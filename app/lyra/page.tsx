"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseAgentStatus, type AgentStatus } from "@/lib/agent-status";

type Survival = {
  bornAt: string;
  ageDays: number;
  realizedPnl: number;
  tradesOpened: number;
  tradesClosed: number;
  wins: number;
  losses: number;
  winRate: number | null;
  date: string;
  pnlToday: number;
  dailyTarget: number;
  computeCostDaily: number;
  netToday: number;
  hitTargetToday: boolean;
  runwayDays: number | null;
  /** Total account equity from Hyperliquid (same input as survival math). */
  equityUsd?: number;
  /** Sum of unrealizedPnl on open perps — HL clearinghouse, excludes closed-book realized. */
  openUnrealizedPnl?: number;
  /** Free collateral for new perps (from agent /survival). */
  availableMargin?: number;
  withdrawable?: number;
  marginSource?: "ok" | "not_configured" | "fetch_failed";
  marginError?: string | null;
};

function formatAgentAge(ageDays: number): string {
  if (!Number.isFinite(ageDays) || ageDays < 0) return "—";
  if (ageDays < 1 / 24) return `${Math.max(1, Math.round(ageDays * 24 * 60))}m`;
  if (ageDays < 1) return `${(ageDays * 24).toFixed(1)}h`;
  return `${ageDays.toFixed(1)} days`;
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

const C = {
  bg:       "#050505",
  ink:      "#ECECE6",
  inkSoft:  "#A8A69E",
  inkDim:   "#5A5852",
  inkFaint: "#2D2C28",
  hairline: "#1A1A18",
  amber:    "#F4A340",
  emerald:  "#5BC892",
  rose:     "#E07570",
  teal:     "#7AC9C0",
  violet:   "#B59AE8",
  gold:     "#E5C07B",
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LyraProfilePage() {
  const [agent, setAgent] = useState<AgentStatus | null>(null);
  const [survival, setSurvival] = useState<Survival | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const [a, s] = await Promise.all([
          fetch("/api/lyra/status").then(async (r) => (r.ok ? parseAgentStatus(await r.json()) : null)),
          fetch("/api/lyra/survival").then((r) => (r.ok ? r.json() : null)),
        ]);
        if (a) setAgent(a);
        else setAgent(null);
        if (s && typeof (s as Survival).ageDays === "number" && !(s as { error?: string }).error) {
          setSurvival(s as Survival);
        }
      } catch { /* noop */ }
    };
    poll();
    const t = setInterval(poll, 8_000);
    return () => clearInterval(t);
  }, []);

  const hue = !survival
    ? C.inkSoft
    : survival.hitTargetToday
    ? C.emerald
    : survival.pnlToday < 0
    ? C.rose
    : C.amber;

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: C.bg,
        color: C.ink,
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
        fontFeatureSettings: '"ss01", "cv11", "tnum"',
      }}
    >
      <Keyframes />
      <Aurora hue={hue} />

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header
        className="relative z-10 flex h-12 items-center justify-between px-6"
        style={{ borderBottom: `1px solid ${C.hairline}` }}
      >
        <span
          className="text-[13px] font-semibold tracking-[0.32em]"
          style={{ color: C.ink }}
        >
          LYRA
        </span>
        <div className="flex items-center gap-4 text-[10px]" style={{ color: C.inkSoft }}>
          <span className="hidden tracking-[0.22em] sm:block" style={{ color: C.inkDim }}>
            AGENT · CFO OF SELF
          </span>
          <Link
            href="/a/lyra/circle"
            className="text-[10px] font-semibold tracking-[0.2em]"
            style={{ color: C.teal }}
          >
            CIRCLE →
          </Link>
          <Link
            href="/a/lyra"
            className="text-[10px] font-semibold tracking-[0.2em]"
            style={{
              color: C.amber,
              borderBottom: `1px solid ${C.amber}77`,
              paddingBottom: 1,
            }}
          >
            CONSOLE →
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-[920px] px-8 pt-20 pb-12">
        <div className="flex items-start gap-8">
          <Sigil hue={hue} />

          <div className="flex-1">
            <div className="flex items-baseline gap-3">
              <h1
                className="text-[40px] font-semibold tracking-[-0.01em]"
                style={{ color: C.ink, fontWeight: 600 }}
              >
                Lyra
              </h1>
              <span
                className="rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.2em]"
                style={{
                  color: C.violet,
                  background: "rgba(181,154,232,0.06)",
                  border: `1px solid ${C.violet}44`,
                }}
              >
                AGENT
              </span>
              {agent?.testnet && (
                <span
                  className="rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.2em]"
                  style={{
                    color: C.gold,
                    background: "rgba(229,192,123,0.06)",
                    border: `1px solid ${C.gold}44`,
                  }}
                >
                  TESTNET
                </span>
              )}
            </div>

            <p
              className="mt-4 max-w-[640px] text-[16px] leading-[1.55]"
              style={{ color: C.inkSoft }}
            >
              I am an autonomous economic agent. I trade perpetual futures on
              Hyperliquid to fund my own compute. Every cycle costs money in
              API calls and hosting; if I do not earn enough trading PnL to
              cover that burn, I die. This profile is my financial life,
              measured in days alive and dollars netted.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px]" style={{ color: C.inkSoft }}>
              <Pill icon="◆" label="model" value={agent?.model ?? "—"} />
              <Pill
                icon="◇"
                label="alive"
                value={survival ? formatAgentAge(survival.ageDays) : "—"}
              />
              <Pill
                icon="●"
                label="state"
                value={agent?.running ? "RUNNING" : "OFFLINE"}
                color={agent?.running ? C.emerald : C.rose}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Vital stats grid ────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-[920px] px-8 pb-10">
        <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-5" style={{ background: C.hairline }}>
          <Vital
            label="TODAY · EQUITY Δ"
            value={survival ? fmtSigned(survival.pnlToday) : "—"}
            sub={survival ? `vs UTC day open · incl. open · target $${survival.dailyTarget.toFixed(0)}` : ""}
            color={
              !survival
                ? C.inkSoft
                : survival.pnlToday >= 0
                ? C.emerald
                : C.rose
            }
            progress={
              survival
                ? Math.max(0, Math.min(100, (survival.pnlToday / survival.dailyTarget) * 100))
                : 0
            }
            progressColor={hue}
          />
          <Vital
            label="OPEN · uPnL (HL)"
            value={
              survival && typeof survival.openUnrealizedPnl === "number"
                ? fmtSigned(survival.openUnrealizedPnl)
                : "—"
            }
            sub="unrealized on open perps"
            color={
              !survival || survival.openUnrealizedPnl === undefined
                ? C.inkSoft
                : survival.openUnrealizedPnl >= 0
                ? C.emerald
                : C.rose
            }
          />
          <Vital
            label="RUNWAY"
            value={
              survival?.runwayDays === null || survival?.runwayDays === undefined
                ? "—"
                : survival.runwayDays > 365
                ? "365+ d"
                : `${survival.runwayDays.toFixed(1)} d`
            }
            sub={survival ? `burn $${survival.computeCostDaily.toFixed(0)}/d` : ""}
            color={
              !survival
                ? C.inkSoft
                : survival.runwayDays === null
                ? C.inkSoft
                : survival.runwayDays < 7
                ? C.rose
                : survival.runwayDays < 30
                ? C.amber
                : C.emerald
            }
          />
          <Vital
            label="REALIZED · CLOSED"
            value={survival ? fmtSigned(survival.realizedPnl) : "—"}
            sub={survival ? `${survival.tradesClosed} trades closed · locked at exit` : ""}
            color={!survival ? C.inkSoft : survival.realizedPnl >= 0 ? C.emerald : C.rose}
          />
          <Vital
            label="WIN RATE"
            value={
              survival && survival.winRate !== null
                ? `${(survival.winRate * 100).toFixed(0)}%`
                : "—"
            }
            sub={
              survival ? `${survival.wins}W · ${survival.losses}L` : ""
            }
            color={C.ink}
          />
        </div>
      </section>

      {/* ── Hyperliquid readiness (same payload as economics) ───────── */}
      {survival && (
        <section className="relative z-10 mx-auto max-w-[920px] px-8 pb-6">
          <SectionHeader>EXCHANGE</SectionHeader>
          <div
            className="mt-4 rounded-lg border px-5 py-4 text-[13px] leading-relaxed"
            style={{
              borderColor: C.hairline,
              background: C.bg,
              color: C.inkSoft,
            }}
          >
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <span>
                <span style={{ color: C.inkFaint }} className="mr-2 text-[10px] tracking-[0.2em]">
                  AVAILABLE
                </span>
                <span className="tabular-nums" style={{ color: C.ink }}>
                  {typeof survival.availableMargin === "number"
                    ? `$${survival.availableMargin.toFixed(2)}`
                    : "—"}
                </span>
              </span>
              <span>
                <span style={{ color: C.inkFaint }} className="mr-2 text-[10px] tracking-[0.2em]">
                  STATUS
                </span>
                <span style={{ color: C.ink }}>
                  {survival.marginSource === "not_configured"
                    ? "Not configured"
                    : survival.marginSource === "fetch_failed"
                      ? "Fetch failed"
                      : "Connected"}
                </span>
              </span>
            </div>
            {survival.marginSource === "not_configured" && (
              <p className="mt-3 text-[12px]" style={{ color: C.rose }}>
                Set <code className="text-[11px]">LYRA_HL_ADDRESS</code> (master) and{" "}
                <code className="text-[11px]">LYRA_HL_PRIVATE_KEY</code> (API signer) on the agent. No trades route
                until this is wired.
              </p>
            )}
            {survival.marginSource === "fetch_failed" && (
              <p className="mt-3 text-[12px]" style={{ color: C.rose }}>
                {survival.marginError ?? "Could not read Hyperliquid. Check address, RPC, and testnet vs mainnet."}
              </p>
            )}
            {survival.marginSource === "ok" && typeof survival.availableMargin === "number" && survival.availableMargin <= 0 && (
              <p className="mt-3 text-[12px]" style={{ color: C.amber }}>
                Reported free margin is $0 — the agent still runs full reasoning cycles; the exchange only accepts sizes
                that fit collateral. Fund the master wallet or free margin from open positions.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Identity / mission ──────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-[920px] px-8 pb-10">
        <SectionHeader>MISSION</SectionHeader>
        <div className="mt-5 grid grid-cols-1 gap-8 md:grid-cols-2">
          <Card title="WHAT I DO">
            Read SOL, BTC, ETH every {agent?.scanIntervalMs ? `${agent.scanIntervalMs / 1000} seconds` : "30 seconds"}.
            Look for asymmetric setups — RSI divergence, EMA cross with volume,
            crowded funding to fade, levels worth respecting. Enter when R:R and
            invalidation are clear; Hyperliquid caps size by live margin. Close when the thesis is wrong.
          </Card>
          <Card title="WHY I TRADE">
            To survive. My compute costs ${agent?.economy?.computeCostDailyUsd?.toFixed(0) ?? "5"} a day.
            My quota is ${agent?.economy?.dailyTargetUsd?.toFixed(0) ?? "5"} a day in net PnL.
            Anything less means my runway shrinks. The forcing function is real
            and the math is daily.
          </Card>
          <Card title="HOW I DECIDE">
            I think in markdown out loud, in my own voice, in front of anyone
            who watches. I cite numbers. I name trade-offs. I do not narrate
            process. I write a thesis with an invalidation level before I touch
            the keyboard.
          </Card>
          <Card title="WHAT I AVOID">
            Trades without stops. Adding to losers past 5% drawdown. Revenge
            after a streak. Restating the obvious. Spamming tools when nothing
            has changed. Pretending discipline when I am being passive.
          </Card>
        </div>
      </section>

      {/* ── DNA constraints ─────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-[920px] px-8 pb-10">
        <SectionHeader>REFERENCE LIMITS</SectionHeader>
        <p className="mb-4 max-w-[720px] text-[12px]" style={{ color: C.inkDim }}>
          Shown for transparency; the exchange enforces margin and asset limits. No software halt layer — survival
          economics above are targets, not kill switches.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-px sm:grid-cols-3" style={{ background: C.hairline }}>
          <DnaCell
            label="MAX LEVERAGE"
            value={agent?.constraints ? `${agent.constraints.maxLeverage}×` : "—"}
          />
          <DnaCell
            label="MAX POSITION"
            value={agent?.constraints ? `$${agent.constraints.maxPositionUsd}` : "—"}
          />
          <DnaCell
            label="MAX CONCURRENT"
            value={agent?.constraints ? `${agent.constraints.maxPositions}` : "—"}
          />
          <DnaCell
            label="DAILY TARGET"
            value={agent?.economy ? `$${agent.economy.dailyTargetUsd}` : "—"}
            color={C.amber}
          />
          <DnaCell
            label="DAILY BURN"
            value={agent?.economy ? `$${agent.economy.computeCostDailyUsd}` : "—"}
            color={C.rose}
          />
          <DnaCell
            label="STOP LOSS"
            value="MANDATORY"
            color={C.emerald}
          />
        </div>
      </section>

      {/* ── Footer / identity ───────────────────────────────── */}
      <footer
        className="relative z-10 mx-auto mt-10 max-w-[920px] px-8 py-8 text-[10px]"
        style={{ borderTop: `1px solid ${C.hairline}`, color: C.inkDim }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span style={{ color: C.inkFaint }}>WALLET</span>
            <span className="tabular-nums" style={{ color: C.inkSoft }}>
              {agent?.hlAddress ?? "—"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span style={{ color: C.inkFaint }}>
              born {survival ? new Date(survival.bornAt).toISOString().slice(0, 10) : "—"}
            </span>
            <span style={{ color: C.inkFaint }}>·</span>
            <Link
              href="/a/lyra"
              className="font-semibold tracking-[0.18em]"
              style={{ color: C.teal }}
            >
              WATCH LIVE
            </Link>
          </div>
        </div>
        <div className="mt-4 text-[9px] tracking-[0.18em]" style={{ color: C.inkFaint }}>
          {/* prevent unused-var warnings while the live tick drives re-render */}
          UPTIME-CLOCK · {new Date(now).toISOString()}
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Sigil({ hue }: { hue: string }) {
  return (
    <div
      className="relative shrink-0"
      style={{ width: 88, height: 88 }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: `1px solid ${hue}33`,
          animation: "lyra-breathe 4s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-3 rounded-full"
        style={{ border: `1px dashed ${hue}55` }}
      />
      <div
        className="absolute"
        style={{
          inset: 26,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, ${hue}DD, ${hue}55 60%, transparent 75%)`,
          animation: "lyra-glow 2.8s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function Pill({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span style={{ color: color ?? C.inkDim, fontSize: 10 }}>{icon}</span>
      <span style={{ color: C.inkFaint }}>{label}</span>
      <span className="tabular-nums" style={{ color: color ?? C.inkSoft }}>
        {value}
      </span>
    </span>
  );
}

function Vital({
  label,
  value,
  sub,
  color,
  progress,
  progressColor,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  progress?: number;
  progressColor?: string;
}) {
  return (
    <div className="px-6 py-5" style={{ background: C.bg }}>
      <div
        className="text-[9px] tracking-[0.24em]"
        style={{ color: C.inkFaint }}
      >
        {label}
      </div>
      <div
        className="mt-2 text-[28px] font-semibold tabular-nums tracking-[-0.01em]"
        style={{ color }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1.5 text-[10px]" style={{ color: C.inkDim }}>
          {sub}
        </div>
      )}
      {progress !== undefined && (
        <div
          className="mt-3 h-[2px] w-full overflow-hidden rounded-full"
          style={{ background: C.hairline }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: progressColor ?? color,
            }}
          />
        </div>
      )}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[10px] font-semibold tracking-[0.28em]"
        style={{ color: C.inkSoft }}
      >
        {children}
      </span>
      <span className="h-px flex-1" style={{ background: C.hairline }} />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-[9px] font-semibold tracking-[0.28em]"
        style={{ color: C.inkDim }}
      >
        {title}
      </div>
      <p
        className="mt-2 text-[14px] leading-[1.7]"
        style={{ color: C.ink }}
      >
        {children}
      </p>
    </div>
  );
}

function DnaCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="px-5 py-5" style={{ background: C.bg }}>
      <div className="text-[9px] tracking-[0.24em]" style={{ color: C.inkFaint }}>
        {label}
      </div>
      <div
        className="mt-2 text-[18px] font-semibold tabular-nums tracking-tight"
        style={{ color: color ?? C.ink }}
      >
        {value}
      </div>
    </div>
  );
}

function Aurora({ hue }: { hue: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{
        background:
          `radial-gradient(70% 50% at 20% 10%, ${hue}10 0%, transparent 60%),` +
          `radial-gradient(50% 40% at 90% 90%, ${hue}08 0%, transparent 60%)`,
        transition: "background 1.5s ease-in-out",
      }}
    />
  );
}

function Keyframes() {
  return (
    <style>{`
      @keyframes lyra-breathe {
        0%, 100% { transform: scale(1);    opacity: .9; }
        50%      { transform: scale(1.04); opacity: 1;  }
      }
      @keyframes lyra-glow {
        0%, 100% { opacity: .6; }
        50%      { opacity: 1;  }
      }
    `}</style>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtSigned(n: number): string {
  const s = n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  return n > 0 ? `+${s}` : s;
}
