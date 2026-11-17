import { run, one, now } from "../db";
import { getProfile } from "../repositories";
import { runSearch } from "./engine";

/**
 * Actualisation automatique des offres pour tous les utilisateurs actifs.
 * Appelé par /api/cron/refresh-jobs (à brancher sur un cron externe :
 * Vercel Cron, GitHub Actions, ou tâche planifiée Windows).
 */
export async function refreshAllJobs(): Promise<{ users: number; jobs: number; errors: number }> {
  const users = (await import("../db")).all<{ id: string }>(
    "SELECT id FROM users WHERE status='active' AND deleted_at IS NULL"
  );
  let jobs = 0;
  let errors = 0;

  for (const u of users) {
    try {
      const profile = getProfile(u.id);
      const result = await runSearch(u.id, { limit: 30, date_posted_days: 30 }, profile);
      jobs += result.jobs.length;
    } catch (e) {
      errors++;
      console.error(`[Cron] refresh user ${u.id}:`, e instanceof Error ? e.message : e);
    }
  }

  run(
    "INSERT INTO audit_logs (id,actor_id,action,target_type,target_id,metadata,ip,created_at) VALUES (?,?,?,?,?,?,?,?)",
    (await import("../db")).uid(), null, "cron.jobs.refreshed", "cron", "jobs",
    JSON.stringify({ users: users.length, jobs, errors }), "", now()
  );
  return { users: users.length, jobs, errors };
}

/** Vérifie si une actualisation est due (intervalle en heures). */
export function isRefreshDue(intervalHours = 6): boolean {
  const row = one<{ created_at: string }>(
    "SELECT created_at FROM audit_logs WHERE action='cron.jobs.refreshed' ORDER BY created_at DESC LIMIT 1"
  );
  if (!row) return true;
  return Date.now() - new Date(row.created_at).getTime() > intervalHours * 3600000;
}
