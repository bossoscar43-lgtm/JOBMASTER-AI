"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Layers3, ArrowRight, ShieldCheck } from "lucide-react";
import { Button, Card, Field, Input } from "./ui";
import { useApp } from "./providers";
import { safeJson } from "./hooks";

type Mode = "login" | "register" | "forgot" | "reset";

export function AuthForm({ mode, token }: { mode: Mode; token?: string }) {
  const { toast } = useApp();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "", adminSecret: "" });
  const [done, setDone] = useState(false);
  const submitting = useRef(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email }),
        });
        const json = await safeJson(res);
        if (!json.ok) throw new Error(json.error);
        setDone(true);
        toast("Si cet email existe, un lien de réinitialisation a été envoyé.", "success");
        return;
      }
      if (mode === "reset") {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password: form.password }),
        });
        const json = await safeJson(res);
        if (!json.ok) throw new Error(json.error);
        toast("Mot de passe mis à jour.", "success");
        window.location.assign("/login");
        return;
      }
      if (mode === "register" && form.password !== form.confirm) {
        throw new Error("Les mots de passe ne correspondent pas.");
      }
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login"
        ? { email: form.email, password: form.password }
        : { full_name: form.full_name, email: form.email, password: form.password, adminSecret: form.adminSecret };
      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      }).catch(() => { throw new Error("Impossible de contacter le serveur. Vérifiez qu'il est démarré."); });
      const json = await safeJson(res);
      if (!json.ok) throw new Error(json.error);
      toast(mode === "login" ? "Connexion réussie. Redirection…" : "Compte créé. Redirection…", "success");
      // Navigation complète : garantit que le cookie de session est envoyé au
      // serveur. On remplace la location (pas d'historique) pour éviter tout
      // retour arrière qui ramènerait au formulaire.
      window.location.replace("/dashboard");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Une erreur est survenue.", "error");
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }

  const titles: Record<Mode, { title: string; sub: string }> = {
    login: { title: "Bon retour parmi nous", sub: "Connectez-vous pour reprendre votre recherche." },
    register: { title: "Créez votre compte", sub: "Gratuit, sans carte bancaire. Commencez en 2 minutes." },
    forgot: { title: "Mot de passe oublié ?", sub: "Nous vous enverrons un lien sécurisé de réinitialisation." },
    reset: { title: "Nouveau mot de passe", sub: "Choisissez un mot de passe solide." },
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 jm-grid-bg opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-7 flex items-center justify-center gap-2.5 text-lg font-extrabold">
          <span className="grid h-9 w-9 place-items-center rounded-xl jm-gradient text-white"><Layers3 className="h-5 w-5" /></span>
          JOBMASTER <span className="jm-gradient-text">AI</span>
        </Link>
        <Card className="p-7 shadow-glow">
          <h1 className="text-2xl font-extrabold tracking-tight">{titles[mode].title}</h1>
          <p className="mt-1.5 text-sm jm-muted">{titles[mode].sub}</p>

          {done ? (
            <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
              Vérifiez votre boîte mail. Le lien est valable 1 heure.
              <Link href="/login" className="mt-3 block font-semibold text-indigo-500">Retour à la connexion →</Link>
            </div>
          ) : (
            <div className="mt-6 space-y-4" onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}>
              {mode === "register" && <Field label="Nom complet"><Input required value={form.full_name} onChange={set("full_name")} placeholder="Camille Dupont" /></Field>}
              {mode !== "reset" && <Field label="Adresse email"><Input required type="email" value={form.email} onChange={set("email")} placeholder="vous@exemple.fr" autoComplete="email" /></Field>}
              {(mode === "login" || mode === "register" || mode === "reset") && (
                <Field label="Mot de passe" hint={mode === "register" ? "12 caractères minimum, avec majuscule, minuscule et chiffre." : undefined}>
                  <div className="relative">
                    <Input required type={show ? "text" : "password"} minLength={mode === "register" || mode === "reset" ? 12 : 1}
                      value={form.password} onChange={set("password")} placeholder="••••••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} />
                    <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100" aria-label="Afficher">
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
              )}
              {mode === "register" && <Field label="Confirmer le mot de passe"><Input required type="password" value={form.confirm} onChange={set("confirm")} placeholder="••••••••••••" /></Field>}
              {mode === "register" && (
                <div className="rounded-xl border border-dashed p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold"><ShieldCheck className="h-3.5 w-3.5 text-indigo-500" /> Accès administrateur</p>
                  <p className="mb-2 mt-1 text-[11px] jm-muted">Réservé : secret fourni hors-bande uniquement. L'email seul n'accorde jamais de droits.</p>
                  <Input value={form.adminSecret} onChange={set("adminSecret")} placeholder="Secret d'activation admin (optionnel)" />
                </div>
              )}
              {mode === "login" && <div className="text-right"><Link href="/forgot-password" className="text-xs font-semibold text-indigo-500 hover:underline">Mot de passe oublié ?</Link></div>}
              <Button type="button" onClick={() => void submit()} className="w-full" loading={busy}>
                {mode === "login" ? "Se connecter" : mode === "register" ? "Créer mon compte" : mode === "forgot" ? "Envoyer le lien" : "Enregistrer"} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="mt-5 text-center text-xs jm-muted">
            {mode === "login" ? <>Pas encore de compte ? <Link href="/register" className="font-semibold text-indigo-500">S'inscrire</Link></> :
              mode === "register" ? <>Déjà inscrit ? <Link href="/login" className="font-semibold text-indigo-500">Se connecter</Link></> :
                <Link href="/login" className="font-semibold text-indigo-500">Retour à la connexion</Link>}
          </div>
        </Card>
        <p className="mt-5 text-center text-[11px] jm-muted">En continuant, vous acceptez les conditions d'utilisation et la politique de confidentialité.</p>
      </div>
    </main>
  );
}
