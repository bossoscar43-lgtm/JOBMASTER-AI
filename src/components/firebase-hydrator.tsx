"use client";

import { useEffect } from "react";

/** Réhydrate le cache SQL depuis Firestore au chargement de l'application.
 *  L'appel est idempotent et sans effet si Firestore n'est pas configuré. */
export function FirebaseHydrator() {
  useEffect(() => {
    void fetch("/api/system/hydrate", { method: "POST" }).catch(() => undefined);
  }, []);
  return null;
}
