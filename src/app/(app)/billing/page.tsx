"use client";

import { useState } from "react";
import { CreditCard, Coins, Check, Zap, ExternalLink, Receipt } from "lucide-react";
import { useApi, apiJson } from "@/components/hooks";
import { Badge, Button, Card, Spinner } from "@/components/ui";
import { useApp } from "@/components/providers";
import { formatDateTime, cn } from "@/lib/utils";

interface Plan { id: string; name: string; price_monthly: number; credits_per_month: number; features: string[] }
interface Data { plans: Plan[]; current: { plan: string; credits: number }; ledger: { id: string; delta: number; reason: string; created_at: string }[]; mode: string; stripeConfigured: boolean }

const NAMES: Record<string, string> = { free: "Gratuit", starter: "Starter", premium: "Premium", business: "Business" };

export default function BillingPage() {
  const { data, loading, reload } = useApi<Data>("/api/billing");
  const { toast } = useApp();
  const [busy, setBusy] = useState("");

  async function select(plan: string) {
    setBusy(plan);
    try {
      const res = await apiJson<{ checkoutUrl?: string; message?: string }>("/api/billing", "POST", { action: "select", plan });
      if (res.data.checkoutUrl) window.location.href = res.data.checkoutUrl;
      else { toast(res.data.message || "Forfait mis à jour.", "success"); await reload(); }
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setBusy(""); }
  }

  if (loading) return <div className="grid place-items-center py-32"><Spinner /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div><h1 className="text-2xl font-extrabold tracking-tight">Abonnements & crédits</h1><p className="mt-1 text-sm jm-muted">Gérez votre forfait et suivez votre consommation IA.</p></div>
        <Card className="flex items-center gap-4 px-5 py-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-500"><Coins className="h-5 w-5" /></div>
          <div><p className="text-xs jm-muted">Solde actuel</p><p className="text-xl font-extrabold">{data.current.credits < 0 ? "Illimité" : data.current.credits}</p></div></Card>
      </div>

      {data.mode === "demo" && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-600"><strong>Mode facturation démonstration.</strong> Aucun paiement réel n'est effectué. Configurez Stripe dans le panneau administrateur pour activer les paiements.</div>}
      {data.current.credits === -1 && <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-xs"><Zap className="mr-2 inline h-4 w-4 text-emerald-500" />Votre solde est illimité (configuration serveur). Les coûts réels des fournisseurs IA restent suivis séparément par l'administrateur.</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.plans.map((p) => {
          const active = data.current.plan === p.name;
          return <Card key={p.id} className={cn("flex flex-col", p.name === "premium" && "ring-2 ring-violet-500")}>
            <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">{NAMES[p.name] || p.name}</h3>{active && <Badge tone="green">Actuel</Badge>}{p.name === "premium" && !active && <Badge>Recommandé</Badge>}</div>
            <p className="text-2xl font-extrabold">{p.price_monthly === 0 ? "Gratuit" : `${(p.price_monthly / 100).toFixed(0)} €`}<span className="text-xs font-normal jm-muted"> /mois</span></p>
            <p className="mt-1 text-xs jm-muted">{p.credits_per_month === 0 ? "Crédits limités" : `${p.credits_per_month} crédits / mois`}</p>
            <ul className="mt-5 flex-1 space-y-2">{p.features.map((f) => <li key={f} className="flex gap-2 text-xs"><Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />{f}</li>)}</ul>
            <Button className="mt-5 w-full" variant={active ? "outline" : p.name === "premium" ? "primary" : "secondary"} disabled={active || busy === p.name} loading={busy === p.name} onClick={() => select(p.name)}>
              {active ? "Forfait actuel" : p.price_monthly ? "Choisir ce forfait" : "Revenir au gratuit"}
            </Button>
          </Card>;
        })}
      </div>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 font-bold"><Receipt className="h-4 w-4 text-indigo-500" /> Historique des crédits</h2>
        {data.ledger.length ? <div className="space-y-2">{data.ledger.slice(0, 20).map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs">
            <div><p className="font-semibold">{l.reason}</p><p className="jm-muted">{formatDateTime(l.created_at)}</p></div>
            <span className={cn("font-bold", l.delta >= 0 ? "text-emerald-500" : "text-rose-500")}>{l.delta > 0 ? "+" : ""}{l.delta}</span>
          </div>
        ))}</div> : <p className="text-sm jm-muted">Aucune opération.</p>}
      </Card>
    </div>
  );
}
