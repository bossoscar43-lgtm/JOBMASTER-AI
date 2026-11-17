"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "./ui";
import { apiJson } from "./hooks";

/** Bouton d'actualisation manuelle des offres (complète le cron serveur). */
export function RefreshButton() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      await apiJson("/api/cron/refresh-jobs", "POST", {});
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch {
      // Erreur silencieuse : l'utilisateur peut réessayer.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={refresh} loading={busy} title="Actualiser les offres">
      <RefreshCw className={`h-4 w-4 ${done ? "text-emerald-500" : ""}`} />
      {done ? "Actualisé" : "Actualiser"}
    </Button>
  );
}
