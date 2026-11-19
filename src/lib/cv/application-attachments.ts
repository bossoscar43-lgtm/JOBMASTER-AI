import { one } from "../db";
import { getProfile } from "../repositories";
import { renderPdf, renderDocx, type CvDocument } from "./render";
import { slugify } from "../utils";
import type { Application, User } from "../types";

export interface Attachment {
  filename: string;
  content: Buffer;
}

/** Construit le CV adapté (PDF + DOCX) et la lettre de motivation (PDF) pour
 *  une candidature, afin de les joindre à l'email d'envoi. */
export async function buildApplicationAttachments(
  app: Application,
  user: Pick<User, "id" | "email" | "full_name">
): Promise<Attachment[]> {
  const attachments: Attachment[] = [];
  const versionId = app.resume_version_id;
  if (!versionId) return attachments;

  const v = one<Record<string, unknown>>(
    `SELECT v.* FROM resume_versions v JOIN resumes r ON r.id=v.resume_id
     WHERE v.id=? AND r.user_id=?`, versionId, user.id
  );
  if (!v) return attachments;

  const profile = getProfile(user.id);
  const text = String(v.content_text || "");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const title = lines[0] || profile.headline || "Curriculum Vitae";

  const doc: CvDocument = {
    title,
    summary: profile.summary || "",
    skills: profile.skills || [],
    experienceLines: (profile.experiences || []).map(
      (e) => `${e.title}${e.company ? " — " + e.company : ""}${e.period ? " (" + e.period + ")" : ""}`
    ),
    educationLines: (profile.education || []).map(
      (e) => `${e.degree}${e.school ? " — " + e.school : ""}${e.year ? " (" + e.year + ")" : ""}`
    ),
    qualities: profile.qualities || [],
    languages: profile.languages || [],
    contact: [user.email, profile.city, profile.phone].filter(Boolean).join(" · "),
  };

  try {
    const base = slugify(title || "CV") || "CV";
    attachments.push({ filename: `CV_${base}.pdf`, content: await renderPdf(doc) });
    attachments.push({ filename: `CV_${base}.docx`, content: await renderDocx(doc) });
  } catch (e) {
    console.error("[Attachments] génération CV:", e instanceof Error ? e.message : e);
  }

  // Lettre de motivation en PDF.
  if (app.cover_letter) {
    try {
      const letter = app.cover_letter.split("\n").filter(Boolean);
      const letterDoc: CvDocument = {
        title: `Lettre de motivation — ${app.job?.company || ""}`,
        summary: letter.join(" "),
        skills: [], experienceLines: [], educationLines: [], qualities: [], languages: [],
        contact: [user.full_name, user.email, profile.phone, profile.city].filter(Boolean).join(" · "),
      };
      attachments.push({ filename: "Lettre_de_motivation.pdf", content: await renderPdf(letterDoc) });
    } catch (e) {
      console.error("[Attachments] génération lettre:", e instanceof Error ? e.message : e);
    }
  }

  return attachments;
}

/** Formate une taille en KB pour l'affichage. */
export function formatSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}
