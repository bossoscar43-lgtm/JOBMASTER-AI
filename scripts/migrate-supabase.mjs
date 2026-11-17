/**
 * Migration SQLite -> Supabase.
 * Usage: node scripts/migrate-supabase.mjs
 * Prérequis : table jm_snapshot créée (voir supabase/migrations/001_jobmaster_init.sql)
 *            et SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY dans .env.local.
 */
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local");
  process.exit(1);
}

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const sqlite = new DatabaseSync(env.DATABASE_PATH || "./data/jobmaster.db");

const TABLES = ["users", "sessions", "profiles", "preferences", "resumes", "resume_versions",
  "jobs", "searches", "search_jobs", "applications", "application_events", "emails",
  "coach_sessions", "assistant_messages", "credits_ledger", "plans", "subscriptions",
  "api_config", "audit_logs", "notifications"];

let total = 0;
for (const table of TABLES) {
  const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
  const { error } = await sb.from("jm_snapshot").upsert(
    { table_name: table, rows, updated_at: new Date().toISOString() },
    { onConflict: "table_name" }
  );
  if (error) {
    console.error(`${table}: ${error.message}`);
  } else {
    console.log(`${table.padEnd(22)} ${rows.length} lignes`);
    total += rows.length;
  }
}
console.log(`\nMigration terminée : ${total} lignes -> Supabase`);
sqlite.close();
process.exit(0);
