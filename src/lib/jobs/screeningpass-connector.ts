import type { Connector, SearchQuery } from "./connectors";
import { hashOf } from "./connectors";
import type { Job } from "../types";

/**
 * Screeningpass — offres d'emploi en France, API publique SANS clé ni carte.
 * ~90 000 offres en France, dont stages et alternances. Données réelles avec
 * dates de publication et URL d'origine.
 * https://www.screeningpass.ai/api/v1/agent/
 */
const screeningpass: Connector = {
  id: "screeningpass",
  name: "Screeningpass (offres France)",
  homepage: "https://www.screeningpass.ai",
  requiresKey: false,
  async search(q: SearchQuery) {
    try {
      const url = new URL("https://www.screeningpass.ai/api/v1/agent/jobs/");
      if (q.keywords) url.searchParams.set("query", q.keywords);
      // L'API accepte au maximum 50 résultats par page.
      url.searchParams.set("limit", String(Math.max(1, Math.min(50, q.limit || 30))));
      url.searchParams.set("countries", "FR");
      if (q.city) url.searchParams.set("cities", q.city);

      const res = await fetch(url, {
        signal: AbortSignal.timeout(35000),
        headers: { Accept: "application/json", "User-Agent": "JOBMASTER-AI/1.0" },
      });
      if (!res.ok) throw new Error(`Screeningpass ${res.status}`);
      const data = (await res.json()) as { jobs?: Array<Record<string, any>> };

      return (data.jobs || []).map((r) => {
        const remote = String(r.remote_mode || "").toLowerCase();
        return {
          id: `sp-${r.id}`,
          source: "screeningpass",
          external_id: `sp-${r.id}`,
          title: String(r.title || "Offre"),
          company: String(r.company || "Entreprise"),
          city: String(r.location || ""),
          country: "France",
          remote: remote.includes("remote") ? "remote" : remote.includes("hybrid") ? "hybrid" : "onsite",
          contract_type: mapContract(String(r.contract_type || "")),
          salary: "",
          description: String(r.description_summary || ""),
          url: String(r.url || ""),
          posted_at: String(r.published_at || r.first_collected_at || new Date().toISOString()),
          skills: extractSkills(r),
          domain: "",
          study_level: "",
          dedupe_hash: hashOf(`${r.title}|${r.company}|${r.location}`),
          is_demo: 0,
          created_at: new Date().toISOString(),
          expires_at: null,
        } as Job;
      });
    } catch (e) {
      console.error("[Connecteur Screeningpass]", e instanceof Error ? e.message : e);
      return [];
    }
  },
};

function mapContract(t: string): string {
  const v = t.toLowerCase();
  if (v.includes("intern") || v.includes("stage")) return "Stage";
  if (v.includes("apprenti") || v.includes("alternance")) return "Alternance";
  if (v.includes("part")) return "Temps partiel";
  if (v.includes("cd")) return "CDD";
  return "CDI";
}

function extractSkills(r: Record<string, any>): string[] {
  const out: string[] = [];
  if (Array.isArray(r.technologies)) out.push(...r.technologies.map((t: any) => String(t.name || t)));
  if (Array.isArray(r.career_tracks)) out.push(...r.career_tracks.map((t: any) => String(t.name || t)));
  return out.slice(0, 12);
}

export const SCREENINGPASS_CONNECTOR: Connector[] = [screeningpass];
