import mammoth from "mammoth";

export const MAX_CV_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_CV = [".pdf", ".docx", ".txt"];

export interface ParsedCv {
  text: string;
  pages?: number;
  warning?: string;
}

export class UnsupportedFile extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFile";
  }
}

export async function parseCvFile(buffer: Buffer, filename: string, mime: string): Promise<ParsedCv> {
  const name = filename.toLowerCase();
  if (buffer.length > MAX_CV_BYTES) {
    throw new UnsupportedFile("Le fichier dépasse 10 Mo.");
  }
  if (buffer.length === 0) {
    throw new UnsupportedFile("Le fichier est vide.");
  }

  if (name.endsWith(".pdf") || mime === "application/pdf") {
    if (buffer.subarray(0, 4).toString() !== "%PDF") {
      throw new UnsupportedFile("Fichier PDF invalide.");
    }
    const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
    const result = await pdfParse(buffer);
    return {
      text: result.text.replace(/\u0000/g, "").trim(),
      pages: result.numpages,
      warning: result.text.trim().length < 50 ? "Peu de texte détecté : le PDF est peut-être scanné (image). Ajoutez une version textuelle si possible." : undefined,
    };
  }

  if (name.endsWith(".docx") || mime.includes("wordprocessingml")) {
    if (buffer.subarray(0, 2).toString() !== "PK") {
      throw new UnsupportedFile("Fichier DOCX invalide (format ZIP attendu).");
    }
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value.trim(),
      warning: result.messages.length ? result.messages.map((m) => m.message).join(" | ") : undefined,
    };
  }

  if (name.endsWith(".txt") || mime.startsWith("text/")) {
    return { text: buffer.toString("utf8").trim() };
  }

  throw new UnsupportedFile("Format non pris en charge. Utilisez un fichier PDF, DOCX ou TXT.");
}
