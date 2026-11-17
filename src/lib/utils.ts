export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function formatDate(value: string | null | undefined, locale = "fr-FR"): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function formatDateTime(value: string | null | undefined, locale = "fr-FR"): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

export function relativeDate(value: string | null | undefined): string {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 30) return `Il y a ${days} jours`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  return `Il y a ${Math.floor(days / 365)} an(s)`;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

export function downloadBlob(content: BlobPart, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export const SOURCE_LABELS: Record<string, string> = {
  demo: "Démonstration",
  remotive: "Remotive",
  arbeitnow: "Arbeitnow",
  jobicy: "Jobicy",
  lever: "Carrières d'entreprises",
  remoteok: "RemoteOK",
  himalayas: "Himalayas",
  workingnomads: "Working Nomads",
  francetravail: "France Travail",
  wttj: "Welcome to the Jungle",
};

export const STATUS_LABELS: Record<string, string> = {
  detected: "Offre détectée",
  cv_adapted: "CV adapté",
  to_validate: "À valider",
  sent: "Candidature envoyée",
  received: "Candidature reçue",
  interview: "Entretien proposé",
  rejected: "Refus",
  accepted: "Acceptation",
};

export const STATUS_COLORS: Record<string, string> = {
  detected: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  cv_adapted: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  to_validate: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  sent: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  received: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  interview: "bg-purple-500/15 text-purple-600 dark:text-purple-300",
  rejected: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  accepted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
};
