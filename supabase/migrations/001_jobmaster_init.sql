-- ============================================================
-- JOBMASTER AI — Schéma Supabase (PostgreSQL)
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- Table de snapshots : c'est ici que l'application persiste les données.
create table if not exists public.jm_snapshot (
  table_name text primary key,
  rows jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS : seul le rôle service_role (utilisé par le serveur) peut y accéder.
alter table public.jm_snapshot enable row level security;

drop policy if exists "jm_snapshot service only" on public.jm_snapshot;
create policy "jm_snapshot service only"
  on public.jm_snapshot for all
  to service_role
  using (true) with check (true);

-- Table de suivi des dépenses IA (transparence des coûts réels).
create table if not exists public.jm_ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  task text not null,
  model text not null,
  tokens integer not null default 0,
  cost_usd numeric(10,6) not null default 0,
  created_at timestamptz not null default now()
);
alter table public.jm_ai_usage enable row level security;
drop policy if exists "jm_ai_usage service only" on public.jm_ai_usage;
create policy "jm_ai_usage service only"
  on public.jm_ai_usage for all
  to service_role
  using (true) with check (true);
