import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
console.log("DATA_BACKEND:", env.DATA_BACKEND);
console.log("SUPABASE_URL:", env.SUPABASE_URL);
console.log("SERVICE_KEY:", env.SUPABASE_SERVICE_ROLE_KEY ? "presente (" + env.SUPABASE_SERVICE_ROLE_KEY.length + ")" : "ABSENTE");

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
try {
  const { data, error } = await sb.from("jm_snapshot").select("table_name").limit(5);
  console.log("LECTURE Supabase:", error ? "ERREUR " + error.message : "OK " + JSON.stringify(data));
} catch (e) {
  console.log("LECTURE Supabase EXCEPTION:", e.message);
}
process.exit(0);
