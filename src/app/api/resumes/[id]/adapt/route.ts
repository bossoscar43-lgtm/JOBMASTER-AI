import { z } from "zod";
import { handle, ok, fail, notFound, unauthorized, validationError } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { run, one, uid, now, audit, notify } from "@/lib/db";
import { getResume, getJob, getProfile } from "@/lib/repositories";
import { scoreJob, adaptCv, generateMaterials } from "@/lib/ai";
import { COST, requireConsume } from "@/lib/credits";
import { getPreferences } from "@/lib/repositories";

const schema = z.object({ jobId: z.string().min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);

    const resume = getResume(id, user.id);
    const job = getJob(parsed.data.jobId);
    if (!resume || !job) return notFound("CV ou offre introuvable.");

    requireConsume(user, COST.adaptiveCv, "Adaptation CV + lettre", { jobId: job.id, resumeId: resume.id });

    const profile = resume.extracted_profile.skills?.length ? resume.extracted_profile : getProfile(user.id);
    const prefs = getPreferences(user.id);
    const match = (await scoreJob(profile, job, { cities: prefs.cities, remote: prefs.remote })).data;
    const adapted = (await adaptCv(profile, job, match)).data;
    const materials = (await generateMaterials(profile, job, match, user.full_name)).data;

    const versionId = uid();
    const ts = now();
    run(
      "INSERT INTO resume_versions (id,resume_id,label,content_text,content_html,ai_model,job_id,created_at) VALUES (?,?,?,?,?,?,?,?)",
      versionId, resume.id, `Adapté — ${job.company}`, adapted.contentText, adapted.contentHtml, "ai-adapter-v1", job.id, ts
    );

    const existing = run(
      "UPDATE applications SET resume_version_id=?,cover_letter=?,email_subject=?,email_body=?,linkedin_message=?,recruiter_answers=?,status=?,updated_at=? WHERE user_id=? AND job_id=?",
      versionId, materials.coverLetter, materials.emailSubject, materials.emailBody, materials.linkedinMessage,
      JSON.stringify(materials.recruiterAnswers), "to_validate", ts, user.id, job.id
    );
    if (!existing.changes) {
      run(
        `INSERT INTO applications (id,user_id,job_id,resume_version_id,status,cover_letter,email_subject,email_body,linkedin_message,recruiter_answers,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        uid(), user.id, job.id, versionId, "to_validate", materials.coverLetter, materials.emailSubject,
        materials.emailBody, materials.linkedinMessage, JSON.stringify(materials.recruiterAnswers), ts, ts
      );
      const app = one<{ id: string }>("SELECT id FROM applications WHERE user_id=? AND job_id=?", user.id, job.id);
      if (app) {
        run(
          "INSERT INTO application_events (id,application_id,from_status,to_status,note,created_at) VALUES (?,?,?,?,?,?)",
          uid(), app.id, "detected", "cv_adapted", "Documents générés", ts
        );
      }
    }
    notify(user.id, "success", "Documents prêts", `CV et lettre générés pour ${job.company}.`);
    audit(user.id, "cv.adapted", "resume", resume.id, { jobId: job.id, versionId, score: match.score });

    return ok({
      versionId, score: match.score, matched: match.matched_skills, missing: match.missing_skills,
      adaptation: adapted, materials,
    }, { creditsUsed: COST.adaptiveCv });
  });
}
