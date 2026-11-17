import { one, all, run, uid, now, jstring, jparse } from "./db";
import type { CreditEntry, User } from "./types";

export const COST = {
  aiAnalysis: 4,
  jobSearch: 3,
  adaptiveCv: 6,
  coverLetter: 5,
  interview: 8,
  assistant: 1,
  emailSend: 2,
} as const;

export function isUnlimited(user: User): boolean {
  return user.role === "admin" && user.admin_verified === 1;
}

export function balanceOf(userId: string): number {
  const u = one<{ credits_balance: number }>("SELECT credits_balance FROM users WHERE id=?", userId);
  return u?.credits_balance ?? 0;
}

export class InsufficientCredits extends Error {
  constructor() {
    super("Crédits IA insuffisants. Passez à un forfait supérieur ou contactez l'administrateur.");
    this.name = "InsufficientCredits";
  }
}

/** Débite les crédits. Retourne false si solde insuffisant. */
export function consume(
  user: User,
  amount: number,
  reason: string,
  metadata: Record<string, unknown> = {}
): boolean {
  if (isUnlimited(user)) {
    record(user.id, 0, reason + " (illimité)", -1, metadata);
    return true;
  }
  if (user.credits_balance < amount) return false;
  const next = user.credits_balance - amount;
  run("UPDATE users SET credits_balance=?, updated_at=? WHERE id=?", next, now(), user.id);
  record(user.id, -amount, reason, next, metadata);
  return true;
}

export function requireConsume(
  user: User,
  amount: number,
  reason: string,
  metadata: Record<string, unknown> = {}
): void {
  if (!consume(user, amount, reason, metadata)) throw new InsufficientCredits();
}

export function grant(
  userId: string,
  amount: number,
  reason: string,
  metadata: Record<string, unknown> = {}
): number {
  const u = one<{ credits_balance: number; lifetime_credits: number }>(
    "SELECT credits_balance,lifetime_credits FROM users WHERE id=?", userId
  );
  if (!u) throw new Error("Utilisateur introuvable.");
  const next = Math.max(0, u.credits_balance + amount);
  run(
    "UPDATE users SET credits_balance=?, lifetime_credits=?, updated_at=? WHERE id=?",
    next, u.lifetime_credits + Math.max(0, amount), now(), userId
  );
  record(userId, amount, reason, next, metadata);
  return next;
}

export function setUnlimited(userId: string, unlimited: boolean): void {
  const value = unlimited ? -1 : 0;
  run("UPDATE users SET credits_balance=?, updated_at=? WHERE id=?", value, now(), userId);
  record(userId, 0, unlimited ? "Solde illimité activé" : "Solde illimité désactivé", value);
}

function record(
  userId: string,
  delta: number,
  reason: string,
  balanceAfter: number,
  metadata: Record<string, unknown> = {}
): void {
  run(
    "INSERT INTO credits_ledger (id,user_id,delta,reason,balance_after,metadata,created_at) VALUES (?,?,?,?,?,?,?)",
    uid(), userId, delta, reason, balanceAfter, jstring(metadata), now()
  );
}

export function ledger(userId: string, limit = 100): CreditEntry[] {
  const rows = all<Record<string, unknown>>(
    "SELECT * FROM credits_ledger WHERE user_id=? ORDER BY created_at DESC LIMIT ?", userId, limit
  );
  return rows.map((r) => ({
    id: String(r.id), user_id: String(r.user_id), delta: Number(r.delta),
    reason: String(r.reason), balance_after: Number(r.balance_after),
    metadata: jparse<Record<string, unknown>>(String(r.metadata), {}),
    created_at: String(r.created_at),
  }));
}

export const PLAN_LIMITS: Record<string, { resumes: number; applications: number }> = {
  free: { resumes: 3, applications: 10 },
  starter: { resumes: 10, applications: 100 },
  premium: { resumes: 999, applications: 9999 },
  business: { resumes: 999, applications: 99999 },
};

export function canAddResume(user: User): boolean {
  if (isUnlimited(user) || user.plan === "premium" || user.plan === "business") return true;
  const { count } = one<{ count: number }>("SELECT COUNT(*) AS count FROM resumes WHERE user_id=?", user.id) || { count: 0 };
  return count < PLAN_LIMITS[user.plan].resumes;
}
