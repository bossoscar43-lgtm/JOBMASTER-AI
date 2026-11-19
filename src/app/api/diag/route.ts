import { ok, handle } from "@/lib/http";

/** Endpoint de diagnostic minimal. */
export async function GET() {
  return handle(async () => {
    return ok({
      nodeEnv: process.env.NODE_ENV,
      dataBackend: process.env.DATA_BACKEND || "(vide)",
      hasUrl: Boolean(process.env.SUPABASE_URL),
      hasKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasSessionSecret: Boolean(process.env.SESSION_SECRET),
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "(vide)",
    });
  });
}
