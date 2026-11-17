/**
 * Migration SQLite -> Firestore.
 * Usage: node scripts/migrate-firestore.mjs
 * Nécessite FIREBASE_SERVICE_ACCOUNT dans .env.local.
 */
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
const app = getApps().length ? getApps()[0] : initializeApp({
  credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }),
});
const db = getFirestore(app);
const sqlite = new DatabaseSync(env.DATABASE_PATH || "./data/jobmaster.db");

const TABLES = ["users", "sessions", "profiles", "preferences", "resumes", "resume_versions",
  "jobs", "searches", "search_jobs", "applications", "application_events", "emails",
  "coach_sessions", "assistant_messages", "credits_ledger", "plans", "subscriptions",
  "api_config", "audit_logs", "notifications"];

let total = 0;
for (const table of TABLES) {
  const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
  if (rows.length) {
    await db.collection("jobmaster").doc("data").collection("snapshot").doc(table)
      .set({ rows, updatedAt: new Date().toISOString() });
    total += rows.length;
  }
  console.log(`${table.padEnd(22)} ${rows.length} lignes`);
}
console.log(`\nMigration terminée : ${total} lignes -> Firestore`);
sqlite.close();
