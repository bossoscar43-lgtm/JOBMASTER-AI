import { z } from "zod";
import { handle, ok, rateLimit, validationError } from "@/lib/http";
import { one, audit } from "@/lib/db";
import { createPasswordReset, clientIp } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

export async function POST(req: Request) {
  return handle(async () => {
    if (!rateLimit("forgot:" + (await clientIp()), 6, 3600000)) {
      return ok({ sent: true, message: "Si cet email existe, un lien a été envoyé." });
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);
    const { email } = parsed.data;
    const user = one<{ id: string }>("SELECT id FROM users WHERE email=? AND deleted_at IS NULL", email);

    // Réponse identique dans tous les cas : pas d'énumération de comptes.
    if (!user) return ok({ sent: true, message: "Si cet email existe, un lien a été envoyé." });

    const token = createPasswordReset(user.id);
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const link = `${base}/reset-password?token=${token}`;
    await sendMail({
      to: email,
      subject: "Réinitialisation de votre mot de passe — JOBMASTER AI",
      body: `Bonjour,\n\nPour réinitialiser votre mot de passe, cliquez sur ce lien (valable 1 heure) :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\nJOBMASTER AI`,
      userId: user.id,
    });
    audit(user.id, "auth.password_reset.requested", "user", user.id, {}, await clientIp());

    const demo = process.env.NODE_ENV !== "production" ? { demoToken: token, demoLink: link } : {};
    return ok({ sent: true, message: "Si cet email existe, un lien a été envoyé." }, demo);
  });
}
