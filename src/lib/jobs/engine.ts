import { all, one, run, uid, now, jstring } from "../db";
import { scoreJob } from "../ai";
import { localScoreJob } from "../local-match";
import { getAiSettings } from "../settings";
import { isFranceAndReliable } from "./france-filter";
import { CONNECTORS, hashOf } from "./connectors";
import type { CandidateProfile, Job, Preferences, ScoredJob } from "../types";

export interface SearchFilters {
  keywords?: string;
  city?: string;
  radius_km?: number;
  remote?: string;
  contract_types?: string[];
  domains?: string[];
  study_level?: string;
  availability?: string;
  salary_min?: number;
  date_posted_days?: number;
  limit?: number;
  sources?: string[];
  keywords_exclude?: string[];
}

const COORDS: Record<string, [number, number]> = {
  paris: [48.8566, 2.3522], lyon: [45.764, 4.8357], marseille: [43.2965, 5.3698],
  toulouse: [43.6047, 1.4442], bordeaux: [44.8378, -0.5792], lille: [50.6292, 3.0573],
  nantes: [47.2184, -1.5536], rennes: [48.1173, -1.6778], strasbourg: [48.5734, 7.7521],
  nice: [43.7102, 7.262], montpellier: [43.6108, 3.8767], grenoble: [45.1885, 5.7245],
  dijon: [47.322, 5.0415], angers: [47.4784, -0.5632], brest: [48.3904, -4.4861],
  tours: [47.3941, 0.6848], toulon: [43.1242, 5.928], "le mans": [48.0061, 0.1996],
  amiens: [49.8941, 2.2957], limoges: [45.8336, 1.2611], clermontferrand: [45.7772, 3.087],
};

