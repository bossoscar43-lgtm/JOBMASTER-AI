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
