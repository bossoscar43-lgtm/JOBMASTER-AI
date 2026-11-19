import type { Job } from "../types";
import { norm } from "../local-profile";

export interface RecruiterContact {
  email: string;
  source: "description" | "generated" | "careers";
  confidence: "high" | "medium" | "low";
  note: string;
}

/** Extrait l'email de contact d'un recruteur depuis une offre d'emploi.
 *  Stratégies (du plus fiable au moins fiable) :
 *  1. Email explicite dans la description (candidature@..., recrutement@...)
 *  2. Email généré à partir du nom de domaine de l'entreprise
 *  3. Adresse carrière générique. */
export function findRecruiterEmail(job: Job): RecruiterContact | null {
  const text = `${job.description || ""} ${job.title || ""}`;

  // 1) Emails explicites dans la description.
  const matches = text.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g) || [];
  const priority = /recrut|emploi|carri|candidat|rh|contact|hire|job|apply|talent/i;
  const filtered = matches.filter((m) => !/example\.com|noreply|no-reply|donotreply/i.test(m));
  const best = filtered.find((m) => priority.test(m)) || filtered[0];
  if (best) {
    return {
      email: best.toLowerCase(),
      source: "description",
      confidence: "high",
      note: "Email trouvé dans le texte de l'annonce.",
    };
  }

  // 2) Domaine de l'entreprise déduit de l'URL de l'offre.
  let domain: string | null = null;
  try {
    const host = new URL(job.url).hostname.replace(/^www\./, "");
    if (!/^(example|localhost|\d+\.\d+\.\d+\.\d+)/.test(host)) domain = host;
  } catch {
    // URL invalide → pas de domaine.
  }

  if (domain) {
    // Emails génériques courants chez les recruteurs.
    const cleanDomain = domain.split(".").slice(0, -1).join(".").replace(/[^a-z0-9-]/gi, "");
    if (cleanDomain && cleanDomain.length > 2) {
      return {
        email: `recrutement@${domain}`,
        source: "careers",
        confidence: "medium",
        note: `Adresse probable déduite du site de l'entreprise (${domain}). À vérifier.`,
      };
    }
  }

  // 3) Offres de démonstration → adresse d'exemple réaliste pour tester.
  if (job.is_demo === 1 || job.source === "demo") {
    const company = norm(job.company || "entreprise").replace(/[^a-z0-9]+/g, "").slice(0, 20) || "entreprise";
    return {
      email: `recrutement@${company}.fr`,
      source: "generated",
      confidence: "low",
      note: "Adresse de démonstration générée pour tester l'envoi.",
    };
  }

  return null;
}

/** Construit l'objet d'email professionnel avec le nom du candidat. */
export function buildSubject(job: Job, fullName: string): string {
  return `Candidature — ${job.title} — ${fullName}`;
}

/** Construit le corps de l'email avec les coordonnées complètes du candidat. */
export function buildBodyWithContact(
  job: Job,
  body: string,
  contact: { fullName: string; email: string; phone?: string; city?: string; linkedin?: string }
): string {
  const coords = [
    contact.fullName,
    contact.email,
    contact.phone || "",
    contact.city || "",
    contact.linkedin || "",
  ].filter(Boolean).join(" | ");

  return `${body || `Madame, Monsieur,\n\nJe vous adresse ma candidature pour le poste de ${job.title} chez ${job.company}.\n\nVeuillez trouver mon CV et ma lettre de motivation en pièces jointes.\n\nJe reste à votre disposition pour un entretien.\n`}\n\n---\n${coords}`;
}
