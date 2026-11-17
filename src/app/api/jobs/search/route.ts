import { handle, ok, fail, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { audit, notify, run, uid, now } from "@/lib/db";
import { getProfile, getPreferences } from "@/lib/repositories";
import { runSearch, getScoredJobs, type SearchFilters } from "@/lib/jobs/engine";
import { COST, consume, InsufficientCredits } from "@/lib/credits";
import { connectorsStatus } from "@/lib/jobs/connectors";

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    return ok({ jobs: getScoredJobs(user.id), connectors: connectorsStatus() });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const filters = (await req.json()) as SearchFilters;

    if (!user.credits_balance || user.credits_balance < COST.jobSearch) {
      if (user.credits_balance !== -1) {
        throw new InsufficientCredits();
      }
    }
    consume(user, COST.jobSearch, "Recherche d'offres", { query: filters.keywords || "" });

    const profile = getProfile(user.id);
    const prefs = getPreferences(user.id);
    const result = await runSearch(user.id, filters, profile, prefs);

    // Crée automatiquement une candidature au statut « offre détectée » pour chaque résultat.
    for (const job of result.jobs.slice(0, 40)) {
      const ts = now();
      run(
        `INSERT OR IGNORE INTO applications (id,user_id,job_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?)`,
        uid(), user.id, job.id, "detected", ts, ts
      );
    }
    notify(user.id, "success", "Recherche terminée", `${result.jobs.length} offre(s) trouvée(s) et analysée(s).`);
    audit(user.id, "jobs.search", "search", result.searchId, { filters, results: result.jobs.length, sources: result.sources });

    return ok(
      { jobs: result.jobs, searchId: result.searchId, sources: result.sources },
      { creditsUsed: COST.jobSearch, aiMode: "matching", demo: result.sources.length === 0 }
    );
  });
}
