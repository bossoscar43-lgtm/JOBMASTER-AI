import { handle, ok, unauthorized } from "@/lib/http";
import { getCurrentUser, listUserSessions, revokeAllSessions } from "@/lib/auth";
import { run, audit } from "@/lib/db";
import { one } from "@/lib/db";

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    return ok({
      email: user.email,
      sessions: listUserSessions(user.id).map((s) => ({
        id: s.token_hash.slice(0, 12), created_at: s.created_at,
        last_seen_at: s.last_seen_at, ip: s.ip, user_agent: s.user_agent,
      })),
    });
  });
}

/** Droit à l'effacement (RGPD) : anonymise le compte et supprime les données associées. */
export async function DELETE() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const admins = one<{ c: number }>("SELECT COUNT(*) AS c FROM users WHERE role='admin' AND admin_verified=1 AND status='active'")?.c || 0;
    if (user.role === "admin" && admins <= 1) {
      return ok({ deleted: false, message: "Impossible de supprimer le dernier administrateur actif." });
    }
    await revokeAllSessions(user.id);
    run("DELETE FROM assistant_messages WHERE user_id=?", user.id);
    run("DELETE FROM coach_sessions WHERE user_id=?", user.id);
    run("DELETE FROM applications WHERE user_id=?", user.id);
    run("DELETE FROM emails WHERE user_id=?", user.id);
    run("DELETE FROM searches WHERE user_id=?", user.id);
    run("DELETE FROM resumes WHERE user_id=?", user.id);
    run("DELETE FROM credits_ledger WHERE user_id=?", user.id);
    run("DELETE FROM notifications WHERE user_id=?", user.id);
    run("DELETE FROM subscriptions WHERE user_id=?", user.id);
    run("DELETE FROM preferences WHERE user_id=?", user.id);
    run("DELETE FROM profiles WHERE user_id=?", user.id);
    run("UPDATE users SET email=?, full_name='Compte supprimé', password_hash=?, deleted_at=?, status='suspended' WHERE id=?",
      `deleted-${user.id.slice(0, 8)}@invalid.local`, "disabled", new Date().toISOString(), user.id);
    audit(null, "gdpr.account.deleted", "user", user.id);
    return ok({ deleted: true });
  });
}
