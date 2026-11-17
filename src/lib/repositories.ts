import { one, all, jparse, jstring, now, run, uid } from "./db";
import type { Application, CandidateProfile, Job, Preferences, Resume, ResumeVersion } from "./types";

const EMPTY_PROFILE: CandidateProfile = {
  headline: "", summary: "", city: "", phone: "", linkedin: "", website: "",
  experience_years: 0, seniority: "", availability: "", desired_roles: [], domains: [],
  skills: [], languages: [], education: [], experiences: [], qualities: [],
};

export const DEFAULT_PREFERENCES: Preferences = {
  cities: [], radius_km: 50, remote: "any", contract_types: [], domains: [],
  study_level: "", availability: "", salary_min: 0, salary_max: 0, date_posted_days: 30,
  keywords_include: [], keywords_exclude: [],
};

export function getProfile(userId: string): CandidateProfile {
  const r = one<Record<string, unknown>>("SELECT * FROM profiles WHERE user_id=?", userId);
  if (!r) return { ...EMPTY_PROFILE };
  return {
    ...EMPTY_PROFILE,
    headline: String(r.headline || ""), summary: String(r.summary || ""), city: String(r.city || ""),
    phone: String(r.phone || ""), linkedin: String(r.linkedin || ""), website: String(r.website || ""),
    experience_years: Number(r.experience_years || 0), seniority: String(r.seniority || ""),
    availability: String(r.availability || ""),
    desired_roles: jparse(String(r.desired_roles), []), domains: jparse(String(r.domains), []),
    skills: jparse(String(r.skills), []), languages: jparse(String(r.languages), []),
    education: jparse(String(r.education), []), experiences: jparse(String(r.experiences), []),
    qualities: jparse(String(r.qualities), []),
  };
}

export function saveProfile(userId: string, p: CandidateProfile): void {
  run(
    `UPDATE profiles SET headline=?,summary=?,city=?,phone=?,linkedin=?,website=?,experience_years=?,
     seniority=?,availability=?,desired_roles=?,domains=?,skills=?,languages=?,education=?,experiences=?,qualities=?,updated_at=?
     WHERE user_id=?`,
    p.headline || "", p.summary || "", p.city || "", p.phone || "", p.linkedin || "", p.website || "",
    p.experience_years || 0, p.seniority || "", p.availability || "",
    jstring(p.desired_roles || []), jstring(p.domains || []), jstring(p.skills || []), jstring(p.languages || []),
    jstring(p.education || []), jstring(p.experiences || []), jstring(p.qualities || []), now(), userId
  );
}

export function getPreferences(userId: string): Preferences {
  const r = one<Record<string, unknown>>("SELECT * FROM preferences WHERE user_id=?", userId);
  if (!r) return { ...DEFAULT_PREFERENCES };
  return {
    cities: jparse(String(r.cities), []), radius_km: Number(r.radius_km || 50),
    remote: String(r.remote || "any") as Preferences["remote"],
    contract_types: jparse(String(r.contract_types), []), domains: jparse(String(r.domains), []),
    study_level: String(r.study_level || ""), availability: String(r.availability || ""),
    salary_min: Number(r.salary_min || 0), salary_max: Number(r.salary_max || 0),
    date_posted_days: Number(r.date_posted_days || 30),
    keywords_include: jparse(String(r.keywords_include), []), keywords_exclude: jparse(String(r.keywords_exclude), []),
  };
}

export function savePreferences(userId: string, p: Preferences): void {
  run(
    `UPDATE preferences SET cities=?,radius_km=?,remote=?,contract_types=?,domains=?,study_level=?,availability=?,
     salary_min=?,salary_max=?,date_posted_days=?,keywords_include=?,keywords_exclude=?,updated_at=? WHERE user_id=?`,
    jstring(p.cities || []), p.radius_km || 50, p.remote || "any", jstring(p.contract_types || []),
    jstring(p.domains || []), p.study_level || "", p.availability || "", p.salary_min || 0, p.salary_max || 0,
    p.date_posted_days || 30, jstring(p.keywords_include || []), jstring(p.keywords_exclude || []), now(), userId
  );
}

export function getResumes(userId: string): Resume[] {
  return all<Record<string, unknown>>("SELECT * FROM resumes WHERE user_id=? ORDER BY created_at DESC", userId)
    .map(mapResume);
}

export function getResume(id: string, userId: string): Resume | null {
  const r = one<Record<string, unknown>>("SELECT * FROM resumes WHERE id=? AND user_id=?", id, userId);
  return r ? mapResume(r) : null;
}

