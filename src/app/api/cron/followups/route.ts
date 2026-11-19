import { handle, ok, fail } from "@/lib/http";
import { processDueFollowups } from "@/lib/jobs/followup";

/** Cron de relances automatiques. Protégé par CRON_SECRET (Bearer). */
export async function POST(req: Request) {
  return handle(async () => {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization") || "";
      if (auth !== `Bearer ${secret}`) return fail("Non autorisé.", "UNAUTHORIZED", 401);
    }
    const result = await processDueFollowups();
    return ok(result);
  });
}

export async function GET(req: Request) { return POST(req); }
