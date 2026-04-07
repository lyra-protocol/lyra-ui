import "server-only";

import { PAPER_LEVERAGE_MAX } from "@/core/paper/leverage";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

type PaperTradeCapabilities = {
  maxLeverage: number;
};

type CapabilityCache = {
  value: PaperTradeCapabilities;
  expiresAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const LEGACY_MAX_LEVERAGE = 3;

let cachedCapabilities: CapabilityCache | null = null;
let inflightCapabilities: Promise<PaperTradeCapabilities> | null = null;

function getMaxLeverageFromProbeMessage(message: string | undefined) {
  const normalized = message?.toLowerCase() ?? "";
  if (!normalized) {
    return PAPER_LEVERAGE_MAX;
  }

  if (normalized.includes("one of 1x, 2x, or 3x")) {
    return LEGACY_MAX_LEVERAGE;
  }

  const rangeMatch = normalized.match(/between 1x and (\d+)x/);
  if (rangeMatch) {
    const parsed = Number(rangeMatch[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : PAPER_LEVERAGE_MAX;
  }

  if (
    normalized.includes("workspace user not found") ||
    normalized.includes("paper account not found") ||
    normalized.includes("position already exists") ||
    normalized.includes("insufficient paper balance")
  ) {
    return PAPER_LEVERAGE_MAX;
  }

  return LEGACY_MAX_LEVERAGE;
}

async function probePaperTradeCapabilities(): Promise<PaperTradeCapabilities> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.rpc("lyra_open_or_increase_paper_position", {
    p_privy_user_id: "__capability_probe__",
    p_product_id: "BTC-USD",
    p_symbol: "BTC",
    p_notional: 1,
    p_price: 1,
    p_expected_action: "open",
    p_direction: "long",
    p_leverage: PAPER_LEVERAGE_MAX,
    p_stop_loss: null,
    p_take_profit: null,
    p_note: null,
  });

  return {
    maxLeverage: getMaxLeverageFromProbeMessage(error?.message),
  };
}

export async function getPaperTradeCapabilities(): Promise<PaperTradeCapabilities> {
  const now = Date.now();
  if (cachedCapabilities && cachedCapabilities.expiresAt > now) {
    return cachedCapabilities.value;
  }

  if (inflightCapabilities) {
    return inflightCapabilities;
  }

  inflightCapabilities = probePaperTradeCapabilities()
    .catch(() => ({ maxLeverage: LEGACY_MAX_LEVERAGE }))
    .then((value) => {
      cachedCapabilities = {
        value,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
      return value;
    })
    .finally(() => {
      inflightCapabilities = null;
    });

  return inflightCapabilities;
}
