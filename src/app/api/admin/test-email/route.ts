import { handle, ok, fail, forbidden } from "@/lib/http";
import { requireAdminUser } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";

/** Envoie un email de test pour valider la configuration SMTP/Resend. */
export async function POST(req: Request) {
  return handle(async () => {
    const admin = await requireAdminUser();
    if (!admin) return forbidden("Accès administrateur requis.");
    const body = (await req.json()) as { to?: string };
    const to = (body.to || "").trim();
    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return fail("Adresse email de test invalide.", "BAD_EMAIL", 400);
    }
    const result = await sendMail({
      to,
      subject: "Test de configuration — JOBMASTER AI",
      body: "Bonjour,\n\nCet email de test confirme que la configuration SMTP de JOBMASTER AI fonctionne.\n\nSi vous recevez ce message, l'envoi des candidatures est opérationnel.\n\nJOBMASTER AI",
      userId: admin.id,
    });
    return ok(result);
  });
}
