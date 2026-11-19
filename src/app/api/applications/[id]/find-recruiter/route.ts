import { handle, ok, notFound, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { getApplication } from "@/lib/repositories";
import { getJob } from "@/lib/repositories";
import { findRecruiterEmail } from "@/lib/jobs/recruiter-email";

/** Trouve l'email du recruteur pour une offre donnée. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const app = getApplication(id, user.id);
    if (!app) return notFound("Candidature introuvable.");
    const job = getJob(app.job_id);
    if (!job) return notFound("Offre introuvable.");
    const contact = findRecruiterEmail(job);
    return ok(contact);
  });
}
