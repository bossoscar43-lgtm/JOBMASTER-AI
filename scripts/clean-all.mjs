/**
 * Nettoyage complet : données de test + TOUT ce qui est démo,
 * en préservant le compte admin (id, role, admin_verified).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const get = async (t) => {
  const { data } = await sb.from("jm_snapshot").select("rows").eq("table_name", t);
  return data?.[0]?.rows || [];
};
const set = async (t, rows) => {
  await sb.from("jm_snapshot").update({ rows, updated_at: new Date().toISOString() }).eq("table_name", t);
};
const report = {};

// Emails de test / démo
{
  const rows = await get("emails");
  const clean = rows.filter((r) =>
    !/Cet email de test|@test\.fr|@exemple\.fr|Mode d.mon...|d.monstration/i.test(`${r.body || ""} ${r.to_addr || ""} ${r.subject || ""}`)
  );
  report.emails = `${rows.length - clean.length} supprimés`;
  await set("emails", clean);
}

// Notifications démo / obsolètes
{
  const rows = await get("notifications");
  const clean = rows.filter((r) => !/d.mon...|SMTP n'est configur|Mode local|démonstration/i.test(r.body || ""));
  report.notifications = `${rows.length - clean.length} supprimées`;
  await set("notifications", clean);
}

// Candidatures liées à des comptes test
{
  const users = await get("users");
  const testIds = new Set(users.filter((u) => /@test\.fr|@exemple\.fr/i.test(u.email || "")).map((u) => u.id));
  const rows = await get("applications");
  const clean = rows.filter((r) => !testIds.has(r.user_id));
  report.applications = `${rows.length - clean.length} supprimées`;
  await set("applications", clean);
}

// Audit logs : anonymiser les emails en clair
{
  const rows = await get("audit_logs");
  let n = 0;
  const clean = rows.map((r) => {
    if (r.metadata && /@|bossoscar|johnsalvador/i.test(r.metadata)) {
      n++;
      return { ...r, metadata: JSON.stringify({ anonymized: true }) };
    }
    return r;
  });
  report.audit = `${n} anonymisés`;
  await set("audit_logs", clean);
}

// TOUTES les offres démo + leurs liaisons
{
  const rows = await get("jobs");
  const demoIds = new Set(rows.filter((j) => j.is_demo === 1 || j.source === "demo").map((j) => j.id));
  const clean = rows.filter((j) => !demoIds.has(j.id));
  report.jobs = `${rows.length - clean.length} offres démo supprimées`;
  await set("jobs", clean);
  const sj = await get("search_jobs");
  await set("search_jobs", sj.filter((x) => !demoIds.has(x.job_id)));
  // Recherches devenues vides
  const searches = await get("searches");
  const remainingJobIds = new Set(clean.map((j) => j.id));
  const sj2 = await get("search_jobs");
  const validSearchIds = new Set(sj2.map((x) => x.search_id));
  await set("searches", searches.filter((s) => validSearchIds.has(s.id)));
}

// Comptes test (admin conservé)
{
  const rows = await get("users");
  const clean = rows.filter((u) => u.role === "admin" || !/@test\.fr|@exemple\.fr/i.test(u.email || ""));
  report.users = `${rows.length - clean.length} comptes test supprimés | admin conservé: ${clean.some((u) => u.role === "admin")}`;
  await set("users", clean);
}

// Versions de CV "démo" / sample
{
  const rows = await get("resume_versions");
  const clean = rows.filter((r) => !/d.mon...|sample|test/i.test(`${r.label || ""}`));
  report.versions = `${rows.length - clean.length} versions démo supprimées`;
  await set("resume_versions", clean);
}

console.log("=== NETTOYAGE TERMINÉ ===");
for (const [k, v] of Object.entries(report)) console.log(`  ${k}: ${v}`);
process.exit(0);
