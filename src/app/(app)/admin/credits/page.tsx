"use client";

import { Coins, Search } from "lucide-react";
import { useApi } from "@/components/hooks";
import { Badge, Card, Input, Spinner } from "@/components/ui";
import { formatDateTime, cn } from "@/lib/utils";

interface Entry { id: string; email: string; delta: number; reason: string; balance_after: number; created_at: string }

export default function AdminCredits() {
  const { data, loading } = useApi<Entry[]>("/api/admin/credits");
  if (loading) return <div className="grid place-items-center py-24"><Spinner /></div>;
  return (
    <div className="space-y-5">
      <Card className="flex items-center gap-3"><Coins className="h-5 w-5 text-indigo-500" /><p className="text-sm jm-muted">Historique global des attributions et consommations de crédits. Les coûts réels des fournisseurs IA sont suivis séparément dans la configuration IA.</p></Card>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b text-[11px] uppercase jm-muted"><tr><th className="px-4 py-3">Utilisateur</th><th className="px-4 py-3">Motif</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Variation</th><th className="px-4 py-3">Solde</th></tr></thead>
          <tbody className="divide-y">{(data || []).map((e) => (
            <tr key={e.id}><td className="px-4 py-2.5 text-xs">{e.email}</td><td className="px-4 py-2.5 text-xs">{e.reason}</td><td className="px-4 py-2.5 text-xs jm-muted">{formatDateTime(e.created_at)}</td>
              <td className={cn("px-4 py-2.5 text-xs font-bold", e.delta >= 0 ? "text-emerald-500" : "text-rose-500")}>{e.delta > 0 ? "+" : ""}{e.delta}</td><td className="px-4 py-2.5 text-xs">{e.balance_after < 0 ? "∞" : e.balance_after}</td></tr>
          ))}</tbody>
        </table>
        {!data?.length && <p className="p-6 text-sm jm-muted">Aucune opération.</p>}
      </Card>
    </div>
  );
}
