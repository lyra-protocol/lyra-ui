import { authenticatePrivyRequest } from "@/core/server/auth/privy-server";
import { updatePaperPositionLevels } from "@/core/server/services/paper-position-service";

type Payload = {
  stopLoss?: number | null;
  takeProfit?: number | null;
  note?: string;
};

function validateLevel(value: number | null | undefined, label: string) {
  if (value == null) {
    return null;
  }
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
  return value;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const auth = await authenticatePrivyRequest(request);
    const { productId } = await context.params;
    if (!productId) {
      throw new Error("Missing product id.");
    }

    const payload = (await request.json()) as Payload;
    const stopLoss = validateLevel(payload.stopLoss, "Stop loss");
    const takeProfit = validateLevel(payload.takeProfit, "Take profit");

    const result = await updatePaperPositionLevels(auth.privyUserId, {
      productId,
      stopLoss,
      takeProfit,
      note: payload.note,
    });

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update trade setup.";
    const status = message.toLowerCase().includes("bearer")
      ? 401
      : message.toLowerCase().includes("missing")
        ? 400
        : 422;

    return Response.json({ error: message }, { status });
  }
}
