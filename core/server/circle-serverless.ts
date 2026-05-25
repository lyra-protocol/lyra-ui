import "server-only";

import { fetchMarketOverviewServer } from "@/core/market/market-server";

const SIGNAL_PRICE_USDC = 0.25;
const PAYMENT_PREFIX = "lyra_vc_";

type PaymentInput = {
  agentId?: unknown;
  signalType?: unknown;
};

function env(key: string): string {
  return process.env[key]?.trim() || "";
}

function nowIso(): string {
  return new Date().toISOString();
}

function safePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32) || "anonymous";
}

export function isServerlessPaymentId(paymentId: string | null | undefined): paymentId is string {
  return Boolean(paymentId?.startsWith(PAYMENT_PREFIX));
}

export function getCircleStatus() {
  const walletAddress = env("CIRCLE_WALLET_ADDRESS") || null;
  return {
    ok: true,
    environment: env("CIRCLE_ENVIRONMENT") || "vercel",
    walletId: env("CIRCLE_WALLET_ID") || "lyra-wallet",
    walletAddress,
    signalPriceUsdc: SIGNAL_PRICE_USDC,
    paymentBypass: false,
  };
}

export function getWalletBalance() {
  return {
    ok: true,
    walletId: env("CIRCLE_WALLET_ID") || "lyra-wallet",
    address: env("CIRCLE_WALLET_ADDRESS") || "",
    blockchain: env("CIRCLE_WALLET_BLOCKCHAIN") || "ARC-TESTNET",
    balances: [{ token: "USDC", amount: "0" }],
  };
}

export function getWalletTransactions() {
  return { ok: true, transactions: [] };
}

export function getPaymentSummary() {
  return {
    ok: true,
    totalUsdcReceived: 0,
    signalCallsPaid: 0,
    bySignalType: {},
    walletAddress: env("CIRCLE_WALLET_ADDRESS") || "",
    walletId: env("CIRCLE_WALLET_ID") || "lyra-wallet",
  };
}

export function getPaymentLog() {
  return { ok: true, payments: [], count: 0 };
}

export function createPaymentIntent(input: PaymentInput) {
  const agentId = safePart(String(input.agentId ?? "anonymous"));
  const signalType = safePart(String(input.signalType ?? "trending_breakout"));
  const paymentId = `${PAYMENT_PREFIX}${Date.now()}_${agentId}_${signalType}`;
  return {
    ok: true,
    intent: {
      paymentId,
      agentId,
      signalType,
      amountUsdc: SIGNAL_PRICE_USDC,
      payToAddress: env("CIRCLE_WALLET_ADDRESS") || "lyra-demo-payment-address",
      status: "pending",
      instructions: "Intent created. Confirm sandbox to unlock the signal.",
    },
  };
}

export function confirmPayment(paymentId: string) {
  if (!isServerlessPaymentId(paymentId)) {
    return { ok: false, error: "payment not found" };
  }
  return { ok: true, paymentId, status: "confirmed" };
}

export function verifyPayment(paymentId: string) {
  if (!isServerlessPaymentId(paymentId)) {
    return { ok: false, status: "not_found" };
  }
  return { ok: true, status: "confirmed", paymentId };
}

async function marketSignal(productId: string) {
  const market = await fetchMarketOverviewServer(productId);
  const symbol = productId.replace(/-USD$/i, "");
  return {
    id: `lyra-${symbol.toLowerCase()}-${Date.now()}`,
    symbol,
    primaryRule: "trending_breakout",
    severity: "notable",
    score: Math.round(Math.min(95, Math.max(55, Math.abs(market.price - market.open24h) / market.price * 1800))),
    mark: market.price,
    volume24h: market.volume24h,
    sentence: `${symbol} trend scan at $${market.price.toLocaleString("en-US")}`,
    createdAt: nowIso(),
  };
}

export async function getTrendingBreakoutSignals(paymentId: string | null) {
  if (!isServerlessPaymentId(paymentId)) {
    return {
      ok: false,
      error: "Payment required",
      accepts: "Create an intent and confirm sandbox to unlock this signal.",
      priceUsdc: SIGNAL_PRICE_USDC,
    };
  }

  const results = await Promise.allSettled(["SOL-USD", "BTC-USD", "ETH-USD"].map(marketSignal));
  const signals = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  return { ok: true, signalType: "trending_breakout", priceUsdc: SIGNAL_PRICE_USDC, paymentId, count: signals.length, signals };
}
