"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mic2, Sparkles, Send, CheckCircle2, Volume2, Mic } from "lucide-react";
import { useApi, apiJson } from "@/components/hooks";
import { Badge, Button, Card, EmptyState, Field, Input, Progress, Spinner, Textarea } from "@/components/ui";
import { ScoreRing } from "@/components/charts";
import { useApp } from "@/components/providers";
import type { Job, CoachSession, CoachQuestion } from "@/lib/types";

interface SpeechRecognitionLike {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
  start(): void; stop(): void;
}

export default function CoachPage() {
  const { data: jobs } = useApi<Array<{ id: string; title: string; company: string }>>("/api/jobs");
  const { data: sessions, reload } = useApi<CoachSession[]>("/api/coach");
  const { toast } = useApp();
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [jobId, setJobId] = useState(params.get("job") || "");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [mode, setMode] = useState<"written" | "voice">("written");
  const [session, setSession] = useState<CoachSession | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<CoachSession["report"]>(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const job = jobs?.find((j) => j.id === jobId);
    if (job && !role) { setRole(job.title); setCompany(job.company); }
  }, [jobs, jobId, role]);

  async function start() {
    setBusy(true);
    try {
      const res = await apiJson<{ id: string; questions: CoachQuestion[] }>("/api/coach", "POST", { jobId: jobId || undefined, role, company, mode });
      setSession({ id: res.data.id, questions: res.data.questions, role, company, user_id: "", job_id: jobId || null, mode, report: null, score: null, created_at: "", finished_at: null });
      setReport(null);
      toast("Entretien simulé démarré.", "success");
      await reload();
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setBusy(false); }
  }

  async function submitAnswer() {
    if (!session || !answer.trim()) return;
    setBusy(true);
    try {
      const res = await apiJson<{ questions: CoachQuestion[] }>(`/api/coach/${session.id}`, "PATCH", {
        questionId: session.questions.find((q) => !q.answer)?.id, answer,
      });
      setSession({ ...session, questions: res.data.questions });
      setAnswer("");
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setBusy(false); }
  }

  async function finish() {
    if (!session) return;
    setBusy(true);
    try {
      const res = await apiJson<CoachSession["report"]>(`/api/coach/${session.id}`, "POST", {});
      setReport(res.data);
      await reload();
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setBusy(false); }
  }

  function startVoice() {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Ctor) { toast("La reconnaissance vocale n'est pas disponible dans ce navigateur. Utilisez le mode écrit.", "error"); return; }
    const rec = new Ctor();
    rec.lang = "fr-FR"; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e) => { setAnswer((p) => p + " " + e.results[0][0].transcript); };
    rec.onend = () => setListening(false);
    rec.onerror = () => { setListening(false); toast("Erreur de reconnaissance vocale.", "error"); };
    rec.start(); setListening(true);
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text); u.lang = "fr-FR"; u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }

  const answered = session?.questions.filter((q) => q.answer).length || 0;
  const current = session?.questions.find((q) => !q.answer);
  const total = session?.questions.length || 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">MON COACH ENTRETIEN IA</h1>
        <p className="mt-1 text-sm jm-muted">Un recruteur virtuel vous interroge, analyse vos réponses et vous aide à progresser.</p>
      </div>

      {!session ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="space-y-4 lg:col-span-2">
            <h2 className="flex items-center gap-2 font-bold"><Mic2 className="h-5 w-5 text-indigo-500" /> Simuler un entretien</h2>
            <Field label="Offre d'emploi (optionnel)">
              <select className="jm-input" value={jobId} onChange={(e) => setJobId(e.target.value)}>
                <option value="">— Entretien libre —</option>
                {jobs?.map((j) => <option key={j.id} value={j.id}>{j.title} · {j.company}</option>)}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Poste"><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Développeur Front-End" /></Field>
              <Field label="Entreprise"><Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Malt" /></Field>
            </div>
            <div className="flex gap-2">
              {(["written", "voice"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`rounded-xl border px-4 py-2 text-xs font-semibold ${mode === m ? "border-indigo-500 bg-indigo-500/10 text-indigo-500" : "opacity-60"}`}>{m === "written" ? "Écrit" : "Vocal"}</button>)}
            </div>
            <Button onClick={start} loading={busy}><Sparkles className="h-4 w-4" /> Démarrer la simulation</Button>
          </Card>
          <Card>
            <h2 className="mb-4 font-bold">Sessions précédentes</h2>
            {sessions?.length ? sessions.slice(0, 6).map((s) => (
              <div key={s.id} className="mb-2 rounded-xl border p-3 text-xs">
                <p className="font-semibold">{s.role}</p>
                <p className="jm-muted">{s.company} · {new Date(s.created_at).toLocaleDateString("fr-FR")}</p>
                {s.score !== null && <Badge className="mt-2" tone={s.score >= 70 ? "green" : "amber"}>Note : {s.score}/100</Badge>}
              </div>
            )) : <p className="text-sm jm-muted">Aucune session pour le moment.</p>}
          </Card>
        </div>
      ) : report ? (
        <Card className="space-y-6">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <ScoreRing score={report.overall} size={110} />
            <div><h2 className="text-xl font-extrabold">Rapport d'entretien</h2><p className="mt-1 text-sm jm-muted">{report.summary}</p></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">{report.metrics.map((m) => <div key={m.label}><div className="flex justify-between text-xs"><span>{m.label}</span><span className="font-bold">{m.score}/100</span></div><Progress value={m.score} className="mt-1" /></div>)}</div>
            <div className="space-y-4">
              <div><p className="jm-label">Points forts</p><ul className="space-y-1 text-sm">{report.strengths.map((s, i) => <li key={i} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />{s}</li>)}</ul></div>
              <div><p className="jm-label">Axes d'amélioration</p><ul className="space-y-1 text-sm">{report.improvements.map((s, i) => <li key={i} className="flex gap-2 text-amber-500">• {s}</li>)}</ul></div>
            </div>
          </div>
          <div className="flex gap-2"><Button variant="outline" onClick={() => { setSession(null); setReport(null); }}>Nouvel entretien</Button><Link href="/jobs"><Button>Explorer les offres</Button></Link></div>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div><p className="text-xs jm-muted">{session.company} · {session.role}</p><p className="font-bold">Question {answered + 1} / {total}</p></div>
              <Badge tone="indigo">{Math.round((answered / Math.max(1, total)) * 100)}% terminé</Badge>
            </div>
            <Progress value={(answered / Math.max(1, total)) * 100} className="mb-6" />
            {current ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-5">
                  <div className="mb-2 flex items-center justify-between"><Badge tone="violet">{current.category}</Badge>
                    <button onClick={() => speak(current.question)} className="rounded-lg p-1.5 opacity-60 hover:opacity-100" title="Écouter"><Volume2 className="h-4 w-4" /></button>
                  </div>
                  <p className="text-base font-semibold">{current.question}</p>
                </div>
                <Textarea className="min-h-[170px]" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Rédigez votre réponse ici…" />
                {session.mode === "voice" && <Button variant="outline" onClick={startVoice} loading={listening}><Mic className="h-4 w-4" /> {listening ? "Écoute en cours…" : "Répondre à la voix"}</Button>}
                <Button onClick={submitAnswer} loading={busy} disabled={!answer.trim()}><Send className="h-4 w-4" /> Valider ma réponse</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-sm">Toutes les questions ont été traitées. Générez votre rapport détaillé.</div>
                <Button onClick={finish} loading={busy}><Sparkles className="h-4 w-4" /> Générer mon rapport</Button>
              </div>
            )}
          </Card>
          <Card>
            <h2 className="mb-4 font-bold">Vos réponses</h2>
            <div className="space-y-2">
              {session.questions.map((q, i) => (
                <div key={q.id} className={`rounded-xl border p-3 text-xs ${q.answer ? "border-emerald-500/25" : "opacity-50"}`}>
                  <p className="font-semibold">{i + 1}. {q.question}</p>
                  {q.answer && <p className="mt-1 jm-muted">Note : {q.score}/100</p>}
                  {q.feedback && <p className="mt-2 text-[11px]">{q.feedback}</p>}
                  {q.better_answer && <p className="mt-2 rounded bg-indigo-500/5 p-2 text-[11px]"><strong>Proposition :</strong> {q.better_answer}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
