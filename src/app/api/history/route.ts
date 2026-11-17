import { handle, ok, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { all, jparse } from "@/lib/db";

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const searches = all<Record<string, unknown>>(
      "SELECT id,query,filters,results_count,created_at FROM searches WHERE user_id=? ORDER BY created_at DESC LIMIT 100", user.id
    ).map((s) => ({ ...s, filters: jparse(String(s.filters), {}) }));
    const emails = all<Record<string, unknown>>(
      "SELECT id,to_addr,subject,status,provider,created_at FROM emails WHERE user_id=? ORDER BY created_at DESC LIMIT 100", user.id
    );
    const versions = all<Record<string, unknown>>(
      `SELECT v.id,v.label,v.ai_model,v.created_at,r.name AS resume_name
       FROM resume_versions v JOIN resumes r ON r.id=v.resume_id WHERE r.user_id=? ORDER BY v.created_at DESC LIMIT 100`, user.id
    );
    const ledger = all<Record<string, unknown>>(
      "SELECT id,delta,reason,balance_after,created_at FROM credits_ledger WHERE user_id=? ORDER BY created_at DESC LIMIT 100", user.id
    );
    return ok({ searches, emails, versions, ledger });
  });
}
