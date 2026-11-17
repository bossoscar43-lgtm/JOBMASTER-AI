# Déploiement — GitHub + Vercel

Guide complet pour publier JOBMASTER AI en production.

---

## 1. Préparer le dépôt GitHub

Le projet est dans `jobmaster-ai/`. Le `.gitignore` exclut déjà :
- `node_modules`, `.next`, `data/`
- `.env`, `.env.local`, `.env*.local`
- `*.log`, `*.pem`, `*service-account*.json`

⚠️ **Vérifiez qu'aucun secret n'est commité** (`.env.local` ne doit jamais partir sur GitHub).

```powershell
cd "C:\Users\Lenovo\Documents\Projet par défaut\jobmaster-ai"
git init
git add .
git commit -m "Initial commit - JOBMASTER AI"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/jobmaster-ai.git
git push -u origin main
```

---

## 2. Déployer sur Vercel

### Méthode A — Dashboard (recommandé)

1. https://vercel.com/new → **Import Git Repository** → sélectionnez `jobmaster-ai`
2. Framework : **Next.js** (détecté automatiquement)
3. **Root Directory** : laissez vide si vous avez poussé le dossier `jobmaster-ai` directement, sinon indiquez `jobmaster-ai`
4. Avant de déployer, ajoutez les **Environment Variables** (voir section 3)
5. **Deploy**

### Méthode B — CLI

```powershell
npm i -g vercel
vercel login
vercel --prod
```

---

## 3. Variables d'environnement Vercel

Dans **Vercel Dashboard → Project → Settings → Environment Variables**, ajoutez toutes les variables de `.env.vercel.example`.

**Minimal obligatoire** (l'app démarre avec ça) :

| Variable | Valeur |
|---|---|
| `SESSION_SECRET` | chaîne aléatoire longue |
| `NEXT_PUBLIC_APP_URL` | `https://votre-projet.vercel.app` |
| `DATA_BACKEND` | `supabase` |
| `SUPABASE_URL` | votre URL Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | votre clé secrète |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | votre clé publishable |
| `ADMIN_EMAILS` | **un seul** email admin |
| `ADMIN_BOOTSTRAP_SECRET` | secret aléatoire |
| `CRON_SECRET` | secret aléatoire |
| `AUTO_REFRESH_ENABLED` | `true` |
| `FRANCE_ONLY` | `true` |

⚠️ **Ne PAS mettre `COOKIE_INSECURE_LOCAL` en production** (les cookies `Secure` sont automatiques en HTTPS).

---

## 4. Points importants pour Vercel

### Base de données
Supabase reste la source de vérité. Le cache SQLite en mémoire est rechargé depuis Supabase à chaque démarrage du serveurless via `waitForHydration()`. ✅ Déjà configuré.

### Actualisation automatique des offres
`vercel.json` déclare un **Vercel Cron** qui appelle `/api/cron/refresh-jobs` toutes les 6 h :

```json
"crons": [{ "path": "/api/cron/refresh-jobs", "schedule": "0 */6 * * *" }]
```

Le planificateur intégré au serveur et le Vercel Cron **coexistent sans doublon** grâce à la détection d'actualisation récente.

⚠️ Vercel Cron envoie l'en-tête `Authorization: Bearer $CRON_SECRET` automatiquement. La route le vérifie.

### Limites Serverless
`vercel.json` fixe `maxDuration` à 60 s (maximum du plan Hobby). Si vous avez un plan Pro et de nombreux utilisateurs, augmentez la valeur pour le cron. Le cron traite les utilisateurs par lots ; avec peu d'utilisateurs, 60 s suffisent large.

### Région
`regions: ["cdg1"]` (Paris) pour la proximité avec Supabase Europe.

---

## 5. Après le déploiement

1. Ouvrez `https://votre-projet.vercel.app`
2. Créez le compte admin : `/register` avec l'email de `ADMIN_EMAILS` + le `ADMIN_BOOTSTRAP_SECRET` dans le champ « Accès administrateur »
3. Vérifiez `https://votre-projet.vercel.app/api/system/hydrate` → `supabase: true`
4. Dans **Administration → Base de données**, confirmez : Supabase Active, AutoRefresh Actif

---

## 6. Configuration Supabase (si pas déjà fait)

1. Créez le projet sur https://supabase.com
2. SQL Editor → collez `supabase/migrations/001_jobmaster_init.sql`
3. Project Settings → API → copiez URL + clé `service_role`
4. RLS activée : seul `service_role` accède aux données ✅

---

## 7. Sécurité — checklist

- [ ] Aucun secret dans Git (`.env.local` ignoré)
- [ ] `SESSION_SECRET` régénéré
- [ ] `ADMIN_BOOTSTRAP_SECRET` régénéré
- [ ] **Un seul** email dans `ADMIN_EMAILS` (choisir 064 ou 104)
- [ ] `CRON_SECRET` régénéré
- [ ] Clé OpenAI révoquée (elle a été partagée dans la conversation) puis régénérée si vous voulez l'IA réelle
- [ ] Mentions légales complétées (`src/app/legal/page.tsx`)
- [ ] HTTPS actif (automatique sur Vercel)
- [ ] `COOKIE_INSECURE_LOCAL` absent

---

## 8. Coûts

- **Vercel Hobby** : gratuit
- **Supabase Free** : 500 Mo DB + 1 Go Storage (suffisant pour démarrer)
- **OpenAI** : payant à l'usage (optionnel ; sans clé, moteur local gratuit)
- **Sources d'offres** : API gratuites, aucune clé requise

Le suivi des coûts IA réels est dans **Administration → Configuration IA**.
