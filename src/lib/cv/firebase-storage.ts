import { getFirebaseBucket } from "../firebase";

/** Stocke un CV dans Firebase Storage lorsque configuré. Retourne null sinon. */
export async function uploadCvToStorage(
  userId: string,
  fileId: string,
  buffer: Buffer,
  mime: string,
  filename: string
): Promise<string | null> {
  const bucket = getFirebaseBucket();
  if (!bucket) return null;
  try {
    const path = `cvs/${userId}/${fileId}/${filename}`;
    const file = bucket.file(path);
    await file.save(buffer, {
      contentType: mime || "application/octet-stream",
      resumable: false,
      metadata: { metadata: { uploadedBy: userId, jobmaster: "true" } },
    });
    return `gs://${bucket.name}/${path}`;
  } catch (e) {
    console.error("[Firebase Storage] upload:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** URL signée valable 10 minutes pour le téléchargement d'un CV privé. */
export async function signedCvUrl(userId: string, fileId: string, filename: string): Promise<string | null> {
  const bucket = getFirebaseBucket();
  if (!bucket) return null;
  try {
    const file = bucket.file(`cvs/${userId}/${fileId}/${filename}`);
    const [url] = await file.getSignedUrl({ action: "read", expires: Date.now() + 10 * 60 * 1000 });
    return url;
  } catch {
    return null;
  }
}
