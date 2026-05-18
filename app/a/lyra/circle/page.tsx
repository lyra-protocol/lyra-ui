"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Info,
  Layers,
  Loader2,
  Radio,
  RefreshCw,
  Shield,
  Wallet,
  Zap,
} from "lucide-react";

const C = {
  bg: "#050505",
  panel: "#0A0A09",
  panelRaised: "#0F0F0D",
  ink: "#ECECE6",
  inkSoft: "#A8A69E",
  inkDim: "#5A5852",
  inkFaint: "#2D2C28",
  hairline: "#1A1A18",
  hairBold: "#2A2926",
  amber: "#F4A340",
  emerald: "#5BC892",
  rose: "#E07570",
  teal: "#7AC9C0",
  tealDim: "rgba(122,201,192,0.12)",
  violet: "#B59AE8",
  gold: "#E5C07B",
  circleBlue: "#6B9FE8",
};

type CircleStatus = {
  ok: boolean;
  environment: string;
  walletId: string | null;
  walletAddress: string | null;
  signalPriceUsdc: number;
  paymentBypass: boolean;
  error?: string;
};

type WalletBalance = {
  ok?: boolean;
  walletId: string;
  address: string;
  blockchain: string;
  balances: Array<{ token: string; amount: string }>;
  error?: string;
};

type ChainTx = {
  id: string;
  state: string;
  type: string;
  amount?: string;
  token?: string;
  createDate?: string;
  txHash?: string;
};

type PaymentSummary = {
  ok?: boolean;
  totalUsdcReceived: number;
  signalCallsPaid: number;
  bySignalType: Record<string, { count: number; usdc: number }>;
  walletAddress: string;
  walletId: string;
};

type PaymentLogEntry = {
  id: string;
  agentId: string;
  signalType: string;
  paymentId: string;
  usdcAmount: number;
  status: "pending" | "confirmed";
  createdAt: string;
  confirmedAt?: string;
};

type PaymentIntent = {
  paymentId: string;
  agentId: string;
  signalType: string;
  amountUsdc: number;
  payToAddress: string;
  status: string;
  instructions: string;
};

type DemoStep = 0 | 1 | 2 | 3 | 4;
type ActivityTab = "payments" | "chain";

const PAYMENT_ID_KEY = "lyra-circle-active-payment-id";

function loadStoredPaymentId(): string | null {
  try {
    return sessionStorage.getItem(PAYMENT_ID_KEY);
  } catch {
    return null;
  }
}

function storePaymentId(id: string) {
  try {
    sessionStorage.setItem(PAYMENT_ID_KEY, id);
  } catch {
    /* noop */
  }
}

function latestConfirmedPaymentId(entries: PaymentLogEntry[]): string | null {
  const confirmed = entries.filter((p) => p.status === "confirmed");
  if (confirmed.length === 0) return null;
  confirmed.sort(
    (a, b) =>
      new Date(b.confirmedAt ?? b.createdAt).getTime() -
      new Date(a.confirmedAt ?? a.createdAt).getTime(),
  );
  return confirmed[0]!.paymentId;
}

function gateHintFromBody(text: string, status: number): string | null {
  if (status !== 402) return null;
  try {
    const body = JSON.parse(text) as { reason?: string; paymentId?: string };
    if (body.reason === "missing_payment_id") {
      return "No payment ID sent — complete steps 2 and 3, or run the full demo.";
    }
    if (body.reason === "payment_pending") {
      return `Payment ${body.paymentId?.slice(0, 8)}… is pending — run Confirm (step 3).`;
    }
    if (body.reason === "payment_not_found") {
      return "Payment ID not found on this agent — create a fresh intent.";
    }
  } catch {
    /* not json */
  }
  return null;
}

function fmtUsdc(n: number): string {
  return `$${n.toFixed(2)}`;
}