export function distanceKm(a: string, b: string): number | null {
  const ca = COORDS[a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")];
  const cb = COORDS[b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")];
  if (!ca || !cb) return null;
  const R = 6371;
  const dLat = ((cb[0] - ca[0]) * Math.PI) / 180;
  const dLon = ((cb[1] - ca[1]) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((ca[0] * Math.PI) / 180) * Math.cos((cb[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

function salaryNumber(s: string): number {
  const n = s.replace(/\s/g, "").match(/(\d+)/);
  if (!n) return 0;
  const value = Number(n[1]);
  if (/mois/i.test(s)) return value * 12;
  if (/h\b|\/h/i.test(s)) return value * 1600;
  return value;
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function dedupe(jobs: Job[]): Job[] {
  const map = new Map<string, Job>();
  for (const j of jobs) {
    const key = j.dedupe_hash || hashOf(`${j.title}|${j.company}|${j.city}`);
    const existing = map.get(key);
    if (!existing || (!existing.is_demo && j.is_demo) || j.description.length > existing.description.length) {
      map.set(key, j);
    }
  }
  return [...map.values()];
}

export function filterJobs(jobs: Job[], f: SearchFilters, prefs?: Preferences): Job[] {
  const since = f.date_posted_days
    ? Date.now() - f.date_posted_days * 86400000
    : Date.now() - 365 * 86400000;
  const franceOnly = process.env.FRANCE_ONLY !== "false";

  return jobs.filter((j) => {
    // Filtre France + fiabilité : dates réelles, URL valide, localisation française.
    if (franceOnly && !isFranceAndReliable(j)) return false;
    if (j.expires_at && new Date(j.expires_at).getTime() < Date.now()) return false;
    if (new Date(j.posted_at).getTime() < since) return false;
    if (f.sources?.length && !f.sources.includes(j.source)) return false;

    if (f.keywords) {
      const hay = norm(`${j.title} ${j.company} ${j.description} ${j.skills.join(" ")} ${j.domain}`);
      if (!hay.includes(norm(f.keywords))) return false;
    }
    if (f.keywords_exclude?.length) {
      const hay = norm(`${j.title} ${j.description}`);
      if (f.keywords_exclude.some((k) => hay.includes(norm(k)))) return false;
    }
    if (prefs?.keywords_exclude?.length) {
      const hay = norm(`${j.title} ${j.description}`);
      if (prefs.keywords_exclude.some((k) => hay.includes(norm(k)))) return false;
    }

    const city = f.city || prefs?.cities?.[0] || "";
    if (city && j.city) {
      const d = distanceKm(city, j.city);
      const radius = f.radius_km ?? prefs?.radius_km ?? 50;
      if (d === null) {
        if (norm(j.city) !== norm(city) && j.remote !== "remote") return false;
      } else if (d > radius && j.remote !== "remote") return false;
    }

    const remote = f.remote || prefs?.remote;
    if (remote && remote !== "any" && j.remote !== remote && !(remote === "hybrid" && j.remote === "remote")) return false;

    const contracts = f.contract_types?.length ? f.contract_types : prefs?.contract_types || [];
    if (contracts.length && !contracts.some((c) => norm(j.contract_type).includes(norm(c)) || norm(c).includes(norm(j.contract_type)))) return false;

    const domains = f.domains?.length ? f.domains : prefs?.domains || [];
    if (domains.length && !domains.some((d) => norm(j.domain).includes(norm(d)) || norm(d).includes(norm(j.domain)))) return false;

    if (f.study_level && j.study_level && norm(j.study_level) !== norm(f.study_level)) return false;
    const min = f.salary_min ?? prefs?.salary_min ?? 0;
    if (min > 0 && salaryNumber(j.salary) > 0 && salaryNumber(j.salary) < min) return false;

    return true;
  });
}

export function persistJobs(jobs: Job[]): void {
  for (const j of jobs) {
    run(
      `INSERT INTO jobs (id,source,external_id,title,company,city,country,remote,contract_type,salary,description,url,posted_at,skills,domain,study_level,dedupe_hash,is_demo,created_at,expires_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(source,external_id) DO UPDATE SET
         title=excluded.title, company=excluded.company, city=excluded.city, remote=excluded.remote,
         contract_type=excluded.contract_type, salary=excluded.salary, description=excluded.description,
         url=excluded.url, posted_at=excluded.posted_at, skills=excluded.skills, domain=excluded.domain,
         study_level=excluded.study_level, dedupe_hash=excluded.dedupe_hash, expires_at=excluded.expires_at`,
      j.id, j.source, j.external_id, j.title, j.company, j.city, j.country, j.remote, j.contract_type,
      j.salary, j.description, j.url, j.posted_at, jstring(j.skills), j.domain, j.study_level,
      j.dedupe_hash, j.is_demo, j.created_at, j.expires_at
    );
    // En cas de conflit, SQLite conserve l'ID existant : on le récupère pour
    // éviter une violation de clé étrangère dans search_jobs.
    const stored = one<{ id: string }>(
      "SELECT id FROM jobs WHERE source=? AND external_id=?", j.source, j.external_id
    );
    if (stored) j.id = stored.id;
  }
}

export async function runSearch(
  userId: string,
  filters: SearchFilters,
  profile: CandidateProfile,
  prefs?: Preferences
): Promise<{ jobs: ScoredJob[]; searchId: string; sources: string[] }> {
  const results = await Promise.allSettled(
    CONNECTORS.map((c) => c.search({
      keywords: filters.keywords,
      city: filters.city || prefs?.cities?.[0],
      contract: filters.contract_types?.[0],
      limit: Math.max(60, filters.limit || 40),
    }))
  );

  const raw: Job[] = [];
  const sources: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      if (r.value.length && CONNECTORS[i].id !== "demo") sources.push(CONNECTORS[i].id);
      raw.push(...r.value);
    } else {
      console.error("[Search] connecteur", CONNECTORS[i].id, r.reason);
    }
  });

  // Le jeu de démonstration FRANÇAIS est toujours inclus : il garantit des
  // offres en France avec de vraies dates même si les sources externes
  // (souvent internationales) ne fournissent rien de pertinent.
  const demoOffers = await CONNECTORS[0].search({ limit: 40 });
  raw.push(...demoOffers);
  const unique = dedupe(raw);
  const filtered = filterJobs(unique, filters, prefs);
  persistJobs(filtered);

  const matchContext = {
    cities: filters.city ? [filters.city] : prefs?.cities,
    remote: filters.remote || prefs?.remote,
  };

  // 1) Pré-scoring local de TOUTES les offres fusionnées (gratuit et rapide).
  const prescored = filtered.map((job) => ({ job, match: localScoreJob(profile, job, matchContext) }));
  prescored.sort((a, b) => b.match.score - a.match.score ||
    new Date(b.job.posted_at).getTime() - new Date(a.job.posted_at).getTime());

  // 2) Seuls les meilleurs résultats sont envoyés au fournisseur IA payant.
  const limit = filters.limit || 40;
  const selected = prescored.slice(0, limit);
  const aiLimit = Math.max(0, Math.min(selected.length, getAiSettings().maxAiScoredJobs ?? 15));
  const scored: ScoredJob[] = [];
  for (let i = 0; i < selected.length; i++) {
    const { job, match: local } = selected[i];
    const match = i < aiLimit ? (await scoreJob(profile, job, matchContext)).data : local;
    scored.push({
      ...job,
      score: match.score,
      matched_skills: match.matched_skills,
      missing_skills: match.missing_skills,
      reasons: match.reasons,
    });
  }
  scored.sort((a, b) => b.score - a.score || new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());

  const searchId = uid();
  run(
    "INSERT INTO searches (id,user_id,query,filters,results_count,created_at) VALUES (?,?,?,?,?,?)",
    searchId, userId, filters.keywords || "", jstring(filters), scored.length, now()
  );
  for (const j of scored) {
    run(
      "INSERT OR REPLACE INTO search_jobs (search_id,job_id,score,matched_skills,missing_skills) VALUES (?,?,?,?,?)",
      searchId, j.id, j.score, jstring(j.matched_skills), jstring(j.missing_skills)
    );
  }

  return { jobs: scored, searchId, sources };
}

export function getScoredJobs(userId: string, limit = 60): ScoredJob[] {
  const rows = all<Record<string, unknown>>(
    `SELECT j.*, sj.score AS match_score, sj.matched_skills, sj.missing_skills
     FROM search_jobs sj JOIN searches s ON s.id=sj.search_id
     JOIN jobs j ON j.id=sj.job_id
     WHERE s.user_id=? ORDER BY s.created_at DESC, sj.score DESC LIMIT ?`,
    userId, limit
  );
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(String(r.id))) return false;
    seen.add(String(r.id));
    return true;
  }).map((r) => ({
    id: String(r.id), source: String(r.source), external_id: String(r.external_id),
    title: String(r.title), company: String(r.company), city: String(r.city),
    country: String(r.country), remote: String(r.remote), contract_type: String(r.contract_type),
    salary: String(r.salary), description: String(r.description), url: String(r.url),
    posted_at: String(r.posted_at), skills: JSON.parse(String(r.skills) || "[]"),
    domain: String(r.domain), study_level: String(r.study_level), dedupe_hash: String(r.dedupe_hash),
    is_demo: Number(r.is_demo), created_at: String(r.created_at), expires_at: r.expires_at ? String(r.expires_at) : null,
    score: Number(r.match_score), matched_skills: JSON.parse(String(r.matched_skills) || "[]"),
    missing_skills: JSON.parse(String(r.missing_skills) || "[]"), reasons: [],
  }));
}
