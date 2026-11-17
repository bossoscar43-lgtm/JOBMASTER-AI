import { handle, ok, notFound, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { one, run, now, jparse, audit } from "@/lib/db";
import { evaluateAnswer, buildCoachReport } from "@/lib/ai";
import type { CoachQuestion, CoachSession } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

function load(id: string, userId: string): CoachSession | null {
  const r = one<Record<string, unknown>>("SELECT * FROM coach_sessions WHERE id=? AND user_id=?", id, userId);
  if (!r) return null;
  return {
    id: String(r.id), user_id: String(r.user_id), job_id: r.job_id ? String(r.job_id) : null,
    mode: String(r.mode) as CoachSession["mode"], company: String(r.company || ""), role: String(r.role || ""),
    questions: jparse<CoachQuestion[]>(String(r.questions), []),
    report: r.report ? jparse(String(r.report), null) : null,
    score: r.score === null || r.score === undefined ? null : Number(r.score),
    created_at: String(r.created_at), finished_at: r.finished_at ? String(r.finished_at) : null,
  };
}

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const session = load(id, user.id);
    if (!session) return notFound("Session introuvable.");
    return ok(session);
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const session = load(id, user.id);
    if (!session) return notFound("Session introuvable.");
    const body = (await req.json()) as { questionId: string; answer: string };
    const q = session.questions.find((x) => x.id === body.questionId);
    if (!q) return notFound("Question introuvable.");
    const ev = (await evaluateAnswer(q.question, body.answer || "", session.role)).data;
    const questions = session.questions.map((x) => x.id === body.questionId
      ? { ...x, answer: body.answer, score: ev.score, feedback: ev.feedback, better_answer: ev.better_answer }
      : x);
    run("UPDATE coach_sessions SET questions=? WHERE id=?", JSON.stringify(questions), id);
    audit(user.id, "coach.answer", "coach_session", id, { questionId: body.questionId, score: ev.score });
    return ok({ questions, evaluation: ev });
  });
}

export async function POST(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const session = load(id, user.id);
    if (!session) return notFound("Session introuvable.");
    const answered = session.questions.filter((q) => q.answer);
    const report = (await buildCoachReport(
      answered.map((q) => ({ question: q.question, answer: q.answer || "", score: q.score || 0, category: q.category })),
      session.role
    )).data;
    run("UPDATE coach_sessions SET report=?, score=?, finished_at=? WHERE id=?",
      JSON.stringify(report), report.overall, now(), id);
    audit(user.id, "coach.finished", "coach_session", id, { score: report.overall });
    return ok(report);
  });
}
