import { z } from "zod";
import { handle, ok, fail, rateLimit, validationError } from "@/lib/http";
import { one, run, now, audit, waitForHydration } from "@/lib/db";
import { startAutoRefresh } from "@/lib/jobs/auto-refresh";
import { verifyPassword, createSession, clientIp, toPublicUser } from "@/lib/auth";
import type { User } from "@/lib/types";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  return handle(async () => {
    const ip = await clientIp();
    if (!rateLimit("login:" + ip, 12, 900000)) {
      return fail("Trop de tentatives de connexion. Réessayez dans 15 minutes.", "RATE_LIMIT", 429);
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);
    const { email, password } = parsed.data;

    await waitForHydration();
    startAutoRefresh();
    const user = one<User>("SELECT * FROM users WHERE email=? AND deleted_at IS NULL", email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      audit(null, "auth.login.failed", "user", email, { ip });
      return fail("Email ou mot de passe incorrect.", "INVALID_CREDENTIALS", 401);
    }
    if (user.status !== "active") {
      return fail("Ce compte est suspendu. Contactez l'administrateur.", "ACCOUNT_SUSPENDED", 403);
    }

    run("UPDATE users SET last_login_at=?, updated_at=? WHERE id=?", now(), now(), user.id);
    audit(user.id, "auth.login.success", "user", user.id, { ip });
    await createSession(user.id);
    return ok(toPublicUser(user));
  });
}
