"use client";

import { Database, RefreshCw, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { useApi, apiFetch } from "@/components/hooks";
import { Badge, Button, Card } from "@/components/ui";
import { useApp } from "@/components/providers";

interface Status {
  firebaseConfigured: boolean;
  firestore: boolean;
  storage: boolean;
  projectId: string;
  rowsHydrated: number;
  supabaseConfigured: boolean;
  supabase: boolean;
  supabaseUrl: string;
  autoRefresh?: { enabled: boolean; intervalHours: number; nextRunAt: string | null };
}

export default function AdminDatabase() {
  const { data, reload, loading } = useApi<Status>("/api/system/hydrate");
  const { toast } = useApp();
  const actif = data?.supabase || data?.firestore;
  const nom = data?.supabase ? "Supabase" : data?.firestore ? "Firestore" : "SQLite local";

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold"><Database className="h-4 w-4 text-indigo-500" /> Base de données — {nom}</h2>
          <Button size="sm" variant="outline" onClick={async () => { await apiFetch("/api/system/hydrate", { method: "POST" }); toast("Synchronisation terminée.", "success"); await reload(); }} loading={loading}>
            <RefreshCw className="h-4 w-4" /> Synchroniser
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border p-4">
            <p className="text-xs jm-muted">Supabase (PostgreSQL)</p>
            <Badge className="mt-2" tone={data?.supabase ? "green" : data?.supabaseConfigured ? "amber" : "slate"}>
              {data?.supabase ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {data?.supabase ? "Active" : data?.supabaseConfigured ? "Configurée (inactive)" : "Non configurée"}
            </Badge>
            {data?.supabaseUrl && <p className="mt-2 text-[10px] jm-muted">{data.supabaseUrl}</p>}
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-xs jm-muted">Firebase / Firestore</p>
            <Badge className="mt-2" tone={data?.firestore ? "green" : "slate"}>{data?.firestore ? "Active" : "Inactive"}</Badge>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-xs jm-muted">Firebase Storage</p>
            <Badge className="mt-2" tone={data?.storage ? "green" : "slate"}>{data?.storage ? "Actif" : "Local"}</Badge>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-xs jm-muted">Lignes rehydratées</p>
            <p className="mt-2 text-xl font-extrabold text-indigo-500">{data?.rowsHydrated || 0}</p>
          </div>
        </div>
        {actif ? <p className="text-xs text-emerald-500">Persistance cloud active : les données sont sauvegardées à distance.</p> :
          <p className="text-xs text-amber-500">Mode local : les données restent sur ce serveur. Configurez Supabase pour la persistance cloud.</p>}
        <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4 text-xs">
          <p className="flex items-center gap-2 font-semibold text-indigo-500">
            <RefreshCw className="h-4 w-4" /> Actualisation automatique des offres
          </p>
          <p className="mt-2 jm-muted">
            Statut : <strong>{data?.autoRefresh?.enabled ? "ACTIVE (sans intervention)" : "EN ATTENTE"}</strong>
            {" · "}Intervalle : {data?.autoRefresh?.intervalHours || 6} h
          </p>
          {data?.autoRefresh?.nextRunAt && (
            <p className="mt-1 jm-muted">Prochaine actualisation : {new Date(data.autoRefresh.nextRunAt).toLocaleString("fr-FR")}</p>
          )}
          <p className="mt-2 jm-muted">Le serveur actualise les offres de tous les utilisateurs automatiquement. Aucun cron externe nécessaire.</p>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold">Activer Supabase (gratuit)</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm jm-muted">
          <li>Créez un projet sur <strong>supabase.com</strong> (plan gratuit).</li>
          <li><strong>SQL Editor → New query</strong> : collez le contenu de <code className="rounded bg-black/10 px-1">supabase/migrations/001_jobmaster_init.sql</code> puis <strong>Run</strong>.</li>
          <li><strong>Project Settings → API</strong> : copiez l'<strong>URL</strong> et la clé <strong>service_role</strong>.</li>
          <li>Collez-les dans <code className="rounded bg-black/10 px-1">.env.local</code> : <code>SUPABASE_URL</code> et <code>SUPABASE_SERVICE_ROLE_KEY</code>.</li>
          <li>Passez <code className="rounded bg-black/10 px-1">DATA_BACKEND=supabase</code>, puis <code>npm run build && npm start</code>.</li>
        </ol>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-600">
          <strong>Sécurité.</strong> La clé <code>service_role</code> contourne RLS : elle reste exclusivement côté serveur. Les règles SQL fournies limitent l'accès à ce seul rôle. Ne jamais l'exposer au navigateur.
        </div>
        <Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText("DATA_BACKEND=supabase"); toast("Copié.", "success"); }}><Copy className="h-4 w-4" /> Copier la variable</Button>
      </Card>
    </div>
  );
}
