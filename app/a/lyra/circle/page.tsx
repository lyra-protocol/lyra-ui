"use client";

import { useCallback, useEffect, useState } from "react";

const C = {
  bg:       "#050505",
  panel:    "#0A0A09",
  ink:      "#ECECE6",
  inkSoft:  "#A8A69E",
  inkDim:   "#5A5852",
  inkFaint: "#2D2C28",
  hairline: "#1A1A18",
  hairBold: "#2A2926",
  amber:    "#F4A340",
  emerald:  "#5BC892",
  rose:     "#E07570",
  teal:     "#7AC9C0",
  violet:   "#B59AE8",
  gold:     "#E5C07B",
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
  const [showArcModal, setShowArcModal] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem("lyra-arc-intro-seen");
      if (!seen) setShowArcModal(true);
    } catch {
      setShowArcModal(true);
    }
  }, []);

  const refresh = useCallback(async () => {
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
    if (log?.payments) setPayments(log.payments as PaymentLogEntry[]);
    if (tx?.transactions) setTransactions(tx.transactions as ChainTx[]);
    setLastUpdated(Date.now());
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8_000);
    return () => clearInterval(t);
  }, [refresh]);

  const usdcOnChain = balance?.balances?.find(
    (b) => b.token === "USDC" || b.token.toUpperCase().includes("USDC"),
  )?.amount ?? "0";

  const pendingCount = payments.filter((p) => p.status === "pending").length;

  async function runDemoCreateIntent() {
    setDemoBusy(true);
    setDemoMsg(null);
    try {
      const res = await fetch("/api/circle/payments/intent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ agentId: "lyra-ui-demo", signalType: "trending_breakout" }),
      });
      const data = await res.json() as { ok?: boolean; intent?: PaymentIntent; error?: string };
      if (!data.ok || !data.intent) {
        setDemoMsg(data.error ?? "Failed to create intent");
        return;
      }
      setActivePaymentId(data.intent.paymentId);
      setDemoMsg(`Intent created — payment id copied to active slot`);
      await refresh();
    } catch {
      setDemoMsg("Agent unreachable");
    } finally {
      setDemoBusy(false);
    }
  }

  async function runDemoConfirmSandbox() {
    if (!activePaymentId) {
      setDemoMsg("Create an intent first");
      return;
    }
    setDemoBusy(true);
    setDemoMsg(null);
    setGatePreview(null);
    try {
      const res = await fetch(`/api/circle/payments/${activePaymentId}/confirm-sandbox`, {
        method: "POST",
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!data.ok) {
        setDemoMsg(data.error ?? "Confirm failed");
        return;
      }
      const verify = await fetch(`/api/circle/payments/${activePaymentId}/verify`, {
        method: "POST",
      });
      const v = await verify.json() as { ok?: boolean; status?: string };
      setDemoMsg(
        v.ok
          ? "Demo payment confirmed — ready for step 4"
          : "Confirmed locally; retry step 4 or create a new intent",
      );
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
    try {
      const res = await fetch("/api/circle/signals/trending-breakout");
      const text = await res.text();
      setGatePreview(`HTTP ${res.status}\n${text.slice(0, 600)}`);
    } catch (e) {
      setGatePreview(String(e));
    } finally {
      setDemoBusy(false);
    }
  }

  async function runDemoPaidSignal() {
    if (!activePaymentId) {
      setDemoMsg("Create + confirm a payment first");
      return;
    }
    setDemoBusy(true);
    setGatePreview(null);
    try {
      const q = encodeURIComponent(activePaymentId);
      const res = await fetch(`/api/circle/signals/trending-breakout?paymentId=${q}`, {
        headers: { "X-Payment-Id": activePaymentId },
        cache: "no-store",
      });
      const text = await res.text();
      setGatePreview(`HTTP ${res.status}\n${text.slice(0, 800)}`);
      if (res.ok) setDemoMsg("Signal gate passed");
      else setDemoMsg("Still blocked — run step 3 again or create a new intent");
      await refresh();
    } catch (e) {
      setGatePreview(String(e));
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col"
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
          background:
            `radial-gradient(60% 45% at 12% 8%, rgba(122,201,192,0.09) 0%, transparent 55%),` +
            `radial-gradient(50% 40% at 88% 92%, rgba(229,192,123,0.06) 0%, transparent 50%)`,
        }}
      />
      <header
        className="relative z-10 flex h-12 shrink-0 items-center justify-between px-8"
        style={{ borderBottom: `1px solid ${C.hairline}` }}
      >
        <div className="flex items-center gap-5">
          <a
            href="/a/lyra"
            className="text-[10px] tracking-[0.22em] transition-opacity hover:opacity-60"
            style={{ color: C.inkDim }}
          >
            ← LYRA
          </a>
          <span className="text-[13px] font-semibold tracking-[0.28em]" style={{ color: C.ink }}>
            CIRCLE
          </span>
          <span className="hidden text-[10px] tracking-[0.2em] sm:block" style={{ color: C.inkDim }}>
            DEMO ONLY · ARC TESTNET
          </span>
        </div>
        <div className="flex items-center gap-4">
          {status && (
            <span
              className="rounded-sm px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.18em]"
              style={{
                color: status.ok ? C.emerald : C.amber,
                background: status.ok ? "rgba(91,200,146,0.08)" : "rgba(244,163,64,0.08)",
                border: `1px solid ${status.ok ? "rgba(91,200,146,0.25)" : "rgba(244,163,64,0.25)"}`,
              }}
            >
              {status.ok ? "WALLET LIVE" : "SETUP REQUIRED"}
            </span>
          )}
          {lastUpdated && (
            <span className="text-[10px] tabular-nums" style={{ color: C.inkFaint }}>
              updated {new Date(lastUpdated).toLocaleTimeString("en-US", { hour12: false })}
            </span>
          )}
        </div>
      </header>

      {showArcModal && (
        <ArcIntroModal
          onClose={() => {
            try {
              localStorage.setItem("lyra-arc-intro-seen", "1");
            } catch { /* noop */ }
            setShowArcModal(false);
          }}
        />
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-10">
        {!status && (
          <div className="flex justify-center py-24">
            <span className="text-[11px] tracking-[0.22em]" style={{ color: C.inkDim }}>
              CONNECTING TO AGENT…
            </span>
          </div>
        )}

        {status && !status.ok && (
          <div
            className="mb-8 rounded-sm px-5 py-4 text-[12px] leading-relaxed"
            style={{
              background: "rgba(244,163,64,0.06)",
              border: `1px solid rgba(244,163,64,0.22)`,
              color: C.amber,
            }}
          >
            Circle wallet not fully configured on the agent. Set{" "}
            <span className="font-mono">CIRCLE_WALLET_*</span> and{" "}
            <span className="font-mono">CIRCLE_ENTITY_SECRET</span> on lyra-agent, then redeploy.
          </div>
        )}

        {status && (
          <>
            <section className="mb-10">
              <SectionLabel>TREASURY</SectionLabel>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <TreasuryCard
                  label="WALLET ADDRESS"
                  value={status.walletAddress ?? "—"}
                  mono
                  full={status.walletAddress ?? undefined}
                  onCopy={async () => {
                    if (status.walletAddress) {
                      const ok = await copyText(status.walletAddress);
                      setCopied(ok);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  copyLabel={copied ? "COPIED" : "COPY"}
                  accent={C.teal}
                />
                <TreasuryCard
                  label="ON-CHAIN USDC"
                  value={usdcOnChain}
                  sub={balance?.blockchain ?? "ARC-TESTNET"}
                  accent={C.emerald}
                  big
                />
                <TreasuryCard
                  label="PER SIGNAL"
                  value={fmtUsdc(status.signalPriceUsdc)}
                  sub={`${status.environment} · ${status.paymentBypass ? "gate bypassed" : "402 gate active"}`}
                  accent={C.gold}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-[10px]" style={{ color: C.inkDim }}>
                <Meta k="wallet id" v={status.walletId ? shortAddr(status.walletId) : "—"} />
                <Meta k="pending intents" v={String(pendingCount)} />
                <Meta
                  k="faucet"
                  v={
                    <a
                      href="https://faucet.circle.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-dotted underline-offset-2"
                      style={{ color: C.teal }}
                    >
                      faucet.circle.com
                    </a>
                  }
                />
              </div>
            </section>

            <section className="mb-10">
              <SectionLabel>REVENUE</SectionLabel>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  label="USDC RECEIVED"
                  value={summary ? fmtUsdc(summary.totalUsdcReceived) : "—"}
                  color={C.emerald}
                  big
                />
                <StatCard
                  label="PAID SIGNALS"
                  value={summary ? String(summary.signalCallsPaid) : "—"}
                  color={C.ink}
                />
                <StatCard
                  label="LOG ENTRIES"
                  value={String(payments.length)}
                  color={C.inkSoft}
                />
                <StatCard
                  label="CHAIN TXS"
                  value={String(transactions.length)}
                  color={C.violet}
                />
              </div>
              {summary && Object.keys(summary.bySignalType).length > 0 && (
                <div className="mt-4 space-y-2">
                  {Object.entries(summary.bySignalType).map(([type, row]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between rounded-sm px-4 py-3"
                      style={{ background: C.panel, border: `1px solid ${C.hairline}` }}
                    >
                      <span className="text-[11px] tracking-[0.16em]" style={{ color: C.inkSoft }}>
                        {type.replace(/_/g, " ").toUpperCase()}
                      </span>
                      <span className="text-[12px] tabular-nums font-semibold" style={{ color: C.teal }}>
                        {row.count} × {fmtUsdc(row.usdc)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-10">
              <SectionLabel>DEMO ONLY</SectionLabel>
              <div
                className="mt-4 rounded-sm p-5"
                style={{ background: C.panel, border: `1px solid ${C.hairline}` }}
              >
                <p className="text-[12px] leading-relaxed" style={{ color: C.inkSoft }}>
                  Testnet flow for USDC signal access: unpaid request → payment intent → demo confirm →
                  gated signal. Not production billing.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <DemoBtn onClick={runDemo402} disabled={demoBusy} label="1 · Unpaid (expect 402)" />
                  <DemoBtn onClick={runDemoCreateIntent} disabled={demoBusy} label="2 · Create intent" />
                  <DemoBtn onClick={runDemoConfirmSandbox} disabled={demoBusy} label="3 · Confirm (demo)" />
                  <DemoBtn onClick={runDemoPaidSignal} disabled={demoBusy} label="4 · Fetch signal" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowArcModal(true)}
                  className="mt-3 text-[10px] tracking-[0.14em] transition-opacity hover:opacity-70"
                  style={{ color: C.teal }}
                >
                  About Arc & Lyra treasury →
                </button>
                {activePaymentId && (
                  <p className="mt-3 font-mono text-[10px] break-all" style={{ color: C.inkDim }}>
                    active payment: {activePaymentId}
                  </p>
                )}
                {demoMsg && (
                  <p className="mt-2 text-[11px]" style={{ color: C.teal }}>
                    {demoMsg}
                  </p>
                )}
                {gatePreview && (
                  <pre
                    className="mt-4 max-h-48 overflow-auto rounded-sm p-3 text-[10px] leading-relaxed"
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.hairBold}`,
                      color: C.inkSoft,
                    }}
                  >
                    {gatePreview}
                  </pre>
                )}
              </div>
            </section>

            <section className="mb-10">
              <SectionLabel>PAYMENT LOG</SectionLabel>
              <div
                className="mt-4 overflow-hidden rounded-sm"
                style={{ border: `1px solid ${C.hairline}` }}
              >
                {payments.length === 0 ? (
                  <EmptyRow message="No signal payments logged yet" />
                ) : (
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr style={{ background: C.panel, color: C.inkFaint }}>
                        <Th>TIME</Th>
                        <Th>AGENT</Th>
                        <Th>SIGNAL</Th>
                        <Th>AMOUNT</Th>
                        <Th>STATUS</Th>
                        <Th>PAYMENT ID</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr
                          key={p.id}
                          style={{ borderTop: `1px solid ${C.hairline}` }}
                        >
                          <Td>{fmtTime(p.createdAt)}</Td>
                          <Td dim>{p.agentId.slice(0, 12)}</Td>
                          <Td>{p.signalType}</Td>
                          <Td accent>{fmtUsdc(p.usdcAmount)}</Td>
                          <Td>
                            <StatusPill status={p.status} />
                          </Td>
                          <Td mono dim>{shortAddr(p.paymentId)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section className="mb-10">
              <SectionLabel>ON-CHAIN TRANSACTIONS</SectionLabel>
              <div
                className="mt-4 overflow-hidden rounded-sm"
                style={{ border: `1px solid ${C.hairline}` }}
              >
                {transactions.length === 0 ? (
                  <EmptyRow message="No recent Circle wallet transactions" />
                ) : (
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr style={{ background: C.panel, color: C.inkFaint }}>
                        <Th>TIME</Th>
                        <Th>TYPE</Th>
                        <Th>STATE</Th>
                        <Th>AMOUNT</Th>
                        <Th>TX</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} style={{ borderTop: `1px solid ${C.hairline}` }}>
                          <Td>{tx.createDate ? fmtTime(tx.createDate) : "—"}</Td>
                          <Td dim>{tx.type}</Td>
                          <Td>
                            <TxState state={tx.state} />
                          </Td>
                          <Td accent>{tx.amount ? `${tx.amount} ${tx.token ?? ""}` : "—"}</Td>
                          <Td mono dim>{tx.txHash ? shortAddr(tx.txHash) : "—"}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-semibold tracking-[0.28em]" style={{ color: C.inkSoft }}>
        {children}
      </span>
      <span className="h-px flex-1" style={{ background: C.hairline }} />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  big,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  big?: boolean;
  sub?: string;
}) {
  return (
    <div className="px-5 py-4" style={{ background: C.panel, border: `1px solid ${C.hairline}` }}>
      <div className="text-[9px] tracking-[0.24em]" style={{ color: C.inkFaint }}>
        {label}
      </div>
      <div
        className={`mt-2 font-semibold tabular-nums tracking-tight ${big ? "text-[26px]" : "text-[20px]"}`}
        style={{ color }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-[10px]" style={{ color: C.inkDim }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function TreasuryCard({
  label,
  value,
  sub,
  accent,
  mono,
  full,
  big,
  onCopy,
  copyLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  mono?: boolean;
  full?: string;
  big?: boolean;
  onCopy?: () => void;
  copyLabel?: string;
}) {
  return (
    <div
      className="flex flex-col justify-between px-5 py-4"
      style={{ background: C.panel, border: `1px solid ${C.hairline}` }}
    >
      <div className="text-[9px] tracking-[0.24em]" style={{ color: C.inkFaint }}>
        {label}
      </div>
      <div
        className={`mt-2 font-semibold tracking-tight break-all ${big ? "text-[26px]" : "text-[14px]"} ${mono ? "font-mono" : ""}`}
        style={{ color: accent }}
        title={full}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-[10px]" style={{ color: C.inkDim }}>
          {sub}
        </div>
      )}
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="mt-3 self-start text-[9px] font-semibold tracking-[0.2em] transition-opacity hover:opacity-70"
          style={{ color: C.teal }}
        >
          {copyLabel ?? "COPY"}
        </button>
      )}
    </div>
  );
}

function Meta({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <span>
      <span style={{ color: C.inkFaint }}>{k}: </span>
      <span style={{ color: C.inkSoft }}>{v}</span>
    </span>
  );
}

function DemoBtn({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-sm px-3 py-2 text-[10px] font-semibold tracking-[0.14em] transition-opacity disabled:opacity-40"
      style={{
        color: C.ink,
        background: "rgba(122,201,192,0.1)",
        border: `1px solid rgba(122,201,192,0.28)`,
      }}
    >
      {label}
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-[9px] font-semibold tracking-[0.18em]">
      {children}
    </th>
  );
}

function Td({
  children,
  mono,
  dim,
  accent,
}: {
  children: React.ReactNode;
  mono?: boolean;
  dim?: boolean;
  accent?: boolean;
}) {
  return (
    <td
      className={`px-4 py-2.5 tabular-nums ${mono ? "font-mono" : ""}`}
      style={{
        color: accent ? C.teal : dim ? C.inkDim : C.inkSoft,
      }}
    >
      {children}
    </td>
  );
}

function StatusPill({ status }: { status: "pending" | "confirmed" }) {
  const confirmed = status === "confirmed";
  return (
    <span
      className="inline-block rounded-sm px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.14em]"
      style={{
        color: confirmed ? C.emerald : C.amber,
        background: confirmed ? "rgba(91,200,146,0.1)" : "rgba(244,163,64,0.1)",
        border: `1px solid ${confirmed ? "rgba(91,200,146,0.25)" : "rgba(244,163,64,0.25)"}`,
      }}
    >
      {status.toUpperCase()}
    </span>
  );
}

function TxState({ state }: { state: string }) {
  const ok = state === "COMPLETE" || state === "CONFIRMED";
  return (
    <span style={{ color: ok ? C.emerald : C.inkDim }}>{state}</span>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="px-5 py-10 text-center text-[11px] tracking-[0.12em]" style={{ color: C.inkDim }}>
      {message}
    </div>
  );
}

function ArcIntroModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(5,5,5,0.82)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="arc-intro-title"
    >
      <div
        className="relative w-full max-w-md rounded-sm p-6"
        style={{
          background: C.panel,
          border: `1px solid ${C.hairBold}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
        }}
      >
        <h2
          id="arc-intro-title"
          className="text-[13px] font-semibold tracking-[0.22em]"
          style={{ color: C.ink }}
        >
          LYRA × ARC
        </h2>
        <p className="mt-4 text-[12px] leading-relaxed" style={{ color: C.inkSoft }}>
          Lyra holds a Circle developer-controlled treasury on{" "}
          <span style={{ color: C.teal }}>Arc testnet</span> for USDC signal access. Agents pay per
          call; the gate returns HTTP 402 until payment is verified.
        </p>
        <p className="mt-3 text-[12px] leading-relaxed" style={{ color: C.inkSoft }}>
          This dashboard is a <span style={{ color: C.gold }}>demo only</span> — sandbox intents, not
          mainnet billing. Production Arc mainnet is planned for the second half of the year.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-sm py-2.5 text-[10px] font-semibold tracking-[0.18em] transition-opacity hover:opacity-80"
          style={{
            color: C.bg,
            background: C.teal,
          }}
        >
          GOT IT
        </button>
      </div>
    </div>
  );
}
