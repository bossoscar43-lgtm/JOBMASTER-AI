import type { CandidateProfile, CoachQuestion, Job } from "./types";
import type { LocalMatch } from "./local-match";

export interface LocalMaterials {
  coverLetter: string;
  emailSubject: string;
  emailBody: string;
  linkedinMessage: string;
  recruiterAnswers: Record<string, string>;
}

export function localMaterials(profile: CandidateProfile, job: Job, match: LocalMatch, name = ""): LocalMaterials {
  const prenom = (name || profile.headline || "Candidat").split(" ")[0];
  const matched = match.matched_skills.slice(0, 4);
  const skillsPhrase = matched.length
    ? `Mon parcours m'a permis de développer des compétences en ${matched.join(", ")}, que je souhaite aujourd'hui mettre au service de ${job.company}.`
    : `Je suis motivé(e) à l'idée de contribuer aux missions de ${job.company} et de monter en compétences sur ce poste.`;
  const years = profile.experience_years ? `${profile.experience_years} an(s) d'expérience` : "un parcours en cours de construction";

  const coverLetter = `Madame, Monsieur,\n\nC'est avec un réel intérêt que je vous adresse ma candidature pour le poste de ${job.title} au sein de ${job.company}. ${skillsPhrase}\n\n${profile.experience_years ? `Fort(e) de ${years}` : `Issu(e) d${"'un parcours en formation continue"}`}, je suis attentif(ve) aux enjeux de votre équipe et je souhaite apporter une contribution concrète dès mon arrivée. Ma motivation et ma capacité d'adaptation me convainquent que ce poste correspond à mon projet professionnel.\n\nJe reste bien entendu disponible pour échanger sur ma candidature et vous remercie de l'attention que vous lui porterez.\n\nJe vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\n${name || profile.headline || "[Votre nom]"}`;

  const emailSubject = `Candidature — ${job.title} — ${name || "[Votre nom]"}`;
  const emailBody = `Madame, Monsieur,\n\nVeuillez trouver ci-joint mon CV et ma lettre de motivation pour le poste de ${job.title} chez ${job.company}.\n\n${skillsPhrase}\n\nJe me tiens à votre disposition pour un entretien et vous remercie pour votre temps.\n\nCordialement,\n${name || "[Votre nom]"}\n${profile.phone || ""}\n${profile.headline || ""}`;

  const linkedinMessage = `Bonjour, je me permets de vous contacter car j'ai vu l'ouverture du poste ${job.title} chez ${job.company}. Mon profil ${years ? `(${years})` : ""} correspond à plusieurs attentes de l'annonce. Seriez-vous disponible pour un court échange ? Merci d'avance.`;

  const recruiterAnswers: Record<string, string> = {
    motivation: `Le poste de ${job.title} chez ${job.company} correspond à mon projet professionnel car ${matched.length ? `il valorise mes compétences en ${matched.join(", ")}` : "il me permet de monter en compétences dans un environnement structuré"}.`,
    disponibilite: profile.availability || "Je suis disponible immédiatement.",
    pretentions: job.salary ? `Je m'aligne sur la rémunération annoncée (${job.salary}), en fonction des avantages et du périmètre du poste.` : "Je suis ouvert(e) à une discussion sur la rémunération en fonction du périmètre réel du poste.",
  };

  return { coverLetter, emailSubject, emailBody, linkedinMessage, recruiterAnswers };
}

const QUESTION_BANK: Array<[string, string]> = [
  ["Presentation", "Pouvez-vous vous présenter en deux minutes ?"],
  ["Motivation", `Pourquoi souhaitez-vous rejoindre ${"{{company}}"} sur ce poste ?`],
  ["Competence", `Parmi vos compétences, lesquelles sont les plus utiles pour ${"{{role}}"} ?`],
  ["Comportemental", "Racontez une situation difficile que vous avez résolue en équipe."],
  ["Comportemental", "Décrivez un projet dont vous êtes particulièrement fier(e)."],
  ["Trap", "Quel est votre principal défaut et comment travaillez-vous dessus ?"],
  ["Technique", `Comment aborderiez-vous une mission type de ${"{{role}}"} chez ${"{{company}}"} ?`],
  ["Projection", "Où vous voyez-vous dans trois ans ?"],
];

export function localCoachQuestions(role: string, company: string, limit = 7): CoachQuestion[] {
  return QUESTION_BANK.slice(0, limit).map((q, i) => ({
    id: `q${i + 1}`,
    category: q[0],
    question: q[1].replaceAll("{{company}}", company || "notre entreprise").replaceAll("{{role}}", role || "ce poste"),
  }));
}

export interface LocalEvaluation {
  score: number;
  feedback: string;
  better_answer: string;
}

