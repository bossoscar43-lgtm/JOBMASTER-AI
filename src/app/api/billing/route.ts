import { handle, ok, fail, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { all, one, run, uid, now, jparse, audit } from "@/lib/db";
import { ledger, setUnlimited } from "@/lib/credits";
import { getConfig } from "@/lib/settings";
import type { Plan } from "@/lib/types";

function mapPlan(r: Record<string, unknown>): Plan {
  return {
    id: String(r.id), name: String(r.name) as Plan["name"],
    price_monthly: Number(r.price_monthly), price_yearly: Number(r.price_yearly),
    credits_per_month: Number(r.credits_per_month), features: jparse(String(r.features), []),
    is_active: Number(r.is_active),
  };
}

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const plans = all<Record<string, unknown>>("SELECT * FROM plans WHERE is_active=1 ORDER BY price_monthly").map(mapPlan);
    const subscription = one<Record<string, unknown>>(
      "SELECT s.*, p.name AS plan_name FROM subscriptions s JOIN plans p ON p.id=s.plan_id WHERE s.user_id=? AND s.status='active' ORDER BY s.created_at DESC LIMIT 1", user.id
    );
    const stripeKey = getConfig<{ secretKey?: string }>("stripe", {}).secretKey || process.env.STRIPE_SECRET_KEY;
    return ok({
      plans,
      current: { plan: user.plan, credits: user.credits_balance },
      subscription: subscription ? { ...subscription, plan_name: subscription.plan_name } : null,
      ledger: ledger(user.id, 50),
      stripeConfigured: Boolean(stripeKey),
      mode: stripeKey ? "stripe" : "demo",
    });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = (await req.json()) as { action?: string; plan?: string };
    if (body.action === "cancel") {
      run("UPDATE users SET plan='free', updated_at=? WHERE id=?", now(), user.id);
      run("UPDATE subscriptions SET status='cancelled' WHERE user_id=? AND status='active'", user.id);
      audit(user.id, "billing.plan_cancelled", "billing", user.id);
      return ok({ plan: "free" });
    }
    if (body.action !== "select") return fail("Action inconnue.", "BAD_ACTION", 400);
    const plan = one<Record<string, unknown>>("SELECT * FROM plans WHERE name=? AND is_active=1", body.plan || "");
    if (!plan) return fail("Forfait introuvable.", "PLAN_NOT_FOUND", 404);

    const stripeKey = getConfig<{ secretKey?: string }>("stripe", {}).secretKey || process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const params = new URLSearchParams({
        "line_items[0][price_data][currency]": "eur",
        "line_items[0][price_data][unit_amount]": String(plan.price_monthly),
        "line_items[0][price_data][recurring][interval]": "month",
        "line_items[0][price_data][product_data][name]": `JOBMASTER AI — ${plan.name}`,
        "line_items[0][quantity]": "1",
        mode: "subscription",
        success_url: `${base}/billing?success=1`,
        cancel_url: `${base}/billing?canceled=1`,
        "metadata[user_id]": user.id,
        "metadata[plan]": String(plan.name),
      });
      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      const json = (await res.json()) as { url?: string; error?: { message: string } };
      if (!res.ok || !json.url) return fail(json.error?.message || "Erreur Stripe.", "STRIPE_ERROR", 502);
      return ok({ checkoutUrl: json.url, mode: "stripe" });
    }

    // Mode démonstration : aucun paiement réel n'est effectué.
    run("UPDATE users SET plan=?, updated_at=? WHERE id=?", String(plan.name), now(), user.id);
    if (String(plan.name) !== "free") {
      const balance = Number(plan.credits_per_month);
      run("UPDATE users SET credits_balance=? WHERE id=?", balance, user.id);
      run("INSERT INTO credits_ledger (id,user_id,delta,reason,balance_after,created_at) VALUES (?,?,?,?,?,?)",
        uid(), user.id, balance, `Forfait ${plan.name} (démo)`, balance, now());
      run("INSERT INTO subscriptions (id,user_id,plan_id,status,provider,created_at) VALUES (?,?,?,'active','demo',?)",
        uid(), user.id, String(plan.id), now());
    } else {
      setUnlimited(user.id, false);
    }
    audit(user.id, "billing.plan_changed", "billing", user.id, { plan: plan.name, mode: "demo" });
    return ok({ plan: plan.name, mode: "demo", message: "Forfait activé en mode démonstration — aucun paiement réel." });
  });
}
