import { handle, notFound, unauthorized, fail } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { getProfile } from "@/lib/repositories";
import { renderHtml, renderPdf, renderDocx, type CvDocument } from "@/lib/cv/render";
import { slugify } from "@/lib/utils";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const v = one<Record<string, { resume_id: string }> & Record<string, unknown>>(
      `SELECT v.* FROM resume_versions v JOIN resumes r ON r.id=v.resume_id
       WHERE v.id=? AND r.user_id=?`, id, user.id
    );
    if (!v) return notFound("Document introuvable.");
    const profile = getProfile(user.id);
    const text = String(v.content_text || "");
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const doc: CvDocument = {
      title: lines[0] || profile.headline || "Curriculum Vitae",
      summary: profile.summary || "",
      skills: profile.skills || [],
      experienceLines: (profile.experiences || []).map((e) => `${e.title}${e.company ? " — " + e.company : ""}`),
      educationLines: (profile.education || []).map((e) => `${e.degree}${e.school ? " — " + e.school : ""}`),
      qualities: profile.qualities || [],
      languages: profile.languages || [],
      contact: [user.email, profile.city, profile.phone].filter(Boolean).join(" · "),
    };
    const format = new URL(req.url).searchParams.get("format") || "pdf";
    const filename = slugify(doc.title) + "." + format;
    if (format === "html") return new Response(renderHtml(doc), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    if (format === "pdf") {
      const buf = await renderPdf(doc);
      return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` } });
    }
    if (format === "docx") {
      const buf = await renderDocx(doc);
      return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": `attachment; filename="${filename}"` } });
    }
    return fail("Format non pris en charge.", "BAD_FORMAT", 400);
  });
}