export function localEvaluate(question: string, answer: string, role: string): LocalEvaluation {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const len = words.length;
  let score = 30;
  if (len >= 30) score += 15;
  if (len >= 70) score += 15;
  if (len >= 120) score += 10;
  if (/\b(j'ai|j'ai pu|nous avons|résultat|objectif|action|situation)\b/i.test(answer)) score += 12;
  if (/\b(équipe|client|projet|résultat|appris)\b/i.test(answer)) score += 10;
  if (/[\d%€]/.test(answer)) score += 8;
  if (normHas(answer, role)) score += 5;
  if (len < 15) score -= 15;

  score = Math.max(20, Math.min(95, score));
  const feedback = len < 30
    ? "Réponse trop courte. Développez avec une situation concrète, vos actions et un résultat chiffré."
    : !/\b(résultat|impact|appris)\b/i.test(answer)
      ? "Structurez votre réponse avec la méthode STAR : Situation, Tâche, Action, Résultat."
      : "Bonne structure. Ajoutez un chiffre ou un résultat concret pour renforcer la crédibilité.";

  const better_answer = `Pour ${role || "ce poste"}, je citerais une situation concrète : [contexte en une phrase]. J'ai pris en charge [action précise] avec l'équipe, ce qui a permis d'obtenir [résultat chiffré]. Cette expérience m'a appris [compétence transférable], que je mobiliserais dès mon arrivée.`;
  return { score, feedback, better_answer };
}

function normHas(text: string, needle: string): boolean {
  const n = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return needle.length > 3 && n(text).includes(n(needle));
}

export interface ChatResult {
  reply: string;
  actions: Array<{ label: string; href: string }>;
}

export function localChat(message: string, context: { name?: string; jobsCount?: number; applicationsCount?: number; hasCv?: boolean }): ChatResult {
  const m = message.toLowerCase();
  if (/stage|alternance|job étudiant|recherche|offre|trouve|trouver/.test(m)) {
    return {
      reply: `${context.name ? context.name + ", " : ""}je peux lancer une recherche d'offres adaptée à votre profil${context.hasCv ? " et à votre CV" : " (importez d'abord votre CV pour un matching personnalisé)"}. Rendez-vous dans « Recherche automatique » pour définir vos préférences une seule fois, puis je m'occupe du reste.${context.jobsCount ? ` ${context.jobsCount} offre(s) sont déjà disponibles dans votre espace.` : ""}`,
      actions: [{ label: "Lancer la recherche", href: "/search" }, { label: "Voir les offres", href: "/jobs" }],
    };
  }
  if (/cv|adapt/.test(m)) {
    return {
      reply: context.hasCv
        ? "Je peux adapter votre CV à chaque offre : je réorganise les compétences réellement présentes et j'optimise la mise en forme pour les logiciels ATS, sans inventer d'expérience. Ouvrez une offre puis « Générer les documents »."
        : "Importez d'abord votre CV (PDF, DOCX ou TXT) : je l'analyserai et pourrai ensuite le décliner pour chaque offre.",
      actions: [{ label: context.hasCv ? "Voir mes CV" : "Importer mon CV", href: "/resumes" }],
    };
  }
  if (/lettre|motivation|email/.test(m)) {
    return {
      reply: "Je rédige une lettre de motivation et un email professionnels personnalisés pour chaque entreprise. Vous pouvez modifier tous les textes avant tout envoi.",
      actions: [{ label: "Voir les candidatures", href: "/applications" }],
    };
  }
  if (/entretien|coach|prépar/.test(m)) {
    return {
      reply: "Mon Coach Entretien IA simule un recruteur, pose des questions adaptées à l'offre, note vos réponses sur 100 et vous propose une meilleure formulation. Un rapport détaillé est généré à la fin.",
      actions: [{ label: "Ouvrir le Coach", href: "/coach" }],
    };
  }
  if (/crédit|abonnement|tarif|premium|paiement/.test(m)) {
    return {
      reply: "Vous pouvez consulter votre solde et vos forfaits dans la page Abonnements. Les crédits d'administrateur sont illimités côté serveur ; les coûts réels des fournisseurs IA restent suivis séparément.",
      actions: [{ label: "Voir les abonnements", href: "/billing" }],
    };
  }
  return {
    reply: `Je suis JOBMASTER AI. Je peux rechercher des offres, adapter votre CV, rédiger vos lettres, préparer vos entretiens et suivre vos candidatures.${context.applicationsCount ? ` Vous avez actuellement ${context.applicationsCount} candidature(s) en cours.` : ""} Que souhaitez-vous faire ?`,
    actions: [{ label: "Tableau de bord", href: "/dashboard" }, { label: "Recherche automatique", href: "/search" }],
  };
}
