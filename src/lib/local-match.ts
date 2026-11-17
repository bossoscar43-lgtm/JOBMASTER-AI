import { norm } from "./local-profile";
import type { CandidateProfile, Job } from "./types";

export interface LocalMatch {
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  reasons: string[];
}

export function localScoreJob(profile: CandidateProfile, job: Job, prefs?: { cities?: string[]; remote?: string }): LocalMatch {
  const required = job.skills || [];
  const owned = profile.skills || [];
  const matched = required.filter((s) => owned.some((o) => norm(o) === norm(s) || norm(o).includes(norm(s)) || norm(s).includes(norm(o))));
  const missing = required.filter((s) => !matched.includes(s));

  let score = 0;
  const reasons: string[] = [];

  if (required.length) {
    const ratio = matched.length / required.length;
    score += Math.round(ratio * 55);
    reasons.push(`${matched.length}/${required.length} compétences requises présentes`);
  } else {
    score += 28;
  }

  const titleTokens = norm(job.title).split(/\W+/).filter((w) => w.length > 3);
  const profileText = norm([profile.headline, (profile.experiences || []).map((e) => e.title).join(" "), owned.join(" ")].join(" "));
  const titleHits = titleTokens.filter((t) => profileText.includes(t)).length;
  if (titleTokens.length) {
    score += Math.min(20, Math.round((titleHits / titleTokens.length) * 20));
    reasons.push(`${titleHits} mot(s)-clé(s) du poste retrouvé(s) dans le profil`);
  }

  const domains = profile.domains || [];
  if (domains.some((d) => norm(d) === norm(job.domain))) {
    score += 10;
    reasons.push(`Domaine ${job.domain} cohérent avec le profil`);
  }

  if (prefs?.cities?.length && prefs.cities.some((c) => norm(c) === norm(job.city))) {
    score += 8;
    reasons.push(`Ville souhaitée : ${job.city}`);
  } else if (job.remote === "remote" || prefs?.remote === "any") {
    score += 5;
    reasons.push(job.remote === "remote" ? "Poste en télétravail" : "Mode de travail compatible");
  }

  if ((profile.experience_years || 0) === 0 && /senior|confirmé|expert/i.test(job.title)) {
    score -= 6;
    reasons.push("Profil junior pour un poste confirmé");
  }

  return {
    score: Math.max(5, Math.min(99, score)),
    matched_skills: matched,
    missing_skills: missing,
    reasons,
  };
}

export interface LocalAdaptation {
  title: string;
  summary: string;
  skills: string[];
  experienceLines: string[];
  educationLines: string[];
  tips: string[];
  contentText: string;
  contentHtml: string;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] || c);
}

export function localAdaptCv(profile: CandidateProfile, job: Job, match: LocalMatch): LocalAdaptation {
  const matched = match.matched_skills;
  const other = (profile.skills || []).filter((s) => !matched.includes(s));
  const skills = [...matched, ...other];

  const title = `${job.title} — ${profile.headline || "Candidat(e)"}`.replace(/\s+/g, " ").slice(0, 110);
  const summary = [
    `Candidat(e) ${profile.experience_years ? `avec ${profile.experience_years} an(s) d'expérience` : "en début de parcours"},`,
    `je souhaite contribuer aux missions de ${job.company} en tant que ${job.title}.`,
    matched.length ? `Mes compétences en ${matched.slice(0, 5).join(", ")} correspondent aux attentes de cette offre.` : "",
    profile.city ? `Basé(e) à ${profile.city}${job.remote === "remote" ? " et ouvert(e) au télétravail" : ""}.` : "",
  ].filter(Boolean).join(" ");

  const experienceLines = (profile.experiences || []).map((e) =>
    [e.title, e.company ? `— ${e.company}` : "", e.period ? `(${e.period})` : "", e.description ? `\n    ${e.description}` : ""].join(" ")
  );
  const educationLines = (profile.education || []).map((e) =>
    [e.degree, e.school ? `— ${e.school}` : "", e.year ? `(${e.year})` : ""].join(" ")
  );

  const contentText = [
    title.toUpperCase(), "", "PROFIL", summary, "", "COMPÉTENCES CLÉS", skills.join(" · "), "",
    "EXPÉRIENCE", ...experienceLines, "", "FORMATIONS", ...educationLines, "",
    "QUALITÉS", (profile.qualities || []).join(" · "),
    profile.languages?.length ? ["", "LANGUES", profile.languages.join(" · ")] : "",
  ].filter((l) => l !== undefined).join("\n");

  const list = (items: string[]) => items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "";
  const contentHtml = `<article class="cv-doc"><h1>${esc(title)}</h1><section><h2>Profil</h2><p>${esc(summary)}</p></section><section><h2>Compétences clés</h2>${list(skills)}</section><section><h2>Expérience</h2>${list(experienceLines)}</section><section><h2>Formations</h2>${list(educationLines)}</section><section><h2>Qualités</h2><p>${esc((profile.qualities || []).join(" · "))}</p></section></article>`;

  const tips = [
    "Les compétences en lien avec l'offre ont été placées en tête de section pour les logiciels ATS.",
    "Aucune expérience, formation ou compétence n'a été ajoutée artificiellement.",
    match.missing_skills.length ? `Compétences demandées non trouvées dans votre CV : ${match.missing_skills.join(", ")}. Ne les ajoutez que si vous les maîtrisez réellement.` : "Toutes les compétences demandées sont présentes dans votre profil.",
  ];

  return { title, summary, skills, experienceLines, educationLines, tips, contentText, contentHtml };
}
