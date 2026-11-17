"use client";

import { History as HistoryIcon, Search, Mail, FileText, Coins } from "lucide-react";
import { useApi } from "@/components/hooks";
import { Badge, Card, EmptyState, Spinner } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

interface Data {
  searches: { id: string; query: string; results_count: number; created_at: string }[];
  emails: { id: string; to_addr: string; subject: string; status: string; created_at: string }[];
  versions: { id: string; label: string; ai_model: string; resume_name: string; created_at: string }[];
  ledger: { id: string; delta: number; reason: string; balance_after: number; created_at: string }[];
}

export default function HistoryPage() {
  const { data, loading } = useApi<Data>("/api/history");
  if (loading) return <div className="grid place-items-center py-32"><Spinner /></div>;

  const sections = [
    { title: "Recherches", icon: Search, items: data?.searches || [], render: (x: Data["searches"][number]) => ({ main: x.query || "Recherche globale", sub: `${x.results_count} résultats`, at: x.created_at }) },
    { title: "Emails", icon: Mail, items: data?.emails || [], render: (x: Data["emails"][number]) => ({ main: x.subject, sub: `${x.to_addr} · ${x.status}`, at: x.created_at }) },
    { title: "Versions de CV", icon: FileText, items: data?.versions || [], render: (x: Data["versions"][number]) => ({ main: x.label, sub: `${x.resume_name} · ${x.ai_model}`, at: x.created_at }) },
    { title: "Crédits", icon: Coins, items: data?.ledger || [], render: (x: Data["ledger"][number]) => ({ main: x.reason, sub: `${x.delta > 0 ? "+" : ""}${x.delta} · solde ${x.balance_after}`, at: x.created_at }) },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div><h1 className="text-2xl font-extrabold tracking-tight">Historique</h1><p className="mt-1 text-sm jm-muted">Toutes les actions tracées sur votre compte.</p></div>
      <div className="grid gap-5 lg:grid-cols-2">
        {sections.map((s) => {
          const Icon = s.icon;
          return <Card key={s.title}>
            <h2 className="mb-4 flex items-center gap-2 font-bold"><Icon className="h-4 w-4 text-indigo-500" /> {s.title}</h2>
            {s.items.length ? <div className="space-y-2">{s.items.slice(0, 12).map((x, i) => {
              const r = s.render(x as never);
              return <div key={i} className="flex items-start justify-between gap-3 rounded-xl border p-3 text-xs">
                <div className="min-w-0"><p className="truncate font-semibold">{r.main}</p><p className="mt-0.5 jm-muted">{r.sub}</p></div>
                <span className="shrink-0 jm-muted">{formatDateTime(r.at)}</span>
              </div>;
            })}</div> : <p className="text-sm jm-muted">Aucune entrée.</p>}
          </Card>;
        })}
      </div>
    </div>
  );
}
