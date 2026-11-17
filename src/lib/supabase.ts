import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/** Client Supabase serveur avec clé service_role (jamais exposée au navigateur).
 *  La clé service_role contourne RLS : toutes les vérifications d'accès
 *  restent dans notre API (côté serveur). */
export function supabaseEnabled(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function getSupabase(): SupabaseClient | null {
  if (!supabaseEnabled()) return null;
  if (_client) return _client;
  const url = process.env.SUPABASE_URL!;
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
  try {
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application-name": "jobmaster-ai" } },
    });
    return _client;
  } catch (e) {
    console.error("[Supabase] initialisation impossible :", e instanceof Error ? e.message : e);
    return null;
  }
}

export function isSupabaseMode(): boolean {
  return process.env.DATA_BACKEND === "supabase" && Boolean(getSupabase());
}
