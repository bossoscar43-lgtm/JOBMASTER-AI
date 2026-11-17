import type { Connector, SearchQuery } from "./connectors";
import { baseJob } from "./connectors";

/** Sources d'offres gratuite, sans clé, API publiques documentées. */

const remoteok: Connector = {
  id: "remoteok",
  name: "RemoteOK (API gratuite)",
  homepage: "https://remoteok.com",
  requiresKey: false,
  async search(q: SearchQuery) {
    try {
      const res = await fetch("https://remoteok.com/api", {
        signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/json", "User-Agent": "JOBMASTER-AI/1.0" },
      });
      if (!res.ok) throw new Error(`RemoteOK ${res.status}`);
      const data = (await res.json()) as Array<Record<string, any>>;
      return data.slice(1).map((r) => baseJob({
        source: "remoteok",
        external_id: `remoteok-${r.id}`,
        title: String(r.position || "Offre"),
        company: String(r.company || "Entreprise"),
        city: String(r.location || "Télétravail"),
        country: "International",
        remote: "remote",
        contract_type: "CDI",
        salary: r.salary_min ? `${r.salary_min}–${r.salary_max || ""}` : "",
        description: String(r.description || "").replace(/<[^>]*>/g, " ").slice(0, 4000),
        url: String(r.url || r.apply_url || ""),
        posted_at: String(r.date || new Date().toISOString()),
        skills: Array.isArray(r.tags) ? r.tags.slice(0, 12).map((t: unknown) => String(t)) : [],
      })).filter((j) => !q.keywords || `${j.title} ${j.skills.join(" ")}`.toLowerCase().includes(q.keywords.toLowerCase()))
        .slice(0, q.limit || 30);
    } catch (e) {
      console.error("[Connecteur RemoteOK]", e instanceof Error ? e.message : e);
      return [];
    }
  },
};

const himalayas: Connector = {
  id: "himalayas",
  name: "Himalayas (API gratuite)",
  homepage: "https://himalayas.app",
  requiresKey: false,
  async search(q: SearchQuery) {
    try {
      const res = await fetch("https://himalayas.app/jobs/api", {
        signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/json", "User-Agent": "JOBMASTER-AI/1.0" },
      });
      if (!res.ok) throw new Error(`Himalayas ${res.status}`);
      const data = (await res.json()) as { jobs?: Array<Record<string, any>> };
      return (data.jobs || []).map((r) => {
        const loc = Array.isArray(r.locationRestrictions) ? r.locationRestrictions.join(", ") : "";
        return baseJob({
          source: "himalayas",
          external_id: `himalayas-${r.guid || r.title}`,
          title: String(r.title || "Offre"),
          company: String(r.companyName || "Entreprise"),
          city: loc || "Télétravail",
          country: "International",
          remote: "remote",
          contract_type: String(r.employmentType || "CDI"),
          salary: r.minSalary ? `${r.minSalary}–${r.maxSalary || ""} ${r.currency || ""}/${r.salaryPeriod || "an"}` : "",
          description: String(r.excerpt || r.description || "").replace(/<[^>]*>/g, " ").slice(0, 4000),
          url: String(r.applicationLink || r.guid || ""),
          posted_at: new Date(Number(r.pubDate) * 1000 || Date.now()).toISOString(),
          skills: Array.isArray(r.categories) ? r.categories.slice(0, 12).map((t: unknown) => String(t)) : [],
          domain: Array.isArray(r.parentCategories) ? r.parentCategories[0] : "",
        });
      }).slice(0, q.limit || 30);
    } catch (e) {
      console.error("[Connecteur Himalayas]", e instanceof Error ? e.message : e);
      return [];
    }
  },
};

const workingnomads: Connector = {
  id: "workingnomads",
  name: "Working Nomads (API gratuite)",
  homepage: "https://www.workingnomads.com",
  requiresKey: false,
  async search(q: SearchQuery) {
    try {
      const res = await fetch("https://www.workingnomads.com/api/exposed_jobs/", {
        signal: AbortSignal.timeout(18000),
        headers: { Accept: "application/json", "User-Agent": "JOBMASTER-AI/1.0" },
      });
      if (!res.ok) throw new Error(`WorkingNomads ${res.status}`);
      const data = (await res.json()) as Array<Record<string, any>>;
      return data.map((r) => baseJob({
        source: "workingnomads",
        external_id: `workingnomads-${r.url || r.title}`,
        title: String(r.title || "Offre"),
        company: String(r.company_name || "Entreprise"),
        city: String(r.location || "Télétravail"),
        country: "International",
        remote: "remote",
        contract_type: "CDI",
        description: String(r.description || "").replace(/<[^>]*>/g, " ").slice(0, 4000),
        url: String(r.url || ""),
        posted_at: String(r.pub_date || new Date().toISOString()),
        skills: typeof r.tags === "string" ? r.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
        domain: String(r.category_name || ""),
      })).slice(0, q.limit || 30);
    } catch (e) {
      console.error("[Connecteur WorkingNomads]", e instanceof Error ? e.message : e);
      return [];
    }
  },
};

export const EXTRA_CONNECTORS: Connector[] = [remoteok, himalayas, workingnomads];
