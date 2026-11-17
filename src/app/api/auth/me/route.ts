import { handle, ok, unauthorized } from "@/lib/http";
import { getPublicUser } from "@/lib/auth";
import { waitForHydration } from "@/lib/db";

export async function GET() {
  return handle(async () => {
    await waitForHydration();
    const user = await getPublicUser();
    if (!user) return unauthorized();
    return ok(user);
  });
}
