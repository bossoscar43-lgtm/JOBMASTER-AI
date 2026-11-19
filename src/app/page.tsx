"use client";

import Link from "next/link";
import { ArrowRight, Bot, BriefcaseBusiness, FileCheck2, FileText, Sparkles, Target, TrendingUp, ShieldCheck, Zap, Globe2, Moon, Sun, Check, Mail, BarChart3, Mic2, Layers3 } from "lucide-react";
import { useApp } from "@/components/providers";
import { Badge, Button } from "@/components/ui";

const FEATURES = [
  { icon: FileText, title: "Analyse intelligente du CV", text: "PDF, DOCX ou TXT : l'IA identifie vos diplômes, compétences et expériences réellement présentes.", color: "text-indigo-500 bg-indigo-500/10" },
  { icon: Target, title: "Matching transparent", text: "Chaque offre reçoit un score honnête, avec les compétences correspondantes et manquantes.", color: "text-violet-500 bg-violet-500/10" },
  { icon: FileCheck2, title: "CV adapté et ATS", text: "Une version spécifique par offre, restructurée sans jamais inventer d'expérience.", color: "text-fuchsia-500 bg-fuchsia-500/10" },
  { icon: Mail, title: "Lettres et emails", text: "Lettre de motivation, email professionnel et message LinkedIn, modifiables avant envoi.", color: "text-blue-500 bg-blue-500/10" },
  { icon: Mic2, title: "Coach entretien IA", text: "Simulation de recruteur, notation sur 100 et rapport détaillé de vos réponses.", color: "text-purple-500 bg-purple-500/10" },
  { icon: BarChart3, title: "Suivi complet", text: "Statuts, relances, notifications et statistiques dans un tableau de bord clair.", color: "text-emerald-500 bg-emerald-500/10" },
];

const STEPS = [
  { n: "01", title: "Créez votre compte", text: "Quelques secondes suffisent. Vos données restent confidentielles." },
  { n: "02", title: "Importez votre CV", text: "PDF, DOCX ou TXT. L'IA analyse votre profil en profondeur." },
  { n: "03", title: "Définissez vos préférences", text: "Ville, rayon, contrat, domaine, salaire : une seule fois." },
  { n: "04", title: "Lancez la recherche", text: "L'IA trouve, score et prépare vos candidatures avec votre accord." },
];

