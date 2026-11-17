"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Bot, SlidersHorizontal, Coins, ScrollText, Tags, Database } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/ai", label: "Configuration IA", icon: Bot },
  { href: "/admin/config", label: "Intégrations", icon: SlidersHorizontal },
  { href: "/admin/database", label: "Base de données", icon: Database },
  { href: "/admin/credits", label: "Crédits & coûts", icon: Coins },
  { href: "/admin/plans", label: "Abonnements", icon: Tags },
  { href: "/admin/logs", label: "Journal d'activité", icon: ScrollText },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = pathname === t.href;
        return <Link key={t.href} href={t.href} className={cn("flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition",
          active ? "jm-gradient text-white shadow-glow" : "opacity-65 hover:opacity-100")}>
          <Icon className="h-3.5 w-3.5" />{t.label}
        </Link>;
      })}
    </div>
  );
}
