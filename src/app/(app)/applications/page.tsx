"use client";

import Link from "next/link";
import { useState } from "react";
import { Send, Filter, ArrowRight } from "lucide-react";
import { useApi } from "@/components/hooks";
import { Badge, Button, Card, EmptyState, Select, Spinner } from "@/components/ui";
import { relativeDate, STATUS_LABELS, STATUS_COLORS, cn } from "@/lib/utils";
import type { Application } from "@/lib/types";

export default function ApplicationsPage() {
  const { data: apps, loading } = useApi<Application[]>("/api/applications");
  const [status, setStatus] = useState("all");
  const filtered = (apps || []).filter((a) => status === "all" || a.status === status);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div><h1 className="text-2xl font-extrabold tracking-tight">Mes candidatures</h1><p className="mt-1 text-sm jm-muted">Suivez chaque étape, validez vos envois et gérez vos relances.</p></div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 opacity-50" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-52">
            <option value="all">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
      </div>

      {loading ? <div className="grid place-items-center py-24"><Spinner /></div> : filtered.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b text-[11px] uppercase tracking-wide jm-muted">
              <tr><th className="px-5 py-3">Poste / Entreprise</th><th className="px-5 py-3">Statut</th><th className="px-5 py-3">Mise à jour</th><th className="px-5 py-3">Envoi</th><th className="px-5 py-3"></th></tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((a) => (
                <tr key={a.id} className="transition hover:bg-indigo-500/[.03]">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold">{a.job?.title || "Offre"}</p>
                    <p className="text-xs jm-muted">{a.job?.company} · {a.job?.city}</p>
                  </td>
                  <td className="px-5 py-3.5"><span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", STATUS_COLORS[a.status])}>{STATUS_LABELS[a.status]}</span></td>
                  <td className="px-5 py-3.5 text-xs jm-muted">{relativeDate(a.updated_at)}</td>
                  <td className="px-5 py-3.5 text-xs jm-muted">{a.sent_at ? relativeDate(a.sent_at) : "—"}</td>
                  <td className="px-5 py-3.5"><Link href={`/applications/${a.id}`}><Button size="sm" variant="ghost">Gérer <ArrowRight className="h-3.5 w-3.5" /></Button></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState icon={<Send className="h-6 w-6" />} title="Aucune candidature" description="Lancez une recherche automatique : chaque offre trouvée apparaîtra ici." action={<Link href="/search"><Button>Lancer la recherche</Button></Link>} />
      )}
    </div>
  );
}
