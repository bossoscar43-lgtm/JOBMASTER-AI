"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, Sparkles, Zap, MapPin, BriefcaseBusiness, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { useApi, apiJson } from "@/components/hooks";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Spinner, Toggle } from "@/components/ui";
import { ScoreRing } from "@/components/charts";
import { useApp } from "@/components/providers";
import { relativeDate, SOURCE_LABELS } from "@/lib/utils";
import type { Preferences } from "@/lib/types";

interface ScoredJob {
  id: string; title: string; company: string; city: string; contract_type: string; salary: string;
  url: string; posted_at: string; skills: string[]; remote: string; source: string; is_demo?: number;
  score: number; matched_skills: string[]; missing_skills: string[]; reasons: string[];
}

const CONTRACTS = ["Stage", "Alternance", "Apprentissage", "Contrat de professionnalisation", "Job étudiant", "CDD", "CDI", "Temps partiel"];
const DOMAINS = ["Informatique", "Marketing", "Commerce", "Ressources Humaines", "Finance", "Design", "Industrie", "Logistique", "Communication", "Hôtellerie"];

export default function SearchPage() {
  const { data: prefs, loading: loadingPrefs } = useApi<Preferences>("/api/preferences");
  const { data: existing, loading: loadingJobs, reload } = useApi<{ jobs: ScoredJob[] }>("/api/jobs/search");
  const { toast } = useApp();
  const [form, setForm] = useState<Preferences | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ jobs: ScoredJob[]; sources: string[]; creditsUsed?: number } | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => { if (prefs) setForm(prefs); }, [prefs]);

  const set = (k: keyof Preferences, v: unknown) => setForm((p) => p ? { ...p, [k]: v } : p);
  const arr = (k: keyof Preferences) => (form?.[k] as string[] | undefined)?.join(", ") || "";
  const setArr = (k: keyof Preferences, v: string) => set(k, v.split(",").map((x) => x.trim()).filter(Boolean));

  async function launch() {
    setBusy(true);
    try {
      if (form) await apiJson("/api/preferences", "PUT", form);
      const res = await apiJson<{ jobs: ScoredJob[]; sources: string[] }>("/api/jobs/search", "POST", {
        keywords: query,
        city: form?.cities?.[0],
        radius_km: form?.radius_km,
        remote: form?.remote,
        contract_types: form?.contract_types,
        domains: form?.domains,
        study_level: form?.study_level,
        availability: form?.availability,
        salary_min: form?.salary_min,
        date_posted_days: form?.date_posted_days,
        keywords_exclude: form?.keywords_exclude,
        limit: 40,
      });
      setResult(res.data);
      toast(`${res.data.jobs.length} offres analysées.`, "success");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur lors de la recherche", "error");
    } finally { setBusy(false); }
  }

  const jobs = result?.jobs || existing?.jobs || [];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Recherche automatique</h1>
          <p className="mt-1 text-sm jm-muted">Définissez vos préférences une seule fois, puis laissez l'IA travailler.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}><SlidersHorizontal className="h-4 w-4" /> {showFilters ? "Masquer" : "Afficher"} les filtres</Button>
      </div>

      {result && result.jobs.length === 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
          <p className="font-semibold text-amber-600">Aucune offre en France trouvée avec les sources actuelles.</p>
          <p className="mt-2 jm-muted">
            Les offres proviennent de <strong>Screeningpass</strong> (API gratuite, sans clé). Essayez d'élargir vos filtres
            (ville, rayon, type de contrat, ancienneté de l'offre) ou de lancer une recherche avec d'autres mots-clés.
            La recherche utilise automatiquement votre profil (postes, compétences, domaines).
          </p>
        </div>
      )}

      <Card className="relative overflow-hidden border-indigo-500/25 p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
              <Input className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex. développeur React, alternance commerce, stage marketing…"
                onKeyDown={(e) => { if (e.key === "Enter") void launch(); }} />
            </div>
            <Button size="lg" onClick={launch} loading={busy} className="whitespace-nowrap"><Zap className="h-4 w-4" /> LANCER MA RECHERCHE AUTOMATIQUE</Button>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] jm-muted"><Sparkles className="h-3 w-3" /> Analyse CV + matching + déduplication + détection des offres expirées</p>
        </div>
      </Card>

      {showFilters && form && (
        <Card className="space-y-5">
          <h2 className="font-bold">Mes préférences</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Villes" hint="Séparées par une virgule"><Input value={arr("cities")} onChange={(e) => setArr("cities", e.target.value)} placeholder="Paris, Lyon" /></Field>
            <Field label="Rayon (km)"><Input type="number" min="0" value={form.radius_km} onChange={(e) => set("radius_km", Number(e.target.value))} /></Field>
            <Field label="Télétravail">
              <Select value={form.remote} onChange={(e) => set("remote", e.target.value)}>
                <option value="any">Peu importe</option><option value="remote">Télétravail</option><option value="hybrid">Hybride</option><option value="onsite">Sur site</option>
              </Select>
            </Field>
            <Field label="Types de contrat" hint="Séparés par une virgule"><Input value={arr("contract_types")} onChange={(e) => setArr("contract_types", e.target.value)} placeholder="Alternance, CDI, Stage" />
              <div className="mt-2 flex flex-wrap gap-1">{CONTRACTS.map((c) => <button key={c} type="button" onClick={() => { const a = form.contract_types.includes(c) ? form.contract_types.filter((x) => x !== c) : [...form.contract_types, c]; set("contract_types", a); }} className={`rounded-full border px-2 py-0.5 text-[10px] ${form.contract_types.includes(c) ? "border-indigo-500 bg-indigo-500/10 text-indigo-500" : "opacity-60"}`}>{c}</button>)}</div>
            </Field>
            <Field label="Domaines" hint="Séparés par une virgule"><Input value={arr("domains")} onChange={(e) => setArr("domains", e.target.value)} placeholder="Informatique, Marketing" />
              <div className="mt-2 flex flex-wrap gap-1">{DOMAINS.slice(0, 7).map((c) => <button key={c} type="button" onClick={() => { const a = form.domains.includes(c) ? form.domains.filter((x) => x !== c) : [...form.domains, c]; set("domains", a); }} className={`rounded-full border px-2 py-0.5 text-[10px] ${form.domains.includes(c) ? "border-indigo-500 bg-indigo-500/10 text-indigo-500" : "opacity-60"}`}>{c}</button>)}</div>
            </Field>
            <Field label="Niveau d'études"><Input value={form.study_level} onChange={(e) => set("study_level", e.target.value)} placeholder="Bac+3" /></Field>
            <Field label="Salaire minimum (€/an)"><Input type="number" min="0" value={form.salary_min} onChange={(e) => set("salary_min", Number(e.target.value))} /></Field>
            <Field label="Offres publiées depuis (jours)"><Input type="number" min="1" value={form.date_posted_days} onChange={(e) => set("date_posted_days", Number(e.target.value))} /></Field>
            <Field label="Exclure les mots-clés"><Input value={arr("keywords_exclude")} onChange={(e) => setArr("keywords_exclude", e.target.value)} placeholder="Vente, démarchage" /></Field>
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-xs jm-muted">Ces préférences seront réutilisées automatiquement à chaque recherche.</span>
            <Button size="sm" variant="outline" onClick={async () => { if (form) { await apiJson("/api/preferences", "PUT", form); toast("Préférences enregistrées.", "success"); } }}>Enregistrer les préférences</Button>
          </div>
        </Card>
      )}

      {(loadingPrefs || loadingJobs) && !result ? <div className="grid place-items-center py-20"><Spinner /></div> : null}

      {result && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="font-semibold">{result.jobs.length} offres trouvées</span>
          <span className="jm-muted">· Sources : {result.sources.length ? result.sources.map((s) => SOURCE_LABELS[s] || s).join(", ") : "sources en direct"}</span>
          {(!result.sources.length || result.sources.every((s) => s === "demo")) && <Badge tone="amber"><AlertCircle className="h-3 w-3" /> Données de démonstration</Badge>}
        </div>
      )}

      {jobs.length ? (
        <div className="grid gap-3">
          {jobs.map((j) => (
            <Card key={j.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <ScoreRing score={j.score} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{j.title}</p>
                  {(j.source === "demo" || j.is_demo === 1) && <Badge tone="amber">Démo</Badge>}
                </div>
                <p className="mt-1 text-xs jm-muted">{j.company} · <MapPin className="inline h-3 w-3" /> {j.city || "Non précisé"} · {j.contract_type} {j.salary ? `· ${j.salary}` : ""}</p>
                <div className="mt-2 flex flex-wrap gap-1">{j.matched_skills.slice(0, 5).map((s) => <Badge key={s} tone="green" className="text-[10px]">{s}</Badge>)}</div>
                <p className="mt-1.5 text-[11px] jm-muted">Publiée {relativeDate(j.posted_at)} · via {SOURCE_LABELS[j.source] || j.source}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/jobs/${j.id}`}><Button size="sm" variant="outline">Détails</Button></Link>
                <a href={j.url} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="ghost"><ExternalLink className="h-4 w-4" /></Button></a>
              </div>
            </Card>
          ))}
        </div>
      ) : !loadingJobs ? (
        <EmptyState icon={<BriefcaseBusiness className="h-6 w-6" />} title="Aucune offre affichée" description="Lancez une recherche pour voir les offres correspondant à votre profil." />
      ) : null}
    </div>
  );
}
