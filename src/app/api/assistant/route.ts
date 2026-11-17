import { handle, ok, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { one, audit } from "@/lib/db";
import { assistantReply } from "@/lib/ai";
import { COST, consume } from "@/lib/credits";
import { run, uid, now } from "@/lib/db";
import type { User } from "@/lib/types";

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = (await req.json()) as { message?: string; history?: Array<{ role: string; content: string }> };
    const message = (body.message || "").trim().slice(0, 2000);
    if (!message) return ok({ reply: "Je vous écoute. Posez-moi votre question." });

    const jobsCount = one<{ c: number }>("SELECT COUNT(*) AS c FROM searches WHERE user_id=?", user.id)?.c || 0;
    const applicationsCount = one<{ c: number }>("SELECT COUNT(*) AS c FROM applications WHERE user_id=?", user.id)?.c || 0;
    const hasCv = Boolean(one<{ id: string }>("SELECT id FROM resumes WHERE user_id=? LIMIT 1", user.id));

    if (user.credits_balance !== -1) consume(user as User, COST.assistant, "Message assistant", { length: message.length });
    const result = await assistantReply(message, {
      name: user.full_name.split(" ")[0], jobsCount, applicationsCount, hasCv,
      history: (body.history || []).slice(-8),
    });

    run(
      "INSERT INTO assistant_messages (id,user_id,role,content,context,created_at) VALUES (?,?,?,?,?,?)",
      uid(), user.id, "user", message, "{}", now()
    );
    run(
      "INSERT INTO assistant_messages (id,user_id,role,content,context,created_at) VALUES (?,?,?,?,?,?)",
      uid(), user.id, "assistant", result.data.reply, JSON.stringify(result.data.actions), now()
    );
    audit(user.id, "assistant.message", "assistant", "", { mode: result.mode });
    return ok(result.data, { aiMode: result.mode, creditsUsed: COST.assistant });
  });
}
