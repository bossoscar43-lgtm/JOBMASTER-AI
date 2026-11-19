import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data } = await sb.from("jm_snapshot").select("rows").eq("table_name", "api_config");
const rows = data?.[0]?.rows || [];
console.log("ENV SMTP_USER:", env.SMTP_USER, "| FROM:", env.SMTP_FROM);
for (const r of rows) {
  if (r.key === "smtp") {
    const v = r.value;
    console.log("SUPABASE smtp:", JSON.stringify({ user: v?.user || v?.['0'], pass: v?.pass ? "***" : "?" }));
  }
}
process.exit(0);
