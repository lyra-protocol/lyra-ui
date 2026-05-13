"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import type { MarketTicker } from "@/core/market/types";
import { useLiveMarketTickers } from "@/hooks/use-live-market-tickers";
import { Markdown } from "./markdown";

// ─── Types ───────────────────────────────────────────────────────────────────

type EventType =
  | "wake" | "scan" | "thought" | "tool_call" | "tool_result"
  | "signal" | "decision" | "execution" | "confirmed"
  | "monitoring" | "closed" | "memory" | "sleep" | "error";

type FeedEntry = {
  id: string;
  type: EventType;
  content: string;
  data?: Record<string, unknown>;
  ts: string;
  tsMs: number;
};

type Position = {
  symbol: string;
  direction: "long" | "short";
  size: number;
  entryPrice: number;
  unrealizedPnl: number;
  leverage: number;
  /** Filled when recomputing from Hyperliquid allMids WebSocket */
  liveMark?: number;
};

type AgentStatus = {
  running: boolean;
  model: string;
  testnet: boolean;
  hlAddress: string | null;
  scanIntervalMs: number;
  constraints: { maxPositions: number; maxPositionUsd: number; maxLeverage: number };
};

type MemoryLesson = {
  type: string;
  content: string;
  confidence: number;
  symbol?: string;
  ts: string;
};

type MarketTick = { symbol: string; mark: number; trend?: string };

type NewsHeadline = {
  source: string;
  title: string;
  url: string;
  publishedAt: string;
};

type FundingTick = {
  symbol: string;
  rate: number;
  annualizedPct: number;
};

type FearGreed = {
  value: number;
  classification: string;
  delta: number | null;
};

type Survival = {
  ageDays: number;
  pnlToday: number;
  dailyTarget: number;
  computeCostDaily: number;
  netToday: number;
  hitTargetToday: boolean;
  runwayDays: number | null;
  tradesClosed: number;
  wins: number;
  losses: number;
  winRate: number | null;
  bornAt: string;
};

/** Recompute uPnL from live perp mid (agent SSE only refreshes each scan cycle). */
function mergePositionsWithLiveMids(
  positions: Position[],
  tickers: Record<string, MarketTicker>,
): Position[] {
  return positions.map((p) => {
    const pid = `${p.symbol}-USD`;
    const price = tickers[pid]?.price;
    if (!price || !Number.isFinite(price) || price <= 0) return p;
    const delta = p.direction === "long" ? price - p.entryPrice : p.entryPrice - price;
    const unrealizedPnl = delta * p.size;
    return { ...p, unrealizedPnl, liveMark: price };
  });
}

function formatAgentAge(ageDays: number): string {
  if (!Number.isFinite(ageDays) || ageDays < 0) return "—";
  if (ageDays < 1 / 24) return `${Math.max(1, Math.round(ageDays * 24 * 60))}m`;
  if (ageDays < 1) return `${(ageDays * 24).toFixed(1)}h`;
  return `${ageDays.toFixed(1)} days`;
}

// ─── Design tokens ───────────────────────────────────────────────────────────

const C = {
  bg:        "#050505",
  panel:     "#0A0A09",
  ink:       "#ECECE6",
  inkSoft:   "#A8A69E",
  inkDim:    "#5A5852",
  inkFaint:  "#2D2C28",
  hairline:  "#1A1A18",
  hairBold:  "#2A2926",
  amber:     "#F4A340",
  emerald:   "#5BC892",
  rose:      "#E07570",
  teal:      "#7AC9C0",
  violet:    "#B59AE8",
  gold:      "#E5C07B",
};

// ─── Cycle model ─────────────────────────────────────────────────────────────
//
// A cycle is one wake/scan/think/sleep loop. We render one block per cycle so
// the operator reads Lyra's prose, with tool calls as quiet inline annotations.

type Cycle = {
  id: string;
  number: number | null;
  ts: string;
  startMs: number;
  endMs?: number;
  markets?: string;
  thought: string;
  tools: { name: string; status: "running" | "ok" | "fail"; ts: string }[];
  decisions: { kind: "signal" | "decision" | "execution" | "confirmed" | "closed"; text: string; ts: string }[];
  errors: { text: string; ts: string }[];
  ended: boolean;
};

