import nodemailer from "nodemailer";
import { getConfig } from "./settings";
import { run, uid, now, notify } from "./db";

export interface SendMailInput {
  to: string;
  subject: string;
  body: string;
  userId: string;
  applicationId?: string | null;
  attachments?: { filename: string; content: Buffer }[];
}

export interface SendMailResult {
  status: "sent" | "demo" | "failed";
  message: string;
}

/** Envoi via Resend API (gratuit 100/jour). Utilise le domaine de test
 *  onboarding@resend.dev si RESEND_FROM n'est pas défini. */
async function sendViaResend(
  input: SendMailInput,
  apiKey: string,
  from: string
): Promise<SendMailResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject || "Candidature JOBMASTER AI",
      text: input.body || "Veuillez trouver ma candidature en pièce jointe.",
      html: `<p>${(input.body || "Veuillez trouver ma candidature en pièce jointe.").replace(/\n/g, "<br>")}</p>`,
      ...(input.attachments?.length
        ? {
            attachments: input.attachments.map((a) => ({
              filename: a.filename,
              content: a.content.toString("base64"),
            })),
          }
        : {}),
    }),
  });
  const json = (await res.json()) as { id?: string; message?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message || json.message || `Resend ${res.status}`);
  }
  return { status: "sent", message: `Email envoyé via Resend (id ${json.id}).` };
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const cfg = getConfig<{
    host?: string; port?: number; user?: string; pass?: string; from?: string;
  }>("smtp", {});
  const host = cfg.host || process.env.SMTP_HOST;
  const user = cfg.user || process.env.SMTP_USER;
  const pass = cfg.pass || process.env.SMTP_PASS;
  const from = cfg.from || process.env.SMTP_FROM || "JOBMASTER AI <no-reply@jobmaster.ai>";
  const port = Number(cfg.port || process.env.SMTP_PORT || 587);

  const record = (status: string, provider: string) => {
    run(
      "INSERT INTO emails (id,user_id,application_id,to_addr,subject,body,status,provider,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
      uid(), input.userId, input.applicationId || null, input.to, input.subject, input.body, status, provider, now()
    );
  };

  // Resend en priorité si configuré (envoi réel sans SMTP).
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resendFrom = process.env.RESEND_FROM || "JOBMASTER AI <onboarding@resend.dev>";
    try {
      const result = await sendViaResend(input, resendKey, resendFrom);
      record("sent", "resend");
      notify(input.userId, "success", "Candidature envoyée", `Votre email à ${input.to} a été envoyé via Resend.`);
      return result;
    } catch (e) {
      record("failed", "resend");
      console.error("[Resend]", e instanceof Error ? e.message : e);
      return {
        status: "failed",
        message: `Échec Resend : ${e instanceof Error ? e.message : "erreur inconnue"}`,
      };
    }
  }

  if (!host || !user || !pass) {
    record("demo", "internal-log");
    notify(input.userId, "info", "Email enregistré en mode démonstration", "Aucun SMTP n'est configuré : l'email n'a pas été réellement envoyé. Consultez la configuration administrateur.");
    return {
      status: "demo",
      message: "Mode démonstration : email journalisé, non envoyé. Configurez le SMTP dans le panneau administrateur.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host, port, secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: true },
    });
    await transporter.sendMail({
      from, to: input.to, subject: input.subject, text: input.body,
      attachments: input.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
    });
    record("sent", "smtp");
    notify(input.userId, "success", "Candidature envoyée", `Votre email à ${input.to} a été envoyé.`);
    return { status: "sent", message: "Email envoyé avec succès." };
  } catch (e) {
    record("failed", "smtp");
    console.error("[Mail]", e instanceof Error ? e.message : e);
    return { status: "failed", message: "L'envoi a échoué. Vérifiez la configuration SMTP." };
  }
}
