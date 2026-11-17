import { handle, ok, fail, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { one, run, uid, now, jstring, jparse, audit } from "@/lib/db";
import { parseCvFile, UnsupportedFile } from "@/lib/cv/parse";
import { analyzeCv } from "@/lib/ai";
import { COST, requireConsume, canAddResume } from "@/lib/credits";
import { uploadCvToStorage } from "@/lib/cv/firebase-storage";
import { getResumes } from "@/lib/repositories";

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    return ok(getResumes(user.id));
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!canAddResume(user)) {
      return fail("Limite de CV atteinte pour votre forfait. Passez à Premium pour un nombre illimité.", "PLAN_LIMIT", 403);
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("Aucun fichier fourni.", "NO_FILE", 400);
    const name = (form.get("name") as string) || file.name.replace(/\.[^.]+$/, "");

    let parsed;
    try {
      parsed = await parseCvFile(Buffer.from(await file.arrayBuffer()), file.name, file.type);
    } catch (e) {
      if (e instanceof UnsupportedFile) return fail(e.message, "UNSUPPORTED_FILE", 415);
      throw e;
    }
    if (parsed.text.length < 40) {
      return fail("Le document ne contient pas assez de texte exploitable. Essayez un PDF textuel, un DOCX ou un TXT.", "EMPTY_TEXT", 422);
    }

    requireConsume(user, COST.aiAnalysis, "Analyse IA d'un CV", { filename: file.name });
    const analysis = await analyzeCv(parsed.text);

    const id = uid();
    const ts = now();
    const storagePath = await uploadCvToStorage(user.id, id, Buffer.from(await file.arrayBuffer()), file.type, file.name);
    const isPrimary = (one<{ c: number }>("SELECT COUNT(*) AS c FROM resumes WHERE user_id=?", user.id)?.c || 0) === 0 ? 1 : 0;
    run(
      `INSERT INTO resumes (id,user_id,name,original_filename,mime,original_text,extracted_profile,is_primary,version,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      id, user.id, name.slice(0, 120), file.name.slice(0, 200), file.type || "application/octet-stream",
      parsed.text, jstring(analysis.data), isPrimary, 1, ts
    );
    run(
      "INSERT INTO resume_versions (id,resume_id,label,content_text,content_html,ai_model,created_at) VALUES (?,?,?,?,?,?,?)",
      uid(), id, "CV original", parsed.text, "", analysis.mode, ts
    );

    // Complète le profil candidat si les champs sont vides.
    const prof = one<Record<string, unknown>>("SELECT * FROM profiles WHERE user_id=?", user.id);
    if (prof) {
      const fill = (col: string, value: unknown) => {
        if (!prof[col] && value) run(`UPDATE profiles SET ${col}=? WHERE user_id=?`, String(value), user.id);
      };
      fill("headline", analysis.data.headline);
      fill("city", analysis.data.city);
      fill("phone", analysis.data.phone);
      if (Array.isArray(analysis.data.skills) && analysis.data.skills.length) {
        const current = jparse<string[]>(String(prof.skills || "[]"), []);
        run("UPDATE profiles SET skills=?, updated_at=? WHERE user_id=?", jstring([...new Set([...current, ...analysis.data.skills])]), ts, user.id);
      }
    }

    audit(user.id, "cv.imported", "resume", id, { filename: file.name, mode: analysis.mode, pages: parsed.pages, storagePath });
    return ok(
      { id, name, isPrimary, analysis: analysis.data, aiMode: analysis.mode, note: analysis.note, warning: parsed.warning },
      { creditsUsed: COST.aiAnalysis }
    );
  });
}
