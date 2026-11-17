import { getFirestoreDb, getFirebaseBucket, firebaseEnabled } from "@/lib/firebase";
import { hydrateFromFirestore, hydrateFromSupabase, isFirestoreMode } from "@/lib/db";
import { supabaseEnabled, isSupabaseMode } from "@/lib/supabase";
import { getAutoRefreshStatus, startAutoRefresh } from "@/lib/jobs/auto-refresh";
import { ok, handle } from "@/lib/http";

export async function POST() {
  return handle(async () => {
    startAutoRefresh();
    const [rowsFirestore, rowsSupabase] = await Promise.all([
      hydrateFromFirestore(),
      hydrateFromSupabase(),
    ]);
    return ok({
      firebaseConfigured: firebaseEnabled(),
      firestore: isFirestoreMode(),
      storage: Boolean(getFirebaseBucket()),
      supabaseConfigured: supabaseEnabled(),
      supabase: isSupabaseMode(),
      rowsHydrated: rowsFirestore + rowsSupabase,
      autoRefresh: getAutoRefreshStatus(),
    });
  });
}

export async function GET() {
  return handle(async () => {
    startAutoRefresh();
    return ok({
      firebaseConfigured: firebaseEnabled(),
      firestore: isFirestoreMode(),
      storage: Boolean(getFirebaseBucket()),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
      supabaseConfigured: supabaseEnabled(),
      supabase: isSupabaseMode(),
      supabaseUrl: process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).host : "",
      autoRefresh: getAutoRefreshStatus(),
    });
  });
}
