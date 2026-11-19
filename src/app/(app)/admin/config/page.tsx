"use client";

import { useState } from "react";
import { PlugZap, Save, ExternalLink, CheckCircle2, AlertCircle, Mail, CreditCard } from "lucide-react";
import { useApi, apiJson } from "@/components/hooks";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { useApp } from "@/components/providers";

interface Connector { id: string; name: string; homepage: string; requiresKey: boolean; configured: boolean }
interface Data { connectors: Connector[]; smtp: Record<string, string>; stripe: Record<string, string>; demoMode: boolean }

const CONNECTOR_FIELDS: Record<string, { key: string; label: string }[]> = {
  connector_francetravail: [{ key: "clientId", label: "Client ID" }, { key: "clientSecret", label: "Client secret" }],
  connector_wttj: [{ key: "apiKey", label: "Clé API" }],
};

export default function AdminConfigPage() {
  const { data, loading, reload } = useApi<Data>("/api/admin/config");
  const { toast } = useApp();
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState("");

  async function save(section: string) {
    setBusy(section);
    try {
      await apiJson("/api/admin/config", "PATCH", { section, values: values[section] || {} });
      toast("Intégration enregistrée.", "success");
      await reload();
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setBusy(""); }
  }
  const set = (section: string, key: string, v: string) => setValues((p) => ({ ...p, [section]: { ...(p[section] || {}), [key]: v } }));

  if (loading || !data) return null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4 text-xs">
        <strong>Respect des conditions d'utilisation.</strong> JOBMASTER AI utilise exclusivement des API officielles et des sources accessibles. Aucun CAPTCHA, protection anti-robot ou restriction technique n'est contourné. Les connecteurs non configurés restent désactivés ; le jeu de données de démonstration prend le relais.
      </div>

      <Card className="space-y-4">
        <h2 className="flex items-center gap-2 font-bold"><PlugZap className="h-4 w-4 text-indigo-500" /> Connecteurs d'offres d'emploi</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {data.connectors.map((c) => (
            <div key={c.id} className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{c.name}</p>
                <Badge tone={c.configured ? "green" : "amber"}>{c.configured ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}{c.configured ? "Connecté" : "Non configuré"}</Badge>
              </div>
              <a href={c.homepage} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-indigo-500">{c.homepage} <ExternalLink className="h-3 w-3" /></a>
              {CONNECTOR_FIELDS[c.id] && (
                <div className="mt-3 space-y-2">
                  {CONNECTOR_FIELDS[c.id].map((f) => <Field key={f.key} label={f.label}><Input type="password" value={values[c.id]?.[f.key] ?? ""} onChange={(e) => set(c.id, f.key, e.target.value)} placeholder="Laisser vide pour conserver" /></Field>)}
                  <Button size="sm" onClick={() => save(c.id)} loading={busy === c.id}><Save className="h-3.5 w-3.5" /> Enregistrer</Button>
                </div>
              )}
              {c.id === "francetravail" && (
                <p className="mt-2 text-[11px] jm-muted">
                  API gratuite (inscription requise) : <a href="https://francetravail.io" target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">francetravail.io</a> → Se connecter → Créer un compte → Mon espace → Mes applications → Créer une application → souscrire à « Offres d'emploi v2 » → récupérer client_id / client_secret. C'est la source de référence pour les offres en France.
                </p>
              )}
              {!CONNECTOR_FIELDS[c.id] && <p className="mt-2 text-[11px] jm-muted">{c.requiresKey ? "Clé à configurer via les variables d'environnement." : "API publique gratuite, active sans clé."}</p>}
            </div>
          ))}
        </div>
        <p className="text-[11px] jm-muted">Les carrières d'entreprises (Malt, Swile, BlaBlaCar, Heetch, AllTrails) sont interrogées via l'API publique Lever, sans clé. Autres sources (Apec, HelloWork, JobTeaser, LinkedIn) : connecteurs à activer sous réserve d'accords d'intégration officiels. Aucun scraping de pages protégées n'est réalisé.</p>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold"><Mail className="h-4 w-4 text-indigo-500" /> Serveur SMTP (envoi des candidatures)</h2>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setValues((p) => ({ ...p, smtp: { ...(p.smtp || {}), host: "smtp.gmail.com", port: "587" } }))} className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold hover:bg-indigo-500/10">Gmail</button>
            <button type="button" onClick={() => setValues((p) => ({ ...p, smtp: { ...(p.smtp || {}), host: "smtp-mail.outlook.com", port: "587" } }))} className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold hover:bg-indigo-500/10">Outlook</button>
            <button type="button" onClick={() => setValues((p) => ({ ...p, smtp: { ...(p.smtp || {}), host: "smtp.orange.fr", port: "587" } }))} className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold hover:bg-indigo-500/10">Orange</button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[{ k: "host", l: "Hôte" }, { k: "port", l: "Port" }, { k: "user", l: "Utilisateur" }, { k: "pass", l: "Mot de passe / App password" }, { k: "from", l: "Expéditeur" }].map((f) => (
            <Field key={f.k} label={f.l}><Input type={f.k === "pass" ? "password" : "text"} value={values.smtp?.[f.k] ?? data.smtp?.[f.k] ?? ""} onChange={(e) => set("smtp", f.k, e.target.value)} placeholder={f.k === "port" ? "587" : ""} /></Field>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save("smtp")} loading={busy === "smtp"}><Save className="h-4 w-4" /> Enregistrer SMTP</Button>
          <Button variant="outline" loading={busy === "test"} onClick={async () => {
            const to = prompt("Email de test (recevez un message pour valider la config) :", values.smtp?.user || data.smtp?.user || "");
            if (!to) return;
            setBusy("test");
            try {
              await save("smtp");
              const r = await apiJson<{ status: string; message: string }>("/api/admin/test-email", "POST", { to });
              toast(r.data.message + (r.data.status === "sent" ? " Vérifiez votre boîte mail." : ""), r.data.status === "sent" ? "success" : "info");
            } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
            finally { setBusy(""); }
          }}><Mail className="h-4 w-4" /> Envoyer un email de test</Button>
        </div>
        <div className="rounded-xl bg-indigo-500/5 p-3 text-xs jm-muted">
          <strong>Gmail</strong> : activez la validation en 2 étapes, puis créez un <em>Mot de passe d'application</em> dans myaccount.google.com/apppasswords (16 caractères) — utilisez-le comme mot de passe.
          <br /><strong>Sans configuration</strong> : les candidatures restent journalisées en mode démonstration et ne sont jamais envoyées. Les CV et lettres générés sont joints à l'email dès qu'un SMTP est actif.
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="flex items-center gap-2 font-bold"><CreditCard className="h-4 w-4 text-indigo-500" /> Stripe (paiements)</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Secret key"><Input type="password" value={values.stripe?.secretKey ?? data.stripe?.secretKey ?? ""} onChange={(e) => set("stripe", "secretKey", e.target.value)} placeholder="sk_…" /></Field>
          <Field label="Webhook secret"><Input type="password" value={values.stripe?.webhookSecret ?? data.stripe?.webhookSecret ?? ""} onChange={(e) => set("stripe", "webhookSecret", e.target.value)} placeholder="whsec_…" /></Field>
        </div>
        <Button onClick={() => save("stripe")} loading={busy === "stripe"}><Save className="h-4 w-4" /> Enregistrer Stripe</Button>
      </Card>
    </div>
  );
}
