"use client";

import { useState } from "react";
import { Users, Search, Shield, Coins, Ban, CheckCircle2, Trash2, KeyRound, Crown } from "lucide-react";
import { useApi, apiJson } from "@/components/hooks";
import { Badge, Button, Card, Input, Modal, Spinner } from "@/components/ui";
import { useApp } from "@/components/providers";
import { formatDate, cn } from "@/lib/utils";

interface U {
  id: string; email: string; full_name: string; role: string; status: string; admin_verified: number;
  plan: string; credits_balance: number; created_at: string; last_login_at: string | null; resumes: number; applications: number;
}

export default function AdminUsers() {
  const { data: users, loading, reload } = useApi<U[]>("/api/admin/users");
  const { toast } = useApp();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<U | null>(null);
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function action(u: U, body: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const res = await apiJson<{ temporaryPassword?: string; note?: string }>("/api/admin/users", "PATCH", { id: u.id, ...body });
      toast(res.data.temporaryPassword ? `Mot de passe temporaire : ${res.data.temporaryPassword}` : "Action effectuée.", "success");
      await reload();
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setBusy(false); }
  }

  const filtered = (users || []).filter((u) => `${u.email} ${u.full_name}`.toLowerCase().includes(q.toLowerCase()));

  if (loading) return <div className="grid place-items-center py-24"><Spinner /></div>;

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" /><Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un utilisateur…" /></div>
        <Badge tone="indigo">{users?.length || 0} comptes</Badge>
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b text-[11px] uppercase jm-muted"><tr><th className="px-4 py-3">Utilisateur</th><th className="px-4 py-3">Rôle</th><th className="px-4 py-3">Forfait</th><th className="px-4 py-3">Crédits</th><th className="px-4 py-3">Activité</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody className="divide-y">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-indigo-500/[.03]">
                <td className="px-4 py-3"><p className="font-semibold">{u.full_name}</p><p className="text-xs jm-muted">{u.email}</p><p className="text-[10px] jm-muted">Inscrit le {formatDate(u.created_at)}</p></td>
                <td className="px-4 py-3"><Badge tone={u.role === "admin" ? "violet" : "slate"}>{u.role === "admin" ? <Crown className="h-3 w-3" /> : <Users className="h-3 w-3" />}{u.role}{u.admin_verified === 1 ? " ✓" : ""}</Badge></td>
                <td className="px-4 py-3 text-xs">{u.plan}</td>
                <td className="px-4 py-3"><span className={cn("font-bold", u.credits_balance < 0 ? "text-emerald-500" : "text-indigo-500")}>{u.credits_balance < 0 ? "∞" : u.credits_balance}</span></td>
                <td className="px-4 py-3 text-xs jm-muted">{u.resumes} CV · {u.applications} cand.<br />{u.last_login_at ? formatDate(u.last_login_at) : "Jamais connecté"}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" title="Attribuer des crédits" onClick={() => { setSelected(u); setAmount(100); }}><Coins className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" title={u.status === "active" ? "Suspendre" : "Activer"} onClick={() => action(u, { action: u.status === "active" ? "suspend" : "activate" }, `Confirmer ?`)}>{u.status === "active" ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}</Button>
                  <Button size="sm" variant="ghost" title={u.role === "admin" ? "Rétrograder" : "Promouvoir admin (vérification requise)"} onClick={() => action(u, { action: "role", role: u.role === "admin" ? "user" : "admin", verified: u.role !== "admin" ? true : false }, "Confirmer le changement de rôle ?")}><Shield className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" title="Réinitialiser le mot de passe" onClick={() => action(u, { action: "reset_password" }, "Générer un mot de passe temporaire ?")}><KeyRound className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-rose-500" title="Supprimer" onClick={() => action(u, { action: "delete" }, "Supprimer ce compte ?")}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={`Gérer ${selected?.full_name || ""}`}>
        {selected && <div className="space-y-4">
          <p className="text-sm jm-muted">Email : {selected.email} · Solde actuel : {selected.credits_balance < 0 ? "illimité" : selected.credits_balance}</p>
          <label className="jm-label">Crédits à attribuer</label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          <label className="jm-label">Motif</label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Promotion, geste commercial…" />
          <div className="flex flex-wrap gap-2">
            <Button loading={busy} onClick={() => { void action(selected, { action: "credits", amount, reason }); setSelected(null); }}>Attribuer</Button>
            <Button variant="outline" loading={busy} onClick={() => { void action(selected, { action: "unlimited", value: selected.credits_balance !== -1 }); setSelected(null); }}>{selected.credits_balance === -1 ? "Retirer illimité" : "Solde illimité"}</Button>
            <select className="jm-input max-w-[180px]" defaultValue="" onChange={(e) => { if (e.target.value) { void action(selected, { action: "plan", plan: e.target.value }); setSelected(null); } }}>
              <option value="">Changer de forfait…</option>{["free", "starter", "premium", "business"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>}
      </Modal>
    </div>
  );
}