export default function HomePage() {
  const { t, locale, setLocale, theme, setTheme } = useApp();
  return (
    <main className="min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] jm-grid-bg opacity-60" />
      <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 top-40 h-[500px] w-[500px] rounded-full bg-violet-500/20 blur-[120px]" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl jm-gradient text-white shadow-glow"><Layers3 className="h-5 w-5" /></span>
          <span className="text-lg">JOBMASTER <span className="jm-gradient-text">AI</span></span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium opacity-75 md:flex">
          <a href="#fonctionnalites" className="hover:opacity-100">Fonctionnalités</a>
          <a href="#parcours" className="hover:opacity-100">Comment ça marche</a>
          <a href="#tarifs" className="hover:opacity-100">Tarifs</a>
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={() => setLocale(locale === "fr" ? "en" : "fr")} className="rounded-lg p-2 opacity-70 hover:opacity-100" title="Langue"><Globe2 className="h-4 w-4" /></button>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-lg p-2 opacity-70 hover:opacity-100" title="Theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link href="/login"><Button variant="ghost" size="sm">Connexion</Button></Link>
          <Link href="/register"><Button size="sm">S'inscrire</Button></Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="jm-float mb-6 border border-indigo-500/25 bg-indigo-500/10 px-3 py-1.5 text-indigo-500">
            <Sparkles className="h-3.5 w-3.5" /> Propulsé par l'IA · Français & Anglais
          </Badge>
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
            {t("hero.title")}<br /><span className="jm-gradient-text">avec JOBMASTER AI.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed jm-muted md:text-lg">{t("hero.subtitle")}</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register"><Button size="lg" className="w-full sm:w-auto">{t("hero.cta")} <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link href="/login"><Button size="lg" variant="outline" className="w-full sm:w-auto">{t("hero.cta2")}</Button></Link>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs jm-muted">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Sans carte bancaire</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Offres réelles en France</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Données protégées</span>
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-r from-indigo-500/20 to-violet-500/20 blur-2xl" />
          <div className="jm-card relative overflow-hidden p-3 shadow-glow">
            <div className="flex items-center gap-1.5 border-b px-3 py-2.5 opacity-60">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 text-[11px]">Tableau de bord JOBMASTER AI</span>
            </div>
            <div className="grid gap-3 p-3 md:grid-cols-4">
              {[["Offres trouvées","128",Target],["Candidatures","24",BriefcaseBusiness],["Entretiens","3",TrendingUp],["Compatibilité","86%",Zap]].map(([l,v,I]) => {
                const Icon = I as typeof Target;
                return <div key={String(l)} className="rounded-xl border p-4"><p className="text-[11px] jm-muted">{l as string}</p><p className="mt-1 text-2xl font-extrabold">{v as string}</p><Icon className="mt-2 h-4 w-4 text-indigo-500" /></div>;
              })}
            </div>
            <div className="grid gap-3 px-3 pb-3 md:grid-cols-3">
              {[["Développeur Front-End","Malt · Paris","92%"],["Alternance Communication","Decathlon · Lille","88%"],["Chargé RH Formation","SNCF · Lyon","81%"]].map(([t2,s,sc]) => (
                <div key={t2} className="rounded-xl border p-4"><p className="text-sm font-bold">{t2}</p><p className="mt-1 text-xs jm-muted">{s}</p><p className="mt-3 text-xs font-bold text-emerald-500">{sc} de compatibilité</p></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <Badge tone="violet">Tout votre parcours, automatisé</Badge>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">Une suite complète pour <span className="jm-gradient-text">décrocher le poste</span></h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm jm-muted">De l'analyse du CV à la préparation d'entretien, chaque étape est pensée pour vous faire gagner du temps.</p>
        </div>
        <div className="stagger grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return <div key={f.title} className="jm-card group p-6 transition hover:-translate-y-1 hover:shadow-glow">
              <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${f.color}`}><Icon className="h-5 w-5" /></div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed jm-muted">{f.text}</p>
            </div>;
          })}
        </div>
      </section>

      <section id="parcours" className="relative z-10 border-y py-20" style={{ background: "var(--surface)" }}>
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center"><Badge>Parcours utilisateur</Badge><h2 className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">Simple comme <span className="jm-gradient-text">1, 2, 3, 4</span></h2></div>
          <div className="stagger grid gap-5 md:grid-cols-4">
            {STEPS.map((s) => <div key={s.n} className="relative rounded-2xl border p-6">
              <span className="jm-gradient-text text-3xl font-black">{s.n}</span>
              <h3 className="mt-3 font-bold">{s.title}</h3>
              <p className="mt-2 text-sm jm-muted">{s.text}</p>
            </div>)}
          </div>
        </div>
      </section>

      <section id="tarifs" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center"><Badge tone="green">Tarifs transparents</Badge><h2 className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">Un forfait pour chaque étape</h2></div>
        <div className="grid gap-5 md:grid-cols-4">
          {[["Gratuit","0 EUR","30 crédits"],["Starter","19 EUR","250 crédits"],["Premium","39 EUR","800 crédits"],["Business","99 EUR","3000 crédits"]].map(([n,p,c],i) => (
            <div key={n} className={`jm-card p-6 ${i === 2 ? "ring-2 ring-violet-500" : ""}`}>
              {i === 2 && <Badge className="mb-3">Le plus choisi</Badge>}
              <h3 className="font-bold">{n}</h3><p className="mt-2 text-2xl font-extrabold">{p}<span className="text-xs font-normal jm-muted"> /mois</span></p>
              <p className="mt-1 text-xs jm-muted">{c}</p>
              <Link href="/register" className="mt-5 block"><Button variant={i === 2 ? "primary" : "outline"} className="w-full">Choisir</Button></Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs jm-muted">Les crédits illimités de l'administrateur sont une configuration serveur : les coûts réels des fournisseurs IA restent suivis séparément.</p>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <div className="jm-gradient relative overflow-hidden rounded-3xl px-8 py-14 text-center text-white shadow-glow">
          <Bot className="mx-auto mb-4 h-10 w-10 opacity-80" />
          <h2 className="text-3xl font-extrabold tracking-tight">Votre prochain emploi vous attend.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/80">Importez votre CV et laissez JOBMASTER AI préparer le reste, avec votre accord à chaque étape.</p>
          <Link href="/register"><Button size="lg" variant="secondary" className="mt-7 bg-white text-indigo-700 hover:bg-white/90">Commencer maintenant <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </section>

      <footer className="relative z-10 border-t py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-xs jm-muted md:flex-row">
          <p>© {new Date().getFullYear()} JOBMASTER AI. Tous droits réservés.</p>
          <div className="flex gap-5"><Link href="/legal" className="hover:opacity-100">Mentions légales</Link><Link href="/legal#rgpd" className="hover:opacity-100">RGPD</Link><Link href="/settings" className="hover:opacity-100">Confidentialite</Link></div>
        </div>
      </footer>
    </main>
  );
}
