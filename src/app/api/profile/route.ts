import { handle, ok, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { getProfile, saveProfile } from "@/lib/repositories";
import { audit } from "@/lib/db";
import type { CandidateProfile } from "@/lib/types";

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    return ok(getProfile(user.id));
  });
}

export async function PUT(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = (await req.json()) as CandidateProfile;
    saveProfile(user.id, body);
    audit(user.id, "profile.updated", "profile", user.id);
    return ok(getProfile(user.id));
  });
}
