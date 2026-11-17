import { handle, ok, fail, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { run, uid, now, audit, notify } from "@/lib/db";
import { getApplications, getJob } from "@/lib/repositories";

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    return ok(getApplications(user.id));
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { jobId } = (await req.json()) as { jobId?: string };
    if (!jobId) return fail("Offre requise.", "NO_JOB", 400);
    const job = getJob(jobId);
    if (!job) return fail("Offre introuvable.", "NOT_FOUND", 404);
    const ts = now();
    run(
      "INSERT OR IGNORE INTO applications (id,user_id,job_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?)",
      uid(), user.id, jobId, "detected", ts, ts
    );
    audit(user.id, "application.created", "application", jobId);
    notify(user.id, "info", "Offre ajoutée à vos candidatures", job.title);
    return ok(getApplications(user.id).find((a) => a.job_id === jobId));
  });
}
