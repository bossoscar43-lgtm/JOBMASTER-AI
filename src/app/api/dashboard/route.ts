import { handle, ok, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { getApplications } from "@/lib/repositories";
import { getScoredJobs } from "@/lib/jobs/engine";

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const apps = getApplications(user.id);
    const jobs = getScoredJobs(user.id, 200);
    const statuses = (s: string) => apps.filter((a) => a.status === s).length;

    const byDay: Record<string, number> = {};
    for (const a of apps) {
      const key = a.created_at.slice(0, 10);
      byDay[key] = (byDay[key] || 0) + 1;
    }
    const activity = Object.entries(byDay).sort().slice(-14).map(([date, count]) => ({
      date: date.slice(5), count,
    }));

    const avgScore = jobs.length ? Math.round(jobs.reduce((s, j) => s + j.score, 0) / jobs.length) : 0;
    const notifications = all<Record<string, unknown>>(
      "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 8", user.id
    ).map((n) => ({
      id: String(n.id), type: String(n.type), title: String(n.title), body: String(n.body),
      read_at: n.read_at ? String(n.read_at) : null, created_at: String(n.created_at),
    }));

    const followups = apps.filter((a) => a.next_followup_at && new Date(a.next_followup_at).getTime() > Date.now() && ["sent", "received"].includes(a.status))
      .sort((a, b) => new Date(a.next_followup_at!).getTime() - new Date(b.next_followup_at!).getTime())
      .slice(0, 5)
      .map((a) => ({ id: a.id, company: a.job?.company, title: a.job?.title, at: a.next_followup_at }));

    const recent = apps.slice(0, 6).map((a) => ({
      id: a.id, company: a.job?.company, title: a.job?.title, status: a.status, updated_at: a.updated_at,
    }));
    return ok({
      stats: {
        jobsFound: jobs.length,
        prepared: statuses("to_validate") + statuses("cv_adapted"),
        sent: statuses("sent") + statuses("received") + statuses("interview") + statuses("accepted"),
        responses: statuses("received") + statuses("interview") + statuses("accepted") + statuses("rejected"),
        interviews: statuses("interview"),
        avgScore,
        credits: user.credits_balance,
      },
      distribution: [
        { label: "Détectées", value: statuses("detected"), color: "#94a3b8" },
        { label: "À valider", value: statuses("to_validate"), color: "#f59e0b" },
        { label: "Envoyées", value: statuses("sent"), color: "#3b82f6" },
        { label: "Réponses", value: statuses("received") + statuses("interview"), color: "#8b5cf6" },
      ],
      activity,
      followups,
      recent,
      notifications,
      resumeCount: one<{ c: number }>("SELECT COUNT(*) AS c FROM resumes WHERE user_id=?", user.id)?.c || 0,
    });
  });
}
