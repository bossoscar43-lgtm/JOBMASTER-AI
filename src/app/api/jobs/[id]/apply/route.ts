import { handle, ok, fail, notFound, unauthorized, rateLimit } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { run, uid, now, audit, notify, one } from "@/lib/db";
import { getJob, getProfile, getPreferences } from "@/lib/repositories";
import { ensureApplicationDocuments } from "@/lib/applications/ensure-documents";
import { buildApplicationAttachments } from "@/lib/cv/application-attachments";
import { findRecruiterEmail, buildBodyWithContact } from "@/lib/jobs/recruiter-email";
import { sendMail } from "@/lib/mailer";
import { COST, consume, InsufficientCredits } from "@/lib/credits";
import type { Application, User } from "@/lib/types";

/** Postuler en un clic : crée la candidature, génère les documents,
 *  retrouve l'email du recruteur et envoie le tout. L'autorisation est
 *  réputée donnée par le clic explicite sur « Postuler ». */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!rateLimit("apply:" + user.id, 20, 3600000)) {
      return fail("Trop de candidatures envoyées. Réessayez plus tard.", "RATE_LIMIT", 429);
    }
    const { id } = await params;
    const job = getJob(id);
    if (!job) return notFound("Offre introuvable.");

    // Le CV est créé automatiquement depuis le profil si absent
    // (voir ensureApplicationDocuments).

    if (user.credits_balance !== -1 && user.credits_balance < COST.emailSend) {
      throw new InsufficientCredits();
    }

    // Crée ou récupère la candidature.
    let appRow = one<Record<string, unknown>>(
      "SELECT * FROM applications WHERE user_id=? AND job_id=?", user.id, id
    );
    if (!appRow) {
      const ts = now();
      run(
        "INSERT INTO applications (id,user_id,job_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?)",
        uid(), user.id, id, "to_validate", ts, ts
      );
      appRow = one<Record<string, unknown>>(
        "SELECT * FROM applications WHERE user_id=? AND job_id=?", user.id, id
      );
    }

    const app: Application = await ensureApplicationDocuments(
      {
        id: String(appRow!.id), user_id: user.id, job_id: id,
        resume_version_id: appRow!.resume_version_id ? String(appRow!.resume_version_id) : null,
        status: String(appRow!.status) as Application["status"],
        cover_letter: String(appRow!.cover_letter || ""), email_subject: String(appRow!.email_subject || ""),
        email_body: String(appRow!.email_body || ""), linkedin_message: String(appRow!.linkedin_message || ""),
        recruiter_answers: JSON.parse(String(appRow!.recruiter_answers || "{}")),
        send_mode: "email", sent_at: null, received_at: null, next_followup_at: null,
        followup_count: 0, notes: String(appRow!.notes || ""),
        created_at: String(appRow!.created_at), updated_at: String(appRow!.updated_at), job,
      },
      user as User
    );

    const recruiter = findRecruiterEmail(job as never);
    // Aucun email réel publié → ne pas inventer d'adresse. On prépare les
    // documents et on ouvre le vrai lien de l'annonce (candidature assistée).
    if (!recruiter.email) {
      const attachments = await buildApplicationAttachments(app, user as User);
      audit(user.id, "application.assisted_open", "application", app.id, { url: recruiter.applyUrl });
      return ok({
        status: "assisted",
        url: recruiter.applyUrl,
        message: "Aucune adresse email publiée dans cette annonce. Les documents sont prêts : postulez via le lien officiel.",
        attachments: attachments.map((a) => a.filename),
      });
    }

    const attachments = await buildApplicationAttachments(app, user as User);
    const profile = getProfile(user.id);
    // Privilégier la lettre de motivation personnalisée comme corps de l'email,
    // puis l'email généré, avec un fallback professionnel.
    const baseBody =
      app.cover_letter && app.cover_letter.length > 80
        ? app.cover_letter
        : app.email_body && app.email_body.length > 80
          ? app.email_body
          : `Madame, Monsieur,\n\nVeuillez trouver ma candidature pour le poste de ${job.title} chez ${job.company} en pièce jointe. Je reste à votre disposition pour un entretien.\n\nCordialement.`;
    const body = buildBodyWithContact(job as never, baseBody, {
      fullName: user.full_name, email: user.email, phone: profile.phone, city: profile.city, linkedin: profile.linkedin,
    });

    consume(user as User, COST.emailSend, "Candidature 1-clic", { jobId: id });
    const result = await sendMail({
      to: recruiter.email,
      subject: app.email_subject || `Candidature — ${job.title} — ${user.full_name}`,
      body,
      userId: user.id, applicationId: app.id, attachments,
    });
    if (result.status === "failed") return fail(result.message, "SEND_FAILED", 502);

    const ts = now();
    run("UPDATE applications SET status='sent', sent_at=?, next_followup_at=?, updated_at=? WHERE id=?",
      ts, new Date(Date.now() + 7 * 86400000).toISOString(), ts, app.id);
    notify(user.id, "success", "Candidature envoyée", `Votre candidature chez ${job.company} a été envoyée à ${recruiter.email}.`);
    audit(user.id, "application.one_click_apply", "application", app.id, { jobId: id, to: recruiter.email });

    return ok({ status: result.status, to: recruiter.email, attachments: attachments.map((a) => a.filename), applicationId: app.id });
  });
}
