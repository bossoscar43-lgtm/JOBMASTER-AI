export type Role = "user" | "admin";
export type UserStatus = "active" | "suspended";
export type PlanName = "free" | "starter" | "premium" | "business";
export type Locale = "fr" | "en";
export type Theme = "light" | "dark" | "system";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: Role;
  status: UserStatus;
  email_verified: number;
  admin_verified: number;
  locale: Locale;
  theme: Theme;
  plan: PlanName;
  credits_balance: number; // -1 = illimité
  lifetime_credits: number;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  deleted_at: string | null;
}

export interface PublicUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  status: UserStatus;
  plan: PlanName;
  credits_balance: number;
  locale: Locale;
  theme: Theme;
  created_at: string;
  last_login_at: string | null;
}

export interface CandidateProfile {
  headline?: string;
  summary?: string;
  city?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
  experience_years?: number;
  seniority?: string;
  availability?: string;
  desired_roles: string[];
  domains: string[];
  skills: string[];
  languages: string[];
  education: EducationItem[];
  experiences: ExperienceItem[];
  qualities: string[];
}

export interface EducationItem {
  degree: string;
  school: string;
  year?: string;
}

export interface ExperienceItem {
  title: string;
  company?: string;
  period?: string;
  description?: string;
}

export interface Preferences {
  cities: string[];
  radius_km: number;
  remote: "onsite" | "hybrid" | "remote" | "any";
  contract_types: string[];
  domains: string[];
  study_level: string;
  availability: string;
  salary_min: number;
  salary_max: number;
  date_posted_days: number;
  keywords_include: string[];
  keywords_exclude: string[];
}

export interface Resume {
  id: string;
  user_id: string;
  name: string;
  original_filename: string;
  mime: string;
  original_text: string;
  extracted_profile: CandidateProfile;
  is_primary: number;
  version: number;
  parent_id: string | null;
  created_at: string;
}

export interface ResumeVersion {
  id: string;
  resume_id: string;
  label: string;
  content_text: string;
  content_html: string;
  ai_model: string;
  job_id: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  source: string;
  external_id: string;
  title: string;
  company: string;
  city: string;
  country: string;
  remote: string;
  contract_type: string;
  salary: string;
  description: string;
  url: string;
  posted_at: string;
  skills: string[];
  domain: string;
  study_level: string;
  dedupe_hash: string;
  is_demo: number;
  created_at: string;
  expires_at: string | null;
}

export interface ScoredJob extends Job {
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  reasons: string[];
}

export type ApplicationStatus =
  | "detected"
  | "cv_adapted"
  | "to_validate"
  | "sent"
  | "received"
  | "interview"
  | "rejected"
  | "accepted";

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  resume_version_id: string | null;
  status: ApplicationStatus;
  cover_letter: string;
  email_subject: string;
  email_body: string;
  linkedin_message: string;
  recruiter_answers: Record<string, string>;
  send_mode: "draft" | "email" | "assisted";
  sent_at: string | null;
  received_at: string | null;
  next_followup_at: string | null;
  followup_count: number;
  notes: string;
  created_at: string;
  updated_at: string;
  job?: Job;
}

export interface CoachSession {
  id: string;
  user_id: string;
  job_id: string | null;
  mode: "written" | "voice";
  company: string;
  role: string;
  questions: CoachQuestion[];
  report: CoachReport | null;
  score: number | null;
  created_at: string;
  finished_at: string | null;
}

export interface CoachQuestion {
  id: string;
  category: string;
  question: string;
  answer?: string;
  score?: number;
  feedback?: string;
  better_answer?: string;
}

export interface CoachReport {
  overall: number;
  metrics: { label: string; score: number }[];
  strengths: string[];
  improvements: string[];
  summary: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  ip: string;
  created_at: string;
}

export interface CreditEntry {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  balance_after: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Plan {
  id: string;
  name: PlanName;
  price_monthly: number;
  price_yearly: number;
  credits_per_month: number;
  features: string[];
  is_active: number;
}

export interface ConfigEntry {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface ApiResult<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
}
