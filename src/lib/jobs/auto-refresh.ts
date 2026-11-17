import { one, now } from "../db";

let started = false;
let timer: NodeJS.Timeout | null = null;
let nextRunAt: string | null = null;

const INTERVAL_HOURS = Number(process.env.REFRESH_INTERVAL_HOURS || 6);
const INTERVAL_MS = Math.max(1, INTERVAL_HOURS) * 3600000;
const STARTUP_DELAY_MS = 15000; // 15 s après le démarrage

/**
 * Planificateur AUTONOME intégré au serveur Next.js (next start).
 * Démarre une seule fois dans le runtime des API et actualise les offres
 * périodiquement, sans cron externe ni intervention humaine.
 */
export function startAutoRefresh(): void {
  if (started) return;
  if (process.env.AUTO_REFRESH_ENABLED === "false") return;
  started = true;

  const run = async () => {
    try {
      const { refreshAllJobs } = await import("./scheduler");
      const result = await refreshAllJobs();
      nextRunAt = new Date(Date.now() + INTERVAL_MS).toISOString();
      console.log(
        `[AutoRefresh] Terminé : ${result.users} utilisateur(s), ${result.jobs} offres, ` +
        `${result.errors} erreur(s). Prochain dans ${INTERVAL_HOURS} h.`
      );
    } catch (e) {
      console.error("[AutoRefresh] échec :", e instanceof Error ? e.message : e);
      nextRunAt = new Date(Date.now() + INTERVAL_MS).toISOString();
    }
  };

  // Vérifie s'il y a déjà eu une actualisation récente (ex. cron externe).
  const last = one<{ created_at: string }>(
    "SELECT created_at FROM audit_logs WHERE action='cron.jobs.refreshed' ORDER BY created_at DESC LIMIT 1"
  );
  const recent = last && Date.now() - new Date(last.created_at).getTime() < INTERVAL_MS;

  if (recent) {
    nextRunAt = new Date(new Date(last.created_at).getTime() + INTERVAL_MS).toISOString();
    console.log(`[AutoRefresh] Actualisation récente détectée. Prochain ${nextRunAt}`);
  } else {
    setTimeout(() => { void run(); }, STARTUP_DELAY_MS).unref?.();
    nextRunAt = new Date(Date.now() + STARTUP_DELAY_MS + INTERVAL_MS).toISOString();
  }

  timer = setInterval(() => { void run(); }, INTERVAL_MS);
  timer.unref?.();
  console.log(`[AutoRefresh] Actif — intervalle ${INTERVAL_HOURS} h, sans intervention.`);
}

export function getAutoRefreshStatus() {
  return {
    enabled: process.env.AUTO_REFRESH_ENABLED !== "false" && started,
    intervalHours: INTERVAL_HOURS,
    nextRunAt,
  };
}

export function stopAutoRefresh(): void {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}
