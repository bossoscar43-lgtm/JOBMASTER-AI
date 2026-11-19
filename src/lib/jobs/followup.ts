import { all, run, uid, now, audit, notify, one } from "../db";
import { getApplication, getProfile } from "../repositories";
import { sendMail } from "../mailer";
import type { Application, User } from "../types";

/** Génère un email de relance professionnel et concis pour une candidature. */
export function buildFollowupEmail(
  app: Application,
  user: Pick<User, "full_name" | "email">,
  profile: { phone?: string; city?: string }
): { subject: string; body: string } {
  const company = app.job?.company || "votre entreprise";
  const title = app.job?.title || "le poste";
  const subject = `Relance — Candidature ${title} — ${user.full_name}`;
  const body = [
    "Madame, Monsieur,",
    "",
    `Je me permets de relancer ma candidature pour le poste de ${title} chez ${company}, envoyée le ${app.sent_at ? new Date(app.sent_at).toLocaleDateString("fr-FR") : "récemment"}.`,
    "",
    "Toujours très intéressé(e) par cette opportunité, je reste bien entendu disponible pour échanger et vous transmettre toute information complémentaire.",
    "",
    "Je vous remercie pour votre temps et vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
    "",
    [user.full_name, user.email, profile.phone || "", profile.city || ""].filter(Boolean).join(" | "),
  ].join("\n");
  return { subject, body };
}

/** Traite les relances dues : envoie l'email et reprogramme la suivante. */
export async function processDueFollowups(): Promise<{ sent: number; skipped: number; errors: number }> {
  const due = all<Record<string, unknown>>(
    `SELECT id, user_id FROM applications
     WHERE next_followup_at IS NOT NULL AND next_followup_at <= ?
     AND status IN ('sent','received') AND followup_count < 3`,
    now()
  );
  let sent = 0, skipped = 0, errors = 0;

  for (const row of due) {
    const app = getApplication(String(row.id), String(row.user_id));
    if (!app) { skipped++; continue; }
    const user = one<User>("SELECT * FROM users WHERE id=? AND status='active'", String(row.user_id));
    if (!user) { skipped++; continue; }

    // N'envoyer qu'à une adresse recruteur déjà connue (historique emails).
    const lastEmail = one<{ to_addr: string }>(
      "SELECT to_addr FROM emails WHERE application_id=? ORDER BY created_at DESC LIMIT 1", app.id
    );
    if (!lastEmail?.to_addr) { skipped++; continue; }

    const profile = getProfile(user.id);
    const { subject, body } = buildFollowupEmail(app, user, profile);
    try {
      const result = await sendMail({ to: lastEmail.to_addr, subject, body, userId: user.id, applicationId: app.id });
      if (result.status === "failed") { errors++; continue; }
      const count = (app.followup_count || 0) + 1;
      const next = count < 3 ? new Date(Date.now() + 7 * 86400000).toISOString() : null;
      run("UPDATE applications SET followup_count=?, next_followup_at=?, updated_at=? WHERE id=?", count, next, now(), app.id);
      run("INSERT INTO application_events (id,application_id,from_status,to_status,note,created_at) VALUES (?,?,?,?,?,?)",
        uid(), app.id, app.status, app.status, `Relance ${count} envoyée`, now());
      notify(user.id, "info", "Relance envoyée", `Relance ${count} envoyée à ${lastEmail.to_addr}.`);
      audit(user.id, "application.followup_sent", "application", app.id, { count, to: lastEmail.to_addr });
      sent++;
    } catch (e) {
      errors++;
      console.error("[Followup]", e instanceof Error ? e.message : e);
    }
  }
  return { sent, skipped, errors };
}
