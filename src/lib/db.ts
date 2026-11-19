import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Plan } from "./types";
import { getFirestoreDb, col } from "./firebase";
import { getSupabase, isSupabaseMode } from "./supabase";

const dbPath = path.resolve(
  process.cwd(),
  process.env.DATABASE_PATH || "./data/jobmaster.db"
);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

let _db: DatabaseSync | null = null;
let _autoRefreshStarted = false;

export function getDb(): DatabaseSync {
  if (_db) return _db;
  // En mode cloud (Firestore/Supabase), le moteur SQL reste en mémoire :
  // la source de vérité est distante, la couche SQL sert aux requêtes.
  const cloudMode =
    (process.env.DATA_BACKEND === "firestore" && Boolean(getFirestoreDb())) ||
    isSupabaseMode();
  const db = new DatabaseSync(cloudMode ? ":memory:" : dbPath);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  if (!cloudMode) seed(db);
  _db = db;
  // Démarre l'actualisation autonome dès le premier accès à la base,
  // dans ce runtime (partagé avec toutes les API). Une seule fois.
  if (!_autoRefreshStarted) {
    _autoRefreshStarted = true;
    void import("./jobs/auto-refresh").then((m) => m.startAutoRefresh()).catch(() => undefined);
  }
  return db;
}

/** Réhydrate depuis le cloud si nécessaire (appelé par les routes sensibles).
 *  Démarre aussi le planificateur d'actualisation autonome une seule fois. */
export async function waitForHydration(): Promise<void> {
  if (isSupabaseMode()) await hydrateFromSupabase();
  else if (isFirestoreMode()) await hydrateFromFirestore();
  // Import différé pour éviter les dépendances circulaires.
  void import("./jobs/auto-refresh").then((m) => m.startAutoRefresh()).catch(() => undefined);
}

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
  email_verified INTEGER NOT NULL DEFAULT 0,
  admin_verified INTEGER NOT NULL DEFAULT 0,
  locale TEXT NOT NULL DEFAULT 'fr',
  theme TEXT NOT NULL DEFAULT 'system',
  plan TEXT NOT NULL DEFAULT 'free',
  credits_balance INTEGER NOT NULL DEFAULT 30,
  lifetime_credits INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT,
  deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  linkedin TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  experience_years INTEGER NOT NULL DEFAULT 0,
  seniority TEXT NOT NULL DEFAULT '',
  availability TEXT NOT NULL DEFAULT '',
  desired_roles TEXT NOT NULL DEFAULT '[]',
  domains TEXT NOT NULL DEFAULT '[]',
  skills TEXT NOT NULL DEFAULT '[]',
  languages TEXT NOT NULL DEFAULT '[]',
  education TEXT NOT NULL DEFAULT '[]',
  experiences TEXT NOT NULL DEFAULT '[]',
  qualities TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cities TEXT NOT NULL DEFAULT '[]',
  radius_km INTEGER NOT NULL DEFAULT 50,
  remote TEXT NOT NULL DEFAULT 'any',
  contract_types TEXT NOT NULL DEFAULT '[]',
  domains TEXT NOT NULL DEFAULT '[]',
  study_level TEXT NOT NULL DEFAULT '',
  availability TEXT NOT NULL DEFAULT '',
  salary_min INTEGER NOT NULL DEFAULT 0,
  salary_max INTEGER NOT NULL DEFAULT 0,
  date_posted_days INTEGER NOT NULL DEFAULT 30,
  keywords_include TEXT NOT NULL DEFAULT '[]',
  keywords_exclude TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  original_text TEXT NOT NULL,
  extracted_profile TEXT NOT NULL DEFAULT '{}',
  is_primary INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  parent_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);
