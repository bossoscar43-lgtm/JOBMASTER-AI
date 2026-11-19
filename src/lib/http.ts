import { NextResponse } from "next/server";
import { z } from "zod";
import type { ApiError, ApiResult } from "./types";
import { flushPendingWrites } from "./db";

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json<ApiResult<T>>({ ok: true, data, ...(meta ? { meta } : {}) });
}

export function fail(error: string, code = "BAD_REQUEST", status = 400) {
  return NextResponse.json<ApiError>({ ok: false, error, code }, { status });
}

export function unauthorized() {
  return fail("Authentification requise.", "UNAUTHORIZED", 401);
}

export function forbidden(message = "Accès refusé.") {
  return fail(message, "FORBIDDEN", 403);
}

export function notFound(message = "Ressource introuvable.") {
  return fail(message, "NOT_FOUND", 404);
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : "Erreur interne.";
  console.error("[JOBMASTER]", message);
  return fail("Une erreur est survenue. Réessayez.", "INTERNAL", 500);
}

export function validationError(error: z.ZodError) {
  const first = error.issues[0];
  return fail(first ? `${first.path.join(".") || "champ"}: ${first.message}` : "Données invalides.", "VALIDATION", 422);
}

/** Exécute un handler API avec gestion d'erreur uniforme. */
export async function handle(fn: () => Promise<Response> | Response): Promise<Response> {
  try {
    // Sur Vercel (serverless), chaque function démarre avec un cache vide :
    // le recharger depuis Supabase AVANT toute requête, sinon les sessions
    // et données ne sont pas trouvées (401/500 intermittents).
    try {
      const { waitForHydration } = await import("./db");
      await waitForHydration();
    } catch (e) {
      console.error("[DB] hydration impossible:", e instanceof Error ? e.message : e);
    }
    const response = await fn();
    // Sur Vercel (serverless), attendre la persistance cloud avant de répondre.
    // Tolérant aux erreurs : un échec de flush ne doit pas transformer une
    // réponse valide en 500.
    try {
      await flushPendingWrites();
    } catch (e) {
      console.error("[DB] flush impossible:", e instanceof Error ? e.message : e);
    }
    return response;
  } catch (e) {
    return serverError(e);
  }
}

const buckets = new Map<string, { count: number; reset: number }>();

/** Limiteur de débit en mémoire (par adresse IP + route). */
export function rateLimit(key: string, limit = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(body);
  if (!result.success) return { success: false, response: validationError(result.error) };
  return { success: true, data: result.data };
}
