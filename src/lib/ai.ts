import { aiJson, compact, type AiResponse } from "./ai-core";
import { localAnalyzeProfile } from "./local-profile";
import { localAdaptCv, localScoreJob, type LocalAdaptation, type LocalMatch } from "./local-match";
import { localChat, localCoachQuestions, localEvaluate, localMaterials, type ChatResult, type LocalEvaluation, type LocalMaterials } from "./local-content";
import type { CandidateProfile, CoachQuestion, Job } from "./types";

export async function analyzeCv(text: string): Promise<AiResponse<CandidateProfile>> {
  return aiJson<CandidateProfile>({
    task: "cvAnalysis",
    prompt: `Analyse ce CV et renvoie un JSON avec les clés : headline, summary, city, phone, email, experience_years (nombre), desired_roles (tableau), domains (tableau), skills (tableau), languages (tableau), education (tableau d'objets degree/school/year), experiences (tableau d'objets title/company/period/description), qualities (tableau). N'invente aucune information.\n\nCV:\n${compact(text, 12000)}`,
    local: () => localAnalyzeProfile(text),
  });
}

export async function scoreJob(
  profile: CandidateProfile,
  job: Job,
  prefs?: { cities?: string[]; remote?: string }
): Promise<AiResponse<LocalMatch>> {
  return aiJson<LocalMatch>({
    task: "jobMatching",
    prompt: `Profil: ${compact(profile)}\nOffre: ${compact(job)}\nRenvoie {score: nombre 0-100, matched_skills: [], missing_skills: [], reasons: []}. Sois factuel.`,
    local: () => localScoreJob(profile, job, prefs),
    maxTokens: 700,
  });
}

export async function adaptCv(
  profile: CandidateProfile,
  job: Job,
  match: LocalMatch
): Promise<AiResponse<LocalAdaptation>> {
  return aiJson<LocalAdaptation>({
    task: "cvAdaptation",
    prompt: `Profil: ${compact(profile)}\nOffre: ${compact(job)}\nMatching: ${compact(match)}\nRenvoie {title, summary, skills: [], experienceLines: [], educationLines: [], tips: [], contentText, contentHtml}. Réorganise sans inventer.`,
    local: () => localAdaptCv(profile, job, match),
    maxTokens: 2200,
  });
}

export async function generateMaterials(
  profile: CandidateProfile,
  job: Job,
  match: LocalMatch,
  name: string
): Promise<AiResponse<LocalMaterials>> {
  return aiJson<LocalMaterials>({
    task: "coverLetter",
    prompt: `Profil: ${compact(profile)}\nOffre: ${compact(job)}\nPoints forts: ${compact(match.matched_skills)}\nNom: ${name}\nRenvoie {coverLetter, emailSubject, emailBody, linkedinMessage, recruiterAnswers: objet}.`,
    local: () => localMaterials(profile, job, match, name),
    maxTokens: 2200,
  });
}

export async function coachQuestions(role: string, company: string): Promise<AiResponse<CoachQuestion[]>> {
  return aiJson<CoachQuestion[]>({
    task: "coach",
    prompt: `Poste: ${role}. Entreprise: ${company}. Génère 7 questions d'entretien variées. Renvoie un tableau d'objets {id, category, question}.`,
    local: () => localCoachQuestions(role, company),
    maxTokens: 1400,
  });
}

export async function evaluateAnswer(question: string, answer: string, role: string): Promise<AiResponse<LocalEvaluation>> {
  return aiJson<LocalEvaluation>({
    task: "coach",
    prompt: `Question: ${question}\nRéponse: ${answer}\nPoste: ${role}\nRenvoie {score: 0-100, feedback, better_answer}.`,
    local: () => localEvaluate(question, answer, role),
    maxTokens: 900,
  });
}

export interface CoachReportData {
  overall: number;
  metrics: { label: string; score: number }[];
  strengths: string[];
  improvements: string[];
  summary: string;
}

export async function buildCoachReport(
  answers: Array<{ question: string; answer: string; score: number; category: string }>,
  role: string
): Promise<AiResponse<CoachReportData>> {
  const local = (): CoachReportData => {
    const avg = answers.length ? Math.round(answers.reduce((s, a) => s + (a.score || 0), 0) / answers.length) : 0;
    const byCategory = new Map<string, number[]>();
    for (const a of answers) {
      const arr = byCategory.get(a.category) || [];
      arr.push(a.score || 0);
      byCategory.set(a.category, arr);
    }
    const metrics = [...byCategory.entries()].map(([label, vals]) => ({
      label,
      score: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
    }));
    return {
      overall: avg,
      metrics: metrics.length ? metrics : [{ label: "Global", score: avg }],
      strengths: [
        avg >= 60 ? "Votre discours est globalement structuré." : "Vous vous exprimez avec authenticité.",
        answers.some((a) => /[\d%€]/.test(a.answer)) ? "Vous appuyez vos propos sur des éléments chiffrés." : "Vous donnez des exemples issus de votre parcours.",
      ],
      improvements: [
        "Développez davantage vos réponses avec la méthode STAR.",
        `Préparez 2 exemples concrets spécifiques à ${role || "ce poste"}.`,
        "Ajoutez systématiquement un résultat mesurable à vos exemples.",
      ],
      summary: avg >= 70
        ? "Bonne préparation. Vos réponses sont cohérentes ; travaillez la concision et les exemples chiffrés."
        : "Base correcte. Structurez vos réponses et préparez des exemples concrets avant l'entretien.",
    };
  };
  return aiJson<CoachReportData>({
    task: "coach",
    prompt: `Poste: ${role}. Réponses et notes: ${compact(answers)}. Renvoie un rapport {overall, metrics:[{label,score}], strengths:[], improvements:[], summary}.`,
    local,
    maxTokens: 1400,
  });
}

export interface AssistantContext {
  name?: string;
  jobsCount?: number;
  applicationsCount?: number;
  hasCv?: boolean;
  history?: Array<{ role: string; content: string }>;
}

export async function assistantReply(message: string, context: AssistantContext): Promise<AiResponse<ChatResult>> {
  return aiJson<ChatResult>({
    task: "assistant",
    prompt: `Historique: ${compact(context.history || [])}\nContexte: ${compact(context)}\nMessage: ${message}\nRenvoie {reply: string, actions: [{label, href}]}.`,
    local: () => localChat(message, context),
    maxTokens: 900,
  });
}
