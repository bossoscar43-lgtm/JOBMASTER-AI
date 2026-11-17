"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon, Moon, Sun, Monitor, Globe2, ShieldCheck, Download, Trash2, LogOut } from "lucide-react";
import { useApi, apiFetch, safeJson } from "@/components/hooks";
import { Button, Card, Badge } from "@/components/ui";
import { useApp } from "@/components/providers";
import { formatDateTime, cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";

interface Account { email: string; sessions: { id: string; created_at: string; last_seen_at: string; ip: string; user_agent: string }[] }

export default function SettingsPage() {
  const { data } = useApi<Account>("/api/account");
  const { theme, setTheme, locale, setLocale, toast } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function removeAccount() {
    if (!confirm("SUPPRESSION DÉFINITIVE : toutes vos données seront effacées. Confirmez ?")) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ deleted: boolean; message?: string }>("/api/account", { method: "DELETE" });
      if (!res.deleted) { toast(res.message || "Suppression impossible.", "error"); return; }
      toast("Vos données ont été supprimées.", "success");
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div><h1 className="text-2xl font-extrabold tracking-tight">Paramètres</h1><p className="mt-1 text-sm jm-muted">Apparence, langue, sécurité et confidentialité.</p></div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-5">
          <h2 className="flex items-center gap-2 font-bold"><Sun className="h-4 w-4 text-indigo-500" /> Apparence</h2>
          <div className="grid grid-cols-3 gap-2">
            {([["light", Sun, "Clair"], ["dark", Moon, "Sombre"], ["system", Monitor, "Système"]] as const).map(([t, Icon, label]) => (
              <button key={t} onClick={() => setTheme(t)} className={cn("flex flex-col items-center gap-2 rounded-xl border p-4 text-xs transition", theme === t ? "border-indigo-500 bg-indigo-500/10 text-indigo-500" : "opacity-60 hover:opacity-100")}>
                <Icon className="h-5 w-5" />{label}
              </button>
            ))}
          </div>
          <div className="border-t pt-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold"><Globe2 className="h-4 w-4 text-indigo-500" /> Langue</h2>
            <div className="flex gap-2">
              {(["fr", "en"] as Locale[]).map((l) => <button key={l} onClick={() => setLocale(l)} className={cn("rounded-xl border px-4 py-2 text-xs font-semibold", locale === l ? "border-indigo-500 bg-indigo-500/10 text-indigo-500" : "opacity-60")}>{l === "fr" ? "Français" : "English"}</button>)}
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4 text-indigo-500" /> Sécurité</h2>
          <div className="rounded-xl border p-3 text-xs"><span className="jm-muted">Compte :</span> <span className="font-semibold">{data?.email}</span></div>
          <div className="rounded-xl border p-3 text-xs"><span className="jm-muted">Sessions actives :</span> <Badge className="ml-2">{data?.sessions.length || 0}</Badge></div>
          <div className="space-y-2">
            {data?.sessions.map((s) => <div key={s.id} className="flex items-center justify-between rounded-lg bg-black/[.03] p-2.5 text-[11px] dark:bg-white/[.04]"><span className="jm-muted">{s.id}… · {s.ip || "IP inconnue"}</span><span>{formatDateTime(s.last_seen_at)}</span></div>)}
          </div>
          <Button variant="outline" size="sm" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); }}><LogOut className="h-4 w-4" /> Déconnecter cette session</Button>
        </Card>

        <Card className="space-y-4">
          <h2 className="flex items-center gap-2 font-bold"><Download className="h-4 w-4 text-indigo-500" /> Mes données</h2>
          <p className="text-sm jm-muted">Conformément au RGPD, vous pouvez exporter vos données ou demander leur effacement complet.</p>
          <Button variant="outline" size="sm" onClick={async () => {
            const res = await fetch("/api/history"); const json = await safeJson(res);
            const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" });
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "jobmaster-export.json"; a.click();
          }}><Download className="h-4 w-4" /> Exporter mes données (JSON)</Button>
        </Card>

        <Card className="space-y-4 border-rose-500/25">
          <h2 className="flex items-center gap-2 font-bold text-rose-500"><Trash2 className="h-4 w-4" /> Zone sensible</h2>
          <p className="text-sm jm-muted">La suppression du compte efface définitivement CV, candidatures, documents et historique. Cette action est irréversible.</p>
          <Button variant="danger" size="sm" onClick={removeAccount} loading={busy}><Trash2 className="h-4 w-4" /> Supprimer mon compte</Button>
        </Card>
      </div>
    </div>
  );
}