function shortAddr(a: string): string {
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function CircleTreasuryPage() {
  const [status, setStatus] = useState<CircleStatus | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [payments, setPayments] = useState<PaymentLogEntry[]>([]);
  const [transactions, setTransactions] = useState<ChainTx[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoMsg, setDemoMsg] = useState<string | null>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [gatePreview, setGatePreview] = useState<string | null>(null);
  const [gateStatus, setGateStatus] = useState<number | null>(null);
  const [showArcModal, setShowArcModal] = useState(false);
  const [demoStep, setDemoStep] = useState<DemoStep>(0);
  const [activityTab, setActivityTab] = useState<ActivityTab>("payments");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem("lyra-arc-intro-seen");
      if (!seen) setShowArcModal(true);
    } catch {
      setShowArcModal(true);
    }
    const stored = loadStoredPaymentId();
    if (stored) setActivePaymentId(stored);
  }, []);

  function pickPaymentId(logEntries: PaymentLogEntry[] = payments): string | null {
    return activePaymentId ?? loadStoredPaymentId() ?? latestConfirmedPaymentId(logEntries);
  }

  function setPaymentId(id: string) {
    setActivePaymentId(id);
    storePaymentId(id);
  }

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const [st, bal, sum, log, tx] = await Promise.all([
      fetch("/api/circle/status").then((r) => r.json()).catch(() => null),
      fetch("/api/circle/wallet/balance").then((r) => r.json()).catch(() => null),
      fetch("/api/circle/payments/summary").then((r) => r.json()).catch(() => null),
      fetch("/api/circle/payments/log?limit=80").then((r) => r.json()).catch(() => null),
      fetch("/api/circle/wallet/transactions").then((r) => r.json()).catch(() => null),
    ]);
    if (st) setStatus(st as CircleStatus);
    if (bal) setBalance(bal as WalletBalance);
    if (sum) setSummary(sum as PaymentSummary);
    const logEntries = (log?.payments ?? []) as PaymentLogEntry[];
    if (logEntries.length) setPayments(logEntries);
    if (tx?.transactions) setTransactions(tx.transactions as ChainTx[]);
    setActivePaymentId((prev) => {
      if (prev) return prev;
      const stored = loadStoredPaymentId();
      if (stored) return stored;
      return latestConfirmedPaymentId(logEntries);
    });
    setLastUpdated(Date.now());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8_000);
    return () => clearInterval(t);
  }, [refresh]);

  const usdcOnChain =
    balance?.balances?.find(
      (b) => b.token === "USDC" || b.token.toUpperCase().includes("USDC"),
    )?.amount ?? "0";

  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const confirmedCount = payments.filter((p) => p.status === "confirmed").length;

  async function runDemoCreateIntent() {
    setDemoBusy(true);
    setDemoMsg(null);
    setDemoStep(2);
    try {
      const res = await fetch("/api/circle/payments/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "lyra-ui-demo", signalType: "trending_breakout" }),
      });
      const data = (await res.json()) as { ok?: boolean; intent?: PaymentIntent; error?: string };
      if (!data.ok || !data.intent) {
        setDemoMsg(data.error ?? "Failed to create intent");
        setDemoStep(1);
        return;
      }
      setPaymentId(data.intent.paymentId);
      setDemoMsg("Intent created — proceed to confirm");
      await refresh();
    } catch {
      setDemoMsg("Agent unreachable");
      setDemoStep(1);
    } finally {
      setDemoBusy(false);
    }
  }

  async function runDemoConfirmSandbox() {
    const paymentId = pickPaymentId();
    if (!paymentId) {
      setDemoMsg("Create an intent first (step 2)");
      return;
    }
    setPaymentId(paymentId);
    setDemoBusy(true);
    setDemoMsg(null);
    setGatePreview(null);
    setGateStatus(null);
    setDemoStep(3);
    try {
      const res = await fetch(`/api/circle/payments/${paymentId}/confirm-sandbox`, {
        method: "POST",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) {
        setDemoMsg(data.error ?? "Confirm failed");
        return;
      }
      const verify = await fetch(`/api/circle/payments/${paymentId}/verify`, {
        method: "POST",
      });
      const v = (await verify.json()) as { ok?: boolean; status?: string };
      setDemoMsg(
        v.ok ? "Payment confirmed — fetch the signal" : "Confirm recorded — retry signal fetch",
      );
      if (v.ok) setDemoStep(4);
      await refresh();
    } catch {
      setDemoMsg("Agent unreachable");
    } finally {
      setDemoBusy(false);
    }
  }

  async function runDemo402() {
    setDemoBusy(true);
    setGatePreview(null);
    setGateStatus(null);
    setDemoStep(1);
    setDemoMsg("Unpaid request — HTTP 402 is expected");
    try {
      const res = await fetch("/api/circle/signals/trending-breakout", { cache: "no-store" });
      const text = await res.text();
      setGateStatus(res.status);
      setGatePreview(text.slice(0, 1200));
    } catch (e) {
      setGatePreview(String(e));
    } finally {
      setDemoBusy(false);
    }
  }

  async function fetchPaidSignal(paymentId: string) {
    const q = encodeURIComponent(paymentId);
    return fetch(`/api/circle/signals/trending-breakout?paymentId=${q}`, {
      headers: { "X-Payment-Id": paymentId },
      cache: "no-store",
    });
  }

  async function runDemoPaidSignal() {
    const paymentId = pickPaymentId();
    if (!paymentId) {
      setDemoMsg("Complete steps 2 → 3 first, or run the full demo");
      return;
    }
    setPaymentId(paymentId);
    setDemoBusy(true);
    setGatePreview(null);
    setGateStatus(null);
    try {
      const res = await fetchPaidSignal(paymentId);
      const text = await res.text();
      setGateStatus(res.status);
      setGatePreview(text.slice(0, 1200));
      const hint = gateHintFromBody(text, res.status);
      if (res.ok) {
        setDemoMsg("Signal gate passed");
        setDemoStep(4);
      } else {
        setDemoMsg(hint ?? "Blocked — confirm payment or create a new intent");
      }
      await refresh();
    } catch (e) {
      setGatePreview(String(e));
    } finally {
      setDemoBusy(false);
    }
  }

  async function runFullDemo() {
    setDemoBusy(true);
    setDemoMsg(null);
    setGatePreview(null);
    setGateStatus(null);
    setDemoStep(1);
    try {
      const unpaid = await fetch("/api/circle/signals/trending-breakout", { cache: "no-store" });
      const unpaidText = await unpaid.text();
      setGateStatus(unpaid.status);
      setGatePreview(unpaidText.slice(0, 600));

      const intentRes = await fetch("/api/circle/payments/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "lyra-ui-demo", signalType: "trending_breakout" }),
      });
      const intentData = (await intentRes.json()) as {
        ok?: boolean;
        intent?: PaymentIntent;
        error?: string;
      };
      if (!intentData.ok || !intentData.intent) {
        setDemoMsg(intentData.error ?? "Intent failed");
        return;
      }
      const paymentId = intentData.intent.paymentId;
      setPaymentId(paymentId);
      setDemoStep(2);

      const confirmRes = await fetch(`/api/circle/payments/${paymentId}/confirm-sandbox`, {
        method: "POST",
      });
      const confirmData = (await confirmRes.json()) as { ok?: boolean; error?: string };
      if (!confirmData.ok) {
        setDemoMsg(
          confirmData.error ?? "Sandbox confirm failed — set CIRCLE_ENVIRONMENT=sandbox on agent",
        );
        return;
      }
      setDemoStep(3);

      const signalRes = await fetchPaidSignal(paymentId);
      const text = await signalRes.text();
      setGateStatus(signalRes.status);
      setGatePreview(text.slice(0, 1200));
      const hint = gateHintFromBody(text, signalRes.status);
      setDemoMsg(
        signalRes.ok
          ? "Full demo complete — 402 → intent → confirm → 200"
          : (hint ?? "Signal still blocked after confirm"),
      );
      if (signalRes.ok) setDemoStep(4);
      await refresh();
    } catch {
      setDemoMsg("Agent unreachable");
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{
        background: C.bg,
        color: C.ink,
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        fontFeatureSettings: '"ss01","cv11","tnum"',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 0% 0%, rgba(122,201,192,0.11) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 100% 100%, rgba(107,159,232,0.08) 0%, transparent 45%),
            radial-gradient(ellipse 40% 30% at 50% 50%, rgba(229,192,123,0.04) 0%, transparent 60%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(${C.hairline} 1px, transparent 1px),
            linear-gradient(90deg, ${C.hairline} 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 20%, transparent 75%)",
        }}
      />

      <header
        className="relative z-20 flex shrink-0 items-center justify-between gap-4 px-6 py-4 lg:px-10"
        style={{ borderBottom: `1px solid ${C.hairline}` }}
      >
        <div className="flex min-w-0 items-center gap-4">
          <a
            href="/a/lyra"
            className="group flex items-center gap-2 text-[11px] tracking-[0.18em] transition-opacity hover:opacity-70"
            style={{ color: C.inkDim }}
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            LYRA
          </a>
          <span className="h-4 w-px" style={{ background: C.hairBold }} />
          <div>
            <h1 className="text-[15px] font-semibold tracking-[0.2em]" style={{ color: C.ink }}>
              TREASURY
            </h1>
            <p className="mt-0.5 text-[10px] tracking-[0.14em]" style={{ color: C.inkDim }}>
              Circle · USDC · Arc testnet
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span
            className="hidden rounded-full px-2.5 py-1 text-[9px] font-semibold tracking-[0.16em] sm:inline"
            style={{
              color: C.gold,
              background: "rgba(229,192,123,0.08)",
              border: `1px solid rgba(229,192,123,0.22)`,
            }}
          >
            DEMO ONLY
          </span>
          {status && (
            <StatusChip
              live={status.ok}
              label={status.ok ? "Wallet live" : "Setup required"}
            />
          )}
          <button
            type="button"
            onClick={() => refresh()}
            disabled={refreshing}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.04] disabled:opacity-40"
            style={{ border: `1px solid ${C.hairBold}`, color: C.inkSoft }}
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowArcModal(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-[10px] font-medium tracking-[0.12em] transition-colors hover:bg-white/[0.04]"
            style={{ border: `1px solid ${C.hairBold}`, color: C.teal }}
          >
            <Info className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">About</span>
          </button>
        </div>
      </header>

      {showArcModal && (
        <ArcIntroModal
          onClose={() => {
            try {
              localStorage.setItem("lyra-arc-intro-seen", "1");
            } catch {
              /* noop */
            }
            setShowArcModal(false);
          }}
        />
      )}

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 py-8 lg:px-10 lg:py-10">
        {!status && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: C.teal }} />
            <span className="text-[11px] tracking-[0.22em]" style={{ color: C.inkDim }}>
              Connecting to agent…
            </span>
          </div>
        )}

        {status && !status.ok && (
          <div
            className="mb-8 flex gap-3 rounded-xl px-5 py-4"
            style={{
              background: "rgba(244,163,64,0.06)",
              border: `1px solid rgba(244,163,64,0.2)`,
            }}
          >
            <Shield className="mt-0.5 h-5 w-5 shrink-0" style={{ color: C.amber }} />
            <div className="text-[13px] leading-relaxed" style={{ color: C.amber }}>
              <p className="font-medium">Treasury not configured</p>
              <p className="mt-1 opacity-90">
                Set <code className="font-mono text-[12px]">CIRCLE_WALLET_*</code> and{" "}
                <code className="font-mono text-[12px]">CIRCLE_ENTITY_SECRET</code> on lyra-agent,
                then redeploy.
              </p>
            </div>
          </div>
        )}

        {status && (
          <div className="space-y-8">
            {/* Hero treasury */}
            <section
              className="relative overflow-hidden rounded-2xl p-6 lg:p-8"
              style={{
                background: `linear-gradient(145deg, ${C.panelRaised} 0%, ${C.panel} 55%, ${C.bg} 100%)`,
                border: `1px solid ${C.hairBold}`,
                boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset, 0 24px 64px rgba(0,0,0,0.35)",
              }}
            >
              <div
                aria-hidden
                className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-40 blur-3xl"
                style={{ background: C.tealDim }}
              />
              <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <NetworkPill label={balance?.blockchain ?? "ARC-TESTNET"} />
                    <NetworkPill label={status.environment} muted />
                    {status.paymentBypass && (
                      <NetworkPill label="Gate bypassed" warn />
                    )}
                  </div>
                  <p className="text-[11px] font-medium tracking-[0.2em]" style={{ color: C.inkDim }}>
                    ON-CHAIN BALANCE
                  </p>
                  <p
                    className="mt-1 font-semibold tabular-nums tracking-tight"
                    style={{ fontSize: "clamp(2.5rem, 6vw, 3.75rem)", color: C.emerald, lineHeight: 1.05 }}
                  >
                    {usdcOnChain}
                    <span className="ml-2 text-[0.45em] font-medium tracking-[0.2em]" style={{ color: C.inkSoft }}>
                      USDC
                    </span>
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <WalletChip
                      address={status.walletAddress ?? "—"}
                      copied={copied}
                      onCopy={async () => {
                        if (status.walletAddress) {
                          const ok = await copyText(status.walletAddress);
                          setCopied(ok);
                          setTimeout(() => setCopied(false), 2000);
                        }
                      }}
                    />
                    <a
                      href="https://faucet.circle.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.1em] transition-opacity hover:opacity-70"
                      style={{ color: C.teal }}
                    >
                      Testnet faucet
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 lg:gap-4">
                  <HeroStat
                    icon={<CircleDollarSign className="h-4 w-4" />}
                    label="Per signal"
                    value={fmtUsdc(status.signalPriceUsdc)}
                    accent={C.gold}
                  />
                  <HeroStat
                    icon={<Zap className="h-4 w-4" />}
                    label="Paid calls"
                    value={summary ? String(summary.signalCallsPaid) : "—"}
                    accent={C.teal}
                  />
                  <HeroStat
                    icon={<Layers className="h-4 w-4" />}
                    label="Received"
                    value={summary ? fmtUsdc(summary.totalUsdcReceived) : "—"}
                    accent={C.emerald}
                  />
                  <HeroStat
                    icon={<Radio className="h-4 w-4" />}
                    label="Pending"
                    value={String(pendingCount)}
                    accent={pendingCount > 0 ? C.amber : C.inkDim}
                  />
                </div>
              </div>
              {lastUpdated && (
                <p className="relative mt-6 text-[10px] tabular-nums" style={{ color: C.inkFaint }}>
                  Last sync {new Date(lastUpdated).toLocaleTimeString("en-US", { hour12: false })}
                </p>
              )}
            </section>

            <div className="grid gap-8 xl:grid-cols-5">
              {/* Demo column */}
              <section className="xl:col-span-2">
                <SectionHead
                  title="Payment gate demo"
                  subtitle="HTTP 402 until USDC intent is confirmed — testnet only"
                />
                <div
                  className="mt-5 rounded-2xl p-5 lg:p-6"
                  style={{
                    background: C.panel,
                    border: `1px solid ${C.hairBold}`,
                  }}
                >
                  <DemoStepper current={demoStep} busy={demoBusy} />
                  <div className="mt-6 flex flex-col gap-2">
                    <DemoAction
                      step={1}
                      title="Probe unpaid access"
                      desc="Expect HTTP 402 with payment_required"
                      onClick={runDemo402}
                      disabled={demoBusy}
                      active={demoStep === 1}
                    />
                    <DemoAction
                      step={2}
                      title="Create payment intent"
                      desc="Allocates a payment ID for this signal"
                      onClick={runDemoCreateIntent}
                      disabled={demoBusy}
                      active={demoStep === 2}
                    />
                    <DemoAction
                      step={3}
                      title="Confirm (sandbox)"
                      desc="Marks intent paid without on-chain transfer"
                      onClick={runDemoConfirmSandbox}
                      disabled={demoBusy}
                      active={demoStep === 3}
                    />
                    <DemoAction
                      step={4}
                      title="Fetch gated signal"
                      desc="trending_breakout with X-Payment-Id"
                      onClick={runDemoPaidSignal}
                      disabled={demoBusy}
                      active={demoStep === 4}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={runFullDemo}
                    disabled={demoBusy}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[11px] font-semibold tracking-[0.14em] transition-all hover:brightness-110 disabled:opacity-45"
                    style={{
                      color: C.bg,
                      background: `linear-gradient(135deg, ${C.teal} 0%, #5aab9f 100%)`,
                      boxShadow: "0 4px 24px rgba(122,201,192,0.25)",
                    }}
                  >
                    {demoBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    Run full demo
                  </button>
                  {activePaymentId && (
                    <div
                      className="mt-4 rounded-lg px-3 py-2.5 font-mono text-[10px] leading-relaxed break-all"
                      style={{ background: C.bg, border: `1px solid ${C.hairline}`, color: C.inkDim }}
                    >
                      <span style={{ color: C.inkFaint }}>active payment · </span>
                      {activePaymentId}
                    </div>
                  )}
                  {demoMsg && (
                    <p
                      className="mt-3 text-[12px] leading-relaxed"
                      style={{ color: demoMsg.includes("OK") || demoMsg.includes("passed") ? C.emerald : C.teal }}
                    >
                      {demoMsg}
                    </p>
                  )}
                  {(gatePreview || gateStatus !== null) && (
                    <ApiTerminal status={gateStatus} body={gatePreview} />
                  )}
                </div>
              </section>

              {/* Activity column */}
              <section className="xl:col-span-3">
                <div className="flex items-end justify-between gap-4">
                  <SectionHead title="Activity" subtitle="Payments and on-chain wallet history" />
                  <TabSwitch tab={activityTab} onChange={setActivityTab} />
                </div>
                <div
                  className="mt-5 overflow-hidden rounded-2xl"
                  style={{ border: `1px solid ${C.hairBold}`, background: C.panel }}
                >
                  {activityTab === "payments" ? (
                    payments.length === 0 ? (
                      <EmptyState
                        icon={<CircleDollarSign className="h-8 w-8" />}
                        title="No payments yet"
                        hint="Run the demo to create your first signal payment intent"
                      />
                    ) : (
                      <div className="divide-y" style={{ borderColor: C.hairline }}>
                        {payments.map((p) => (
                          <PaymentRow key={p.id} entry={p} />
                        ))}
                      </div>
                    )
                  ) : transactions.length === 0 ? (
                    <EmptyState
                      icon={<Wallet className="h-8 w-8" />}
                      title="No chain transactions"
                      hint="Inbound USDC transfers will appear here"
                    />
                  ) : (
                    <div className="divide-y" style={{ borderColor: C.hairline }}>
                      {transactions.map((tx) => (
                        <TxRow key={tx.id} tx={tx} />
                      ))}
                    </div>
                  )}
                </div>
                {summary && Object.keys(summary.bySignalType).length > 0 && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {Object.entries(summary.bySignalType).map(([type, row]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between rounded-xl px-4 py-3"
                        style={{ background: C.panel, border: `1px solid ${C.hairline}` }}
                      >
                        <span className="text-[11px] tracking-[0.12em]" style={{ color: C.inkSoft }}>
                          {type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[13px] font-semibold tabular-nums" style={{ color: C.teal }}>
                          {row.count} × {fmtUsdc(row.usdc)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-[10px]" style={{ color: C.inkFaint }}>
                  {confirmedCount} confirmed · {payments.length} log entries · {transactions.length}{" "}
                  chain txs
                </p>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Subcomponents ─────────────────────────────────────────────────────── */

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold tracking-[0.16em]" style={{ color: C.ink }}>
        {title.toUpperCase()}
      </h2>
      <p className="mt-1 text-[12px] leading-relaxed" style={{ color: C.inkDim }}>
        {subtitle}
      </p>
    </div>
  );
}

function StatusChip({ live, label }: { live: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium tracking-[0.08em]"
      style={{
        color: live ? C.emerald : C.amber,
        background: live ? "rgba(91,200,146,0.1)" : "rgba(244,163,64,0.1)",
        border: `1px solid ${live ? "rgba(91,200,146,0.28)" : "rgba(244,163,64,0.28)"}`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: live ? C.emerald : C.amber,
          boxShadow: live ? `0 0 8px ${C.emerald}` : undefined,
        }}
      />
      {label}
    </span>
  );
}

function NetworkPill({
  label,
  muted,
  warn,
}: {
  label: string;
  muted?: boolean;
  warn?: boolean;
}) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[9px] font-semibold tracking-[0.14em] uppercase"
      style={{
        color: warn ? C.amber : muted ? C.inkDim : C.teal,
        background: warn
          ? "rgba(244,163,64,0.1)"
          : muted
            ? "rgba(255,255,255,0.03)"
            : C.tealDim,
        border: `1px solid ${warn ? "rgba(244,163,64,0.25)" : muted ? C.hairline : "rgba(122,201,192,0.25)"}`,
      }}
    >
      {label}
    </span>
  );
}

function WalletChip({
  address,
  copied,
  onCopy,
}: {
  address: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="group inline-flex max-w-full items-center gap-2 rounded-lg px-3 py-2 font-mono text-[11px] transition-colors hover:bg-white/[0.04]"
      style={{ border: `1px solid ${C.hairBold}`, color: C.inkSoft }}
    >
      <Wallet className="h-3.5 w-3.5 shrink-0" style={{ color: C.teal }} />
      <span className="truncate">{shortAddr(address)}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0" style={{ color: C.emerald }} />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 opacity-50 group-hover:opacity-100" />
      )}
    </button>
  );
}

function HeroStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${C.hairline}` }}
    >
      <div className="flex items-center gap-1.5" style={{ color: C.inkFaint }}>
        {icon}
        <span className="text-[9px] font-medium tracking-[0.16em] uppercase">{label}</span>
      </div>
      <p className="mt-1.5 text-[18px] font-semibold tabular-nums tracking-tight" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

function DemoStepper({ current, busy }: { current: DemoStep; busy: boolean }) {
  const steps = [
    { n: 1, label: "402" },
    { n: 2, label: "Intent" },
    { n: 3, label: "Confirm" },
    { n: 4, label: "Signal" },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const done = current > s.n;
        const active = current === s.n;
        return (
          <div key={s.n} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300"
                style={{
                  background: done ? C.tealDim : active ? "rgba(122,201,192,0.2)" : C.bg,
                  border: `1px solid ${done || active ? C.teal : C.hairBold}`,
                  color: done || active ? C.teal : C.inkFaint,
                  boxShadow: active && !busy ? `0 0 16px rgba(122,201,192,0.35)` : undefined,
                }}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : s.n}
              </div>
              <span
                className="text-[9px] font-medium tracking-[0.1em]"
                style={{ color: active ? C.inkSoft : C.inkFaint }}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="mx-1 mb-5 h-px flex-1 transition-colors duration-300"
                style={{ background: done ? C.teal : C.hairBold, opacity: done ? 0.6 : 0.35 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DemoAction({
  step,
  title,
  desc,
  onClick,
  disabled,
  active,
}: {
  step: number;
  title: string;
  desc: string;
  onClick: () => void;
  disabled: boolean;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all hover:bg-white/[0.03] disabled:opacity-40"
      style={{
        border: `1px solid ${active ? "rgba(122,201,192,0.35)" : C.hairline}`,
        background: active ? "rgba(122,201,192,0.06)" : "transparent",
      }}
    >
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
        style={{
          background: active ? C.tealDim : C.bg,
          color: active ? C.teal : C.inkFaint,
          border: `1px solid ${active ? "rgba(122,201,192,0.3)" : C.hairBold}`,
        }}
      >
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium" style={{ color: C.ink }}>
          {title}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: C.inkDim }}>
          {desc}
        </p>
      </div>
      <ArrowRight
        className="mt-1 h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
        style={{ color: C.teal }}
      />
    </button>
  );
}

function ApiTerminal({ status, body }: { status: number | null; body: string | null }) {
  let formatted = body ?? "";
  try {
    formatted = JSON.stringify(JSON.parse(body ?? ""), null, 2);
  } catch {
    /* keep raw */
  }
  const ok = status !== null && status >= 200 && status < 300;
  const blocked = status === 402;
  return (
    <div className="mt-4 overflow-hidden rounded-xl" style={{ border: `1px solid ${C.hairBold}` }}>
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ background: C.bg, borderBottom: `1px solid ${C.hairline}` }}
      >
        <span className="text-[10px] tracking-[0.14em]" style={{ color: C.inkFaint }}>
          API response
        </span>
        {status !== null && (
          <span
            className="rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold"
            style={{
              color: ok ? C.emerald : blocked ? C.amber : C.rose,
              background: ok
                ? "rgba(91,200,146,0.12)"
                : blocked
                  ? "rgba(244,163,64,0.12)"
                  : "rgba(224,117,112,0.12)",
            }}
          >
            HTTP {status}
          </span>
        )}
      </div>
      <pre
        className="max-h-52 overflow-auto p-3 font-mono text-[10px] leading-relaxed"
        style={{ background: "#030303", color: C.inkSoft }}
      >
        {formatted}
      </pre>
    </div>
  );
}

function TabSwitch({
  tab,
  onChange,
}: {
  tab: ActivityTab;
  onChange: (t: ActivityTab) => void;
}) {
  return (
    <div
      className="flex rounded-lg p-0.5"
      style={{ background: C.bg, border: `1px solid ${C.hairline}` }}
    >
      {(["payments", "chain"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className="rounded-md px-3 py-1.5 text-[10px] font-medium tracking-[0.1em] capitalize transition-colors"
          style={{
            color: tab === t ? C.ink : C.inkDim,
            background: tab === t ? C.panelRaised : "transparent",
          }}
        >
          {t === "chain" ? "On-chain" : "Payments"}
        </button>
      ))}
    </div>
  );
}

function PaymentRow({ entry }: { entry: PaymentLogEntry }) {
  const confirmed = entry.status === "confirmed";
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.02] sm:flex-nowrap">
      <div className="min-w-[120px] flex-1">
        <p className="text-[12px] font-medium" style={{ color: C.ink }}>
          {entry.signalType.replace(/_/g, " ")}
        </p>
        <p className="mt-0.5 text-[10px] tabular-nums" style={{ color: C.inkFaint }}>
          {fmtTime(entry.createdAt)}
        </p>
      </div>
      <span className="font-mono text-[11px]" style={{ color: C.inkDim }}>
        {entry.agentId.slice(0, 14)}
      </span>
      <span className="text-[13px] font-semibold tabular-nums" style={{ color: C.teal }}>
        {fmtUsdc(entry.usdcAmount)}
      </span>
      <StatusPill status={entry.status} />
      <span className="w-full font-mono text-[10px] sm:w-auto sm:text-right" style={{ color: C.inkFaint }}>
        {shortAddr(entry.paymentId)}
      </span>
    </div>
  );
}

function TxRow({ tx }: { tx: ChainTx }) {
  const ok = tx.state === "COMPLETE" || tx.state === "CONFIRMED";
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.02]">
      <div className="min-w-[100px] flex-1">
        <p className="text-[12px] font-medium" style={{ color: C.inkSoft }}>
          {tx.type}
        </p>
        <p className="mt-0.5 text-[10px]" style={{ color: C.inkFaint }}>
          {tx.createDate ? fmtTime(tx.createDate) : "—"}
        </p>
      </div>
      <span className="text-[11px] font-medium" style={{ color: ok ? C.emerald : C.inkDim }}>
        {tx.state}
      </span>
      <span className="text-[12px] tabular-nums font-medium" style={{ color: C.teal }}>
        {tx.amount ? `${tx.amount} ${tx.token ?? ""}` : "—"}
      </span>
      <span className="font-mono text-[10px]" style={{ color: C.inkFaint }}>
        {tx.txHash ? shortAddr(tx.txHash) : "—"}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: "pending" | "confirmed" }) {
  const confirmed = status === "confirmed";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-[0.1em] uppercase"
      style={{
        color: confirmed ? C.emerald : C.amber,
        background: confirmed ? "rgba(91,200,146,0.1)" : "rgba(244,163,64,0.1)",
        border: `1px solid ${confirmed ? "rgba(91,200,146,0.25)" : "rgba(244,163,64,0.25)"}`,
      }}
    >
      {status}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 opacity-30" style={{ color: C.teal }}>
        {icon}
      </div>
      <p className="text-[13px] font-medium" style={{ color: C.inkSoft }}>
        {title}
      </p>
      <p className="mt-2 max-w-xs text-[12px] leading-relaxed" style={{ color: C.inkDim }}>
        {hint}
      </p>
    </div>
  );
}

function ArcIntroModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arc-modal-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: "rgba(3,3,3,0.75)" }}
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl"
        style={{
          background: C.panel,
          border: `1px solid ${C.hairBold}`,
          boxShadow: "0 32px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04) inset",
        }}
      >
        <div
          className="relative px-6 pt-8 pb-6 sm:px-8"
          style={{
            background: `linear-gradient(180deg, rgba(122,201,192,0.14) 0%, transparent 70%)`,
          }}
        >
          <div
            aria-hidden
            className="absolute right-6 top-6 h-24 w-24 rounded-full blur-2xl"
            style={{ background: "rgba(107,159,232,0.2)" }}
          />
          <p className="text-[10px] font-semibold tracking-[0.24em]" style={{ color: C.teal }}>
            LYRA TREASURY
          </p>
          <h2
            id="arc-modal-title"
            className="mt-2 text-[22px] font-semibold tracking-tight leading-snug"
            style={{ color: C.ink }}
          >
            USDC signals on Arc
          </h2>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed" style={{ color: C.inkSoft }}>
            Lyra operates a Circle developer-controlled wallet on Arc testnet. External agents pay
            per signal call in USDC before Lyra releases gated market intelligence.
          </p>
        </div>

        <div className="space-y-4 px-6 pb-2 sm:px-8">
          <ModalBlock
            icon={<Shield className="h-4 w-4" />}
            title="HTTP 402 payment gate"
            body="Unpaid requests receive payment_required with amount, treasury address, and intent URL. After USDC is verified, the same endpoint returns signal payload."
          />
          <ModalBlock
            icon={<Wallet className="h-4 w-4" />}
            title="Treasury & intents"
            body="Each signal type has a fixed USDC price. Agents POST an intent, receive a payment ID, then attach X-Payment-Id on the gated route."
          />
          <ModalBlock
            icon={<Layers className="h-4 w-4" />}
            title="What you see here"
            body="This page is a demo only — sandbox confirm simulates payment without mainnet settlement. Not production billing."
          />
        </div>

        <div
          className="mx-6 mt-5 rounded-xl p-4 sm:mx-8"
          style={{ background: C.bg, border: `1px solid ${C.hairline}` }}
        >
          <p className="text-[10px] font-semibold tracking-[0.18em]" style={{ color: C.inkFaint }}>
            ROADMAP
          </p>
          <div className="mt-3 space-y-3">
            <RoadmapRow
              phase="Now"
              label="Arc testnet + Circle sandbox"
              active
            />
            <RoadmapRow
              phase="H2 2026"
              label="Arc mainnet production treasury"
            />
          </div>
        </div>

        <div
          className="mt-6 flex flex-col-reverse gap-2 px-6 pb-6 sm:flex-row sm:justify-end sm:px-8 sm:pb-8"
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-3 text-[11px] font-medium tracking-[0.12em] transition-colors hover:bg-white/[0.04]"
            style={{ color: C.inkDim, border: `1px solid ${C.hairline}` }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-3 text-[11px] font-semibold tracking-[0.12em] transition-all hover:brightness-110"
            style={{
              color: C.bg,
              background: `linear-gradient(135deg, ${C.teal}, #5aab9f)`,
            }}
          >
            Continue to treasury
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalBlock({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: C.tealDim, color: C.teal, border: `1px solid rgba(122,201,192,0.2)` }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[13px] font-medium" style={{ color: C.ink }}>
          {title}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed" style={{ color: C.inkDim }}>
          {body}
        </p>
      </div>
    </div>
  );
}

function RoadmapRow({
  phase,
  label,
  active,
}: {
  phase: string;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="shrink-0 rounded-md px-2 py-0.5 text-[9px] font-bold tracking-[0.12em]"
        style={{
          color: active ? C.teal : C.inkFaint,
          background: active ? C.tealDim : "rgba(255,255,255,0.03)",
          border: `1px solid ${active ? "rgba(122,201,192,0.3)" : C.hairline}`,
        }}
      >
        {phase}
      </span>
      <span className="text-[12px]" style={{ color: active ? C.inkSoft : C.inkDim }}>
        {label}
      </span>
      {active && (
        <span
          className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: C.emerald, boxShadow: `0 0 8px ${C.emerald}` }}
        />
      )}
    </div>
  );
}
