"use client";

import { useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, MapPin, ExternalLink, Filter, Sparkles, Send, Loader2 } from "lucide-react";
import { RefreshButton } from "@/components/refresh-button";
import { apiJson } from "@/components/hooks";
import { useApp } from "@/components/providers";
import { useApi } from "@/components/hooks";
import { Badge, Button, Card, EmptyState, Input, Select, Spinner } from "@/components/ui";
import { ScoreRing } from "@/components/charts";
import { relativeDate, cn, SOURCE_LABELS } from "@/lib/utils";

interface Job {
  id: string; title: string; company: string; city: string; contract_type: string; salary: string;
  url: string; posted_at: string; skills: string[]; remote: string; source: string; score: number;
  matched_skills: string[]; is_demo?: number;
}

export default function JobsPage() {
  const { data: jobs, loading, reload } = useApi<Job[]>("/api/jobs");
  const { toast } = useApp();
  const [applying, setApplying] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [contract, setContract] = useState("");
  const [minScore, setMinScore] = useState("0");

  async function apply(jobId: string, company: string) {
    if (!confirm(`Postuler automatiquement chez ${company} ?\n\nVotre CV adapté, votre lettre et vos coordonnées seront envoyés au recruteur trouvé dans l'annonce.`)) return;
    setApplying(jobId);
    try {
      const res = await apiJson<{ status: string; to: string; attachments: string[] }>(`/api/jobs/${jobId}/apply`, "POST", {});
      toast(`Candidature envoyée à ${res.data.to} (${res.data.attachments.length} pièces jointes).`, "success");
      await reload();
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setApplying(null); }
  }

  const filtered = (jobs || []).filter((j) => {
    if (q && !`${j.title} ${j.company} ${j.skills.join(" ")}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (contract && !j.contract_type.toLowerCase().includes(contract.toLowerCase())) return false;
    if (minScore && j.score < Number(minScore)) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div><h1 className="text-2xl font-extrabold tracking-tight">Offres d'emploi</h1><p className="mt-1 text-sm jm-muted">{jobs?.length || 0} opportunités analysées et scorées pour votre profil.</p></div>
        <div className="flex gap-2">
          <RefreshButton />
          <Link href="/search"><Button size="sm"><Sparkles className="h-4 w-4" /> Nouvelle recherche</Button></Link>
        </div>
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row">
        <Input className="flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un poste, une entreprise, une compétence…" />
        <Select value={contract} onChange={(e) => setContract(e.target.value)} className="sm:w-48">
          <option value="">Tous les contrats</option>
          {["Stage", "Alternance", "CDI", "CDD", "Job étudiant", "Apprentissage"].map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={minScore} onChange={(e) => setMinScore(e.target.value)} className="sm:w-40">
          <option value="0">Tous les scores</option><option value="50">50% et +</option><option value="70">70% et +</option><option value="85">85% et +</option>
        </Select>
      </Card>

      {loading ? <div className="grid place-items-center py-24"><Spinner /></div> : filtered.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((j) => (
            <Card key={j.id} className="group flex flex-col gap-4 p-5 transition hover:shadow-glow">
              <div className="flex items-start gap-4">
                <ScoreRing score={j.score} size={58} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold leading-snug">{j.title}</h2>
                    {(j.is_demo === 1 || j.source === "demo") && <Badge tone="amber">Démo</Badge>}
                  </div>
                  <p className="mt-1 text-sm jm-muted">{j.company}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs jm-muted">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {j.city || "Non précisé"}</span>
                <span className="flex items-center gap-1"><BriefcaseBusiness className="h-3.5 w-3.5" /> {j.contract_type}</span>
                {j.salary && <span>{j.salary}</span>}
                <span>{relativeDate(j.posted_at)}</span>
                <span className="opacity-70">via {SOURCE_LABELS[j.source] || j.source}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">{j.skills.slice(0, 6).map((s) => <Badge key={s} tone={j.matched_skills.includes(s) ? "green" : "slate"} className="text-[10px]">{s}</Badge>)}</div>
              <div className="mt-auto flex gap-2 border-t pt-4">
                <Button size="sm" className="flex-1" loading={applying === j.id} onClick={() => apply(j.id, j.company)}>
                  <Send className="h-3.5 w-3.5" /> Postuler
                </Button>
                <Link href={`/jobs/${j.id}`}><Button size="sm" variant="outline">Détails</Button></Link>
                <a href={j.url} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline"><ExternalLink className="h-4 w-4" /></Button></a>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Filter className="h-6 w-6" />} title="Aucune offre ne correspond" description="Modifiez vos filtres ou lancez une nouvelle recherche." action={<Link href="/search"><Button size="sm">Lancer la recherche</Button></Link>} />
      )}
    </div>
  );
}
