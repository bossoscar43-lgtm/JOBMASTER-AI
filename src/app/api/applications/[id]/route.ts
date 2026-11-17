import { handle, ok, notFound, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { run, uid, now, audit, notify } from "@/lib/db";
import { getApplication, getApplications } from "@/lib/repositories";
import { STATUS_LABELS } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const app = getApplication(id, user.id);
    if (!app) return notFound("Candidature introuvable.");
    const body = (await req.json()) as Record<string, unknown>;
    const allowed = ["status", "cover_letter", "email_subject", "email_body", "linkedin_message", "recruiter_answers", "notes", "next_followup_at", "send_mode"];
    const sets: string[] = [];
    const values: unknown[] = [];

    if (body.status && STATUS_LABELS[String(body.status)]) {
      sets.push("status=?", "updated_at=?"); values.push(String(body.status), now());
      run(
        "INSERT INTO application_events (id,application_id,from_status,to_status,note,created_at) VALUES (?,?,?,?,?,?)",
        uid(), id, app.status, String(body.status), String(body.note || ""), now()
      );
      if (body.status === "received") notify(user.id, "success", "Réponse reçue !", app.job?.company || "");
      if (body.status === "interview") notify(user.id, "success", "Entretien proposé", app.job?.company || "");
    }
    for (const key of allowed) {
      if (key === "status" || !(key in body)) continue;
      sets.push(`${key}=?`);
      const v = body[key];
      values.push(typeof v === "string" ? v : JSON.stringify(v));
    }
    if (sets.length && !body.status) { sets.push("updated_at=?"); values.push(now()); }
    if (sets.length) {
      values.push(id, user.id);
      run(`UPDATE applications SET ${sets.join(",")} WHERE id=? AND user_id=?`, ...(values as never[]));
    }
    audit(user.id, "application.updated", "application", id, body);
    return ok(getApplication(id, user.id));
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const app = getApplication(id, user.id);
    if (!app) return notFound("Candidature introuvable.");
    run("DELETE FROM applications WHERE id=?", id);
    audit(user.id, "application.deleted", "application", id);
    return ok({ deleted: true });
  });
}

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const app = getApplication(id, user.id);
    if (!app) return notFound("Candidature introuvable.");
    return ok(app);
  });
}