CREATE TABLE IF NOT EXISTS resume_versions (
  id TEXT PRIMARY KEY,
  resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  content_text TEXT NOT NULL,
  content_html TEXT NOT NULL DEFAULT '',
  ai_model TEXT NOT NULL DEFAULT 'local',
  job_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_versions_resume ON resume_versions(resume_id);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'France',
  remote TEXT NOT NULL DEFAULT 'onsite',
  contract_type TEXT NOT NULL DEFAULT '',
  salary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  posted_at TEXT NOT NULL,
  skills TEXT NOT NULL DEFAULT '[]',
  domain TEXT NOT NULL DEFAULT '',
  study_level TEXT NOT NULL DEFAULT '',
  dedupe_hash TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(source, external_id)
);
CREATE INDEX IF NOT EXISTS idx_jobs_dedupe ON jobs(dedupe_hash);
CREATE TABLE IF NOT EXISTS searches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL DEFAULT '',
  filters TEXT NOT NULL DEFAULT '{}',
  results_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS search_jobs (
  search_id TEXT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  matched_skills TEXT NOT NULL DEFAULT '[]',
  missing_skills TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY(search_id, job_id)
);
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  resume_version_id TEXT,
  status TEXT NOT NULL DEFAULT 'detected',
  cover_letter TEXT NOT NULL DEFAULT '',
  email_subject TEXT NOT NULL DEFAULT '',
  email_body TEXT NOT NULL DEFAULT '',
  linkedin_message TEXT NOT NULL DEFAULT '',
  recruiter_answers TEXT NOT NULL DEFAULT '{}',
  send_mode TEXT NOT NULL DEFAULT 'draft',
  sent_at TEXT,
  received_at TEXT,
  next_followup_at TEXT,
  followup_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_apps_user ON applications(user_id);
CREATE TABLE IF NOT EXISTS application_events (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL DEFAULT '',
  to_status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id TEXT,
  to_addr TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'demo',
  provider TEXT NOT NULL DEFAULT 'internal-log',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS coach_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT,
  mode TEXT NOT NULL DEFAULT 'written',
  company TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  questions TEXT NOT NULL DEFAULT '[]',
  report TEXT,
  score INTEGER,
  created_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_coach_user ON coach_sessions(user_id);
CREATE TABLE IF NOT EXISTS assistant_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assistant_user ON assistant_messages(user_id);
CREATE TABLE IF NOT EXISTS credits_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  balance_after INTEGER NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON credits_ledger(user_id);
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  price_yearly INTEGER NOT NULL DEFAULT 0,
  credits_per_month INTEGER NOT NULL DEFAULT 0,
  features TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  provider TEXT NOT NULL DEFAULT 'internal',
  current_period_end TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS api_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  metadata TEXT NOT NULL DEFAULT '{}',
  ip TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read_at TEXT,
  created_at TEXT NOT NULL
);
`;

export function now(): string {
  return new Date().toISOString();
}

export function uid(): string {
  return crypto.randomUUID();
}

type Param = string | number | null | undefined | Uint8Array;

export function all<T = Record<string, unknown>>(sql: string, ...params: Param[]): T[] {
  const rows = getDb().prepare(sql).all(...(params as never[])) as Record<string, unknown>[];
  return rows.map((r) => ({ ...r }) as T);
}

export function one<T = Record<string, unknown>>(sql: string, ...params: Param[]): T | null {
  const row = getDb().prepare(sql).get(...(params as never[])) as Record<string, unknown> | undefined;
  return row ? ({ ...row } as T) : null;
}

// Écritures cloud en attente. Sur Vercel (serverless), la function peut être
// figée dès que la réponse est renvoyée : on DOIT attendre ces écritures
// avant de répondre, sinon les inscriptions/connexions ne sont pas persistées.
const pendingWrites = new Set<Promise<void>>();

function trackWrite(p: Promise<void>): void {
  pendingWrites.add(p);
  void p.finally(() => pendingWrites.delete(p));
}

/** Attend que toutes les écritures cloud soient persistées. */
export async function flushPendingWrites(): Promise<void> {
  if (!pendingWrites.size) return;
  await Promise.all([...pendingWrites]);
}

export function run(sql: string, ...params: Param[]): { changes: number; lastInsertRowid: number | bigint } {
  const result = getDb().prepare(sql).run(...(params as never[])) as {
    changes: number;
    lastInsertRowid: number | bigint;
  };
  if (isFirestoreMode()) trackWrite(syncMutation(sql, params));
  if (isSupabaseMode()) trackWrite(syncSupabaseMutation(sql));
  return result;
}

/** Mode Firestore : persistance asynchrone sans bloquer la réponse HTTP. */
export function isFirestoreMode(): boolean {
  return process.env.DATA_BACKEND === "firestore" && Boolean(getFirestoreDb());
}

const TABLES = [
  "users", "sessions", "password_resets", "profiles", "preferences", "resumes",
  "resume_versions", "jobs", "searches", "search_jobs", "applications",
  "application_events", "emails", "coach_sessions", "assistant_messages",
  "credits_ledger", "plans", "subscriptions", "api_config", "audit_logs", "notifications",
];

/** Réhydrate SQLite en mémoire depuis Firestore au démarrage du processus. */
export async function hydrateFromFirestore(): Promise<number> {
  if (!isFirestoreMode()) return 0;
  const db = getDb();
  const target = col("snapshot");
  if (!target) return 0;
  let count = 0;
  db.exec("BEGIN");
  try {
    for (const table of TABLES) {
      const snap = await target.doc(table).get();
      const data = snap.data();
      const rows = (data?.rows as Record<string, unknown>[]) || [];
      if (!rows.length) continue;
      const columns = Object.keys(rows[0]);
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`
      );
      for (const row of rows) {
        stmt.run(...columns.map((c) => row[c] as never));
        count++;
      }
    }
    db.exec("COMMIT");
    console.log(`[Firestore] ${count} lignes rehydratees.`);
    return count;
  } catch (e) {
    db.exec("ROLLBACK");
    console.error("[Firestore] rehydration impossible :", e instanceof Error ? e.message : e);
    return 0;
  }
}

