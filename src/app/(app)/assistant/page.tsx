"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Send, Sparkles, ArrowRight, UserRound } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { safeJson } from "@/components/hooks";

interface Msg { role: "user" | "assistant"; content: string; actions?: { label: string; href: string }[] }

const PROMPTS = [
  "Trouve-moi 30 alternances dans le commerce.",
  "Recherche des jobs étudiants près de chez moi.",
  "Adapte mon CV à cette annonce.",
  "Rédige une lettre de motivation.",
  "Prépare-moi à un entretien demain.",
  "Aide-moi à répondre à ce recruteur.",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Bonjour ! Je suis votre assistant JOBMASTER AI. Je connais votre profil, vos CV et vos candidatures (avec votre accord). Que souhaitez-vous faire ?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((p) => [...p, { role: "user", content: text }, { role: "assistant", content: "…" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const json = await safeJson(res);
      setMessages((p) => {
        const copy = [...p];
        copy[copy.length - 1] = json.ok
          ? { role: "assistant", content: json.data.reply, actions: json.data.actions }
          : { role: "assistant", content: json.error || "Erreur" };
        return copy;
      });
    } catch {
      setMessages((p) => { const c = [...p]; c[c.length - 1] = { role: "assistant", content: "Connexion impossible." }; return c; });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Assistant IA personnel</h1>
        <p className="mt-1 text-sm jm-muted">Une conversation contextuelle pour piloter toute votre recherche d'emploi.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          <div className="flex h-[min(68vh,660px)] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role === "assistant" && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl jm-gradient text-white"><Bot className="h-4 w-4" /></div>}
                  <div className={cn("max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed", m.role === "user" ? "jm-gradient text-white" : "border")} style={m.role === "assistant" ? { background: "var(--bg)" } : undefined}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.actions?.length ? <div className="mt-3 flex flex-wrap gap-2">{m.actions.map((a) => <Link key={a.href} href={a.href} className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 px-2.5 py-1 text-xs font-semibold text-indigo-500 hover:bg-indigo-500/10">{a.label} <ArrowRight className="h-3 w-3" /></Link>)}</div> : null}
                  </div>
                  {m.role === "user" && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border"><UserRound className="h-4 w-4" /></div>}
                </div>
              ))}
              {busy && <p className="text-xs jm-muted animate-soft-pulse">L'assistant rédige…</p>}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="mt-4 flex gap-2 border-t pt-4">
              <input className="jm-input flex-1" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Écrivez votre demande…" />
              <Button type="submit" loading={busy}><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </Card>
        <Card className="space-y-3">
          <h2 className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-indigo-500" /> Suggestions</h2>
          {PROMPTS.map((p) => <button key={p} onClick={() => send(p)} className="block w-full rounded-xl border p-3 text-left text-xs transition hover:bg-indigo-500/5">{p}</button>)}
          <p className="pt-2 text-[11px] jm-muted">L'assistant peut consulter vos documents et offres uniquement dans le cadre de votre compte.</p>
        </Card>
      </div>
    </div>
  );
}
