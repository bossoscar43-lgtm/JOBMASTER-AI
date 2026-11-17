import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import type { Bucket } from "@google-cloud/storage";

let _app: App | null = null;
let _db: Firestore | null = null;
let _bucket: Bucket | null = null;

/**
 * Initialisation Firebase Admin (côté serveur uniquement).
 * La clé de compte de service est lue depuis FIREBASE_SERVICE_ACCOUNT (JSON)
 * ou depuis FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
 * Aucune clé admin n'est jamais exposée au navigateur.
 */
export function firebaseEnabled(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
  );
}

export function getFirebaseApp(): App | null {
  if (!firebaseEnabled()) return null;
  if (_app) return _app;
  if (getApps().length) {
    _app = getApps()[0];
    return _app;
  }
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) as {
      project_id?: string; client_email?: string; private_key?: string;
    };
    credential = cert({
      projectId: sa.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    });
  } else {
    credential = cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    });
  }
  try {
    _app = initializeApp({
      credential,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "jobmaster-778c1.firebasestorage.app",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "jobmaster-778c1",
    });
    return _app;
  } catch (e) {
    console.error("[Firebase] initialisation impossible :", e instanceof Error ? e.message : e);
    return null;
  }
}

export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!_db) _db = getFirestore(app);
  return _db;
}

export function getFirebaseBucket(): Bucket | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!_bucket) _bucket = getStorage(app).bucket();
  return _bucket;
}

/** Collection Firestore racine unique contenant toutes les tables. */
export function col(name: string) {
  const db = getFirestoreDb();
  if (!db) return null;
  return db.collection("jobmaster").doc("data").collection(name);
}
