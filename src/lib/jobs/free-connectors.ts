import type { Job } from "../types";
import { hashOf } from "./connectors";
import type { Connector, SearchQuery } from "./connectors";
import { COMPANY_CONNECTORS } from "./lever-connector";
import { EXTRA_CONNECTORS } from "./extra-connectors";
import { SCREENINGPASS_CONNECTOR } from "./screeningpass-connector";

/** Evite d'importer baseJob (dépendance circulaire) : construction locale équivalente. */
function baseJob(p: Partial<Job> & Pick<Job, "title" | "company" | "source" | "external_id">): Job {
  return {
    id: p.id || `${p.source}-${p.external_id}`,
    source: p.source, external_id: p.external_id, title: p.title, company: p.company,
    city: p.city || "", country: p.country || "France", remote: p.remote || "onsite",
    contract_type: p.contract_type || "", salary: p.salary || "", description: p.description || "",
    url: p.url || "", posted_at: p.posted_at || new Date().toISOString(),
    skills: p.skills || [], domain: p.domain || "", study_level: p.study_level || "",
    dedupe_hash: p.dedupe_hash || hashOf(`${p.title}|${p.company}|${p.city || ""}`),
    is_demo: 0, created_at: p.created_at || new Date().toISOString(), expires_at: null,
  };
}

/** API publique gratuite, sans clé. https://remotive.com/api/docs */
const remotive: Connector = {
  id: "remotive",
  name: "Remotive (API gratuite)",
  homepage: "https://remotive.com/remote-jobs",
  requiresKey: false,
  async search(q: SearchQuery) {
    try {
      const url = new URL("https://remotive.com/api/remote-jobs");
      url.searchParams.set("limit", String(Math.min(50, q.limit || 30)));
      if (q.keywords) url.searchParams.set("search", q.keywords);
      const res = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Remotive ${res.status}`);
      const data = (await res.json()) as { jobs?: Array<Record<string, any>> };
      return (data.jobs || []).map((r) => baseJob({
        source: "remotive",
        external_id: `remotive-${r.id}`,
        title: String(r.title || "Offre"),
        company: String(r.company_name || "Entreprise"),
        city: String(r.candidate_required_location || "Télétravail"),
        country: "International",
        remote: "remote",
        contract_type: mapRemotiveContract(String(r.job_type || "")),
        salary: String(r.salary || ""),
        description: stripHtml(String(r.description || "")),
        url: String(r.url || ""),
        posted_at: String(r.publication_date || new Date().toISOString()),
        skills: Array.isArray(r.tags) ? r.tags.slice(0, 12).map((t: unknown) => String(t)) : [],
        domain: String(r.category || ""),
      }));
    } catch (e) {
      console.error("[Connecteur Remotive]", e instanceof Error ? e.message : e);
      return [];
    }
  },
};

/** API publique gratuite, sans clé. https://www.arbeitnow.com/api/job-board-api */
const arbeitnow: Connector = {
  id: "arbeitnow",
  name: "Arbeitnow (API gratuite)",
  homepage: "https://www.arbeitnow.com",
  requiresKey: false,
  async search(q: SearchQuery) {
    try {
      const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
        signal: AbortSignal.timeout(15000), headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Arbeitnow ${res.status}`);
      const data = (await res.json()) as { data?: Array<Record<string, any>> };
      let jobs = (data.data || []).map((r) => baseJob({
        source: "arbeitnow",
        external_id: `arbeitnow-${r.slug}`,
        title: String(r.title || "Offre"),
        company: String(r.company_name || "Entreprise"),
        city: String(r.location || ""),
        country: "Europe",
        remote: r.remote ? "remote" : "onsite",
        contract_type: Array.isArray(r.job_types) && r.job_types.length ? String(r.job_types[0]) : "CDI",
        description: stripHtml(String(r.description || "")),
        url: String(r.url || ""),
        posted_at: new Date(Number(r.created_at) * 1000).toISOString(),
        skills: Array.isArray(r.tags) ? r.tags.slice(0, 12).map((t: unknown) => String(t)) : [],
      }));
      if (q.keywords) {
        const needle = q.keywords.toLowerCase();
        jobs = jobs.filter((j) => `${j.title} ${j.skills.join(" ")}`.toLowerCase().includes(needle));
      }
      return jobs.slice(0, q.limit || 30);
    } catch (e) {
      console.error("[Connecteur Arbeitnow]", e instanceof Error ? e.message : e);
      return [];
    }
  },
};

/** API publique gratuite, sans clé. https://jobicy.com/api/v2/remote-jobs */
const jobicy: Connector = {
  id: "jobicy",
  name: "Jobicy (API gratuite)",
  homepage: "https://jobicy.com",
  requiresKey: false,
  async search(q: SearchQuery) {
    try {
      const url = new URL("https://jobicy.com/api/v2/remote-jobs");
      url.searchParams.set("count", String(Math.min(50, q.limit || 30)));
      if (q.keywords) url.searchParams.set("tag", q.keywords);
      const res = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Jobicy ${res.status}`);
      const data = (await res.json()) as { jobs?: Array<Record<string, any>> };
      return (data.jobs || []).map((r) => baseJob({
        source: "jobicy",
        external_id: `jobicy-${r.id}`,
        title: String(r.jobTitle || "Offre"),
        company: String(r.companyName || "Entreprise"),
        city: String(r.jobGeo || "Télétravail"),
        country: "International",
        remote: "remote",
        contract_type: Array.isArray(r.jobType) && r.jobType.length ? String(r.jobType[0]) : "CDI",
        salary: r.annualSalaryMin ? `${r.annualSalaryMin}–${r.annualSalaryMax || ""} ${r.salaryCurrency || "USD"}/an` : "",
        description: stripHtml(String(r.jobExcerpt || r.jobDescription || "")),
        url: String(r.url || ""),
        posted_at: String(r.pubDate || new Date().toISOString()),
        skills: Array.isArray(r.jobIndustry) ? r.jobIndustry.map((t: unknown) => String(t)) : [],
        domain: Array.isArray(r.jobIndustry) ? r.jobIndustry[0] : "",
      }));
    } catch (e) {
      console.error("[Connecteur Jobicy]", e instanceof Error ? e.message : e);
      return [];
    }
  },
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim().slice(0, 4000);
}

function mapRemotiveContract(t: string): string {
  const v = t.toLowerCase();
  if (v.includes("part")) return "Temps partiel";
  if (v.includes("contract")) return "CDD";
  if (v.includes("intern")) return "Stage";
  return "CDI";
}

/**
 * Sources réelles actives par défaut (API publiques gratuites).
 * Toutes sont interrogées en direct ; le filtre France (FRANCE_ONLY=true)
 * ne conserve ensuite que les offres situées en France.
 * Aucune offre de démonstration n'est utilisée.
 */
export const FREE_CONNECTORS: Connector[] = [
  ...SCREENINGPASS_CONNECTOR, // source France principale (gratuite, sans clé)
  arbeitnow,
  remotive,
  jobicy,
  ...EXTRA_CONNECTORS,
  ...COMPANY_CONNECTORS,
];
