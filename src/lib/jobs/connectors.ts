import { all, one, uid, now, jstring, buildDemoJobs } from "../db";
import { getConfig } from "../settings";
import type { Job } from "../types";

export interface SearchQuery {
  keywords?: string;
  city?: string;
  contract?: string;
  limit?: number;
}

export interface Connector {
  id: string;
  name: string;
  homepage: string;
  requiresKey: boolean;
  search(q: SearchQuery): Promise<Job[]>;
}

export function baseJob(partial: Partial<Job> & Pick<Job, "title" | "company" | "source" | "external_id">): Job {
  const dedupe = partial.dedupe_hash || hashOf(`${partial.title}|${partial.company}|${partial.city || ""}`);
  return {
    id: partial.id || uid(),
    source: partial.source,
    external_id: partial.external_id,
    title: partial.title,
    company: partial.company,
    city: partial.city || "",
    country: partial.country || "France",
    remote: partial.remote || "onsite",
    contract_type: partial.contract_type || "CDI",
    salary: partial.salary || "",
    description: partial.description || "",
    url: partial.url || "",
    posted_at: partial.posted_at || now(),
    skills: partial.skills || [],
    domain: partial.domain || "",
    study_level: partial.study_level || "",
    dedupe_hash: dedupe,
    is_demo: partial.is_demo ?? 0,
    created_at: partial.created_at || now(),
    expires_at: partial.expires_at || null,
  };
}

export function hashOf(value: string): string {
  // Empreinte stable pour détection des doublons (sans crypto natif nécessaire ici).
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < value.length; i++) {
    h1 = Math.imul(h1 ^ value.charCodeAt(i), 0x01000193);
    h2 = Math.imul(h2 + value.charCodeAt(i), 0x0100019d);
  }
  return ((h1 >>> 0).toString(16) + (h2 >>> 0).toString(16)).padStart(16, "0");
}

const demoConnector: Connector = {
  id: "demo",
  name: "Offres de démonstration",
  homepage: "https://example.com",
  requiresKey: false,
  async search(q) {
    // Utilise le jeu figé de 24 offres FRANÇAISES, indépendamment de la table
    // `jobs` (qui peut contenir des offres internationales en mode cloud).
    const rows = buildDemoJobs();
    return rows.map((r) => baseJob(r)).filter((j) =>
      !q.keywords || `${j.title} ${j.skills.join(" ")} ${j.domain}`.toLowerCase().includes(q.keywords.toLowerCase())
    ).slice(0, q.limit || 50);
  },
};

const franceTravail: Connector = {
  id: "francetravail",
  name: "France Travail",
  homepage: "https://www.francetravail.fr",
  requiresKey: true,
  async search(q) {
    const cfg = getConfig<{ clientId?: string; clientSecret?: string }>("connector_francetravail", {});
    const id = cfg.clientId || process.env.FRANCE_TRAVAIL_CLIENT_ID;
    const secret = cfg.clientSecret || process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
    if (!id || !secret) return [];
    try {
      const tokenRes = await fetch("https://api.francetravail.io/partenaire/cle", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=client_credentials&client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(secret)}&scope=api_offresdemploiv2 o2dsoffre`,
        signal: AbortSignal.timeout(12000),
      });
      if (!tokenRes.ok) throw new Error(`OAuth ${tokenRes.status}`);
      const token = (await tokenRes.json()) as { access_token: string };
      const params = new URLSearchParams({ size: String(q.limit || 30) });
      if (q.keywords) params.set("motsCles", q.keywords);
      if (q.city) params.set("commune", q.city);
      if (q.contract) params.set("typeContrat", q.contract.toUpperCase());
      const res = await fetch(`https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${params}`, {
        headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`Recherche ${res.status}`);
      const data = (await res.json()) as {
        resultats?: Array<Record<string, any>>;
      };
      return (data.resultats || []).map((r) => baseJob({
        source: "francetravail",
        external_id: String(r.id),
        title: String(r.intitule || "Offre"),
        company: String(r.entreprise?.nom || "Entreprise non précisée"),
        city: String(r.lieuTravail?.libelle || ""),
        contract_type: String(r.typeContratLibelle || r.typeContrat || ""),
        salary: String(r.salaire?.libelle || ""),
        description: String(r.description || ""),
        url: String(r.lienPoursuivreVoeu || r.origineOffre?.urlOrigine || ""),
        posted_at: String(r.dateCreation || now()),
        skills: Array.isArray(r.competences) ? r.competences.map((c: any) => String(c.libelle || c)) : [],
      }));
    } catch (e) {
      console.error("[Connecteur France Travail]", e instanceof Error ? e.message : e);
      return [];
    }
  },
};

const wttj: Connector = {
  id: "wttj",
  name: "Welcome to the Jungle",
  homepage: "https://www.welcometothejungle.com",
  requiresKey: true,
  async search(q) {
    const cfg = getConfig<{ apiKey?: string }>("connector_wttj", {});
    const key = cfg.apiKey || process.env.WELCOME_TO_THE_JUNGLE_API_KEY;
    if (!key) return [];
    try {
      const params = new URLSearchParams({ apiKey: key, per_page: String(q.limit || 30) });
      if (q.keywords) params.set("query", q.keywords);
      const res = await fetch(`https://api.welcometothejungle.com/api/v1/jobs?${params}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`WTTJ ${res.status}`);
      const data = (await res.json()) as { results?: Array<Record<string, any>> };
      return (data.results || []).map((r) => baseJob({
        source: "wttj",
        external_id: String(r.id || r.slug),
        title: String(r.name || "Offre"),
        company: String(r.organization?.name || "Entreprise"),
        city: String(r.offices?.[0]?.city || r.city || ""),
        contract_type: String(r.contracts?.[0]?.type || ""),
        description: String(r.description_plain || r.description || ""),
        url: String(r.url || ""),
        posted_at: String(r.published_at || now()),
        skills: Array.isArray(r.tags) ? r.tags.map((t: any) => String(t.name || t)) : [],
      }));
    } catch (e) {
      console.error("[Connecteur WTTJ]", e instanceof Error ? e.message : e);
      return [];
    }
  },
};

import { FREE_CONNECTORS } from "./free-connectors";

export const CONNECTORS: Connector[] = [demoConnector, ...FREE_CONNECTORS, franceTravail, wttj];

export function connectorsStatus() {
  return CONNECTORS.map((c) => {
    let configured = !c.requiresKey;
    if (FREE_CONNECTORS.some((f) => f.id === c.id)) configured = true;
    if (c.id === "francetravail") {
      const cfg = getConfig<{ clientId?: string }>("connector_francetravail", {});
      configured = Boolean(cfg.clientId || process.env.FRANCE_TRAVAIL_CLIENT_ID);
    }
    if (c.id === "wttj") {
      const cfg = getConfig<{ apiKey?: string }>("connector_wttj", {});
      configured = Boolean(cfg.apiKey || process.env.WELCOME_TO_THE_JUNGLE_API_KEY);
    }
    return { id: c.id, name: c.name, homepage: c.homepage, requiresKey: c.requiresKey, configured };
  });
}
