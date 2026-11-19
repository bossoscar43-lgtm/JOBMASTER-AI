export async function GET() {
  return Response.json({
    ok: true,
    backend: process.env.DATA_BACKEND || "(vide)",
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasSessionSecret: Boolean(process.env.SESSION_SECRET),
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "(vide)",
    timestamp: new Date().toISOString(),
  });
}
