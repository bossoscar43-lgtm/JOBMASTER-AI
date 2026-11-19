# JOBMASTER AI

**Ton prochain emploi commence ici.**

Plateforme SaaS full-stack de recherche d'emploi assistée par IA : import de CV, analyse du profil, recherche d'offres, matching, adaptation des CV, génération de lettres, suivi des candidatures, coach d'entretien et assistant conversationnel.

---

## 0. Base de données gratuite (Supabase — recommandé, ou Firebase / Firestore)

Le projet Firebase `jobmaster-778c1` est intégré. **Supabase est recommandé** car PostgreSQL est compatible avec le code SQL existant (voir `GUIDE-SUPABASE.md`). Trois modes :

- **Mode SQLite local** (`DATA_BACKEND=sqlite`, par défaut) : fonctionne immédiatement, sans clé. Idéal pour le développement.
- **Mode Firestore** (`DATA_BACKEND=firestore`) : Firestore devient la source de vérité. La couche SQL est conservée en mémoire pour les jointures et réhydratée depuis Firestore au démarrage.

### Activer Firestore

1. Console Firebase → **Paramètres du projet** → **Comptes de service** → **Générer une nouvelle clé privée**.
2. Collez le JSON complet dans `FIREBASE_SERVICE_ACCOUNT` dans `.env.local` (ou `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` avec `\n`).
3. Renseignez `NEXT_PUBLIC_FIREBASE_PROJECT_ID` et `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`.
4. `DATA_BACKEND=firestore`, puis `npm run build && npm start`.
5. Migrer les données existantes : `node scripts/migrate-firestore.mjs`.
6. Déployer les règles : `firebase deploy --only firestore:rules,storage` (fichiers `firestore.rules` et `storage.rules`).

La page **Administration → Base de données** affiche l'état de la connexion et permet de resynchroniser.

⚠️ **Sécurité** : la clé API web Firebase est publique par conception. Les règles fournies interdisent **tout accès client direct** à Firestore et Storage : seules les API serveur (SDK Admin) y accèdent. Ne jamais exposer la clé de compte de service au navigateur. Les CV privés sont stockés dans `gs://<bucket>/cvs/<userId>/...` et téléchargés via des URL signées de 10 minutes.

**Gratuité** : le plan Spark Firebase inclut 1 Go de Firestore, 5 Go de Storage et 10 Go/mois de bande passante — largement suffisant pour démarrer. Les API d'offres gratuites (Remotive, Arbeitnow, Jobicy) sont actives sans clé.

---

## 1. Démarrage rapide

Prérequis : **Node.js >= 22.5** (utilise le module natif `node:sqlite`).

```powershell
cd jobmaster-ai
npm install
Copy-Item .env.example .env.local
# Éditez .env.local (au minimum SESSION_SECRET et ADMIN_BOOTSTRAP_SECRET)
npm run dev
```

Ouvrez <http://localhost:3000>.

