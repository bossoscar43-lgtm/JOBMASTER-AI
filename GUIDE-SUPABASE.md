# Activer Supabase — guide rapide

Supabase est une base **PostgreSQL gratuite**. Elle est compatible avec notre code SQL : aucune réécriture nécessaire.

## 1. Créer le projet

1. https://supabase.com → **New project** → nom `jobmaster-ai`, mot de passe DB, région `Europe (Frankfurt)`
2. Attendre ~2 min que le projet soit prêt

## 2. Créer les tables

1. Dans le projet → **SQL Editor** (icône ω) → **New query**
2. Collez tout le contenu de `supabase/migrations/001_jobmaster_init.sql`
3. **Run** → vous devez voir `Success. No rows returned`

Cela crée :
- `jm_snapshot` : stocke les données de l'application (une ligne par table)
- `jm_ai_usage` : suivi des dépenses IA réelles
- Les politiques RLS qui limitent l'accès au rôle `service_role`

## 3. Récupérer les clés

**Project Settings** (⚙️) → **API** :
- **Project URL** → `https://xxxxxxxx.supabase.co`
- **service_role** (secret) → `eyJhbGciOi...`

## 4. Configurer

Dans `.env.local` :
```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
DATA_BACKEND=supabase
```

## 5. Redémarrer

```powershell
npm run build
npm start
```

Vérification :
```powershell
Invoke-RestMethod http://localhost:3000/api/system/hydrate
```
Attendu : `supabaseConfigured = True`, `supabase = True`.

Migration des données locales existantes :
```powershell
node scripts/migrate-supabase.mjs
```

## Sécurité

- La clé `service_role` contourne RLS → **serveur uniquement**, jamais dans le navigateur
- La clé `anon` (publique) n'est pas utilisée pour les données
- Toutes les vérifications d'accès restent dans notre API (`src/lib/auth.ts`)
- Les CV restent dans Firebase Storage ou en local selon la configuration

## Pourquoi Supabase plutôt que Firestore ici

| | Firestore | Supabase |
|---|---|---|
| Type | NoSQL (documents) | PostgreSQL (relationnel) |
| Jointures SQL | ❌ réécriture | ✅ natives |
| Compatibilité code actuel | Faible | **Totale** |
| Configuration | Clé de service JSON | URL + clé service_role |
| Gratuit | 1 Go | 500 Mo + 1 Go Storage |
