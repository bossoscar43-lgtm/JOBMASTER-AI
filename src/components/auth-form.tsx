"use client";

import { useState } from "react";
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
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const full_name = String(data.get("full_name") || "").trim();
    const adminSecret = String(data.get("adminSecret") || "").trim();
    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
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
          body: JSON.stringify({ token, password }),
        });
        const json = await safeJson(res);
        if (!json.ok) throw new Error(json.error);
        toast("Mot de passe mis à jour.", "success");
        window.location.replace("/login");
        return;
      }
      if (mode === "register" && password !== String(data.get("confirm") || "")) {
        throw new Error("Les mots de passe ne correspondent pas.");
      }
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login"
        ? { email, password }
        : { full_name, email, password, adminSecret };
      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      }).catch(() => { throw new Error("Impossible de contacter le serveur."); });
      const json = await safeJson(res);
      if (!json.ok) throw new Error(json.error);
      toast(mode === "login" ? "Connexion réussie. Redirection…" : "Compte créé. Redirection…", "success");
      window.location.replace("/dashboard");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Une erreur est survenue.", "error");
    } finally {
      setBusy(false);
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
            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "register" && <Field label="Nom complet"><Input required name="full_name" placeholder="Camille Dupont" /></Field>}
              {mode !== "reset" && <Field label="Adresse email"><Input required name="email" type="email" placeholder="vous@exemple.fr" autoComplete="email" /></Field>}
              {(mode === "login" || mode === "register" || mode === "reset") && (
                <Field label="Mot de passe" hint={mode === "register" ? "12 caractères minimum." : undefined}>
                  <div className="relative">
                    <Input required name="password" type={show ? "text" : "password"} minLength={mode === "register" || mode === "reset" ? 12 : 1}
                      placeholder="••••••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} />
                    <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100" aria-label="Afficher">
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
              )}
              {mode === "register" && <>
                <Field label="Confirmer le mot de passe"><Input required name="confirm" type="password" placeholder="••••••••••••" /></Field>
                <div className="rounded-xl border border-dashed p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold"><ShieldCheck className="h-3.5 w-3.5 text-indigo-500" /> Accès administrateur</p>
                  <p className="mb-2 mt-1 text-[11px] jm-muted">Réservé : secret fourni hors-bande uniquement.</p>
                  <Input name="adminSecret" placeholder="Secret d'activation admin (optionnel)" />
                </div>
              </>}
              {mode === "login" && <div className="text-right"><Link href="/forgot-password" className="text-xs font-semibold text-indigo-500 hover:underline">Mot de passe oublié ?</Link></div>}
              <Button type="submit" className="w-full" loading={busy}>
                {mode === "login" ? "Se connecter" : mode === "register" ? "Créer mon compte" : mode === "forgot" ? "Envoyer le lien" : "Enregistrer"} <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
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
