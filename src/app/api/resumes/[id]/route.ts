import { handle, ok, notFound, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { run, audit } from "@/lib/db";
import { getResume, getVersions } from "@/lib/repositories";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const resume = getResume(id, user.id);
    if (!resume) return notFound("CV introuvable.");
    return ok({ resume, versions: getVersions(id) });
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const resume = getResume(id, user.id);
    if (!resume) return notFound("CV introuvable.");
    const body = (await req.json()) as { name?: string; is_primary?: boolean };
    if (body.name) run("UPDATE resumes SET name=? WHERE id=?", body.name.slice(0, 120), id);
    if (body.is_primary) {
      run("UPDATE resumes SET is_primary=0 WHERE user_id=?", user.id);
      run("UPDATE resumes SET is_primary=1 WHERE id=?", id);
    }
    audit(user.id, "resume.updated", "resume", id, body);
    return ok(getResume(id, user.id));
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const resume = getResume(id, user.id);
    if (!resume) return notFound("CV introuvable.");
    run("DELETE FROM resumes WHERE id=?", id);
    audit(user.id, "resume.deleted", "resume", id, { name: resume.name });
    // Vérifier la persistance effective dans Supabase après le flush.
    const { flushPendingWrites } = await import("@/lib/db");
    await flushPendingWrites();
    const { getSupabase } = await import("@/lib/supabase");
    const sb = getSupabase();
    let persisted = "n/a";
    if (sb) {
      const { data } = await sb.from("jm_snapshot").select("rows").eq("table_name", "resumes").maybeSingle();
      persisted = (data?.rows || []).some((r: Record<string, unknown>) => r.id === id) ? "STILL_PRESENT" : "DELETED";
    }
    return ok({ deleted: true, persisted });
  });
}
