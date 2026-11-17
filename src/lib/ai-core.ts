import { getAiSettings, getApiKey } from "./settings";

export type AiMode = "openai" | "local";

export interface AiResponse<T> {
  data: T;
  mode: AiMode;
  model: string;
  note?: string;
}

interface AiOptions<T> {
  task: string;
  prompt: string;
  local: () => T;
  system?: string;
  maxTokens?: number;
}

// Disjoncteur : après une erreur de quota, on arrête d'appeler OpenAI
// pendant 1 heure au lieu de réessayer pour chaque offre.
let quotaExhaustedUntil = 0;
let lastQuotaLog = 0;

function localResponse<T>(local: () => T, note: string): AiResponse<T> {
  return { data: local(), mode: "local", model: "local-heuristic-v1", note };
}

/** Appelle OpenAI si configuré, sinon le moteur local déterministe.
 *  Le mode utilisé est toujours renvoyé à l'interface (transparence totale). */
export async function aiJson<T>(options: AiOptions<T>): Promise<AiResponse<T>> {
  const settings = getAiSettings();
  const key = getApiKey();
  if (Date.now() < quotaExhaustedUntil) {
    return localResponse(options.local, "Quota OpenAI épuisé — moteur local actif (réessai dans 1 h).");
  }
  if (!key || settings.provider === "local") {
    return {
      data: options.local(),
      mode: "local",
      model: "local-heuristic-v1",
      note: "Mode local déterministe — aucune clé OpenAI active.",
    };
  }

  try {
    const system = options.system || settings.prompts[options.task] || "";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: settings.temperature,
        max_tokens: options.maxTokens || settings.maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system + "\nRéponds UNIQUEMENT avec un objet JSON valide." },
          { role: "user", content: options.prompt },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      if (res.status === 429 && /credit|quota|billing/i.test(body)) {
        quotaExhaustedUntil = Date.now() + 3600000;
        if (Date.now() - lastQuotaLog > 60000) {
          console.error("[AI] Quota OpenAI épuisé — bascule sur le moteur local pour 1 h.");
          lastQuotaLog = Date.now();
        }
        throw new Error("QUOTA_EXHAUSTED");
      }
      throw new Error(`OpenAI ${res.status}: ${body}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
      model?: string;
    };
    const content = json.choices?.[0]?.message?.content || "{}";
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const data = JSON.parse(cleaned) as T;
    return {
      data,
      mode: "openai",
      model: json.model || settings.model,
      note: `Tokens consommés : ${json.usage?.total_tokens ?? "?"} (coût réel facturé séparément par OpenAI).`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg !== "QUOTA_EXHAUSTED") console.error("[AI] repli local :", msg);
    return localResponse(
      options.local,
      msg === "QUOTA_EXHAUSTED"
        ? "Quota OpenAI épuisé — moteur local actif (réessai dans 1 h)."
        : "Appel OpenAI indisponible — repli automatique sur le moteur local."
    );
  }
}

export function compact(value: unknown, max = 9000): string {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > max ? s.slice(0, max) + "…[tronqué]" : s;
}
