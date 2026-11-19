import { ok, handle } from "@/lib/http";
import { all, run, flushPendingWrites, uid, now } from "@/lib/db";

/** Diagnostic temporaire : insère puis supprime une ligne, vérifie la persistance. */
export async function GET() {
  return handle(async () => {
    const id = "diag-" + uid().slice(0, 8);
    run("INSERT INTO notifications (id,user_id,type,title,body,created_at) VALUES (?,?,?,?,?,?)",
      id, "diag", "info", "diag", "diag", now());
    const during = all<{ id: string }>("SELECT id FROM notifications WHERE id=?", id).length;
    run("DELETE FROM notifications WHERE id=?", id);
    const after = all<{ id: string }>("SELECT id FROM notifications WHERE id=?", id).length;
    await flushPendingWrites();
    return ok({ inserted: during, afterDelete: after });
  });
}
