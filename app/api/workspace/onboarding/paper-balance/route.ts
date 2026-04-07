import { authenticatePrivyRequest } from "@/core/server/auth/privy-server";
import { markPaperBalanceBannerSeen } from "@/core/server/services/paper-onboarding-service";

export async function PATCH(request: Request) {
  try {
    const auth = await authenticatePrivyRequest(request);
    await markPaperBalanceBannerSeen(auth.privyUserId);
    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to dismiss the paper balance message.";
    const status = message.toLowerCase().includes("bearer") ? 401 : 500;

    return Response.json({ error: message }, { status });
  }
}