function mapResume(r: Record<string, unknown>): Resume {
  return {
    id: String(r.id), user_id: String(r.user_id), name: String(r.name),
    original_filename: String(r.original_filename), mime: String(r.mime),
    original_text: String(r.original_text), extracted_profile: jparse<CandidateProfile>(String(r.extracted_profile), { ...EMPTY_PROFILE }),
    is_primary: Number(r.is_primary), version: Number(r.version),
    parent_id: r.parent_id ? String(r.parent_id) : null, created_at: String(r.created_at),
  };
}

export function getVersions(resumeId: string): ResumeVersion[] {
  return all<Record<string, unknown>>("SELECT * FROM resume_versions WHERE resume_id=? ORDER BY created_at DESC", resumeId)
    .map((r) => ({
      id: String(r.id), resume_id: String(r.resume_id), label: String(r.label),
      content_text: String(r.content_text), content_html: String(r.content_html),
      ai_model: String(r.ai_model), job_id: r.job_id ? String(r.job_id) : null,
      created_at: String(r.created_at),
    }));
}

export function getJob(id: string): Job | null {
  const r = one<Record<string, unknown>>("SELECT * FROM jobs WHERE id=?", id);
  if (!r) return null;
  return {
    id: String(r.id), source: String(r.source), external_id: String(r.external_id),
    title: String(r.title), company: String(r.company), city: String(r.city),
    country: String(r.country), remote: String(r.remote), contract_type: String(r.contract_type),
    salary: String(r.salary), description: String(r.description), url: String(r.url),
    posted_at: String(r.posted_at), skills: jparse(String(r.skills), []),
    domain: String(r.domain), study_level: String(r.study_level), dedupe_hash: String(r.dedupe_hash),
    is_demo: Number(r.is_demo), created_at: String(r.created_at),
    expires_at: r.expires_at ? String(r.expires_at) : null,
  };
}

export function getApplications(userId: string): Application[] {
  const rows = all<Record<string, unknown>>(
    `SELECT a.*, j.title AS j_title, j.company AS j_company, j.city AS j_city, j.contract_type AS j_contract,
     j.salary AS j_salary, j.url AS j_url, j.posted_at AS j_posted, j.description AS j_description,
     j.skills AS j_skills, j.remote AS j_remote, j.source AS j_source, j.domain AS j_domain,
     j.id AS j_id, j.external_id AS j_external_id, j.country AS j_country, j.study_level AS j_study_level,
     j.dedupe_hash AS j_dedupe, j.is_demo AS j_demo, j.created_at AS j_created, j.expires_at AS j_expires
     FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.user_id=? ORDER BY a.updated_at DESC`, userId
  );
  return rows.map((r) => ({
    id: String(r.id), user_id: String(r.user_id), job_id: String(r.job_id),
    resume_version_id: r.resume_version_id ? String(r.resume_version_id) : null,
    status: String(r.status) as Application["status"], cover_letter: String(r.cover_letter || ""),
    email_subject: String(r.email_subject || ""), email_body: String(r.email_body || ""),
    linkedin_message: String(r.linkedin_message || ""),
    recruiter_answers: jparse(String(r.recruiter_answers), {}),
    send_mode: String(r.send_mode) as Application["send_mode"],
    sent_at: r.sent_at ? String(r.sent_at) : null, received_at: r.received_at ? String(r.received_at) : null,
    next_followup_at: r.next_followup_at ? String(r.next_followup_at) : null,
    followup_count: Number(r.followup_count || 0), notes: String(r.notes || ""),
    created_at: String(r.created_at), updated_at: String(r.updated_at),
    job: {
      id: String(r.j_id), source: String(r.j_source), external_id: String(r.j_external_id),
      title: String(r.j_title), company: String(r.j_company), city: String(r.j_city),
      country: String(r.j_country), remote: String(r.j_remote), contract_type: String(r.j_contract),
      salary: String(r.j_salary), description: String(r.j_description), url: String(r.j_url),
      posted_at: String(r.j_posted), skills: jparse(String(r.j_skills), []), domain: String(r.j_domain),
      study_level: String(r.j_study_level), dedupe_hash: String(r.j_dedupe), is_demo: Number(r.j_demo),
      created_at: String(r.j_created), expires_at: r.j_expires ? String(r.j_expires) : null,
    },
  }));
}

export function getApplication(id: string, userId: string): Application | null {
  return getApplications(userId).find((a) => a.id === id) || null;
}
