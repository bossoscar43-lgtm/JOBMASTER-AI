"use client";

import Link from "next/link";
import { BriefcaseBusiness, FileText, Send, TrendingUp, Target, Sparkles, Bell, CalendarClock, ArrowRight, Zap } from "lucide-react";
import { useApi } from "@/components/hooks";
import { Badge, Button, Card, EmptyState, Spinner, StatCard } from "@/components/ui";
import { BarChart, Donut } from "@/components/charts";
import { useApp } from "@/components/providers";
import { relativeDate, STATUS_LABELS, STATUS_COLORS, cn } from "@/lib/utils";

interface DashboardData {
  stats: { jobsFound: number; prepared: number; sent: number; responses: number; interviews: number; avgScore: number; credits: number };
  distribution: { label: string; value: number; color: string }[];
  activity: { date: string; count: number }[];
  followups: { id: string; company?: string; title?: string; at: string }[];
  recent: { id: string; company?: string; title?: string; status: string; updated_at: string }[];
  notifications: { id: string; type: string; title: string; body: string; created_at: string }[];
  resumeCount: number;
}

export default function DashboardPage() {
  const { data, loading, error } = useApi<DashboardData>("/api/dashboard");
  const { data: me } = useApi<{ full_name: string }>("/api/auth/me");
  const { toast } = useApp();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  if (loading) return <div className="grid place-items-center py-32"><Spinner /></div>;
  if (error || !data) return <EmptyState title="Impossible de charger le tableau de bord" description={error || ""} />;

  const s = data.stats;
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Tableau de bord</h1>
          <p className="mt-1 text-sm jm-muted">{greeting} {me?.full_name?.split(" ")[0] || ""} 👋 Voici où en est votre recherche aujourd'hui.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/resumes"><Button variant="outline" size="sm"><FileText className="h-4 w-4" /> Mes CV</Button></Link>
          <Link href="/search"><Button size="sm"><Zap className="h-4 w-4" /> Rechercher</Button></Link>
        </div>
      </div>

      {data.resumeCount === 0 && (
        <div className="jm-gradient flex flex-col items-start justify-between gap-4 rounded-2xl p-6 text-white md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15"><Sparkles className="h-6 w-6" /></div>
            <div>
              <p className="font-bold">Commencez par importer votre CV</p>
              <p className="mt-1 text-sm text-white/80">L'IA l'analysera et préparera tout le reste. Une seule fois suffit.</p>
            </div>
          </div>
          <Link href="/resumes"><Button variant="secondary" className="shrink-0 bg-white text-indigo-700">Importer mon CV <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      )}

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Offres trouvées" value={s.jobsFound} icon={<Target className="h-5 w-5" />} />
        <StatCard label="Candidatures préparées" value={s.prepared} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Candidatures envoyées" value={s.sent} icon={<Send className="h-5 w-5" />} />
        <StatCard label="Entretiens obtenus" value={s.interviews} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div><h2 className="font-bold">Activité récente</h2><p className="text-xs jm-muted">Candidatures créées sur 14 jours</p></div>
            <Badge tone="indigo">{s.avgScore}% compatibilité moyenne</Badge>
          </div>
          <BarChart data={data.activity.map((a) => ({ label: a.date, value: a.count }))} />
        </Card>
        <Card>
          <h2 className="mb-5 font-bold">Répartition</h2>
          {data.distribution.some((d) => d.value > 0) ? <Donut segments={data.distribution} /> : <p className="text-sm jm-muted">En attente de données.</p>}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Dernières candidatures</h2>
            <Link href="/applications" className="text-xs font-semibold text-indigo-500">Tout voir →</Link>
          </div>
          {data.recent.length ? (
            <div className="space-y-2">
              {data.recent.map((a) => (
                <Link href={`/applications/${a.id}`} key={a.id} className="flex items-center gap-3 rounded-xl border p-3 transition hover:bg-indigo-500/5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-500/10 text-indigo-500"><BriefcaseBusiness className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.title || "Offre"}</p>
                    <p className="text-xs jm-muted">{a.company} · {relativeDate(a.updated_at)}</p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", STATUS_COLORS[a.status])}>{STATUS_LABELS[a.status]}</span>
                </Link>
              ))}
            </div>
          ) : <EmptyState title="Aucune candidature" description="Lancez votre recherche automatique pour commencer." action={<Link href="/search"><Button size="sm">Lancer la recherche</Button></Link>} />}
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-bold"><CalendarClock className="h-4 w-4 text-indigo-500" /> Prochaines relances</h2>
            {data.followups.length ? (
              <div className="space-y-3">
                {data.followups.map((f) => (
                  <div key={f.id} className="rounded-xl border p-3 text-xs">
                    <p className="font-semibold">{f.company}</p>
                    <p className="mt-0.5 jm-muted">{relativeDate(f.at)}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm jm-muted">Aucune relance programmée.</p>}
          </Card>
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-bold"><Bell className="h-4 w-4 text-indigo-500" /> Notifications</h2>
            {data.notifications.length ? (
              <div className="space-y-3">
                {data.notifications.slice(0, 4).map((n) => (
                  <div key={n.id} className="border-l-2 border-indigo-500 pl-3 text-xs">
                    <p className="font-semibold">{n.title}</p>
                    <p className="mt-0.5 jm-muted">{n.body}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm jm-muted">Tout est à jour.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
