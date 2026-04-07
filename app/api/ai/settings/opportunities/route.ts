import { authenticatePrivyRequest } from "@/core/server/auth/privy-server";
import { updateAiOpportunitySettings } from "@/core/server/services/ai-opportunity-settings-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const auth = await authenticatePrivyRequest(request);
    const payload = (await request.json()) as {
      enabled?: boolean;
      minimumConfidence?: number;
      minimumScore?: number;
      minimumRiskReward?: number;
      maximumEntryDistancePercent?: number;
      maximumAlertsPerScan?: number;
    };
    const settings = await updateAiOpportunitySettings(
      {
        privyUserId: auth.privyUserId,
        walletAddress: request.headers.get("x-wallet-address"),
        email: request.headers.get("x-user-email"),
        displayName: request.headers.get("x-user-name"),
      },
      payload
    );

    return Response.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update AI opportunity settings.";
    const status = message.toLowerCase().includes("bearer") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
