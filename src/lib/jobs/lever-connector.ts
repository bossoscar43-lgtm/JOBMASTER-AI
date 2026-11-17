import type { Job } from "../types";
import type { Connector, SearchQuery } from "./connectors";
import { hashOf } from "./connectors";

/**
 * API publique Lever (ATS utilisé par de nombreuses entreprises).
 * Aucune clé requise : ce sont les boards carrière officiels des entreprises.
 * https://api.lever.co/v0/postings/{company}?mode=json
 */
const COMPANIES = [
  { slug: "malt", name: "Malt" },
  { slug: "swile", name: "Swile" },
  { slug: "blablacar", name: "BlaBlaCar" },
  { slug: "heetch", name: "Heetch" },
  { slug: "alltrails", name: "AllTrails" },
];

function mapContract(commitment: string): string {
  const v = (commitment || "").toLowerCase();
  if (v.includes("intern") || v.includes("stage")) return "Stage";
  if (v.includes("apprenti") || v.includes("alternance")) return "Alternance";
  if (v.includes("part") || v.includes("temps partiel")) return "Temps partiel";
  if (v.includes("cd") || v.includes("fixe") || v.includes("cadre")) return "CDI";
  return commitment || "CDI";
}

const lever: Connector = {
  id: "lever",
  name: "Carrières d'entreprises (Lever)",
  homepage: "https://www.lever.co",
  requiresKey: false,
  async search(q: SearchQuery) {
    // Désactivé par défaut : l'API Lever répond par intermittence (timeouts)
    // depuis cet hébergement. Activer avec LEVER_ENABLED=true une fois
    // connecté depuis un réseau où l'API est accessible.
    if (process.env.LEVER_ENABLED !== "true") return [];
    const batches = await Promise.allSettled(
      COMPANIES.map(async (c) => {
        const res = await fetch(`https://api.lever.co/v0/postings/${c.slug}?mode=json`, {
          signal: AbortSignal.timeout(12000),
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`Lever ${c.slug}: ${res.status}`);
        const data = (await res.json()) as Array<Record<string, any>>;
        return { company: c, data };
      })
    );

    const jobs: Job[] = [];
    for (const b of batches) {
      if (b.status !== "fulfilled") {
        console.error("[Connecteur Lever]", b.reason instanceof Error ? b.reason.message : b.reason);
        continue;
      }
      const { company, data } = b.value;
      for (const r of data) {
        const title = String(r.text || "Offre");
        const categories = (r.categories || {}) as Record<string, any>;
        const city = String(categories.location || r.country || "");
        const workplace = String(r.workplaceType || "").toLowerCase();
        const remote = workplace.includes("remote") ? "remote" : workplace.includes("hybrid") ? "hybrid" : "onsite";
        const id = `lever-${company.slug}-${r.id}`;
        jobs.push({
          id,
          source: "lever",
          external_id: id,
          title,
          company: company.name,
          city,
          country: "France",
          remote,
          contract_type: mapContract(String(categories.commitment || "")),
          salary: "",
          description: String(r.descriptionPlain || r.additionalPlain || "").slice(0, 4000),
          url: String(r.hostedUrl || r.applyUrl || ""),
          posted_at: new Date(Number(r.createdAt) || Date.now()).toISOString(),
          skills: [String(categories.department || ""), String(categories.team || "")].filter(Boolean),
          domain: String(categories.department || ""),
          study_level: "",
          dedupe_hash: hashOf(`${title}|${company.name}|${city}`),
          is_demo: 0,
          created_at: new Date().toISOString(),
          expires_at: null,
        });
      }
    }
    if (q.keywords) {
      const needle = q.keywords.toLowerCase();
      return jobs.filter((j) => `${j.title} ${j.company} ${j.skills.join(" ")}`.toLowerCase().includes(needle)).slice(0, q.limit || 30);
    }
    return jobs.slice(0, q.limit || 30);
  },
};

export const COMPANY_CONNECTORS: Connector[] = [lever];
