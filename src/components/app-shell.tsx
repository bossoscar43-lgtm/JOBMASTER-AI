"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, FileText, UserRound, Search, BriefcaseBusiness, Send, Mic2, Bot,
  History, Settings, CreditCard, Shield, LogOut, Menu, X, Globe2, Moon, Sun, Zap, HelpCircle,
} from "lucide-react";
import { useApp } from "./providers";
import { cn, initials } from "@/lib/utils";
import type { PublicUser } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard },
  { href: "/resumes", label: "nav.resumes", icon: FileText },
  { href: "/profile", label: "nav.profile", icon: UserRound },
  { href: "/search", label: "nav.search", icon: Search, highlight: true },
  { href: "/jobs", label: "nav.jobs", icon: BriefcaseBusiness },
  { href: "/applications", label: "nav.applications", icon: Send },
  { href: "/coach", label: "nav.coach", icon: Mic2 },
  { href: "/assistant", label: "nav.assistant", icon: Bot },
  { href: "/history", label: "nav.history", icon: History },
];

const PAGE_LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  resumes: "Mes CV",
  profile: "Mon profil",
  search: "Recherche automatique",
  jobs: "Offres d'emploi",
  applications: "Candidatures",
  coach: "Coach entretien IA",
  assistant: "Assistant IA",
  history: "Historique",
  settings: "Paramètres",
  billing: "Abonnements",
  admin: "Administration",
  help: "Centre d'aide",
};

const NAV_BOTTOM = [
  { href: "/billing", label: "nav.billing", icon: CreditCard },
  { href: "/settings", label: "nav.settings", icon: Settings },
  { href: "/help", label: "Aide", icon: HelpCircle },
];

export function AppShell({ user, children }: { user: PublicUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale, setLocale, theme, setTheme } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const navLink = (item: typeof NAV[number]) => {
    const Icon = item.icon;
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
        className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all",
          active ? "jm-gradient text-white shadow-glow" : "opacity-70 hover:opacity-100 hover:bg-black/[.04] dark:hover:bg-white/[.06]")}>
        <Icon className="h-[17px] w-[17px] shrink-0" />
        <span className="truncate">{t(item.label)}</span>
        {"highlight" in item && item.highlight && !active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 animate-soft-pulse" />}
      </Link>
    );
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-3 pt-1 text-base font-extrabold">
        <span className="grid h-9 w-9 place-items-center rounded-xl jm-gradient text-white"><Zap className="h-5 w-5" /></span>
        JOBMASTER <span className="jm-gradient-text">AI</span>
      </Link>
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest opacity-40">Espace de travail</p>
      <nav className="space-y-1">{NAV.map(navLink)}</nav>
      {user.role === "admin" && (
        <>
          <p className="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-widest opacity-40">Administration</p>
          <nav className="space-y-1">
            {[{ href: "/admin", label: "nav.admin", icon: Shield }].map(navLink)}
          </nav>
        </>
      )}
      <div className="mt-auto space-y-1 pt-6">
        <div className="mx-1 mb-3 rounded-xl border p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="jm-muted">Crédits IA</span>
            <span className="font-bold text-indigo-500">{user.credits_balance < 0 ? "Illimités" : user.credits_balance}</span>
          </div>
          <Link href="/billing" className="mt-2 block text-[11px] font-semibold text-indigo-500 hover:underline">Gérer mon forfait →</Link>
        </div>
        {NAV_BOTTOM.map(navLink)}
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium opacity-70 transition hover:bg-rose-500/10 hover:text-rose-500 hover:opacity-100">
          <LogOut className="h-[17px] w-[17px]" />{t("nav.logout")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r px-4 py-6 lg:block" style={{ background: "var(--surface)" }}>
        {sidebar}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-[270px] overflow-y-auto border-r px-4 py-6" style={{ background: "var(--surface)" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMobileOpen(false)} className="mb-4 ml-auto block rounded-lg p-1.5 opacity-60"><X className="h-5 w-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-xl md:px-7" style={{ background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}>
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 opacity-70 lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="flex-1">
            <p className="text-[11px] jm-muted">Espace candidat</p>
            <p className="text-sm font-semibold capitalize">{PAGE_LABELS[pathname.split("/").filter(Boolean).pop() || ""] || pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Tableau de bord"}</p>
          </div>
          <button onClick={() => setLocale(locale === "fr" ? "en" : "fr")} className="rounded-lg border p-2 opacity-70 hover:opacity-100" title="Changer de langue">
            <Globe2 className="h-4 w-4" />
          </button>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-lg border p-2 opacity-70 hover:opacity-100" title="Changer de thème">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link href="/profile" className="flex items-center gap-2.5 rounded-xl border py-1.5 pl-1.5 pr-3">
            <span className="grid h-7 w-7 place-items-center rounded-lg jm-gradient text-[10px] font-bold text-white">{initials(user.full_name)}</span>
            <span className="hidden text-xs font-semibold sm:block">{user.full_name.split(" ")[0]}</span>
          </Link>
        </header>
        <main className="relative mx-auto max-w-[1400px] px-4 py-7 md:px-7">
          <div className="pointer-events-none fixed left-1/3 top-0 -z-10 h-72 w-72 rounded-full bg-indigo-500/[.07] blur-[110px] jm-float" />
          <div className="pointer-events-none fixed right-0 top-1/2 -z-10 h-80 w-80 rounded-full bg-violet-500/[.06] blur-[120px] jm-float-slow" />
          {children}
        </main>
      </div>
    </div>
  );
}
