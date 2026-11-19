import { ok, handle } from "@/lib/http";
import { all, run, uid, now, flushPendingWrites } from "@/lib/db";
import { isSupabaseMode, getSupabase } from "@/lib/supabase";

/** Diagnostic temporaire : teste chaque étape de la persistance. */
export async function GET() {
  return handle(async () => {
    const steps: Record<string, unknown> = {};
    steps.cloudMode = isSupabaseMode();
    steps.hasSb = Boolean(getSupabase());
    try {
      const id = "diag-" + uid().slice(0, 8);
      run("INSERT INTO notifications (id,user_id,type,title,body,created_at) VALUES (?,?,?,?,?,?)",
        id, "diag", "info", "diag", "diag", now());
      steps.afterInsert = all<{ id: string }>("SELECT id FROM notifications WHERE id=?", id).length;
      steps.pendingAfterInsert = "voir flush";
      run("DELETE FROM notifications WHERE id=?", id);
      steps.afterDelete = all<{ id: string }>("SELECT id FROM notifications WHERE id=?", id).length;
      await flushPendingWrites();
      steps.flushOk = true;
      return ok(steps);
    } catch (e) {
      steps.error = e instanceof Error ? e.message : String(e);
      steps.stack = e instanceof Error ? e.stack?.slice(0, 300) : "";
      return ok(steps);
    }
  });
}
