"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Save, Download, CalendarClock, ExternalLink, ShieldCheck, FileText, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { useApi, apiFetch, apiJson } from "@/components/hooks";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { useApp } from "@/components/providers";
import { formatDate, STATUS_LABELS, STATUS_COLORS, cn } from "@/lib/utils";
import type { Application } from "@/lib/types";

export function ApplicationDetailView({ id }: { id: string }) {
  const { data: app, loading, reload } = useApi<Application>(`/api/applications/${id}`);
  const { toast } = useApp();
  const [form, setForm] = useState<Application | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [recruiter, setRecruiter] = useState<{ email: string; source: string; confidence: string; note: string } | null>(null);
  const [finding, setFinding] = useState(false);

  useEffect(() => { if (app) setForm(app); }, [app]);

  async function findRecruiter() {
    setFinding(true);
    try {
      const r = await apiFetch<{ email: string; source: string; confidence: string; note: string } | null>(
        `/api/applications/${id}/find-recruiter`
      );
      setRecruiter(r);
      if (r?.email) setRecipient(r.email);
      toast(r ? `Email trouvé : ${r.email}` : "Aucun email trouvé dans l'annonce.", r ? "success" : "info");
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setFinding(false); }
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      await apiJson(`/api/applications/${id}`, "PATCH", {
        cover_letter: form.cover_letter, email_subject: form.email_subject,
        email_body: form.email_body, linkedin_message: form.linkedin_message,
        recruiter_answers: form.recruiter_answers, notes: form.notes,
        status: form.status,
        next_followup_at: form.next_followup_at || null,
      });
      toast("Candidature mise à jour.", "success");
      await reload();
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setSaving(false); }
  }

  async function send(mode: "email" | "assisted") {
    if (!authorized && mode === "email") { toast("Cochez l'autorisation explicite avant l'envoi.", "error"); return; }
    setSending(true);
    try {
      const res = await apiJson<{ status: string; message: string; url?: string; to?: string }>(`/api/applications/${id}/send`, "POST", {
        authorized: true,
        ...(recipient ? { to: recipient } : {}),
        mode,
      });
      toast(res.data.to ? `${res.data.message} Destinataire : ${res.data.to}` : res.data.message, "success");
      if (res.data.url) window.open(res.data.url, "_blank", "noopener,noreferrer");
      await reload();
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setSending(false); }
  }

  if (loading) return <div className="grid place-items-center py-32"><Spinner /></div>;
  if (!app || !form) return <EmptyState title="Candidature introuvable" action={<Link href="/applications"><Button>Retour</Button></Link>} />;

  return (
    <div className="space-y-6 animate-fade-up">
      <Link href="/applications" className="inline-flex items-center gap-1.5 text-xs font-semibold jm-muted hover:text-indigo-500"><ArrowLeft className="h-4 w-4" /> Mes candidatures</Link>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight">{app.job?.title}</h1>
            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", STATUS_COLORS[form.status])}>{STATUS_LABELS[form.status]}</span>
          </div>
          <p className="mt-1 text-sm jm-muted">{app.job?.company} · {app.job?.city} · {app.job?.contract_type}</p>
        </div>
        <div className="flex gap-2">
          {app.job?.url && <a href={app.job.url} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> Annonce</Button></a>}
          <Button size="sm" onClick={save} loading={saving}><Save className="h-4 w-4" /> Enregistrer</Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="font-bold">Lettre de motivation</h2><Badge tone="indigo">Modifiable</Badge></div>
            <Textarea className="min-h-[260px] font-serif text-[13px] leading-7" value={form.cover_letter} onChange={(e) => setForm({ ...form, cover_letter: e.target.value })} />
          </Card>
          <Card className="space-y-4">
            <h2 className="font-bold">Email de candidature</h2>
            <Field label="Objet"><Input value={form.email_subject} onChange={(e) => setForm({ ...form, email_subject: e.target.value })} /></Field>
            <Field label="Message"><Textarea className="min-h-[200px]" value={form.email_body} onChange={(e) => setForm({ ...form, email_body: e.target.value })} /></Field>
            <Field label="Message LinkedIn"><Textarea className="min-h-[100px]" value={form.linkedin_message} onChange={(e) => setForm({ ...form, linkedin_message: e.target.value })} /></Field>
          </Card>
          <Card className="space-y-4">
            <h2 className="font-bold">Réponses au recruteur</h2>
            {Object.entries(form.recruiter_answers || {}).map(([k, v]) => (
              <Field key={k} label={k}>
                <Textarea className="min-h-[80px]" value={v} onChange={(e) => setForm({ ...form, recruiter_answers: { ...form.recruiter_answers, [k]: e.target.value } })} />
              </Field>
            ))}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="space-y-4">
            <h2 className="font-bold">Suivi</h2>
            <Field label="Statut">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Application["status"] })}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Prochaine relance"><Input type="date" value={form.next_followup_at ? form.next_followup_at.slice(0, 10) : ""} onChange={(e) => setForm({ ...form, next_followup_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
            <Field label="Notes"><Textarea className="min-h-[90px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes internes…" /></Field>
            {app.resume_version_id && (
              <div className="rounded-xl border p-3 text-xs">
                <p className="flex items-center gap-1.5 font-semibold"><FileText className="h-3.5 w-3.5 text-indigo-500" /> Documents générés</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <a href={`/api/documents/${app.resume_version_id}?format=pdf`}><Button size="sm" variant="outline" className="text-[10px]">PDF</Button></a>
                  <a href={`/api/documents/${app.resume_version_id}?format=docx`}><Button size="sm" variant="outline" className="text-[10px]">DOCX</Button></a>
                </div>
              </div>
            )}
          </Card>

          <Card className="border-indigo-500/25 space-y-4">
            <h2 className="flex items-center gap-2 font-bold"><Send className="h-4 w-4 text-indigo-500" /> Envoyer ma candidature</h2>
            <Field label="Email du recruteur">
              <div className="flex gap-2">
                <Input type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Trouvé automatiquement depuis l'annonce" />
                <Button type="button" variant="outline" size="sm" onClick={findRecruiter} loading={finding} title="Trouver l'email du recruteur"><Search className="h-4 w-4" /></Button>
              </div>
            </Field>
            {recruiter && (
              <div className={`rounded-lg p-2.5 text-[11px] ${recruiter.confidence === "high" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                <p className="flex items-center gap-1.5 font-semibold">
                  {recruiter.confidence === "high" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {recruiter.source === "description" ? "Trouvé dans l'annonce" : "Adresse probable"}
                </p>
                <p className="mt-1">{recruiter.note}</p>
              </div>
            )}
            <p className="text-[11px] jm-muted">Cliquez sur 🔍 pour retrouver automatiquement l'email du recruteur dans l'annonce. Les coordonnées du candidat sont ajoutées à l'email.</p>
            <label className="flex items-start gap-2.5 rounded-xl border p-3 text-xs">
              <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-600" />
              <span>J'autorise explicitement JOBMASTER AI à envoyer cette candidature par email à l'adresse indiquée. Je confirme avoir relu les documents.</span>
            </label>
            <Button className="w-full" loading={sending} disabled={!authorized || !recipient} onClick={() => send("email")}><ShieldCheck className="h-4 w-4" /> Envoyer avec mon accord</Button>
            <Button variant="outline" className="w-full" size="sm" onClick={() => send("assisted")}>Ouvrir le formulaire externe (assistance)</Button>
            <p className="text-[11px] jm-muted">Aucun CAPTCHA ni protection anti-robot n'est contourné. Pour les sites externes, l'assistance ouvre l'annonce et vous remplissez le formulaire vous-même. En mode démo, l'email est journalisé sans être envoyé.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
