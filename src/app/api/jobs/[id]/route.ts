import { handle, ok, notFound, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { getJob, getProfile, getPreferences, getApplications } from "@/lib/repositories";
import { scoreJob } from "@/lib/ai";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const job = getJob(id);
    if (!job) return notFound("Offre introuvable.");
    const prefs = getPreferences(user.id);
    const match = (await scoreJob(getProfile(user.id), job, { cities: prefs.cities, remote: prefs.remote })).data;
    const application = getApplications(user.id).find((a) => a.job_id === id) || null;
    return ok({ job, match, application });
  });
}