/** Écrit un snapshot complet de la table concernée après chaque mutation. */
async function syncMutation(sql: string, params: Param[]): Promise<void> {
  const match = sql.trim().match(/^(INSERT|UPDATE|DELETE|REPLACE)\s+(?:OR\s+\w+\s+)?(?:INTO\s+)?([a-z_]+)/i);
  if (!match) return;
  const table = match[2].toLowerCase();
  if (!TABLES.includes(table)) return;
  const target = col("snapshot");
  if (!target) return;
  try {
    const rows = getDb().prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    await target.doc(table).set({ rows, updatedAt: now() });
  } catch (e) {
    console.error(`[Firestore] sync ${table}:`, e instanceof Error ? e.message : e);
  }
}

export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function jparse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function jstring(value: unknown): string {
  return JSON.stringify(value ?? null);
}

// Expose la liste des tables pour les outils de migration.
export { TABLES };

let _hydrateResult = 0;

/** Réhydrate SQLite en mémoire depuis Supabase (table `jm_snapshot`).
 *  Idempotent : les lignes déjà présentes ne sont pas réinsérées. */
export async function hydrateFromSupabase(): Promise<number> {
  const sb = getSupabase();
  if (!isSupabaseMode() || !sb) return 0;
  const db = getDb();
  if (_hydrateResult > 0) return _hydrateResult;
  let count = 0;
  try {
    // Les tables sont chargées dans un ordre arbitraire : on désactive
    // temporairement les FK pour éviter les erreurs de référence.
    db.exec("PRAGMA foreign_keys = OFF;");
    for (const table of TABLES) {
      const { data, error } = await sb.from("jm_snapshot").select("rows").eq("table_name", table).maybeSingle();
      if (error || !data?.rows) continue;
      const rows = data.rows as Record<string, unknown>[];
      if (!rows.length) continue;
      const columns = Object.keys(rows[0]).filter((c) => {
        const info = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
        return info.some((i) => i.name === c);
      });
      if (!columns.length) continue;
      // INSERT OR IGNORE : ne pas écraser les données créées entre-temps.
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`
      );
      for (const row of rows) {
        stmt.run(...columns.map((c) => row[c] as never));
        count++;
      }
    }
    db.exec("PRAGMA foreign_keys = ON;");
    _hydrateResult = count;
    console.log(`[Supabase] ${count} lignes rehydratees.`);
    return count;
  } catch (e) {
    db.exec("PRAGMA foreign_keys = ON;");
    console.error("[Supabase] rehydration impossible :", e instanceof Error ? e.message : e);
    return 0;
  }
}

/** Écrit un snapshot complet de la table modifiée dans Supabase. */
async function syncSupabaseMutation(sql: string): Promise<void> {
  const match = sql.trim().match(/^(INSERT|UPDATE|DELETE|REPLACE)\s+(?:OR\s+\w+\s+)?(?:INTO\s+)?([a-z_]+)/i);
  if (!match) return;
  const table = match[2].toLowerCase();
  if (!TABLES.includes(table)) return;
  const sb = getSupabase();
  if (!sb) return;
  try {
    const rows = getDb().prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    await sb.from("jm_snapshot").upsert(
      { table_name: table, rows, updated_at: new Date().toISOString() },
      { onConflict: "table_name" }
    );
  } catch (e) {
    console.error(`[Supabase] sync ${table}:`, e instanceof Error ? e.message : e);
  }
}

export function audit(
  actorId: string | null,
  action: string,
  targetType = "",
  targetId = "",
  metadata: Record<string, unknown> = {},
  ip = ""
): void {
  run(
    "INSERT INTO audit_logs (id,actor_id,action,target_type,target_id,metadata,ip,created_at) VALUES (?,?,?,?,?,?,?,?)",
    uid(), actorId, action, targetType, targetId, jstring(metadata), ip, now()
  );
}

export function notify(userId: string, type: string, title: string, body = ""): void {
  run(
    "INSERT INTO notifications (id,user_id,type,title,body,created_at) VALUES (?,?,?,?,?,?)",
    uid(), userId, type, title, body, now()
  );
}

// ---------------------------------------------------------------------------
// Seed (idempotent) — plans + offres de démonstration
// ---------------------------------------------------------------------------
function seed(db: DatabaseSync): void {
  const plans: Plan[] = [
    { id: "plan_free", name: "free", price_monthly: 0, price_yearly: 0, credits_per_month: 30, features: ["3 CV", "Recherche basique", "10 candidatures/mois"], is_active: 1 },
    { id: "plan_starter", name: "starter", price_monthly: 1900, price_yearly: 190000, credits_per_month: 250, features: ["10 CV", "Recherche avancée", "CV adaptés illimités", "Coach entretien"], is_active: 1 },
    { id: "plan_premium", name: "premium", price_monthly: 3900, price_yearly: 390000, credits_per_month: 800, features: ["CV illimités", "Candidature automatique", "Relances IA", "Assistant prioritaire"], is_active: 1 },
    { id: "plan_business", name: "business", price_monthly: 9900, price_yearly: 990000, credits_per_month: 3000, features: ["Équipe", "API", "Support dédié", "Tout Premium"], is_active: 1 },
  ];
  for (const p of plans) {
    db.prepare(
      "INSERT OR IGNORE INTO plans (id,name,price_monthly,price_yearly,credits_per_month,features,is_active) VALUES (?,?,?,?,?,?,?)"
    ).run(p.id, p.name, p.price_monthly, p.price_yearly, p.credits_per_month, jstring(p.features), p.is_active);
  }

  const count = (db.prepare("SELECT COUNT(*) AS c FROM jobs WHERE is_demo=1").get() as { c: number }).c;
  if (count > 0) return;

  const demoJobs = buildDemoJobs();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO jobs
     (id,source,external_id,title,company,city,country,remote,contract_type,salary,description,url,posted_at,skills,domain,study_level,dedupe_hash,is_demo,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  for (const j of demoJobs) {
    stmt.run(j.id, j.source, j.external_id, j.title, j.company, j.city, j.country, j.remote,
      j.contract_type, j.salary, j.description, j.url, j.posted_at, jstring(j.skills), j.domain,
      j.study_level, j.dedupe_hash, 1, j.created_at);
  }
}

export function buildDemoJobs() {
  const raw: Array<[string, string, string, string, string, string, string, string[], string, string]> = [
    ["Alternant(e) Chargé(e) de Communication Digital", "Decathlon", "Lille", "hybrid", "Alternance", "1 400 €/mois", "Vous intégrez une équipe dynamique et accompagnez la stratégie digitale de la marque.", ["Communication", "Social Media", "SEO", "Canva"], "Marketing", "Bac+3"],
    ["Stage Chargé(e) de recrutement", "Adecco", "Paris", "onsite", "Stage", "1 300 €/mois", "Vous participez au processus de recrutement de bout en bout et au sourcing de candidats.", ["Recrutement", "Sourcing", "Excel", "LinkedIn"], "Ressources Humaines", "Bac+3"],
    ["Développeur(se) Full Stack JavaScript", "Capgemini", "Paris", "hybrid", "CDI", "38 000 €/an", "Conception et développement d'applications web avec React et Node.js.", ["JavaScript", "React", "Node.js", "SQL", "Git"], "Informatique", "Bac+5"],
    ["Conseiller(ère) de vente en magasin", "Fnac", "Lyon", "onsite", "CDI", "24 000 €/an", "Accueil et conseil client, vente produits et services.", ["Vente", "Relation client", "Conseil"], "Commerce", "Bac+2"],
    ["Job étudiant - Serveur(se) en restauration", "Flunch", "Toulouse", "onsite", "Job étudiant", "11,65 €/h", "Service en salle et accueil de la clientèle.", ["Service client", "Restauration", "Travail en équipe"], "Hôtellerie", "Bac"],
    ["Alternance Technicien(ne) Support Informatique", "SFR", "Nantes", "hybrid", "Alternance", "1 500 €/mois", "Assistance technique aux utilisateurs et gestion des incidents.", ["Support", "Windows", "Réseau", "Service client"], "Informatique", "Bac+2"],
    ["Chargé(e) de marketing digital", "Sephora", "Paris", "hybrid", "CDD", "32 000 €/an", "Pilotage des campagnes d'acquisition et analyse des performances.", ["Marketing", "SEO", "Google Ads", "Analytics"], "Marketing", "Bac+5"],
    ["Stage Assistant(e) comptable", "Deloitte", "Lyon", "onsite", "Stage", "1 200 €/mois", "Aide à la tenue comptable et à la préparation des bilans.", ["Comptabilité", "Excel", "Rigueur"], "Finance", "Bac+2"],
    ["Data Analyst Junior", "Accenture", "Paris", "remote", "CDI", "36 000 €/an", "Analyse de données et création de tableaux de bord décisionnels.", ["SQL", "Python", "Power BI", "Analyse de données"], "Informatique", "Bac+5"],
    ["Vendeur(conseiller) téléphonique", "Boulanger", "Bordeaux", "onsite", "CDI", "23 000 €/an", "Conseil et vente de produits high-tech par téléphone.", ["Vente", "Relation client", "Persuasion"], "Commerce", "Bac+2"],
    ["Apprenti(e) électricien(ne)", "Engie", "Marseille", "onsite", "Apprentissage", "1 300 €/mois", "Installation et maintenance d'équipements électriques.", ["Électricité", "Sécurité", "Lecture de plans"], "Industrie", "CAP/BEP"],
    ["UX/UI Designer", "Doctolib", "Paris", "remote", "CDI", "45 000 €/an", "Conception d'interfaces pour des produits numériques à fort impact.", ["Figma", "UX Design", "Prototypage", "Design System"], "Design", "Bac+5"],
    ["Contrat de professionnalisation - Logistique", "Amazon", "Lille", "onsite", "Contrat de professionnalisation", "1 450 €/mois", "Gestion des flux et préparation de commandes.", ["Logistique", "Organisation", "Excel"], "Logistique", "Bac+2"],
    ["Job étudiant - Animateur(trice) de vente", "Carrefour", "Rennes", "onsite", "Job étudiant", "12,00 €/h", "Animation de rayon et mise en valeur des produits.", ["Vente", "Animation", "Relation client"], "Commerce", "Bac"],
    ["Chargé(e) RH - Formation", "SNCF", "Lyon", "hybrid", "CDI", "34 000 €/an", "Pilotage des plans de formation et suivi des compétences.", ["Formation", "Recrutement", "RH", "Excel"], "Ressources Humaines", "Bac+5"],
    ["Développeur(se) Front-End React", "Malt", "Paris", "remote", "CDD", "42 000 €/an", "Développement d'interfaces web modernes et accessibles.", ["React", "TypeScript", "CSS", "Git"], "Informatique", "Bac+4"],
    ["Stage en intelligence artificielle", "Dataiku", "Paris", "hybrid", "Stage", "1 800 €/mois", "Expérimentation sur des modèles de machine learning et NLP.", ["Python", "Machine Learning", "NLP", "Pandas"], "Informatique", "Bac+5"],
    ["Conseiller(ère) clientèle banque", "Crédit Agricole", "Nantes", "onsite", "CDI", "26 000 €/an", "Accompagnement des clients dans leurs projets financiers.", ["Relation client", "Banque", "Conseil", "Vente"], "Finance", "Bac+2"],
    ["Alternance Chargé(e) de communication interne", "L'Oréal", "Paris", "hybrid", "Alternance", "1 600 €/mois", "Animation de la communication interne et des événements collaborateurs.", ["Communication", "Rédaction", "Événementiel"], "Communication", "Bac+5"],
    ["Technicien(ne) de maintenance industrielle", "Thales", "Toulouse", "onsite", "CDI", "30 000 €/an", "Maintenance préventive et corrective des équipements.", ["Maintenance", "Industrie", "Sécurité"], "Industrie", "Bac+2"],
    ["Community Manager", "Back Market", "Paris", "remote", "CDI", "35 000 €/an", "Animation des communautés et création de contenu éditorial.", ["Social Media", "Rédaction", "Community Management"], "Marketing", "Bac+3"],
    ["Stage en développement web", "Alan", "Paris", "remote", "Stage", "1 500 €/mois", "Participation au développement de la plateforme produit.", ["Ruby", "JavaScript", "SQL", "Git"], "Informatique", "Bac+4"],
    ["Assistant(e) de direction", "KPMG", "Lyon", "onsite", "CDI", "29 000 €/an", "Support administratif et coordination des agendas.", ["Administration", "Excel", "Organisation"], "Administration", "Bac+2"],
    ["Job étudiant - Livreur(se) à vélo", "Uber Eats", "Bordeaux", "onsite", "Job étudiant", "12,50 €/h", "Livraison de repas à vélo en centre-ville.", ["Livraison", "Autonomie", "Ponctualité"], "Logistique", "Bac"],
  ];
  const nowIso = new Date().toISOString();
  return raw.map((r, i) => {
    const [title, company, city, remote, contract, salary, description, skills, domain, level] = r;
    const externalId = `demo-${String(i + 1).padStart(3, "0")}`;
    const dedupe = crypto.createHash("sha1").update(`${title}|${company}|${city}`).digest("hex");
    const posted = new Date(Date.now() - (i % 18) * 86400000).toISOString();
    return {
      id: `job_${externalId}`, source: "demo", external_id: externalId, title, company, city,
      country: "France", remote, contract_type: contract, salary, description,
      url: `https://www.francetravail.fr/candidat/recherche.html?keywords=${encodeURIComponent(title)}`, posted_at: posted, skills, domain,
      study_level: level, dedupe_hash: dedupe, is_demo: 1, created_at: nowIso,
    };
  });
}
