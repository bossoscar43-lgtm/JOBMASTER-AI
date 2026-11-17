import { handle, notFound, unauthorized, fail } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { getResume, getVersions, getProfile } from "@/lib/repositories";
import { renderHtml, renderPdf, renderDocx, type CvDocument } from "@/lib/cv/render";
import { slugify } from "@/lib/utils";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const resume = getResume(id, user.id);
    if (!resume) return notFound("CV introuvable.");

    const url = new URL(req.url);
    const format = (url.searchParams.get("format") || "pdf").toLowerCase();
    const versionId = url.searchParams.get("version");
    const versions = getVersions(id);
    const version = versionId ? versions.find((v) => v.id === versionId) : versions[0];
    const p = getProfile(user.id);
    const text = version?.content_text || resume.original_text;

    const doc: CvDocument = {
      title: version?.content_text?.split("\n")[0] || resume.name || p.headline || "Curriculum Vitae",
      summary: p.summary || resume.extracted_profile.summary || "",
      skills: version ? (resume.extracted_profile.skills || p.skills || []) : (resume.extracted_profile.skills || p.skills || []),
      experienceLines: (resume.extracted_profile.experiences || p.experiences || []).map((e) => `${e.title}${e.company ? " — " + e.company : ""}${e.period ? " (" + e.period + ")" : ""}${e.description ? " : " + e.description : ""}`),
      educationLines: (resume.extracted_profile.education || p.education || []).map((e) => `${e.degree}${e.school ? " — " + e.school : ""}${e.year ? " (" + e.year + ")" : ""}`),
      qualities: resume.extracted_profile.qualities || p.qualities || [],
      languages: resume.extracted_profile.languages || p.languages || [],
      contact: [user.email, p.city, p.phone, p.linkedin].filter(Boolean).join(" · "),
    };
    // Le texte adapté est la source de vérité de la version téléchargée.
    if (version && version.content_text) {
      doc.summary = version.content_text.split("\n")[3]?.trim() || doc.summary;
    }
    const filename = slugify(doc.title || resume.name) + "." + (format === "html" ? "html" : format);
    if (format === "html") {
      return new Response(renderHtml(doc), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    if (format === "pdf") {
      const buf = await renderPdf(doc);
      return new Response(new Uint8Array(buf), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` },
      });
    }
    if (format === "docx") {
      const buf = await renderDocx(doc);
      return new Response(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }
    return fail("Format non pris en charge (pdf, docx, html).", "BAD_FORMAT", 400);
  });
}
