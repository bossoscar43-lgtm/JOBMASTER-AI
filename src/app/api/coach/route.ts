import { handle, ok, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { run, uid, now, all, jparse, audit } from "@/lib/db";
import { getJob, getProfile } from "@/lib/repositories";
import { coachQuestions } from "@/lib/ai";
import { COST, requireConsume } from "@/lib/credits";
import type { CoachSession, CoachQuestion } from "@/lib/types";

function mapSession(r: Record<string, unknown>): CoachSession {
  return {
    id: String(r.id), user_id: String(r.user_id), job_id: r.job_id ? String(r.job_id) : null,
    mode: String(r.mode) as CoachSession["mode"], company: String(r.company || ""), role: String(r.role || ""),
    questions: jparse<CoachQuestion[]>(String(r.questions), []),
    report: r.report ? jparse(String(r.report), null) : null,
    score: r.score === null || r.score === undefined ? null : Number(r.score),
    created_at: String(r.created_at), finished_at: r.finished_at ? String(r.finished_at) : null,
  };
}

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const rows = all<Record<string, unknown>>("SELECT * FROM coach_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 50", user.id);
    return ok(rows.map(mapSession));
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = (await req.json()) as { jobId?: string; role?: string; company?: string; mode?: "written" | "voice" };
    const job = body.jobId ? getJob(body.jobId) : null;
    const profile = getProfile(user.id);
    const role = job?.title || body.role || profile.headline || "Candidat(e)";
    const company = job?.company || body.company || "notre entreprise";

    requireConsume(user, COST.interview, "Coach entretien", { jobId: body.jobId || "" });
    const qs = await coachQuestions(role, company);
    const id = uid();
    run(
      "INSERT INTO coach_sessions (id,user_id,job_id,mode,company,role,questions,created_at) VALUES (?,?,?,?,?,?,?,?)",
      id, user.id, job?.id || null, body.mode === "voice" ? "voice" : "written", company, role,
      JSON.stringify(qs.data), now()
    );
    audit(user.id, "coach.started", "coach_session", id, { role, company, mode: qs.mode });
    return ok({ id, role, company, questions: qs.data, aiMode: qs.mode }, { creditsUsed: COST.interview });
  });
}