Aucune clé externe n'est nécessaire pour démarrer : l'application fonctionne en **mode démonstration local** (moteur déterministe + 24 offres d'exemple clairement identifiées `Démo`).

### Comptes de démonstration

Aucun compte n'est pré-créé (sécurité). Créez le vôtre via `/register`.

**Compte administrateur** : le rôle admin n'est **jamais** accordé sur la seule base d'une adresse email déclarée. Pour le créer :

1. Définir `ADMIN_EMAILS` (emails autorisés) et `ADMIN_BOOTSTRAP_SECRET` dans `.env.local`.
2. S'inscrire avec un email de la liste **et** le secret d'amorçage dans le champ dédié.
3. Le serveur vérifie le secret en temps constant (HMAC) et attribue `role=admin` + `admin_verified=1`.

Deux adresses sont mentionnées dans le cahier des charges (`johnsalvador064@gmail.com` en §2 et `johnsalvador104@gmail.com` en §13) : les deux sont listées par défaut dans `.env.example`. **À confirmer : une seule doit rester autorisée en production.**

---

## 2. Architecture

```
src/
  app/
    (app)/            # Espace authentifié (dashboard, CV, offres, candidatures, coach, admin…)
    api/              # Route handlers (auth, profil, CV, recherche, IA, admin, billing…)
    login|register|forgot-password|reset-password|help|legal
  components/         # UI, shell, graphiques SVG, vues détaillées, assistant flottant
  lib/
    db.ts             # SQLite natif, schéma complet, seed idempotent
    auth.ts           # sessions opaques en DB, cookies httpOnly, garde admin serveur
    credits.ts        # crédits, coûts par action, illimité côté serveur
    ai-core.ts        # adaptateur OpenAI + repli local transparent
    local-*.ts        # moteur déterministe (analyse CV, scoring, adaptation, contenus)
    jobs/             # connecteurs officiels + moteur de recherche/déduplication
    cv/               # parsing PDF/DOCX/TXT + rendu PDF/DOCX/HTML
    mailer.ts         # SMTP optionnel, journalisation sinon
    settings.ts       # configuration IA et intégrations
  types/              # déclarations de modules
data/jobmaster.db     # base locale (non versionnée)
```

**Stockage** : `node:sqlite` (SQLite intégré à Node, WAL, clés étrangères). Le schéma est dans `src/lib/db.ts`. Pour une mise à l'échelle Supabase/PostgreSQL, la couche d'accès est centralisée dans `repositories.ts` et `db.ts`.

**Sécurité** : sessions opaques hachées (SHA-256) en base, cookies `httpOnly` + `Secure` en production + `SameSite=Lax`, mots de passe bcrypt (coût 12), garde admin côté serveur (`role` **et** `admin_verified`), journalisation des actions sensibles, limitation de débit, réinitialisation par token à usage unique, effacement RGPD.

---

## 3. Configuration des intégrations

Toutes les clés peuvent être définies dans `.env.local` **ou** depuis le panneau administrateur (`Administration → Intégrations` et `Configuration IA`).

| Intégration | Variables | Comportement sans clé |
|---|---|---|
| **Remotive** (gratuite, sans clé) | aucune | Active par défaut — offres remote réelles |
| **Arbeitnow** (gratuite, sans clé) | aucune | Active par défaut — offres Europe réelles |
| **Jobicy** (gratuite, sans clé) | aucune | Active par défaut — offres remote réelles, source créditée dans l'UI |
| OpenAI | `OPENAI_API_KEY`, `OPENAI_MODEL` | Moteur local déterministe, mode explicitement indiqué `local` |
| France Travail | `FRANCE_TRAVAIL_CLIENT_ID`, `FRANCE_TRAVAIL_CLIENT_SECRET` | Connecteur désactivé (API gratuite mais inscription requise) |
| Welcome to the Jungle | `WELCOME_TO_THE_JUNGLE_API_KEY` | Connecteur désactivé |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Emails journalisés, **jamais envoyés** |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Facturation en mode démonstration |

Les connecteurs utilisent **uniquement des API officielles**. Aucun CAPTCHA, anti-robot ou contournement de restriction n'est implémenté. Les sources nécessitant un accord commercial (Apec, HelloWork, JobTeaser, LinkedIn) sont listées mais non activées par défaut.

---

## 4. Parcours utilisateur

1. Créer un compte.
2. Importer un CV (PDF / DOCX / TXT, 10 Mo max). L'IA extrait compétences, formations, expériences et qualités **réellement présentes**.
3. Compléter le profil si besoin.
4. Définir les préférences (villes, rayon, contrats, domaines, salaire, ancienneté de l'offre) une seule fois.
5. Cliquer sur **LANCER MA RECHERCHE AUTOMATIQUE** : collecte, déduplication, filtrage des offres expirées et scoring.
6. Ouvrir une offre → générer le CV adapté + lettre + email + message LinkedIn.
7. Vérifier et modifier les textes, puis valider.
8. **L'email du recruteur est retrouvé automatiquement** depuis l'annonce (regex dans la description, domaine de l'entreprise déduit de l'URL, ou adresse de démonstration), avec un niveau de confiance. Le bouton 🔍 permet de le pré-remplir. L'email envoyé contient **les coordonnées complètes du candidat** (nom, email, téléphone, ville, LinkedIn) + CV et lettre en pièces jointes. Envoi **uniquement après autorisation explicite**.
9. Suivi des statuts, relances, notifications, et préparation d'entretien avec le Coach IA.

---

## 5. Crédits et coûts réels

Les crédits sont une unité applicative. L'administrateur vérifié dispose d'un solde **illimité côté serveur** (`-1`). Cela **ne signifie pas** que les appels aux fournisseurs IA sont gratuits : le panneau `Configuration IA` suit séparément le modèle, le budget et les dépenses estimées.

Coûts par action : analyse CV 4 · recherche 3 · adaptation CV 6 · lettre 5 · coach 8 · assistant 1 · envoi 2.

---

## 6. Scripts

```powershell
npm run dev         # développement (http://localhost:3000)
npm run build       # build de production
npm run start       # serveur de production
npm run typecheck   # vérification TypeScript
powershell -ExecutionPolicy Bypass -File scripts/smoke.ps1   # test bout-en-bout (port 3001)
```

Le script de smoke test couvre : inscription, session, import CV, recherche, détail d'offre, adaptation, candidatures, coach, assistant, dashboard, contrôle d'accès admin et création admin sécurisée.

---

## 7. Limites connues / production

- Remplacer le secret de session et le secret d'amorçage par des valeurs aléatoires fortes.
- Définir `NEXT_PUBLIC_APP_URL` en HTTPS (cookies `Secure`).
- Fournir les mentions légales et le texte RGPD définitifs (`src/app/legal/page.tsx` est un modèle).
- Brancher Stripe webhooks pour synchroniser les abonnements réels.
- Brancher un fournisseur d'email SMTP transactionnel pour les envois réels.
- Pour monter en charge : migrer `db.ts` vers PostgreSQL/Supabase en conservant les règles RLS et les gardes serveur.
 
 