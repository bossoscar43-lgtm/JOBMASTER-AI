"use client";

import { useCallback, useEffect, useState } from "react";

export function useApi<T>(url: string | null, initial?: T) {
  const [data, setData] = useState<T | null>(initial ?? null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url).catch(() => {
        throw new Error("Impossible de contacter le serveur.");
      });
      const json = await safeJson(res);
      if (!json.ok) throw new Error(json.error || "Erreur de chargement");
      setData(json.data as T);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, error, reload, setData };
}

/** Parse une réponse API sans jamais planter sur un corps vide/non-JSON. */
export async function safeJson(res: Response): Promise<Record<string, any>> {
  const text = await res.text().catch(() => "");
  if (!text) {
    throw new Error(
      res.status >= 500
        ? "Le serveur est momentanément indisponible. Réessayez dans un instant."
        : "Réponse vide du serveur. Vérifiez que l'application est démarrée."
    );
  }
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    throw new Error(
      res.status >= 500
        ? `Erreur serveur (${res.status}). Réessayez dans un instant.`
        : `Réponse inattendue du serveur (${res.status}).`
    );
  }
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options).catch(() => {
    throw new Error("Impossible de contacter le serveur. Vérifiez qu'il est démarré.");
  });
  const json = await safeJson(res);
  if (!json.ok) throw new Error(json.error || "Une erreur est survenue.");
  return json.data as T;
}

export async function apiJson<T>(url: string, method: string, body: unknown): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const res = await fetch(url, {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }).catch(() => { throw new Error("Impossible de contacter le serveur."); });
  const json = await safeJson(res);
  if (!json.ok) throw new Error(json.error || "Une erreur est survenue.");
  return { data: json.data as T, meta: json.meta };
}
