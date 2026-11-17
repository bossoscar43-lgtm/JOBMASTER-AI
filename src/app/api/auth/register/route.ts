import { z } from "zod";
import { handle, ok, fail, rateLimit, validationError } from "@/lib/http";
import { one, run, uid, now, jstring, transaction, audit, waitForHydration } from "@/lib/db";
import { hashPassword, createSession, checkAdminBootstrap, logAuth, clientIp } from "@/lib/auth";

const schema = z.object({
  full_name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12).max(128),
  adminSecret: z.string().optional().default(""),
});

export async function POST(req: Request) {
  return handle(async () => {
    if (!rateLimit("register:" + (await clientIp()), 8, 3600000)) {
      return fail("Trop de tentatives. Réessayez plus tard.", "RATE_LIMIT", 429);
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);
    const { full_name, email, password, adminSecret } = parsed.data;

    await waitForHydration();
    if (one("SELECT id FROM users WHERE email=?", email)) {
      return fail("Un compte existe déjà avec cet email.", "EMAIL_TAKEN", 409);
    }

    // Attribution admin : secret serveur + email autorisé + vérification hors-bande.
    let role: "user" | "admin" = "user";
    let adminVerified = 0;
    if (adminSecret) {
      if (!checkAdminBootstrap(email, adminSecret)) {
        return fail("Secret d'administration invalide ou email non autorisé.", "INVALID_ADMIN_SECRET", 403);
      }
      role = "admin";
      adminVerified = 1;
    }

    const id = uid();
    const ts = now();
    transaction(() => {
      run(
        `INSERT INTO users (id,email,password_hash,full_name,role,admin_verified,locale,theme,plan,credits_balance,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        id, email, hashPassword(password), full_name, role, adminVerified, "fr", "system", "free", 30, ts, ts
      );
      run("INSERT INTO profiles (user_id,updated_at) VALUES (?,?)", id, ts);
      run("INSERT INTO preferences (user_id,updated_at) VALUES (?,?)", id, ts);
      run(
        "INSERT INTO credits_ledger (id,user_id,delta,reason,balance_after,created_at) VALUES (?,?,?,?,?,?)",
        uid(), id, 30, "Crédits de bienvenue", 30, ts
      );
      audit(id, role === "admin" ? "auth.admin_bootstrap" : "auth.register", "user", id, { email, role }, "");
    });

    await createSession(id);
    logAuth(id, "auth.session.created", { email });
    return ok({ id, email, full_name, role, credits_balance: 30 });
  });
}
