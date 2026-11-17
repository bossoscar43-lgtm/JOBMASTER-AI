"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FileText, UploadCloud, Sparkles, Download, Trash2, Star, CheckCircle2, AlertCircle } from "lucide-react";
import { useApi, apiFetch, apiJson, safeJson } from "@/components/hooks";
import { Badge, Button, Card, EmptyState, Modal, Spinner, Progress } from "@/components/ui";
import { useApp } from "@/components/providers";
import { formatDate } from "@/lib/utils";
import type { Resume } from "@/lib/types";

interface Analysis { id: string; name: string; aiMode: string; note?: string; warning?: string; analysis: { skills?: string[]; domains?: string[]; experience_years?: number }; creditsUsed?: number }

export default function ResumesPage() {
  const { data: resumes, loading, reload } = useApi<Resume[]>("/api/resumes");
  const { toast } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<Analysis | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setStep(1);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/resumes", { method: "POST", body: fd });
      const json = await safeJson(res);
      if (!json.ok) throw new Error(json.error);
      setResult(json.data);
      setStep(2);
      toast("CV analysé avec succès.", "success");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Échec de l'import.", "error");
      setStep(0);
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer définitivement ce CV et ses versions ?")) return;
    try {
      await apiFetch(`/api/resumes/${id}`, { method: "DELETE" });
      toast("CV supprimé.", "success");
      await reload();
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
  }

  async function setPrimary(id: string) {
    await apiJson(`/api/resumes/${id}`, "PATCH", { is_primary: true });
    toast("CV principal défini.", "success");
    await reload();
  }

  if (loading) return <div className="grid place-items-center py-32"><Spinner /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Mes CV</h1>
        <p className="mt-1 text-sm jm-muted">Importez votre CV une fois ; l'IA l'analysera et le déclinera pour chaque offre.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) void upload(f); }}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-9 text-center transition ${dragging ? "border-indigo-500 bg-indigo-500/5" : "opacity-90"}`}>
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500">
              <UploadCloud className="h-7 w-7" />
            </div>
            <p className="font-semibold">Déposez votre CV ici</p>
            <p className="mt-1 text-xs jm-muted">PDF, DOCX ou TXT · 10 Mo maximum</p>
            <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,application/pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
            <Button className="mt-5" onClick={() => inputRef.current?.click()} loading={uploading}>Parcourir mes fichiers</Button>
            <p className="mt-4 flex items-center gap-1.5 text-[11px] jm-muted"><Sparkles className="h-3 w-3" /> Analyse IA : diplômes, compétences, expériences et qualités réelles</p>
          </div>
          {uploading && (
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-xs"><span>Analyse en cours…</span><span>{step === 1 ? "40%" : "100%"}</span></div>
              <Progress value={step === 1 ? 40 : 95} />
            </div>
          )}
        </Card>

        <div className="space-y-3 lg:col-span-3">
          {resumes?.length ? resumes.map((r) => (
            <Card key={r.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-500"><FileText className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{r.name}</p>
                  {r.is_primary ? <Badge tone="green"><Star className="h-3 w-3" /> Principal</Badge> : <Badge tone="slate">v{r.version}</Badge>}
                </div>
                <p className="mt-1 text-xs jm-muted">{r.original_filename} · {formatDate(r.created_at)} · {r.extracted_profile.skills?.length || 0} compétences détectées</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {!r.is_primary && <Button size="sm" variant="ghost" onClick={() => setPrimary(r.id)} title="Définir comme principal"><Star className="h-4 w-4" /></Button>}
                <a href={`/api/resumes/${r.id}/download?format=pdf`}><Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" /> PDF</Button></a>
                <a href={`/api/resumes/${r.id}/download?format=docx`}><Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" /> DOCX</Button></a>
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="text-rose-500"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          )) : !uploading && (
            <EmptyState icon={<FileText className="h-6 w-6" />} title="Aucun CV pour le moment" description="Importez votre premier CV pour activer la recherche automatique et l'adaptation IA." />
          )}
        </div>
      </div>

      <Modal open={Boolean(result)} onClose={() => setResult(null)} title="Analyse de votre CV terminée">
        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div><p className="text-sm font-semibold">{result.name}</p><p className="text-xs jm-muted">Profil extrait et enregistré avec succès.</p></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="indigo">Mode IA : {result.aiMode === "openai" ? "OpenAI" : "Local"}</Badge>
              <Badge tone="violet">{result.analysis.skills?.length || 0} compétences</Badge>
              <Badge tone="green">{result.analysis.experience_years || 0} an(s) d'expérience</Badge>
            </div>
            {result.analysis.skills?.length ? <div><p className="jm-label">Compétences détectées</p><div className="flex flex-wrap gap-1.5">{result.analysis.skills.map((s) => <Badge key={s} tone="slate">{s}</Badge>)}</div></div> : null}
            {result.warning && <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-600"><AlertCircle className="h-4 w-4 shrink-0" />{result.warning}</p>}
            <p className="text-[11px] jm-muted">{result.note}</p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => { setResult(null); window.location.href = "/profile"; }}>Compléter mon profil</Button>
              <Button variant="outline" className="flex-1" onClick={() => { setResult(null); window.location.href = "/search"; }}>Lancer la recherche</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
