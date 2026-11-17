import { ok, fail, handle } from "@/lib/http";
import { refreshAllJobs } from "@/lib/jobs/scheduler";

/** Endpoint d'actualisation automatique.
 *  Protégé par CRON_SECRET (Bearer token) ou appel interne. */
export async function POST(req: Request) {
  return handle(async () => {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization") || "";
      if (auth !== `Bearer ${secret}`) return fail("Non autorisé.", "UNAUTHORIZED", 401);
    }
    const result = await refreshAllJobs();
    return ok(result);
  });
}

export async function GET(req: Request) {
  return POST(req);
}
