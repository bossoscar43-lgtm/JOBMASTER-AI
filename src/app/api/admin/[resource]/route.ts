import { handle, ok, fail, forbidden, unauthorized } from "@/lib/http";
import { getCurrentUser, requireAdminUser, revokeAllSessions } from "@/lib/auth";
import { all, one, run, uid, now, jstring, jparse, audit } from "@/lib/db";
import { getAiSettings, setConfig, getConfig, DEFAULT_AI_SETTINGS } from "@/lib/settings";
import { getApiKey } from "@/lib/settings";
import { setUnlimited, grant } from "@/lib/credits";
import { connectorsStatus } from "@/lib/jobs/connectors";

type Ctx = { params: Promise<{ resource: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    if (!(await requireAdminUser())) return forbidden("Accès administrateur requis.");
    const { resource } = await params;

    if (resource === "stats") {
      const counts = (table: string) => one<{ c: number }>(`SELECT COUNT(*) AS c FROM ${table}`)?.c || 0;
      const planRows = all<Record<string, unknown>>("SELECT plan, COUNT(*) AS c FROM users GROUP BY plan");
      const aiConfig = getAiSettings();
      return ok({
        users: counts("users"), activeUsers: one<{ c: number }>("SELECT COUNT(*) AS c FROM users WHERE status='active'")?.c || 0,
        resumes: counts("resumes"), jobs: counts("jobs"), applications: counts("applications"),
        interviews: counts("coach_sessions"), emails: counts("emails"), searches: counts("searches"),
        creditsGranted: one<{ c: number }>("SELECT COALESCE(SUM(lifetime_credits),0) AS c FROM users")?.c || 0,
        planDistribution: planRows.map((p) => ({ label: String(p.plan), value: Number(p.c) })),
        aiCosts: { configured: Boolean(getApiKey()), provider: aiConfig.provider, model: aiConfig.model, spentUsd: aiConfig.spentUsd, budgetUsd: aiConfig.monthlyBudgetUsd },
      });
    }
    if (resource === "users") {
      const users = all<Record<string, unknown>>(
        `SELECT u.id,u.email,u.full_name,u.role,u.status,u.admin_verified,u.email_verified,u.plan,u.credits_balance,
         u.created_at,u.last_login_at,
         (SELECT COUNT(*) FROM resumes r WHERE r.user_id=u.id) AS resumes,
         (SELECT COUNT(*) FROM applications a WHERE a.user_id=u.id) AS applications
         FROM users u WHERE u.deleted_at IS NULL ORDER BY u.created_at DESC`
      );
      return ok(users);
    }
    if (resource === "logs") {
      return ok(all<Record<string, unknown>>(
        `SELECT a.*, u.email AS actor_email FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id
         ORDER BY a.created_at DESC LIMIT 300`
      ).map((r) => ({ ...r, metadata: jparse(String(r.metadata), {}) })));
    }
    if (resource === "ai") {
      const s = getAiSettings();
      return ok({ ...s, apiKeyConfigured: Boolean(getApiKey()), apiKeyHint: getApiKey() ? "••••" + getApiKey().slice(-4) : "" });
    }
    if (resource === "config") {
      return ok({
        connectors: connectorsStatus(),
        smtp: getConfig("smtp", {}),
        stripe: getConfig("stripe", {}),
        demoMode: process.env.DEMOMODE !== "false",
      });
    }
    if (resource === "plans") {
      return ok(all<Record<string, unknown>>("SELECT * FROM plans ORDER BY price_monthly").map((p) => ({ ...p, features: jparse(String(p.features), []) })));
    }
    if (resource === "credits") {
      return ok(all<Record<string, unknown>>(
        `SELECT l.*, u.email FROM credits_ledger l JOIN users u ON u.id=l.user_id ORDER BY l.created_at DESC LIMIT 200`
      ).map((r) => ({ ...r, metadata: jparse(String(r.metadata), {}) })));
    }
    return fail("Ressource inconnue.", "UNKNOWN_RESOURCE", 404);
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const admin = await requireAdminUser();
    if (!admin) return forbidden("Accès administrateur requis.");
    const { resource } = await params;
    const body = (await req.json()) as Record<string, unknown>;

    if (resource === "users") {
      const targetId = String(body.id || "");
      const target = one<Record<string, unknown>>("SELECT * FROM users WHERE id=?", targetId);
      if (!target) return fail("Utilisateur introuvable.", "NOT_FOUND", 404);
      const action = String(body.action || "");

      // Empêche la révocation du dernier administrateur vérifié.
      const adminCount = one<{ c: number }>("SELECT COUNT(*) AS c FROM users WHERE role='admin' AND admin_verified=1 AND status='active'")?.c || 0;
      const isSelf = targetId === admin.id;

      if (action === "suspend") {
        if (isSelf) return fail("Vous ne pouvez pas suspendre votre propre compte.", "SELF_ACTION", 400);
        run("UPDATE users SET status='suspended', updated_at=? WHERE id=?", now(), targetId);
        await revokeAllSessions(targetId);
      } else if (action === "activate") {
        run("UPDATE users SET status='active', updated_at=? WHERE id=?", now(), targetId);
      } else if (action === "role") {
        const role = body.role === "admin" ? "admin" : "user";
        if (role === "user" && target.role === "admin" && target.admin_verified === 1 && adminCount <= 1) {
          return fail("Impossible de rétrograder le dernier administrateur.", "LAST_ADMIN", 400);
        }
        // Promotion manuelle : nécessite une vérification hors-bande explicite.
        if (role === "admin" && !body.verified) {
          return fail("La promotion admin exige la confirmation d'une vérification d'identité hors-bande (verified:true).", "VERIFICATION_REQUIRED", 403);
        }
        run("UPDATE users SET role=?, admin_verified=?, updated_at=? WHERE id=?",
          role, role === "admin" ? 1 : 0, now(), targetId);
      } else if (action === "credits") {
        grant(targetId, Number(body.amount || 0), `Attribution manuelle ADMIN-${admin.id.slice(0, 8)}`, { reason: String(body.reason || "") });
      } else if (action === "unlimited") {
        setUnlimited(targetId, Boolean(body.value));
      } else if (action === "plan") {
        run("UPDATE users SET plan=?, updated_at=? WHERE id=?", String(body.plan || "free"), now(), targetId);
      } else if (action === "delete") {
        if (isSelf) return fail("Vous ne pouvez pas supprimer votre propre compte.", "SELF_ACTION", 400);
        run("UPDATE users SET deleted_at=?, status='suspended' WHERE id=?", now(), targetId);
        await revokeAllSessions(targetId);
      } else if (action === "reset_password") {
        // Génère un mot de passe temporaire et force le changement à la connexion.
        const bcrypt = (await import("bcryptjs")).default;
        const temp = "JM-TEMP-" + uid().slice(0, 12);
        run("UPDATE users SET password_hash=?, updated_at=? WHERE id=?", bcrypt.hashSync(temp, 12), now(), targetId);
        await revokeAllSessions(targetId);
        audit(admin.id, "admin.user.password_reset", "user", targetId);
        return ok({ temporaryPassword: temp, note: "Mot de passe temporaire — à transmettre hors-bande puis à changer." });
      } else {
        return fail("Action inconnue.", "BAD_ACTION", 400);
      }
      audit(admin.id, `admin.user.${action}`, "user", targetId, body);
      return ok({ updated: true });
    }

    if (resource === "ai") {
      const current = getAiSettings();
      const next = { ...current, ...(body as Partial<typeof current>) };
      next.prompts = { ...current.prompts, ...((body.prompts as Record<string, string>) || {}) };
      // Un champ vide ou masqué conserve la clé existante côté serveur.
      if (!body.apiKey || String(body.apiKey).includes("••••") || String(body.apiKey).startsWith("••••")) {
        next.apiKey = getConfig<{ apiKey?: string }>("ai_settings", {}).apiKey;
      }
      setConfig("ai_settings", next, admin.id);
      return ok({ ...next, apiKeyConfigured: Boolean(getApiKey()), apiKeyHint: getApiKey() ? "••••" + getApiKey().slice(-4) : "" });
    }

    if (resource === "config") {
      const section = String(body.section || "");
      if (!["smtp", "stripe", "connector_francetravail", "connector_wttj"].includes(section)) {
        return fail("Section inconnue.", "BAD_SECTION", 400);
      }
      const existing = getConfig<Record<string, unknown>>(section, {});
      const merged = { ...existing, ...((body.values || {}) as Record<string, unknown>) };
      setConfig(section, merged, admin.id);
      return ok({ section, values: merged, configured: true });
    }

    if (resource === "plans") {
      const id = String(body.id || "");
      if (!one("SELECT id FROM plans WHERE id=?", id)) return fail("Forfait introuvable.", "NOT_FOUND", 404);
      const fields = ["price_monthly", "price_yearly", "credits_per_month", "is_active"];
      for (const f of fields) {
        if (f in body) run(`UPDATE plans SET ${f}=? WHERE id=?`, Number(body[f]), id);
      }
      if ("features" in body) run("UPDATE plans SET features=? WHERE id=?", jstring(body.features), id);
      audit(admin.id, "admin.plan.updated", "plan", id, body);
      return ok({ updated: true });
    }

    if (resource === "credits") {
      const userId = String(body.userId || "");
      if (!one("SELECT id FROM users WHERE id=?", userId)) return fail("Utilisateur introuvable.", "NOT_FOUND", 404);
      grant(userId, Number(body.amount || 0), `Ajustement ADMIN-${admin.id.slice(0, 8)}`);
      audit(admin.id, "admin.credits.granted", "user", userId, body);
      return ok({ updated: true });
    }

    return fail("Ressource inconnue.", "UNKNOWN_RESOURCE", 404);
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const admin = await requireAdminUser();
    if (!admin) return forbidden("Accès administrateur requis.");
    const current = await getCurrentUser();
    void current;
    const { resource } = await params;
    if (resource === "logs") {
      run("DELETE FROM audit_logs WHERE created_at < ?", new Date(Date.now() - 90 * 86400000).toISOString());
      audit(admin.id, "admin.logs.purged", "logs");
      return ok({ purged: true });
    }
    return fail("Suppression non autorisée.", "BAD_RESOURCE", 404);
  });
}
