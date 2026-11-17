"use client";

import { Users, FileText, BriefcaseBusiness, Send, Mic2, Mail, Coins, Database } from "lucide-react";
import { useApi } from "@/components/hooks";
import { Card, Spinner, Badge, StatCard } from "@/components/ui";
import { BarChart } from "@/components/charts";

interface Stats {
  users: number; activeUsers: number; resumes: number; jobs: number; applications: number;
  interviews: number; emails: number; searches: number; creditsGranted: number;
  planDistribution: { label: string; value: number }[];
  aiCosts: { configured: boolean; provider: string; model: string; spentUsd: number; budgetUsd: number };
}

export default function AdminOverview() {
  const { data, loading } = useApi<Stats>("/api/admin/stats");
  if (loading) return <div className="grid place-items-center py-24"><Spinner /></div>;
  if (!data) return null;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Utilisateurs" value={data.users} icon={<Users className="h-5 w-5" />} trend={`${data.activeUsers} actifs`} />
        <StatCard label="CV analysés" value={data.resumes} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Offres en base" value={data.jobs} icon={<BriefcaseBusiness className="h-5 w-5" />} />
        <StatCard label="Candidatures" value={data.applications} icon={<Send className="h-5 w-5" />} />
        <StatCard label="Entretiens simulés" value={data.interviews} icon={<Mic2 className="h-5 w-5" />} />
        <StatCard label="Emails journalisés" value={data.emails} icon={<Mail className="h-5 w-5" />} />
        <StatCard label="Recherches" value={data.searches} icon={<Database className="h-5 w-5" />} />
        <StatCard label="Crédits distribués" value={data.creditsGranted} icon={<Coins className="h-5 w-5" />} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-5 font-bold">Répartition des forfaits</h2>
          <BarChart data={data.planDistribution} />
        </Card>
        <Card className="space-y-4">
          <h2 className="font-bold">Suivi des coûts IA (réels)</h2>
          <div className="flex flex-wrap gap-2"><Badge tone={data.aiCosts.configured ? "green" : "amber"}>{data.aiCosts.configured ? "Fournisseur connecté" : "Mode local"}</Badge><Badge tone="indigo">{data.aiCosts.model}</Badge></div>
          <p className="text-sm jm-muted">Les crédits illimités de l'administrateur sont une règle applicative. Les dépenses réelles auprès du fournisseur sont comptabilisées séparément et ne doivent pas être confondues avec des appels gratuits.</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border p-3"><p className="text-xs jm-muted">Dépensé (suivi)</p><p className="mt-1 font-bold">${data.aiCosts.spentUsd.toFixed(2)}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs jm-muted">Budget mensuel</p><p className="mt-1 font-bold">${data.aiCosts.budgetUsd.toFixed(2)}</p></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
