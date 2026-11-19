import type { Job } from "../types";

export interface RecruiterContact {
  email: string | null;
  source: "description" | "none";
  confidence: "high" | "none";
  note: string;
  /** Vrai lien de l'annonce pour postuler via le formulaire officiel. */
  applyUrl: string;
}

/** Extrait UNIQUEMENT un email réellement publié dans l'annonce.
 *  Ne jamais inventer d'adresse (ex: recrutement@himalayas.app n'existe pas).
 *  Si aucun email n'est publié, on retourne null + le vrai lien de l'annonce. */
export function findRecruiterEmail(job: Job): RecruiterContact {
  const text = `${job.description || ""} ${job.title || ""}`;
  const applyUrl = String(job.url || "");

  // 1) Emails explicites dans la description de l'annonce.
  const matches = text.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g) || [];
  const invalid = /example\.com|noreply|no-reply|donotreply|@screeningpass|@himalayas|@arbeitnow|@remotive|@jobicy|@remoteok|@workingnomads/i;
  const filtered = matches.filter((m) => !invalid.test(m));
  const priority = /recrut|emploi|carri|candidat|rh|contact|hire|job|apply|talent/i;
  const best = filtered.find((m) => priority.test(m)) || filtered[0];

  if (best) {
    return {
      email: best.toLowerCase(),
      source: "description",
      confidence: "high",
      note: "Adresse email publiée dans l'annonce.",
      applyUrl,
    };
  }

  // 2) Aucun email publié → on ne devine pas. Le candidat postule via le vrai lien.
  return {
    email: null,
    source: "none",
    confidence: "none",
    note: "Aucune adresse email publiée dans l'annonce. Postulez via le lien officiel.",
    applyUrl,
  };
}

/** Construit le corps de l'email avec la lettre et la signature du candidat. */
export function buildBodyWithContact(
  job: Job,
  body: string,
  contact: { fullName: string; email: string; phone?: string; city?: string; linkedin?: string }
): string {
  let letter = body || `Madame, Monsieur,\n\nJe vous adresse ma candidature pour le poste de ${job.title} chez ${job.company}.\n\nVeuillez trouver mon CV et ma lettre de motivation en pièces jointes.\n\nJe reste à votre disposition pour un entretien.`;
  const letterLines = letter.split("\n").map((l) => l.trim()).filter(Boolean);
  if (letterLines.length && letterLines[letterLines.length - 1] === contact.fullName) {
    letterLines.pop();
    letter = letterLines.join("\n");
  }
  const signature = [
    "Cordialement,",
    contact.fullName,
    contact.phone ? `Tél. : ${contact.phone}` : "",
    contact.city ? `Ville : ${contact.city}` : "",
    contact.linkedin ? `LinkedIn : ${contact.linkedin}` : "",
    `Email : ${contact.email}`,
  ].filter(Boolean).join("\n");
  return `${letter}\n\n${signature}`;
}
