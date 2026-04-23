import { PaperTradeRequest } from "@/core/paper/types";
import { isSupportedPaperLeverage } from "@/core/paper/leverage";
import { getTradeLevelsValidationMessage } from "@/core/paper/trade-levels";
import { authenticatePrivyRequest } from "@/core/server/auth/privy-server";
import { getPaperTradeCapabilities } from "@/core/server/services/paper-trade-capabilities";
import { executePaperTrade } from "@/core/server/services/paper-trade-service";

function normalizeTradeErrorMessage(message: string) {
  const lower = message.toLowerCase();
  if (
    lower.includes("one of 1x, 2x, or 3x") ||
    (lower.includes("leverage") && lower.includes("3x")) ||
    lower.includes("leverage") && lower.includes("allowed")
  ) {
    return "Leverage is higher than this database allows (often 3× until migrations are applied). Lower leverage on the ticket, or raise the limit in Postgres / PAPER_MAX_LEVERAGE to match.";
  }

  return message;
}

async function validateRequest(input: Partial<PaperTradeRequest>) {
  if (!input.action || !["open", "increase", "close"].includes(input.action)) {
    throw new Error("Unsupported paper position action.");
  }
  if (!input.productId) {
    throw new Error("Missing product id.");
  }
  if (!input.symbol) {
    throw new Error("Missing market symbol.");
  }
  if (!input.price || input.price <= 0) {
    throw new Error("Missing live price for the current position update.");
  }

  if ("direction" in input && input.direction && !["long", "short"].includes(input.direction)) {
    throw new Error("Unsupported trade direction.");
  }
  if ("stopLoss" in input && input.stopLoss != null && input.stopLoss <= 0) {
    throw new Error("Stop loss must be greater than zero.");
  }
  if ("takeProfit" in input && input.takeProfit != null && input.takeProfit <= 0) {
    throw new Error("Take profit must be greater than zero.");
  }
  if ("userNote" in input && input.userNote != null && String(input.userNote).length > 280) {
    throw new Error("Trade note must be 280 characters or fewer.");
  }
  if ("strategyTag" in input && input.strategyTag != null && String(input.strategyTag).length > 48) {
    throw new Error("Strategy tag must be 48 characters or fewer.");
  }
  if ("plannedRr" in input && input.plannedRr != null && input.plannedRr <= 0) {
    throw new Error("Planned RR must be greater than zero.");
  }

  if (input.action === "close") {
    if (!input.quantity || input.quantity <= 0) {
      throw new Error("Close size must be greater than zero.");
    }
    return;
  }

  const notional = "notional" in input ? input.notional : undefined;
  if (!notional || notional <= 0) {
    throw new Error("Notional must be greater than zero.");
  }

  const capabilities = await getPaperTradeCapabilities();
  const leverage = input.leverage ?? 1;
  if (!isSupportedPaperLeverage(leverage, capabilities.maxLeverage)) {
    throw new Error(`Leverage is currently available up to ${capabilities.maxLeverage}x in this workspace.`);
  }

  const levelValidationMessage = getTradeLevelsValidationMessage({
    direction: input.direction ?? "long",
    referencePrice: input.price,
    stopLoss: input.stopLoss ?? null,
    takeProfit: input.takeProfit ?? null,
    priceLabel: "current price",
  });

  if (levelValidationMessage) {
    throw new Error(levelValidationMessage);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticatePrivyRequest(request);
    const payload = (await request.json()) as Partial<PaperTradeRequest>;
    await validateRequest(payload);

    const result = await executePaperTrade(auth.privyUserId, payload as PaperTradeRequest);
    return Response.json(result);
  } catch (error) {
    const message = normalizeTradeErrorMessage(
      error instanceof Error ? error.message : "Unable to update paper position."
    );
    const status = message.toLowerCase().includes("bearer")
      ? 401
      : message.toLowerCase().includes("missing") ||
          message.toLowerCase().includes("unsupported") ||
          message.toLowerCase().includes("currently available up to")
        ? 400
        : 422;

    return Response.json({ error: message }, { status });
  }
}
