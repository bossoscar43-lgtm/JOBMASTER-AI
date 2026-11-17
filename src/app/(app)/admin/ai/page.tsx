"use client";

import { useEffect, useState } from "react";
import { Bot, Save, KeyRound, AlertCircle } from "lucide-react";
import { useApi, apiJson } from "@/components/hooks";
import { Badge, Button, Card, Field, Input, Spinner, Textarea } from "@/components/ui";
import { useApp } from "@/components/providers";

interface AiConfig {
  provider: string; model: string; temperature: number; maxTokens: number;
  monthlyBudgetUsd: number; spentUsd: number; maxAiScoredJobs: number; prompts: Record<string, string>;
  apiKeyConfigured: boolean; apiKeyHint: string; apiKey?: string;
}

export default function AdminAiPage() {
  const { data, loading, reload } = useApi<AiConfig>("/api/admin/ai");
  const { toast } = useApp();
  const [form, setForm] = useState<AiConfig | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setForm(data); }, [data]);

  async function save() {
    if (!form) return;
    setBusy(true);
    try {
      await apiJson("/api/admin/ai", "PATCH", form);
      toast("Configuration IA enregistrée.", "success");
      await reload();
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setBusy(false); }
  }

  if (loading || !form) return <div className="grid place-items-center py-24"><Spinner /></div>;

  return (
    <div className="space-y-5">
      <div className="flex justify-end"><Button onClick={save} loading={busy}><Save className="h-4 w-4" /> Enregistrer</Button></div>
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-bold"><Bot className="h-4 w-4 text-indigo-500" /> Fournisseur et modèle</h2>
          <Badge tone={form.apiKeyConfigured ? "green" : "amber"}>{form.apiKeyConfigured ? `Clé active ${form.apiKeyHint}` : "Aucune clé — mode local"}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Fournisseur"><select className="jm-input" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}><option value="openai">OpenAI</option><option value="local">Moteur local</option></select></Field>
          <Field label="Modèle"><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="gpt-4o-mini" /></Field>
          <Field label="Température"><Input type="number" step="0.1" min="0" max="2" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })} /></Field>
          <Field label="Max tokens"><Input type="number" value={form.maxTokens} onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Clé API OpenAI" hint="Stockée chiffrée dans la configuration serveur ; seule une indication est affichée ici.">
          <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 opacity-50" /><Input type="password" value={form.apiKey || ""} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder={form.apiKeyConfigured ? "Laisser vide pour conserver la clé actuelle" : "sk-…"} /></div>
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Budget mensuel (USD)"><Input type="number" value={form.monthlyBudgetUsd} onChange={(e) => setForm({ ...form, monthlyBudgetUsd: Number(e.target.value) })} /></Field>
          <Field label="Dépensé suivi (USD)"><Input type="number" value={form.spentUsd} onChange={(e) => setForm({ ...form, spentUsd: Number(e.target.value) })} /></Field>
          <Field label="Offres scorées par l'IA payante" hint="Les autres utilisent le moteur local pour limiter les coûts réels."><Input type="number" min="0" value={form.maxAiScoredJobs ?? 15} onChange={(e) => setForm({ ...form, maxAiScoredJobs: Number(e.target.value) })} /></Field>
        </div>
        <p className="flex gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-600"><AlertCircle className="h-4 w-4 shrink-0" />Les crédits illimités de l'administrateur ne signifient pas des appels API gratuits. Les coûts réels du fournisseur doivent être suivis et budgétés séparément.</p>
      </Card>
      <Card className="space-y-4">
        <h2 className="font-bold">Prompts système</h2>
        <p className="text-xs jm-muted">Modifiez les instructions utilisées par chaque tâche IA. Le moteur local reste disponible sans clé externe.</p>
        {Object.entries(form.prompts).map(([key, value]) => (
          <Field key={key} label={key}>
            <Textarea className="min-h-[90px] font-mono text-xs" value={value} onChange={(e) => setForm({ ...form, prompts: { ...form.prompts, [key]: e.target.value } })} />
          </Field>
        ))}
      </Card>
    </div>
  );
}
