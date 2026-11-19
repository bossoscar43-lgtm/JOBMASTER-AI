"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { Button } from "./ui";
import { cn } from "@/lib/utils";
import { safeJson } from "./hooks";

interface Msg { role: "user" | "assistant"; content: string; actions?: { label: string; href: string }[] }

const SUGGESTIONS = [
  "Trouve-moi des alternances dans le commerce",
  "Adapte mon CV à une annonce",
  "Prépare-moi à un entretien demain",
];

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Bonjour ! Je suis JOBMASTER AI. Comment puis-je vous aider dans votre recherche d'emploi ?" },
  ]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history }),
      });
      const json = await safeJson(res);
      if (json.ok) {
        setMessages((p) => [...p, { role: "assistant", content: json.data.reply, actions: json.data.actions }]);
      } else {
        setMessages((p) => [...p, { role: "assistant", content: json.error || "Une erreur est survenue." }]);
      }
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "Impossible de contacter l'assistant pour le moment." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-2xl jm-gradient text-white shadow-glow transition hover:scale-105"
        aria-label="Ouvrir l'assistant IA">
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        {!open && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 dark:border-[#08091a]" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[min(72vh,620px)] w-[min(94vw,390px)] flex-col overflow-hidden rounded-2xl border shadow-2xl animate-fade-up"
          style={{ background: "var(--surface)" }}>
          <div className="jm-gradient flex items-center gap-3 px-4 py-3.5 text-white">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><Sparkles className="h-5 w-5" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold">Assistant JOBMASTER AI</p>
              <p className="text-[11px] text-white/75">Toujours disponible, contextuel et confidentiel</p>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user" ? "rounded-br-sm jm-gradient text-white" : "rounded-bl-sm border")}
                  style={m.role === "assistant" ? { background: "var(--bg)" } : undefined}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.actions?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.actions.map((a) => (
                        <Link key={a.href} href={a.href} onClick={() => setOpen(false)}
                          className="rounded-lg border border-indigo-500/30 px-2.5 py-1 text-[11px] font-semibold text-indigo-500 hover:bg-indigo-500/10">
                          {a.label} →
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {busy && <p className="text-xs jm-muted animate-soft-pulse">L'assistant réfléchit…</p>}
            {messages.length <= 1 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-[11px] font-semibold jm-muted">Suggestions</p>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="block w-full rounded-lg border px-3 py-2 text-left text-xs hover:bg-indigo-500/5">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Posez votre question…" className="jm-input flex-1" />
            <Button type="submit" size="sm" loading={busy} className="px-3"><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      )}
    </>
  );
}
