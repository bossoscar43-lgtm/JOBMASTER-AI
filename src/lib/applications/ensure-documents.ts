import { one, run, uid, now } from "../db";
import { getResume, getJob, getProfile, getPreferences } from "../repositories";
import { scoreJob, adaptCv, generateMaterials } from "../ai";
import type { Application, User } from "../types";

/** Génère automatiquement le CV adapté, la lettre et l'email d'une candidature
 *  s'ils n'existent pas encore. L'utilisateur garde la main : il peut modifier
 *  les textes avant l'envoi (l'autorisation explicite reste obligatoire). */
export async function ensureApplicationDocuments(
  app: Application,
  user: User
): Promise<Application> {
  if (app.email_body && app.cover_letter && app.resume_version_id) return app;

  let resume = one<{ id: string }>(
    "SELECT id FROM resumes WHERE user_id=? ORDER BY is_primary DESC, created_at DESC LIMIT 1", user.id
  );
  const job = getJob(app.job_id);
  if (!job) return app;

  // Si aucun CV n'a été importé, en créer un automatiquement depuis le profil
  // pour que la candidature puisse partir sans friction.
  if (!resume) {
    const profile = getProfile(user.id);
    const text = [
      profile.headline || "Curriculum Vitae",
      profile.summary || "",
      "COMPÉTENCES",
      (profile.skills || []).join(", "),
      "EXPÉRIENCE",
      ...(profile.experiences || []).map((e) => `${e.title} ${e.company || ""} ${e.description || ""}`),
      "FORMATIONS",
      ...(profile.education || []).map((e) => `${e.degree} ${e.school || ""}`),
    ].join("\n");
    const resumeId = uid();
    run(
      "INSERT INTO resumes (id,user_id,name,original_filename,mime,original_text,extracted_profile,is_primary,version,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      resumeId, user.id, "CV auto", "profil.txt", "text/plain", text,
      JSON.stringify(profile), 1, 1, now()
    );
    resume = { id: resumeId };
  }

  const profile = getProfile(user.id);
  const prefs = getPreferences(user.id);
  const match = (await scoreJob(profile, job, { cities: prefs.cities, remote: prefs.remote })).data;
  const adapted = (await adaptCv(profile, job, match)).data;
  const materials = (await generateMaterials(profile, job, match, user.full_name)).data;

  const versionId = uid();
  const ts = now();
  run(
    "INSERT INTO resume_versions (id,resume_id,label,content_text,content_html,ai_model,job_id,created_at) VALUES (?,?,?,?,?,?,?,?)",
    versionId, resume.id, `Adapté — ${job.company}`, adapted.contentText, adapted.contentHtml, "auto", job.id, ts
  );
  run(
    "UPDATE applications SET resume_version_id=?, cover_letter=?, email_subject=?, email_body=?, linkedin_message=?, recruiter_answers=?, updated_at=? WHERE id=?",
    versionId, materials.coverLetter, materials.emailSubject, materials.emailBody,
    materials.linkedinMessage, JSON.stringify(materials.recruiterAnswers), ts, app.id
  );

  return {
    ...app,
    resume_version_id: versionId,
    cover_letter: materials.coverLetter,
    email_subject: materials.emailSubject,
    email_body: materials.emailBody,
    linkedin_message: materials.linkedinMessage,
  };
}
