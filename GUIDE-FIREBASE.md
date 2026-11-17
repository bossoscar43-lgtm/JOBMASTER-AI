# Activer Firestore — guide en 4 étapes

## Pourquoi vos valeurs actuelles ne suffisent pas

Vous m'avez donné la **configuration web publique** :

```js
apiKey: "AIzaSy...", authDomain: "...", projectId: "...", ...
```

Ces valeurs sont **publiques par conception** : elles servent au navigateur à *identifier* le projet Firebase. Elles ne donnent **aucun droit d'écriture** à notre serveur. Pour que JOBMASTER AI lise/écrive dans Firestore depuis le backend (Node.js), il faut une **clé de compte de service** (un fichier JSON privé contenant une clé cryptographique).

| Type | Valeur | Rôle | Suffisant ? |
|---|---|---|---|
| Config web (`AIzaSy...`) | Publique | Identifier le projet dans le navigateur | ❌ Non |
| Compte de service (`private_key`) | **Secrete** | Authentifier le serveur Admin SDK | ✅ Oui |

---

## Étape 1 — Obtenir la clé de compte de service

1. Allez sur **https://console.firebase.google.com/project/jobmaster-778c1**
2. En haut à gauche, cliquez sur l'**engrenage ⚙️** → **Paramètres du projet**
3. Onglet **Comptes de service** (Members / Service accounts)
4. Cliquez sur **Générer une nouvelle clé privée** (en bas)
5. Confirmez → un fichier se télécharge, du type :
   ```
   jobmaster-778c1-firebase-adminsdk-xxxxx-abcdef123456.json
   ```
6. Placez ce fichier dans le dossier `jobmaster-ai` (par exemple sur le Bureau puis glissez-le dans le projet)

⚠️ Ce fichier est un **secret**. Ne le partagez pas, ne le commitez pas. Il est déjà exclu par `.gitignore` (`**/*service-account*.json`, `firebase-adminsdk*.json`).

## Étape 2 — Activer Firestore (si pas déjà fait)

1. Console Firebase → **Construction → Firestore Database**
2. **Créer une base de données** → mode **Production** → choisissez une région proche (ex. `europe-west1`)
3. Cliquez sur **Activer**

## Étape 3 — Configurer automatiquement

Dans PowerShell, à la racine de `jobmaster-ai` :

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-firebase.ps1 -JsonPath "chemin\vers\le\fichier.json"
```

Le script remplit `FIREBASE_SERVICE_ACCOUNT` et passe `DATA_BACKEND=firestore` dans `.env.local`.

*Alternative manuelle* : ouvrez le JSON, copiez **tout** son contenu sur une seule ligne dans `.env.local` :
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"jobmaster-778c1",...}
DATA_BACKEND=firestore
```

## Étape 4 — Redémarrer et vérifier

```powershell
npm run build
npm start
```

Puis :
```powershell
Invoke-RestMethod http://localhost:3000/api/system/hydrate
```

Vous devez voir :
```
firebaseConfigured = True
firestore = True
storage = True
```

## Migration des données existantes

Si vous avez déjà des comptes/offres en SQLite local :
```powershell
node scripts/migrate-firestore.mjs
```

## Règles de sécurité (important)

Les règles fournies interdisent tout accès client direct :
- `firestore.rules` : `allow read, write: if false;`
- `storage.rules` : `allow read, write: if false;`

Seul le **SDK Admin serveur** accède aux données. Déployez-les avec :
```powershell
firebase deploy --only firestore:rules,storage
```

Les CV privés sont stockés dans `gs://jobmaster-778c1.firebasestorage.app/cvs/<userId>/...` et téléchargés via des URL signées de 10 minutes.