function groupIntoCycles(feed: FeedEntry[]): Cycle[] {
  const cycles: Cycle[] = [];
  let cur: Cycle | null = null;

  const ensure = (e: FeedEntry): Cycle => {
    if (!cur) {
      cur = {
        id: e.id,
        number: null,
        ts: e.ts,
        startMs: e.tsMs,
        thought: "",
        tools: [],
        decisions: [],
        errors: [],
        ended: false,
      };
      cycles.push(cur);
    }
    cur.endMs = e.tsMs;
    return cur;
  };

  for (const e of feed) {
    if (e.type === "scan") {
      // First "Scan #N — collecting market data..." starts a new cycle.
      // Second "Markets loaded: ..." is metadata for the current cycle.
      const m = e.content.match(/Scan #(\d+)/);
      if (m) {
        cur = {
          id: e.id,
          number: Number(m[1]),
          ts: e.ts,
          startMs: e.tsMs,
          thought: "",
          tools: [],
          decisions: [],
          errors: [],
          ended: false,
        };
        cycles.push(cur);
        continue;
      }
      const ml = e.content.match(/Markets loaded: (.+)$/);
      if (ml) {
        ensure(e).markets = ml[1];
        continue;
      }
      continue;
    }

    if (e.type === "thought") {
      ensure(e).thought += e.content;
      continue;
    }

    if (e.type === "tool_call") {
      const name = e.content.replace(/^→\s*/, "").replace(/\(.*\)$/, "");
      ensure(e).tools.push({ name, status: "running", ts: e.ts });
      continue;
    }

    if (e.type === "tool_result") {
      const c = ensure(e);
      const m = e.content.match(/^←\s*(\S+)(?:\s+(done|failed))?$/);
      const name = m ? m[1] : e.content.replace(/^←\s*/, "").trim();
      const status = m && m[2] === "failed" ? "fail" : "ok";
      const errored = Boolean(e.data && (e.data as { error?: unknown }).error);
      const last = [...c.tools].reverse().find((t) => t.name === name && t.status === "running");
      if (last) last.status = errored ? "fail" : status;
      continue;
    }

    if (
      e.type === "signal" ||
      e.type === "decision" ||
      e.type === "execution" ||
      e.type === "confirmed" ||
      e.type === "closed"
    ) {
      ensure(e).decisions.push({ kind: e.type, text: e.content, ts: e.ts });
      continue;
    }

    if (e.type === "error") {
      ensure(e).errors.push({ text: e.content, ts: e.ts });
      continue;
    }

    if (e.type === "sleep" || e.type === "monitoring") {
      if (cur) cur.ended = true;
      continue;
    }
  }

  return cycles;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _seq = 0;
const nextId = () => `e${++_seq}`;
const tsNow = () => new Date().toISOString().slice(11, 19);
const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function shortAddress(addr: string | null): string {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";
}

function modelLabel(m?: string): string {
  if (!m) return "—";
  if (m.toLowerCase().startsWith("gpt")) return m;
  return m.split("-").slice(0, 2).join("-");
}

function deriveMindState(feed: FeedEntry[]): {
  state: "BOOTING" | "SCANNING" | "RESEARCHING" | "THINKING" | "ACTING" | "RESTING" | "FAULT";
  hue: string;
} {
  if (feed.length === 0) return { state: "BOOTING", hue: C.inkSoft };

  // Look at last few events, not just the most recent — research tools
  // produce bursts of CALL/RECV that should distinct from market scans.
  for (let i = feed.length - 1; i >= Math.max(0, feed.length - 6); i--) {
    const e = feed[i];
    if (e.type === "error") return { state: "FAULT", hue: C.rose };
    if (e.type === "execution" || e.type === "confirmed" || e.type === "closed")
      return { state: "ACTING", hue: C.amber };
  }

  const last = feed[feed.length - 1];
  if (last.type === "thought" || last.type === "decision" || last.type === "signal")
    return { state: "THINKING", hue: C.amber };
  if (last.type === "tool_call" || last.type === "tool_result") {
    const c = last.content.toLowerCase();
    if (c.includes("news") || c.includes("funding") || c.includes("fear") || c.includes("greed"))
      return { state: "RESEARCHING", hue: C.violet };
    return { state: "SCANNING", hue: C.teal };
  }
  if (last.type === "sleep") return { state: "RESTING", hue: C.inkSoft };
  return { state: "SCANNING", hue: C.teal };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LyraWatchPage() {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [memories, setMemories] = useState<MemoryLesson[]>([]);
  const [markets, setMarkets] = useState<MarketTick[]>([]);
  const [news, setNews] = useState<NewsHeadline[]>([]);
  const [funding, setFunding] = useState<FundingTick[]>([]);
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);
  const [survival, setSurvival] = useState<Survival | null>(null);
  const [accountValue, setAccountValue] = useState<number | null>(null);
  const [availableMargin, setAvailableMargin] = useState<number | null>(null);
  const [hlMarginStatus, setHlMarginStatus] = useState<"ok" | "not_configured" | "fetch_failed" | null>(null);
  const [hlMarginError, setHlMarginError] = useState<string | null>(null);
  // symbol → rolling array of marks (oldest → newest), used for sparklines.
  const [trail, setTrail] = useState<Record<string, number[]>>({});
  const [agent, setAgent] = useState<AgentStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [bootedAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());

  const feedRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  const hlProductIds = useMemo(() => {
    const ids = new Set<string>(["SOL-USD", "BTC-USD", "ETH-USD"]);
    for (const p of positions) ids.add(`${p.symbol}-USD`);
    return [...ids];
  }, [positions]);

  const liveTickers = useLiveMarketTickers(hlProductIds, { testnet: agent?.testnet ?? false });

  const positionsLive = useMemo(
    () => mergePositionsWithLiveMids(positions, liveTickers),
    [positions, liveTickers],
  );

  const marketsLive = useMemo(() => {
    const rows = markets.length
      ? markets
      : ([{ symbol: "SOL" }, { symbol: "BTC" }, { symbol: "ETH" }] as MarketTick[]);
    return rows.map((m) => {
      const t = liveTickers[`${m.symbol}-USD`]?.price;
      if (t && Number.isFinite(t) && t > 0) return { ...m, mark: t };
      return m;
    });
  }, [markets, liveTickers]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const push = useCallback((entry: Omit<FeedEntry, "id" | "ts" | "tsMs">) => {
    setFeed((prev) => [
      ...prev.slice(-600),
      { ...entry, id: nextId(), ts: tsNow(), tsMs: Date.now() },
    ]);
  }, []);

  // Status + survival poll (survival uses live account equity from agent /survival)
  useEffect(() => {
    const poll = async () => {
      try {
        const [statusRes, survivalRes] = await Promise.all([
          fetch("/api/lyra/status"),
          fetch("/api/lyra/survival"),
        ]);
        if (statusRes.ok) setAgent(await statusRes.json() as AgentStatus);
        if (survivalRes.ok) {
          const data = await survivalRes.json() as Survival & { error?: string };
          if (data && typeof data.ageDays === "number" && !data.error) {
            setSurvival(data);
          }
        }
      } catch { /* offline */ }
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, []);

  // Memory bootstrap — load persisted memories on mount so panel is never empty
  useEffect(() => {
    fetch("/api/lyra/memory")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { memories?: Array<{ type: string; content: string; confidence: number; symbol?: string; createdAt?: string }> } | null) => {
        if (data?.memories?.length) {
          setMemories(
            data.memories.slice(0, 14).map((m) => ({
              type: m.type,
              content: m.content,
              confidence: m.confidence,
              symbol: m.symbol,
              ts: m.createdAt ?? "",
            })),
          );
        }
      })
      .catch(() => { /* agent offline at load time — SSE will fill in later */ });
  }, []);

  // SSE
  useEffect(() => {
    const es = new EventSource("/api/lyra/stream");

    es.onopen  = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as {
          type: EventType;
          content?: string;
          data?: Record<string, unknown>;
        };

        if (msg.type === "error" && msg.content?.toLowerCase().includes("offline")) {
          setConnected(false);
          return;
        }

        setConnected(true);

        // Positions + balance — broadcast at cycle start and after fills
        if (
          (msg.type === "tool_result" || msg.type === "scan") &&
          Array.isArray(msg.data?.positions)
        ) {
          setPositions(msg.data.positions as Position[]);
        }
        if (
          (msg.type === "tool_result" || msg.type === "scan") &&
          typeof msg.data?.accountValue === "number"
        ) {
          setAccountValue(msg.data.accountValue as number);
          if (typeof msg.data?.availableMargin === "number") setAvailableMargin(msg.data.availableMargin as number);
          else if (typeof msg.data?.withdrawable === "number") setAvailableMargin(msg.data.withdrawable as number);
          if (msg.type === "scan" && typeof msg.data?.hlMarginStatus === "string") {
            setHlMarginStatus(msg.data.hlMarginStatus as "ok" | "not_configured" | "fetch_failed");
            setHlMarginError(typeof msg.data.hlMarginError === "string" ? msg.data.hlMarginError : null);
          }
        }
        // Memories — populated at cycle start (scan) and on write_memory
        if (msg.type === "scan" && Array.isArray(msg.data?.memories)) {
          const mems = (msg.data.memories as Array<{ type: string; content: string; confidence: number; symbol?: string; createdAt?: string }>)
            .map((m) => ({ type: m.type, content: m.content, confidence: m.confidence, symbol: m.symbol, ts: m.createdAt ?? "" }));
          setMemories(mems.slice(0, 14));
        }
        if (msg.type === "tool_result" && Array.isArray(msg.data?.memories)) {
          const mems = (msg.data.memories as Array<{ type: string; content: string; confidence: number; symbol?: string; createdAt?: string }>)
            .map((m) => ({ type: m.type, content: m.content, confidence: m.confidence, symbol: m.symbol, ts: m.createdAt ?? "" }));
          setMemories(mems.slice(0, 14));
        }
        if (msg.type === "tool_result" && Array.isArray(msg.data?.markets)) {
          const arr = msg.data.markets as Array<{ symbol: string; mark: number; "15m"?: { trend?: string } }>;
          setMarkets(
            arr.map((m) => ({ symbol: m.symbol, mark: m.mark, trend: m["15m"]?.trend })),
          );
          // Append marks to the rolling trail (cap at 64 ticks per symbol).
          setTrail((prev) => {
            const next = { ...prev };
            for (const m of arr) {
              const list = next[m.symbol] ? [...next[m.symbol]] : [];
              list.push(m.mark);
              next[m.symbol] = list.slice(-64);
            }
            return next;
          });
        }
        if (msg.type === "tool_result" && Array.isArray(msg.data?.news)) {
          setNews(msg.data.news as NewsHeadline[]);
        }
        if (msg.type === "tool_result" && Array.isArray(msg.data?.funding)) {
          setFunding(msg.data.funding as FundingTick[]);
        }
        if (msg.type === "tool_result" && msg.data?.fearGreed) {
          setFearGreed(msg.data.fearGreed as FearGreed);
        }
        if (msg.type === "scan" && msg.data?.survival) {
          setSurvival(msg.data.survival as Survival);
        }
        if (msg.type === "memory" && msg.data?.lesson) {
          const l = msg.data.lesson as MemoryLesson;
          setMemories((prev) => [l, ...prev].slice(0, 14));
        }
        if (msg.type === "scan" && msg.content?.includes("Scan #")) {
          setScanCount((n) => n + 1);
        }

        push({ type: msg.type, content: msg.content ?? "", data: msg.data });
      } catch { /* noop */ }
    };

    return () => es.close();
  }, [push]);

  const onFeedScroll = () => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    atBottomRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };
  useEffect(() => {
    if (atBottomRef.current && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [feed]);

  const cycles = useMemo(() => groupIntoCycles(feed), [feed]);
  const mind = useMemo(() => deriveMindState(feed), [feed]);
  const uptime = useMemo(() => formatUptime(now - bootedAt), [now, bootedAt]);

  return (
    <div
      className="flex h-screen w-full select-none flex-col overflow-hidden"
      style={{
        background: C.bg,
        color: C.ink,
        fontFamily:
          "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        fontFeatureSettings: '"ss01", "cv11", "tnum"',
      }}
    >
      <Aurora hue={mind.hue} />
      <Keyframes />

      {/* ── Top bar ────────────────────────────────────────────── */}
      <header
        className="relative z-10 flex h-12 shrink-0 items-center justify-between px-6"
        style={{ borderBottom: `1px solid ${C.hairline}` }}
      >
        <div className="flex items-center gap-6">
          <span className="text-[13px] font-semibold tracking-[0.32em]" style={{ color: C.ink }}>
            LYRA
          </span>
          <span
            className="hidden text-[10px] tracking-[0.22em] sm:block"
            style={{ color: C.inkDim }}
          >
            SOVEREIGN AUTONOMOUS ECONOMIC AGENT
          </span>
        </div>

        <div className="flex items-center gap-5 text-[10px]" style={{ color: C.inkSoft }}>
          {agent?.testnet && (
            <span
              className="rounded-sm px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.2em]"
              style={{
                color: C.gold,
                background: "rgba(229,192,123,0.06)",
                border: `1px solid rgba(229,192,123,0.22)`,
              }}
            >
              TESTNET
            </span>
          )}
          <Stat k="model"   v={modelLabel(agent?.model)} />
          <Stat k="uptime"  v={uptime} />
          <Stat k="scans"   v={String(scanCount)} />
          <div className="flex items-center gap-2">
            <Dot color={connected ? C.emerald : C.rose} pulse={connected} />
            <span
              className="text-[10px] font-semibold tracking-[0.18em]"
              style={{ color: connected ? C.emerald : C.rose }}
            >
              {connected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1">

        {/* ── Left rail ─────────────────────────────────────── */}
        <aside
          className="flex w-[244px] shrink-0 flex-col"
          style={{ borderRight: `1px solid ${C.hairline}` }}
        >
          <Section label="SURVIVAL">
            <div className="flex items-center gap-4 px-5 py-4">
              <Pulse hue={mind.hue} state={mind.state} intervalMs={agent?.scanIntervalMs ?? 30_000} />
              <div className="flex flex-1 flex-col">
                <span
                  className="text-[10px] font-semibold tracking-[0.28em]"
                  style={{ color: mind.hue }}
                >
                  {mind.state}
                </span>
                <span className="mt-1 text-[10px]" style={{ color: C.inkDim }}>
                  cycle {agent?.scanIntervalMs ? `${agent.scanIntervalMs / 1000}s` : "—"}
                </span>
              </div>
            </div>
            {survival && <SurvivalPanel s={survival} />}
          </Section>

          <Section label="MARKETS" right={`${marketsLive.length}`}>
            <div className="space-y-2 px-5 py-3.5">
              {(marketsLive.length
                ? marketsLive
                : [{ symbol: "SOL" }, { symbol: "BTC" }, { symbol: "ETH" }]
              ).map((m) => (
                <MarketRow
                  key={m.symbol}
                  symbol={m.symbol}
                  mark={"mark" in m ? m.mark : undefined}
                  trend={"trend" in m ? m.trend : undefined}
                  trail={trail[m.symbol] ?? []}
                />
              ))}
            </div>
          </Section>

          {(fearGreed || funding.length > 0) && (
            <Section label="SENTIMENT">
              <div className="space-y-3 px-5 py-3.5">
                {fearGreed && <FearGreedMeter fg={fearGreed} />}
                {funding.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div
                      className="text-[8.5px] tracking-[0.22em]"
                      style={{ color: C.inkFaint }}
                    >
                      FUNDING (8H)
                    </div>
                    {funding.map((f) => (
                      <FundingRow key={f.symbol} f={f} />
                    ))}
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section label="DNA">
            <div className="space-y-2 px-5 py-3.5">
              <Row
                k="balance"
                v={accountValue !== null ? fmtUsd(accountValue) : "—"}
                color={accountValue !== null && accountValue < 50 ? C.rose : undefined}
              />
              <Row
                k="available"
                v={availableMargin !== null ? fmtUsd(availableMargin) : "—"}
                color={availableMargin !== null && availableMargin < 20 ? C.rose : availableMargin !== null && availableMargin < 100 ? C.amber : undefined}
              />
              <Row k="max position"   v={agent ? fmtUsd(agent.constraints.maxPositionUsd) : "—"} />
              <Row k="max leverage"   v={agent ? `${agent.constraints.maxLeverage}×` : "—"} />
              <Row k="max concurrent" v={agent ? String(agent.constraints.maxPositions) : "—"} />
              <Row k="wallet"         v={shortAddress(agent?.hlAddress ?? null)} dim />
              {(hlMarginStatus === "not_configured" || hlMarginStatus === "fetch_failed") && (
                <div
                  className="rounded-md px-2 py-2 text-[9px] leading-snug"
                  style={{
                    color: C.rose,
                    background: `${C.rose}12`,
                    border: `1px solid ${C.hairline}`,
                  }}
                >
                  {hlMarginStatus === "not_configured" ? (
                    <>
                      <span className="font-semibold">Wallet not wired.</span>{" "}
                      Set <span className="font-mono">LYRA_HL_ADDRESS</span> (master) and{" "}
                      <span className="font-mono">LYRA_HL_PRIVATE_KEY</span> (API signer). Mainnet:{" "}
                      <span className="font-mono">LYRA_HL_TESTNET=false</span>.
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">Balance fetch failed.</span>{" "}
                      {hlMarginError ?? "Check network, address, and testnet vs mainnet."}
                    </>
                  )}
                </div>
              )}
            </div>
          </Section>

          <div className="flex-1" />
        </aside>

        {/* ── Center: cycle stream ────────────────────────── */}
        <main className="flex min-h-0 flex-1 flex-col">
          <Section
            label="CONSCIOUSNESS"
            right={cycles.length === 0 ? undefined : `${cycles.length} cycles`}
          >
            <div
              ref={feedRef}
              onScroll={onFeedScroll}
              className="min-h-0 flex-1 overflow-y-auto"
              style={{ scrollbarWidth: "thin" }}
            >
              {cycles.length === 0 ? (
                <EmptyMind />
              ) : (
                <div className="mx-auto max-w-[760px] px-10 py-8">
                  {cycles.map((c, i) => (
                    <CycleBlock
                      key={c.id}
                      cycle={c}
                      isCurrent={i === cycles.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </Section>
        </main>

        {/* ── Right rail ──────────────────────────────────── */}
        <aside
          className="flex w-[300px] shrink-0 flex-col"
          style={{ borderLeft: `1px solid ${C.hairline}` }}
        >
          <Section
            label="POSITIONS"
            right={`${positionsLive.length} / ${agent?.constraints.maxPositions ?? 3}`}
          >
            <div className="px-5 py-3.5">
              {positionsLive.length === 0 ? (
                <Empty text="No open positions" />
              ) : (
                <div className="space-y-2">
                  {positionsLive.map((p) => <PositionCard key={p.symbol} p={p} />)}
                </div>
              )}
            </div>
          </Section>

          {news.length > 0 && (
            <Section label="HEADLINES" right={`${news.length}`}>
              <div className="space-y-2.5 px-5 py-3.5">
                {news.slice(0, 6).map((n, i) => (
                  <NewsRow key={i} n={n} />
                ))}
              </div>
            </Section>
          )}

          <Section label="MEMORY" right={`${memories.length}`} grow>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3.5">
              {memories.length === 0 ? (
                <Empty text="No memories yet" />
              ) : (
                <div className="space-y-3.5">
                  {memories.map((m, i) => <MemoryItem key={i} m={m} />)}
                </div>
              )}
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
}

// ─── Cycle block ─────────────────────────────────────────────────────────────

function CycleBlock({ cycle, isCurrent }: { cycle: Cycle; isCurrent: boolean }) {
  const opacity = isCurrent ? 1 : 0.55;
  return (
    <article
      className="relative mb-12 last:mb-4"
      style={{ opacity, transition: "opacity 0.6s ease-out" }}
    >
      {/* Cycle header */}
      <div className="mb-4 flex items-baseline gap-3">
        <span
          className="text-[10px] font-semibold tabular-nums tracking-[0.28em]"
          style={{ color: C.inkDim }}
        >
          {cycle.number !== null ? `CYCLE ${String(cycle.number).padStart(3, "0")}` : "BOOT"}
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: C.inkFaint }}>
          {cycle.ts}
        </span>
        {cycle.markets && (
          <span
            className="ml-auto truncate text-[10px] tabular-nums"
            style={{ color: C.inkDim, fontFamily: 'ui-monospace, "SF Mono", monospace' }}
          >
            {cycle.markets}
          </span>
        )}
      </div>

      {/* Prose: Lyra's actual thinking, rendered as markdown */}
      {cycle.thought && (
        <div className={isCurrent ? "lyra-cursor" : ""}>
          <Markdown text={cycle.thought} color={C.ink} />
        </div>
      )}

      {/* Decisions/executions stand out */}
      {cycle.decisions.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {cycle.decisions.map((d, i) => (
            <div
              key={i}
              className="flex items-baseline gap-3 rounded-sm px-3 py-2"
              style={{
                background:
                  d.kind === "confirmed"
                    ? "rgba(91,200,146,0.06)"
                    : d.kind === "closed"
                    ? "rgba(224,117,112,0.06)"
                    : "rgba(244,163,64,0.06)",
                border: `1px solid ${
                  d.kind === "confirmed"
                    ? "rgba(91,200,146,0.25)"
                    : d.kind === "closed"
                    ? "rgba(224,117,112,0.25)"
                    : "rgba(244,163,64,0.25)"
                }`,
              }}
            >
              <span
                className="text-[9px] font-semibold tracking-[0.22em]"
                style={{
                  color:
                    d.kind === "confirmed"
                      ? C.emerald
                      : d.kind === "closed"
                      ? C.rose
                      : C.amber,
                }}
              >
                {d.kind.toUpperCase()}
              </span>
              <span className="flex-1 text-[12px]" style={{ color: C.ink }}>
                {d.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Errors as system-style row */}
      {cycle.errors.length > 0 && (
        <div className="mt-4 space-y-1">
          {cycle.errors.map((e, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-sm px-3 py-2 text-[11px]"
              style={{
                background: "rgba(224,117,112,0.04)",
                border: `1px solid rgba(224,117,112,0.18)`,
                color: C.rose,
              }}
            >
              <span className="text-[9px] font-semibold tracking-[0.22em] opacity-80">FAULT</span>
              <span className="flex-1 leading-snug" style={{ color: "#F1A09B" }}>
                {e.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tools used — tiny chips, not spam */}
      {cycle.tools.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span
            className="text-[9px] tracking-[0.2em]"
            style={{ color: C.inkFaint }}
          >
            TOOLS
          </span>
          {cycle.tools.map((t, i) => (
            <ToolChip key={i} t={t} />
          ))}
        </div>
      )}
    </article>
  );
}

function ToolChip({ t }: { t: { name: string; status: "running" | "ok" | "fail" } }) {
  const color =
    t.status === "ok" ? C.teal : t.status === "fail" ? C.rose : C.inkSoft;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[9.5px]"
      style={{
        color,
        background: `${color}0a`,
        border: `1px solid ${color}33`,
        fontFamily: 'ui-monospace, "SF Mono", monospace',
        letterSpacing: "0.04em",
      }}
    >
      {t.status === "running" && <Spinner color={color} />}
      {t.name}
    </span>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <span
      className="inline-block rounded-full"
      style={{
        width: 6,
        height: 6,
        border: `1px solid ${color}55`,
        borderTopColor: color,
        animation: "lyra-spin 0.9s linear infinite",
      }}
    />
  );
}

// ─── Side instruments ────────────────────────────────────────────────────────

function Section({
  label,
  right,
  children,
  grow,
}: {
  label: string;
  right?: string;
  children: React.ReactNode;
  grow?: boolean;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col ${grow ? "flex-1" : ""}`}
      style={{ borderBottom: `1px solid ${C.hairline}` }}
    >
      <header
        className="flex h-9 shrink-0 items-center justify-between px-5"
        style={{ borderBottom: `1px solid ${C.hairline}` }}
      >
        <span
          className="text-[9px] font-semibold tracking-[0.28em]"
          style={{ color: C.inkDim }}
        >
          {label}
        </span>
        {right && (
          <span
            className="text-[9px] tabular-nums tracking-[0.1em]"
            style={{ color: C.inkFaint }}
          >
            {right}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span style={{ color: C.inkFaint }}>{k}</span>
      <span className="tabular-nums" style={{ color: C.inkSoft }}>{v}</span>
    </span>
  );
}

function Row({ k, v, dim, color }: { k: string; v: string; dim?: boolean; color?: string }) {
  return (
    <div className="flex items-baseline justify-between text-[10.5px]">
      <span style={{ color: C.inkDim }}>{k}</span>
      <span className="tabular-nums" style={{ color: color ?? (dim ? C.inkSoft : C.ink) }}>{v}</span>
    </div>
  );
}

function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span className="relative inline-flex" style={{ width: 6, height: 6 }}>
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}88` }}
      />
      {pulse && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: color,
            animation: "lyra-ping 2.4s cubic-bezier(0,0,.2,1) infinite",
          }}
        />
      )}
    </span>
  );
}

function Pulse({
  hue,
  state,
  intervalMs,
}: {
  hue: string;
  state: string;
  intervalMs: number;
}) {
  const breathing = state !== "RESTING" && state !== "FAULT";
  return (
    <div className="relative" style={{ width: 56, height: 56 }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: `1px solid ${hue}33`,
          animation: breathing ? "lyra-breathe 4s ease-in-out infinite" : undefined,
        }}
      />
      <div
        className="absolute inset-2 rounded-full"
        style={{
          border: `1px dashed ${hue}55`,
          animation:
            state === "SCANNING"
              ? `lyra-spin ${Math.max(intervalMs / 1000, 6)}s linear infinite`
              : undefined,
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          inset: 18,
          background: `radial-gradient(circle at 35% 30%, ${hue}DD, ${hue}55 60%, transparent 75%)`,
          filter: "blur(0.4px)",
          animation: breathing ? "lyra-glow 2.8s ease-in-out infinite" : undefined,
        }}
      />
    </div>
  );
}

function SurvivalPanel({ s }: { s: Survival }) {
  const pnlColor = s.pnlToday >= 0 ? C.emerald : C.rose;
  const targetPct = Math.max(0, Math.min(100, (s.pnlToday / s.dailyTarget) * 100));
  const targetColor = s.hitTargetToday ? C.emerald : s.pnlToday > 0 ? C.amber : C.rose;
  const runwayColor =
    s.runwayDays === null ? C.inkDim :
    s.runwayDays < 7  ? C.rose :
    s.runwayDays < 30 ? C.amber :
                        C.emerald;

  return (
    <div
      className="space-y-3 px-5 py-4"
      style={{ borderTop: `1px solid ${C.hairline}` }}
    >
      {/* Today's PnL vs quota */}
      <div>
        <div className="flex items-baseline justify-between">
          <span
            className="text-[8.5px] tracking-[0.22em]"
            style={{ color: C.inkFaint }}
          >
            TODAY · QUOTA
          </span>
          <span
            className="text-[10px] font-semibold tabular-nums"
            style={{ color: pnlColor }}
          >
            {s.pnlToday >= 0 ? "+" : ""}${s.pnlToday.toFixed(2)}
            <span className="ml-1.5 text-[9px]" style={{ color: C.inkDim }}>
              / ${s.dailyTarget}
            </span>
          </span>
        </div>
        <div
          className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full"
          style={{ background: C.hairline }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${targetPct}%`,
              background: targetColor,
            }}
          />
        </div>
      </div>

      {/* Runway */}
      <div className="flex items-baseline justify-between">
        <span className="text-[8.5px] tracking-[0.22em]" style={{ color: C.inkFaint }}>
          RUNWAY
        </span>
        <span
          className="text-[10px] font-semibold tabular-nums"
          style={{ color: runwayColor }}
        >
          {s.runwayDays === null
            ? "—"
            : s.runwayDays > 365
            ? "365+ d"
            : `${s.runwayDays.toFixed(1)} d`}
          <span className="ml-1.5 text-[9px]" style={{ color: C.inkDim }}>
            @ ${s.computeCostDaily.toFixed(0)}/d burn
          </span>
        </span>
      </div>

      {/* Trade record */}
      <div className="flex items-baseline justify-between">
        <span className="text-[8.5px] tracking-[0.22em]" style={{ color: C.inkFaint }}>
          RECORD
        </span>
        <span
          className="text-[10px] tabular-nums"
          style={{ color: C.ink }}
        >
          {s.wins}W / {s.losses}L
          {s.winRate !== null && (
            <span className="ml-1.5 text-[9px]" style={{ color: C.inkDim }}>
              {(s.winRate * 100).toFixed(0)}% wr
            </span>
          )}
        </span>
      </div>

      {/* Age */}
      <div className="flex items-baseline justify-between">
        <span className="text-[8.5px] tracking-[0.22em]" style={{ color: C.inkFaint }}>
          AGE
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: C.inkSoft }}>
          {formatAgentAge(s.ageDays)}
        </span>
      </div>
    </div>
  );
}

function MarketRow({
  symbol,
  mark,
  trend,
  trail,
}: {
  symbol: string;
  mark?: number;
  trend?: string;
  trail: number[];
}) {
  const trendColor = trend === "up" ? C.emerald : trend === "down" ? C.rose : C.inkDim;
  const sparkColor =
    trail.length > 1 && trail[trail.length - 1] >= trail[0] ? C.emerald : C.rose;
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-[10.5px]" style={{ color: C.inkSoft }}>
        {symbol}
      </span>
      <Sparkline values={trail} color={trail.length < 2 ? C.inkFaint : sparkColor} />
      <span
        className="ml-auto flex items-baseline gap-1.5 text-[10.5px] tabular-nums"
        style={{ color: mark ? C.ink : C.inkFaint }}
      >
        <span style={{ color: trendColor, fontSize: 7 }}>
          {trend === "up" ? "▲" : trend === "down" ? "▼" : "·"}
        </span>
        {mark
          ? mark.toLocaleString("en-US", { maximumFractionDigits: mark < 10 ? 4 : 2 })
          : "—"}
      </span>
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const width = 56;
  const height = 16;
  if (values.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={C.inkFaint}
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`)
    .join(" ");
  return (
    <svg width={width} height={height} aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FearGreedMeter({ fg }: { fg: FearGreed }) {
  const v = Math.max(0, Math.min(100, fg.value));
  const hue =
    v <= 24 ? C.rose :
    v <= 44 ? C.amber :
    v <= 55 ? C.inkSoft :
    v <= 74 ? C.gold :
              C.emerald;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[8.5px] tracking-[0.22em]" style={{ color: C.inkFaint }}>
          FEAR · GREED
        </span>
        <span
          className="text-[10px] font-semibold tabular-nums tracking-wide"
          style={{ color: hue }}
        >
          {v}
          {fg.delta !== null && fg.delta !== undefined && (
            <span className="ml-1.5 text-[9px]" style={{ color: C.inkDim }}>
              {fg.delta >= 0 ? "+" : ""}
              {fg.delta}
            </span>
          )}
        </span>
      </div>
      <div
        className="relative h-[3px] w-full overflow-hidden rounded-full"
        style={{ background: C.hairline }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${v}%`,
            background: `linear-gradient(90deg, ${C.rose}, ${C.amber}, ${C.gold}, ${C.emerald})`,
            transition: "width 0.6s ease-out",
          }}
        />
        <div
          className="absolute inset-y-[-2px]"
          style={{
            left: `calc(${v}% - 1px)`,
            width: 2,
            background: hue,
            boxShadow: `0 0 4px ${hue}`,
          }}
        />
      </div>
      <div className="text-[10px]" style={{ color: C.inkDim }}>
        {fg.classification}
      </div>
    </div>
  );
}

function FundingRow({ f }: { f: FundingTick }) {
  const positive = f.rate >= 0;
  const color = Math.abs(f.annualizedPct) > 50 ? C.amber : positive ? C.inkSoft : C.teal;
  return (
    <div className="flex items-baseline justify-between text-[10px] tabular-nums">
      <span style={{ color: C.inkSoft }}>{f.symbol}</span>
      <span style={{ color }}>
        {(f.rate * 100).toFixed(4)}%
        <span className="ml-1.5 text-[9px]" style={{ color: C.inkDim }}>
          {f.annualizedPct >= 0 ? "+" : ""}
          {f.annualizedPct.toFixed(0)}% APR
        </span>
      </span>
    </div>
  );
}

function NewsRow({ n }: { n: NewsHeadline }) {
  const age = newsAge(n.publishedAt);
  return (
    <a
      href={n.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block transition-opacity hover:opacity-80"
    >
      <div className="flex items-baseline gap-2 text-[8.5px] tracking-[0.18em]">
        <span style={{ color: C.teal }}>{n.source.toUpperCase()}</span>
        <span className="ml-auto tabular-nums" style={{ color: C.inkFaint }}>
          {age}
        </span>
      </div>
      <p
        className="mt-1 text-[11px] leading-[1.4]"
        style={{ color: C.inkSoft }}
      >
        {n.title}
      </p>
    </a>
  );
}

function newsAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function PositionCard({ p }: { p: Position }) {
  const dirColor = p.direction === "long" ? C.emerald : C.rose;
  const pnlColor = p.unrealizedPnl >= 0 ? C.emerald : C.rose;
  return (
    <div
      className="rounded-sm p-3"
      style={{
        background: "rgba(255,255,255,0.014)",
        border: `1px solid ${C.hairline}`,
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-semibold tracking-wide" style={{ color: C.ink }}>
          {p.symbol}
        </span>
        <span
          className="text-[9px] font-semibold tracking-[0.22em]"
          style={{ color: dirColor }}
        >
          {p.direction.toUpperCase()} · {p.leverage}×
        </span>
      </div>
      <div className="mt-1.5 text-[10px] tabular-nums" style={{ color: C.inkDim }}>
        {p.size.toFixed(4)} @ {fmtUsd(p.entryPrice)}
        {p.liveMark !== undefined && (
          <span className="ml-1.5" style={{ color: C.teal }}>
            mid {fmtUsd(p.liveMark)}
          </span>
        )}
      </div>
      <div
        className="mt-2 text-[12px] font-semibold tabular-nums"
        style={{ color: pnlColor }}
      >
        {p.unrealizedPnl >= 0 ? "+" : ""}
        {fmtUsd(p.unrealizedPnl)}
      </div>
    </div>
  );
}

function MemoryItem({ m }: { m: MemoryLesson }) {
  const conf = Math.round(m.confidence * 100);
  return (
    <div className="pl-3" style={{ borderLeft: `2px solid ${C.violet}55` }}>
      <div className="flex items-baseline gap-2 text-[9px] font-semibold tracking-[0.18em]">
        <span style={{ color: C.violet }}>{m.type.toUpperCase()}</span>
        {m.symbol && <span style={{ color: C.inkDim }}>· {m.symbol}</span>}
        <span className="ml-auto tabular-nums" style={{ color: C.inkDim }}>
          {conf}%
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-[1.55]" style={{ color: C.inkSoft }}>
        {m.content}
      </p>
    </div>
  );
}

function EmptyMind() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="rounded-full"
          style={{
            width: 8,
            height: 8,
            background: C.inkDim,
            animation: "lyra-glow 2.8s ease-in-out infinite",
          }}
        />
        <span className="text-[10px] tracking-[0.28em]" style={{ color: C.inkDim }}>
          AWAITING SIGNAL
        </span>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <span className="text-[10.5px]" style={{ color: C.inkFaint }}>
      {text}
    </span>
  );
}

function Aurora({ hue }: { hue: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{
        background:
          `radial-gradient(60% 40% at 18% 25%, ${hue}10 0%, transparent 60%),` +
          `radial-gradient(45% 35% at 85% 80%, ${hue}08 0%, transparent 60%)`,
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
        0%, 100% { opacity: .55; }
        50%      { opacity: 1;   }
      }
      @keyframes lyra-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      @keyframes lyra-ping {
        0%   { transform: scale(1); opacity: .6; }
        80%  { transform: scale(2.4); opacity: 0; }
        100% { transform: scale(2.4); opacity: 0; }
      }
      @keyframes lyra-blink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
      .lyra-cursor::after {
        content: "▍";
        margin-left: 4px;
        color: ${C.amber};
        animation: lyra-blink 1.05s steps(1) infinite;
        font-size: 11px;
      }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${C.hairBold}; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #3a3835; }
    `}</style>
  );
}

function formatUptime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m${String(ss).padStart(2, "0")}s`;
  return `${ss}s`;
}
