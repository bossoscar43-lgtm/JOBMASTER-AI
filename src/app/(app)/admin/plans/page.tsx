"use client";

import { useState } from "react";
import { Tags, Save } from "lucide-react";
import { useApi, apiJson } from "@/components/hooks";
import { Badge, Button, Card, Field, Input, Spinner } from "@/components/ui";
import { useApp } from "@/components/providers";

interface Plan { id: string; name: string; price_monthly: number; price_yearly: number; credits_per_month: number; features: string[]; is_active: number }

export default function AdminPlans() {
  const { data: plans, loading, reload } = useApi<Plan[]>("/api/admin/plans");
  const { toast } = useApp();
  const [edit, setEdit] = useState<Record<string, Partial<Plan>>>({});
  const [busy, setBusy] = useState("");

  async function save(p: Plan) {
    setBusy(p.id);
    try {
      await apiJson("/api/admin/plans", "PATCH", { id: p.id, ...edit[p.id] });
      toast("Forfait mis à jour.", "success");
      await reload();
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setBusy(""); }
  }

  if (loading) return <div className="grid place-items-center py-24"><Spinner /></div>;
  return (
    <div className="space-y-5">
      <Card className="flex items-center gap-2 text-sm jm-muted"><Tags className="h-4 w-4 text-indigo-500" /> Modifiez les tarifs, quotas de crédits et fonctionnalités affichés aux utilisateurs.</Card>
      <div className="grid gap-4 md:grid-cols-2">
        {(plans || []).map((p) => {
          const e = edit[p.id] || {};
          return <Card key={p.id} className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="font-bold capitalize">{p.name}</h2><Badge tone={p.is_active ? "green" : "slate"}>{p.is_active ? "Actif" : "Inactif"}</Badge></div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prix mensuel (centimes)"><Input type="number" value={e.price_monthly ?? p.price_monthly} onChange={(ev) => setEdit((x) => ({ ...x, [p.id]: { ...e, price_monthly: Number(ev.target.value) } }))} /></Field>
              <Field label="Prix annuel (centimes)"><Input type="number" value={e.price_yearly ?? p.price_yearly} onChange={(ev) => setEdit((x) => ({ ...x, [p.id]: { ...e, price_yearly: Number(ev.target.value) } }))} /></Field>
              <Field label="Crédits / mois"><Input type="number" value={e.credits_per_month ?? p.credits_per_month} onChange={(ev) => setEdit((x) => ({ ...x, [p.id]: { ...e, credits_per_month: Number(ev.target.value) } }))} /></Field>
              <Field label="Statut"><select className="jm-input" value={e.is_active ?? p.is_active} onChange={(ev) => setEdit((x) => ({ ...x, [p.id]: { ...e, is_active: Number(ev.target.value) } }))}><option value={1}>Actif</option><option value={0}>Inactif</option></select></Field>
            </div>
            <Field label="Fonctionnalités (une par ligne)"><textarea className="jm-input min-h-[90px]" value={(e.features ?? p.features).join("\n")} onChange={(ev) => setEdit((x) => ({ ...x, [p.id]: { ...e, features: ev.target.value.split("\n").filter(Boolean) } }))} /></Field>
            <Button size="sm" onClick={() => save(p)} loading={busy === p.id}><Save className="h-3.5 w-3.5" /> Enregistrer</Button>
          </Card>;
        })}
      </div>
    </div>
  );
}
