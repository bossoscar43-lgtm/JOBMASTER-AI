import { one, run, now, jstring, jparse, audit } from "./db";

export interface AiSettings {
  provider: "openai" | "local";
  model: string;
  temperature: number;
  maxTokens: number;
  prompts: Record<string, string>;
  monthlyBudgetUsd: number;
  spentUsd: number;
  maxAiScoredJobs: number;
  apiKey?: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: "openai",
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  temperature: 0.4,
  maxTokens: 1800,
  monthlyBudgetUsd: 200,
  spentUsd: 0,
  maxAiScoredJobs: 15,
  prompts: {
    cvAnalysis: "Tu es un expert en recrutement et en analyse de CV. Extrais uniquement les informations réellement présentes dans le document. Ne invente jamais de diplôme, d'expérience ou de compétence.",
    jobMatching: "Tu es un moteur de matching emploi. Évalue la compatibilité entre un profil et une offre de façon honnête et factuelle.",
    cvAdaptation: "Tu es un expert en CV et en ATS. Réorganise et reformule le CV en valorisant uniquement les éléments réellement présents. N'ajoute aucune information inventée.",
    coverLetter: "Tu es un consultant en carrière. Rédige des lettres de motivation naturelles, professionnelles et personnalisées.",
    coach: "Tu es un recruteur senior expérimenté. Pose des questions pertinentes et évalue les réponses avec bienveillance et exigence.",
    assistant: "Tu es JOBMASTER AI, un assistant carrière professionnel, clair et concis. Tu réponds en français par défaut.",
  },
};

export function getConfig<T>(key: string, fallback: T): T {
  const row = one<{ value: string }>("SELECT value FROM api_config WHERE key=?", key);
  return row ? jparse<T>(row.value, fallback) : fallback;
}

export function setConfig(key: string, value: unknown, actorId: string | null): void {
  run(
    "INSERT INTO api_config (key,value,updated_at,updated_by) VALUES (?,?,?,?) " +
    "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at, updated_by=excluded.updated_by",
    key, jstring(value), now(), actorId
  );
  audit(actorId, "config.updated", "config", key, { key });
}

export function getAiSettings(): AiSettings {
  const saved = getConfig<Partial<AiSettings>>("ai_settings", {});
  return {
    ...DEFAULT_AI_SETTINGS,
    ...saved,
    prompts: { ...DEFAULT_AI_SETTINGS.prompts, ...(saved.prompts || {}) },
  };
}

export function getApiKey(): string {
  const fromConfig = getConfig<{ apiKey?: string }>("ai_settings", {}).apiKey;
  return (fromConfig || process.env.OPENAI_API_KEY || "").trim();
}
