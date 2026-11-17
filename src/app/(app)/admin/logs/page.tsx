"use client";

import { ScrollText, Trash2 } from "lucide-react";
import { useApi, apiFetch } from "@/components/hooks";
import { Badge, Button, Card, Spinner } from "@/components/ui";
import { useApp } from "@/components/providers";
import { formatDateTime } from "@/lib/utils";

interface Log { id: string; action: string; actor_email: string | null; target_type: string; target_id: string; metadata: Record<string, unknown>; ip: string; created_at: string }

export default function AdminLogs() {
  const { data, loading, reload } = useApi<Log[]>("/api/admin/logs");
  const { toast } = useApp();
  if (loading) return <div className="grid place-items-center py-24"><Spinner /></div>;
  return (
    <div className="space-y-5">
      <div className="flex justify-end"><Button variant="outline" size="sm" onClick={async () => {
        if (!confirm("Purger les journaux de plus de 90 jours ?")) return;
        await apiFetch("/api/admin/logs", { method: "DELETE" }); toast("Journaux purgés.", "success"); await reload();
      }}><Trash2 className="h-4 w-4" /> Purger les anciens journaux</Button></div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[800px] text-left text-xs">
          <thead className="border-b uppercase jm-muted"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Acteur</th><th className="px-4 py-3">Cible</th><th className="px-4 py-3">IP</th></tr></thead>
          <tbody className="divide-y">{(data || []).map((l) => (
            <tr key={l.id}><td className="px-4 py-2.5 whitespace-nowrap jm-muted">{formatDateTime(l.created_at)}</td>
              <td className="px-4 py-2.5"><Badge tone={l.action.includes("delete") || l.action.includes("failed") ? "rose" : "indigo"}>{l.action}</Badge></td>
              <td className="px-4 py-2.5">{l.actor_email || "Système"}</td>
              <td className="px-4 py-2.5 jm-muted">{l.target_type} {l.target_id ? `· ${l.target_id.slice(0, 12)}` : ""}</td>
              <td className="px-4 py-2.5 jm-muted">{l.ip || "—"}</td></tr>
          ))}</tbody>
        </table>
        {!data?.length && <p className="p-6 text-sm jm-muted">Aucune entrée.</p>}
      </Card>
    </div>
  );
}
