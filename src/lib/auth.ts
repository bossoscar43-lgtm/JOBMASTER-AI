import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { all, one, run, uid, now, audit } from "./db";
import type { PublicUser, User } from "./types";

const COOKIE = "jm_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    ""
  );
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  const h = await headers();
  run(
    "INSERT INTO sessions (token_hash,user_id,created_at,expires_at,last_seen_at,ip,user_agent) VALUES (?,?,?,?,?,?,?)",
    hashToken(token), userId, now(), expires, now(), await clientIp(),
    h.get("user-agent") || ""
  );
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_INSECURE_LOCAL !== "true",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_DAYS * 86400000),
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) run("DELETE FROM sessions WHERE token_hash=?", hashToken(token));
  jar.delete(COOKIE);
}

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    status: u.status,
    plan: u.plan,
    credits_balance: u.credits_balance,
    locale: u.locale,
    theme: u.theme,
    created_at: u.created_at,
    last_login_at: u.last_login_at,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = one<{ user_id: string; expires_at: string }>(
    "SELECT user_id,expires_at FROM sessions WHERE token_hash=?",
    hashToken(token)
  );
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    run("DELETE FROM sessions WHERE token_hash=?", hashToken(token));
    return null;
  }
  const user = one<User>(
    "SELECT * FROM users WHERE id=? AND deleted_at IS NULL",
    session.user_id
  );
  if (!user || user.status !== "active") return null;
  return user;
}

export async function getPublicUser(): Promise<PublicUser | null> {
  const u = await getCurrentUser();
  return u ? toPublicUser(u) : null;
}

/** Garde admin côté serveur : rôle + vérification hors-bande, jamais d'email seul. */
export async function requireAdminUser(): Promise<User | null> {
  const u = await getCurrentUser();
  if (!u || u.role !== "admin" || u.admin_verified !== 1 || u.status !== "active") return null;
  return u;
}

/** Vérifie le secret d'amorçage admin. Jamais suffisant seul : l'email doit
 *  aussi être dans ADMIN_EMAILS et l'identité doit être vérifiée hors-bande. */
export function checkAdminBootstrap(email: string, secret: string): boolean {
  const configured = (process.env.ADMIN_BOOTSTRAP_SECRET || "").trim();
  const allowed = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!configured || !allowed.includes(email.trim().toLowerCase())) return false;
  if (!secret || secret.length < 8) return false;
  return safeEqual(secret, configured);
}

export function logAuth(
  actorId: string | null,
  action: string,
  metadata: Record<string, unknown> = {}
): void {
  audit(actorId, action, "auth", actorId || "", metadata);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  run("DELETE FROM sessions WHERE user_id=?", userId);
  logAuth(userId, "auth.sessions.revoked");
}

export function listUserSessions(userId: string) {
  return all<{ token_hash: string; created_at: string; last_seen_at: string; ip: string; user_agent: string }>(
    "SELECT token_hash,created_at,last_seen_at,ip,user_agent FROM sessions WHERE user_id=? ORDER BY last_seen_at DESC",
    userId
  );
}

export function createPasswordReset(userId: string): string {
  const token = crypto.randomBytes(32).toString("base64url");
  run(
    "INSERT INTO password_resets (token_hash,user_id,expires_at) VALUES (?,?,?)",
    hashToken(token), userId, new Date(Date.now() + 3600000).toISOString()
  );
  return token;
}

export function consumePasswordReset(token: string): string | null {
  const h = hashToken(token);
  const row = one<{ user_id: string; expires_at: string; used_at: string | null }>(
    "SELECT user_id,expires_at,used_at FROM password_resets WHERE token_hash=?", h
  );
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) return null;
  run("UPDATE password_resets SET used_at=? WHERE token_hash=?", now(), h);
  return row.user_id;
}
