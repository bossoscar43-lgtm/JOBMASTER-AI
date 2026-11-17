import { handle, ok } from "@/lib/http";
import { destroySession } from "@/lib/auth";

export async function POST() {
  return handle(async () => {
    await destroySession();
    return ok({ loggedOut: true });
  });
}
