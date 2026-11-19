import { handle, ok } from "@/lib/http";
import { supabaseEnabled, isSupabaseMode } from "@/lib/supabase";
import { getSupabase } from "@/lib/supabase";

/** Endpoint de diagnostic temporaire pour identifier les erreurs en prod. */
export async function GET() {
  return handle(async () => {
    const info: Record<string, unknown> = {
      nodeEnv: process.env.NODE_ENV,
      dataBackend: process.env.DATA_BACKEND,
      supabaseEnabled: supabaseEnabled(),
      supabaseMode: isSupabaseMode(),
      hasUrl: Boolean(process.env.SUPABASE_URL),
      hasKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasSessionSecret: Boolean(process.env.SESSION_SECRET),
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    };
    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from("jm_snapshot").select("table_name").limit(1);
        info.supabaseQuery = error ? "ERREUR: " + error.message : "OK";
      } catch (e) {
        info.supabaseQuery = "EXCEPTION: " + (e instanceof Error ? e.message : String(e));
      }
    }
    return ok(info);
  });
}
