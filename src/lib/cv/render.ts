import PDFDocument from "pdfkit";
import JSZip from "jszip";

export interface CvDocument {
  title: string;
  summary: string;
  skills: string[];
  experienceLines: string[];
  educationLines: string[];
  qualities: string[];
  languages: string[];
  contact?: string;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] || c);
}

export function renderHtml(doc: CvDocument): string {
  const section = (title: string, body: string) => body ? `<section><h2>${esc(title)}</h2>${body}</section>` : "";
  const list = (items: string[]) => items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(doc.title)}</title>
<style>
body{font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.55;max-width:820px;margin:40px auto;padding:0 24px}
h1{font-size:22px;color:#1e1b4b;margin-bottom:4px}h2{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#4f46e5;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-top:26px}
p,li{font-size:13px}ul{padding-left:18px}.contact{color:#6b7280;font-size:12px}
@media print{body{margin:0}}
</style></head><body>
<h1>${esc(doc.title)}</h1>${doc.contact ? `<div class="contact">${esc(doc.contact)}</div>` : ""}
${section("Profil", `<p>${esc(doc.summary)}</p>`)}
${section("Compétences clés", list(doc.skills))}
${section("Expérience", list(doc.experienceLines))}
${section("Formations", list(doc.educationLines))}
${section("Qualités", list(doc.qualities))}
${section("Langues", list(doc.languages))}
</body></html>`;
}

export async function renderPdf(doc: CvDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
    const chunks: Buffer[] = [];
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    pdf.font("Helvetica-Bold").fontSize(18).fillColor("#1e1b4b").text(doc.title.slice(0, 90));
    if (doc.contact) {
      pdf.moveDown(0.3).font("Helvetica").fontSize(9).fillColor("#6b7280").text(doc.contact);
    }
    pdf.moveDown(1);

    const heading = (title: string) => {
      pdf.moveDown(0.8).font("Helvetica-Bold").fontSize(10).fillColor("#4f46e5").text(title.toUpperCase());
      pdf.moveDown(0.2);
    };
    const body = (text: string) => {
      pdf.font("Helvetica").fontSize(10).fillColor("#1f2937").text(text, { align: "left" });
    };
    const listItems = (items: string[]) => {
      for (const item of items.slice(0, 20)) {
        pdf.font("Helvetica").fontSize(10).fillColor("#1f2937").text(`• ${item}`, { indent: 8 });
      }
    };

    heading("Profil"); body(doc.summary);
    if (doc.skills.length) { heading("Compétences clés"); listItems(doc.skills); }
    if (doc.experienceLines.length) { heading("Expérience"); listItems(doc.experienceLines); }
    if (doc.educationLines.length) { heading("Formations"); listItems(doc.educationLines); }
    if (doc.qualities.length) { heading("Qualités"); listItems(doc.qualities); }
    if (doc.languages.length) { heading("Langues"); listItems(doc.languages); }
    pdf.end();
  });
}

export async function renderDocx(doc: CvDocument): Promise<Buffer> {
  const zip = new JSZip();
  const p = (text: string, bold = false, size = 24) =>
    `<w:p><w:r><w:rPr><w:b w:val="${bold ? "1" : "0"}"/><w:sz w:val="${size}"/><w:color w:val="${bold ? "1E1B4B" : "1F2937"}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
  const h2 = (text: string) => p(text.toUpperCase(), true, 22);
  const list = (items: string[]) => items.slice(0, 20).map((i) => p(`• ${i}`)).join("");

  const body = [
    p(doc.title, true, 34),
    doc.contact ? p(doc.contact, false, 18) : "",
    h2("Profil"), p(doc.summary),
    doc.skills.length ? h2("Compétences clés") + list(doc.skills) : "",
    doc.experienceLines.length ? h2("Expérience") + list(doc.experienceLines) : "",
    doc.educationLines.length ? h2("Formations") + list(doc.educationLines) : "",
    doc.qualities.length ? h2("Qualités") + list(doc.qualities) : "",
    doc.languages.length ? h2("Langues") + list(doc.languages) : "",
  ].join("");

  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
  zip.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
</w:styles>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`);

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
