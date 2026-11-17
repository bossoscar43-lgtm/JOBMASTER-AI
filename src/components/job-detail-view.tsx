"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, Building2, CalendarDays, ExternalLink, MapPin, Wallet,
  FileCheck2, Sparkles, CheckCircle2, XCircle, Download, Mic2,
} from "lucide-react";
import { useApi, apiJson } from "@/components/hooks";
import { Badge, Button, Card, EmptyState, Select, Spinner } from "@/components/ui";
import { ScoreRing } from "@/components/charts";
import { useApp } from "@/components/providers";
import { relativeDate } from "@/lib/utils";
import type { Job, Resume, Application } from "@/lib/types";

interface Data {
  job: Job;
  match: { score: number; matched_skills: string[]; missing_skills: string[]; reasons: string[] };
  application: Application | null;
}

export function JobDetailView({ id }: { id: string }) {
  const { data, loading } = useApi<Data>(`/api/jobs/${id}`);
  const { data: resumes } = useApi<Resume[]>("/api/resumes");
  const { toast } = useApp();
  const [rid, setRid] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [generation, setGeneration] = useState<{ score: number; versionId: string } | null>(null);

  if (loading) return <div className="grid place-items-center py-32"><Spinner /></div>;
  if (!data) return <EmptyState title="Offre introuvable" action={<Link href="/jobs"><Button>Retour aux offres</Button></Link>} />;

  const { job, match, application } = data;
  return (
    <div className="space-y-6 animate-fade-up">
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-xs font-semibold jm-muted hover:text-indigo-500"><ArrowLeft className="h-4 w-4" /> Retour aux offres</Link>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight">{job.title}</h1>
                  {job.is_demo === 1 && <Badge tone="amber">Offre de démonstration</Badge>}
                </div>
                <p className="mt-2 flex items-center gap-2 text-sm jm-muted"><Building2 className="h-4 w-4" /> {job.company}</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border p-3">
                <ScoreRing score={match.score} size={68} />
                <div><p className="text-xs jm-muted">Compatibilité</p><p className="text-xs font-semibold">{match.score >= 70 ? "Bonne adéquation" : "À évaluer"}</p></div>
              </div>
            </div>
            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2 jm-muted"><MapPin className="h-4 w-4 text-indigo-500" /> {job.city || "Non précisé"}</p>
              <p className="flex items-center gap-2 jm-muted"><FileCheck2 className="h-4 w-4 text-indigo-500" /> {job.contract_type}</p>
              <p className="flex items-center gap-2 jm-muted"><Wallet className="h-4 w-4 text-indigo-500" /> {job.salary || "Non renseignée"}</p>
              <p className="flex items-center gap-2 jm-muted"><CalendarDays className="h-4 w-4 text-indigo-500" /> Publiée {relativeDate(job.posted_at)}</p>
            </div>
            <p className="mt-6 whitespace-pre-wrap text-sm leading-7 opacity-85">{job.description || "Aucune description détaillée fournie par la source."}</p>
            <div className="mt-6 flex flex-wrap gap-2 border-t pt-5">
              <a href={job.url} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> Voir l'annonce originale</Button></a>
              <Link href={`/coach?job=${job.id}`}><Button variant="outline" size="sm"><Mic2 className="h-4 w-4" /> S'entraîner à l'entretien</Button></Link>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold">Compétences recherchées</h2>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((s) => <Badge key={s} tone={match.matched_skills.includes(s) ? "green" : "slate"}>
                {match.matched_skills.includes(s) ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{s}
              </Badge>)}
            </div>
            {match.reasons.length > 0 && <div className="mt-5 rounded-xl border p-4"><p className="mb-2 text-xs font-bold">Analyse du matching</p><ul className="space-y-1 text-xs jm-muted">{match.reasons.map((r, i) => <li key={i}>• {r}</li>)}</ul></div>}
            {match.missing_skills.length > 0 && <p className="mt-4 text-xs jm-muted"><strong className="text-amber-500">Note :</strong> {match.missing_skills.join(", ")} ne figurent pas dans votre CV. Ne les ajoutez que si vous les maîtrisez réellement.</p>}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="border-indigo-500/25">
            <div className="mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-500" /><h2 className="font-bold">Préparer ma candidature</h2></div>
            {!resumes?.length ? (
              <div className="rounded-xl bg-amber-500/10 p-4 text-xs text-amber-600">Importez d'abord votre CV pour générer une version adaptée.</div>
            ) : (
              <div className="space-y-3">
                <label className="jm-label">CV à adapter</label>
                <Select value={rid || resumes.find((r) => r.is_primary)?.id || resumes[0].id} onChange={(e) => setRid(e.target.value)}>
                  {resumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
                <Button className="w-full" loading={busy} onClick={async () => {
                  setBusy(true);
                  try {
                    const selected = rid || resumes.find((r) => r.is_primary)?.id || resumes[0].id;
                    const res = await apiJson<{ score: number; versionId: string }>(`/api/resumes/${selected}/adapt`, "POST", { jobId: id });
                    setGeneration({ score: res.data.score, versionId: res.data.versionId });
                    toast("CV adapté, lettre et email générés.", "success");
                  } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
                  finally { setBusy(false); }
                }}><Sparkles className="h-4 w-4" /> Générer CV + lettre</Button>
                {generation && (
                  <div className="space-y-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs">
                    <p className="font-semibold text-emerald-600">Documents prêts — score {generation.score}%</p>
                    <a href={`/api/resumes/${rid || resumes[0].id}/download?format=pdf&version=${generation.versionId}`}><Button size="sm" variant="outline" className="w-full"><Download className="h-3.5 w-3.5" /> CV adapté PDF</Button></a>
                    <Link href="/applications"><Button size="sm" className="w-full">Vérifier et valider</Button></Link>
                  </div>
                )}
              </div>
            )}
          </Card>
          {application && (
            <Card>
              <h2 className="mb-3 font-bold">Candidature</h2>
              <Badge tone="indigo">{application.status.replace(/_/g, " ")}</Badge>
              <Link href={`/applications/${application.id}`} className="mt-4 block"><Button variant="outline" className="w-full" size="sm">Ouvrir le suivi</Button></Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
