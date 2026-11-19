import { z } from "zod";
import { handle, ok, fail, notFound, unauthorized, validationError } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { run, now, audit, uid } from "@/lib/db";
import { getApplication } from "@/lib/repositories";
import { sendMail } from "@/lib/mailer";
import { COST, consume, InsufficientCredits } from "@/lib/credits";
import { buildApplicationAttachments } from "@/lib/cv/application-attachments";
import { ensureApplicationDocuments } from "@/lib/applications/ensure-documents";

const schema = z.object({
  authorized: z.literal(true),
  to: z.string().trim().email(),
  mode: z.enum(["email", "assisted"]).default("email"),
});

/**
 * Envoi d'une candidature. L'autorisation explicite de l'utilisateur est
 * obligatoire. Aucun contournement de CAPTCHA / anti-robot n'est effectué :
 * le mode « assisted » ouvre simplement l'annonce pour un remplissage manuel.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const app = getApplication(id, user.id);
    if (!app) return notFound("Candidature introuvable.");

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Vous devez autoriser explicitement l'envoi et fournir une adresse email valide.", "AUTHORIZATION_REQUIRED", 403);
    }
    const { to, mode } = parsed.data;

    if (mode === "assisted") {
      audit(user.id, "application.assisted_open", "application", id, { to, url: app.job?.url });
      return ok({ status: "assisted", url: app.job?.url, message: "Ouvrez l'annonce et remplissez le formulaire avec les documents générés. Votre validation reste nécessaire." });
    }

    if (user.credits_balance !== -1 && user.credits_balance < COST.emailSend) throw new InsufficientCredits();
    consume(user, COST.emailSend, "Envoi de candidature", { applicationId: id });

    // Génère automatiquement les documents si l'utilisateur n'est pas passé
    // par l'étape « Générer les documents » au préalable.
    const complete = await ensureApplicationDocuments(app, user);
    const attachments = await buildApplicationAttachments(complete, user);
    const result = await sendMail({
      to,
      subject: complete.email_subject || `Candidature — ${complete.job?.title}`,
      body: complete.email_body || complete.cover_letter ||
        `Bonjour,\n\nVeuillez trouver ma candidature pour le poste de ${complete.job?.title} chez ${complete.job?.company} en pièce jointe.\n\nCordialement.`,
      userId: user.id, applicationId: id,
      attachments,
    });
    if (result.status === "failed") return fail(result.message, "SEND_FAILED", 502);

    const ts = now();
    run(
      "UPDATE applications SET status='sent', send_mode='email', sent_at=?, next_followup_at=?, updated_at=? WHERE id=?",
      ts, new Date(Date.now() + 7 * 86400000).toISOString(), ts, id
    );
    run(
      "INSERT INTO application_events (id,application_id,from_status,to_status,note,created_at) VALUES (?,?,?,?,?,?)",
      uid(), id, app.status, "sent", result.message, ts
    );
    audit(user.id, "application.sent", "application", id, { to, provider: result.status });
    return ok({
      status: result.status,
      message: result.message,
      followupScheduled: true,
      attachments: attachments.map((a) => a.filename),
    }, { creditsUsed: COST.emailSend });
  });
}
