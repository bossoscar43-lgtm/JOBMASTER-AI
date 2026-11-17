import { handle, ok, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { getPreferences, savePreferences } from "@/lib/repositories";
import { audit } from "@/lib/db";
import type { Preferences } from "@/lib/types";

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    return ok(getPreferences(user.id));
  });
}

export async function PUT(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = (await req.json()) as Preferences;
    savePreferences(user.id, body);
    audit(user.id, "preferences.updated", "preferences", user.id);
    return ok(getPreferences(user.id));
  });
}
