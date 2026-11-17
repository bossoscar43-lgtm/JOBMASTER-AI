import { z } from "zod";
import { handle, ok, fail, validationError } from "@/lib/http";
import { run, now, audit } from "@/lib/db";
import { consumePasswordReset, hashPassword, revokeAllSessions } from "@/lib/auth";

const schema = z.object({ token: z.string().min(10), password: z.string().min(12).max(128) });

export async function POST(req: Request) {
  return handle(async () => {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);
    const userId = consumePasswordReset(parsed.data.token);
    if (!userId) return fail("Lien invalide ou expiré. Demandez-en un nouveau.", "INVALID_TOKEN", 400);
    run("UPDATE users SET password_hash=?, updated_at=? WHERE id=?", hashPassword(parsed.data.password), now(), userId);
    await revokeAllSessions(userId);
    audit(userId, "auth.password_reset.completed", "user", userId);
    return ok({ reset: true });
  });
}
