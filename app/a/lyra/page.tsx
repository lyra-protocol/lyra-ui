"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

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

// ─── Design tokens ───────────────────────────────────────────────────────────

const C = {
  bg:        "#050505",
  ink:       "#ECECE6",
  inkSoft:   "#A8A69E",
  inkDim:    "#5A5852",
  inkFaint:  "#2D2C28",
  hairline:  "#1A1A18",
  hairBold:  "#2A2926",
  amber:     "#F4A340",   // active / thinking
  emerald:   "#5BC892",   // confirmed / long
  rose:      "#E07570",   // error / short
  teal:      "#7AC9C0",   // tool / data
  violet:    "#B59AE8",   // memory
  gold:      "#E5C07B",   // decision / signal
};

// One row of meta per event type. Single-source-of-truth for color + label.
const TYPE_META: Record<EventType, { color: string; label: string; weight: "loud" | "soft" | "ghost" }> = {
  wake:        { color: C.inkDim,  label: "WAKE",   weight: "ghost" },
  scan:        { color: C.inkSoft, label: "SCAN",   weight: "soft"  },
  thought:     { color: C.ink,     label: "·",      weight: "loud"  },
  tool_call:   { color: C.teal,    label: "CALL",   weight: "loud"  },
  tool_result: { color: C.teal,    label: "RECV",   weight: "soft"  },
  signal:      { color: C.gold,    label: "SIGNAL", weight: "loud"  },
  decision:    { color: C.amber,   label: "DECIDE", weight: "loud"  },
  execution:   { color: C.amber,   label: "EXEC",   weight: "loud"  },
  confirmed:   { color: C.emerald, label: "FILL",   weight: "loud"  },
  monitoring:  { color: C.inkDim,  label: "MON",    weight: "ghost" },
  closed:      { color: C.rose,    label: "CLOSE",  weight: "loud"  },
  memory:      { color: C.violet,  label: "MEM",    weight: "soft"  },
  sleep:       { color: C.inkDim,  label: "SLEEP",  weight: "ghost" },
  error:       { color: C.rose,    label: "ERR",    weight: "loud"  },
};

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

// Derive Lyra's instantaneous mind state from the most recent few events.
function deriveMindState(feed: FeedEntry[]): {
  state: "BOOTING" | "SCANNING" | "THINKING" | "ACTING" | "RESTING" | "FAULT";
  hue: string;
} {
  if (feed.length === 0) return { state: "BOOTING", hue: C.inkSoft };
  const last = feed[feed.length - 1];
  if (last.type === "error") return { state: "FAULT", hue: C.rose };
  if (last.type === "execution" || last.type === "confirmed" || last.type === "closed")
    return { state: "ACTING", hue: C.amber };
  if (last.type === "tool_call" || last.type === "tool_result")
    return { state: "SCANNING", hue: C.teal };
  if (last.type === "thought" || last.type === "decision" || last.type === "signal")
    return { state: "THINKING", hue: C.amber };
  if (last.type === "sleep") return { state: "RESTING", hue: C.inkSoft };
  return { state: "SCANNING", hue: C.teal };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LyraWatchPage() {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [memories, setMemories] = useState<MemoryLesson[]>([]);
  const [markets, setMarkets] = useState<MarketTick[]>([]);
  const [agent, setAgent] = useState<AgentStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [bootedAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());

  const feedRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const esRef = useRef<EventSource | null>(null);

  // ── Tick (drives uptime, breathing, etc.)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Append helper — coalesces consecutive thought tokens
  const push = useCallback((entry: Omit<FeedEntry, "id" | "ts" | "tsMs">) => {
    setFeed((prev) => {
      if (
        entry.type === "thought" &&
        prev.length > 0 &&
        prev[prev.length - 1].type === "thought"
      ) {
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), { ...last, content: last.content + entry.content }];
      }
      return [
        ...prev.slice(-400),
        { ...entry, id: nextId(), ts: tsNow(), tsMs: Date.now() },
      ];
    });
  }, []);

  // ── Status poll
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/lyra/status");
        if (res.ok) setAgent(await res.json() as AgentStatus);
      } catch { /* offline */ }
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, []);

  // ── SSE
  useEffect(() => {
    const es = new EventSource("/api/lyra/stream");
    esRef.current = es;

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

        if (msg.type === "tool_result" && Array.isArray(msg.data?.positions)) {
          setPositions(msg.data.positions as Position[]);
        }
        if (msg.type === "tool_result" && Array.isArray(msg.data?.markets)) {
          const arr = msg.data.markets as Array<{ symbol: string; mark: number; "15m"?: { trend?: string } }>;
          setMarkets(
            arr.map((m) => ({ symbol: m.symbol, mark: m.mark, trend: m["15m"]?.trend })),
          );
        }
        if (msg.type === "memory" && msg.data?.lesson) {
          const l = msg.data.lesson as MemoryLesson;
          setMemories((prev) => [l, ...prev].slice(0, 14));
        }
        if (msg.type === "scan") setScanCount((n) => n + 1);

        push({ type: msg.type, content: msg.content ?? "", data: msg.data });
      } catch { /* noop */ }
    };

    return () => es.close();
  }, [push]);

  // ── Auto-scroll feed unless user scrolled up
  const onFeedScroll = () => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    atBottomRef.current = scrollHeight - scrollTop - clientHeight < 40;
  };
  useEffect(() => {
    if (atBottomRef.current && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [feed]);

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

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header
        className="relative z-10 flex h-12 shrink-0 items-center justify-between px-6"
        style={{ borderBottom: `1px solid ${C.hairline}` }}
      >
        <div className="flex items-center gap-6">
          <span
            className="text-[13px] font-semibold tracking-[0.32em]"
            style={{ color: C.ink }}
          >
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

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1">

        {/* ── Left rail ─────────────────────────────────────────── */}
        <aside
          className="flex w-[244px] shrink-0 flex-col"
          style={{ borderRight: `1px solid ${C.hairline}` }}
        >
          {/* Mind */}
          <Section label="MIND">
            <div className="flex items-center gap-4 px-5 py-5">
              <Pulse hue={mind.hue} state={mind.state} intervalMs={agent?.scanIntervalMs ?? 30_000} />
              <div className="flex flex-col">
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
          </Section>

          {/* Markets ticker */}
          <Section label="MARKETS" right={`${markets.length}`}>
            <div className="space-y-1 px-5 py-3.5">
              {(markets.length ? markets : [{ symbol: "SOL" }, { symbol: "BTC" }, { symbol: "ETH" }]).map((m) => (
                <MarketRow key={m.symbol} symbol={m.symbol} mark={"mark" in m ? m.mark : undefined} trend={"trend" in m ? m.trend : undefined} />
              ))}
            </div>
          </Section>

          {/* DNA */}
          <Section label="DNA">
            <div className="space-y-2 px-5 py-3.5">
              <Row k="max position"  v={agent ? fmtUsd(agent.constraints.maxPositionUsd) : "—"} />
              <Row k="max leverage"  v={agent ? `${agent.constraints.maxLeverage}×` : "—"} />
              <Row k="max concurrent" v={agent ? String(agent.constraints.maxPositions) : "—"} />
              <Row k="wallet"        v={shortAddress(agent?.hlAddress ?? null)} dim />
            </div>
          </Section>

          <div className="flex-1" />
        </aside>

        {/* ── Center: thought stream ───────────────────────────── */}
        <main className="flex min-h-0 flex-1 flex-col">
          <Section label="THOUGHT STREAM" right={`${feed.length} events`}>
            <div
              ref={feedRef}
              onScroll={onFeedScroll}
              className="min-h-0 flex-1 overflow-y-auto px-8 py-5"
              style={{ scrollbarWidth: "thin" }}
            >
              {feed.length === 0 ? (
                <EmptyMind />
              ) : (
                <div className="flex flex-col gap-[3px]">
                  {feed.map((e, i) => (
                    <FeedRow
                      key={e.id}
                      entry={e}
                      isLast={i === feed.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </Section>
        </main>

        {/* ── Right rail ──────────────────────────────────────── */}
        <aside
          className="flex w-[300px] shrink-0 flex-col"
          style={{ borderLeft: `1px solid ${C.hairline}` }}
        >
          <Section
            label="POSITIONS"
            right={`${positions.length} / ${agent?.constraints.maxPositions ?? 3}`}
          >
            <div className="px-5 py-3.5">
              {positions.length === 0 ? (
                <Empty text="No open positions" />
              ) : (
                <div className="space-y-2">
                  {positions.map((p) => <PositionCard key={p.symbol} p={p} />)}
                </div>
              )}
            </div>
          </Section>

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

// ─── Sub-components ──────────────────────────────────────────────────────────

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

function Row({ k, v, dim }: { k: string; v: string; dim?: boolean }) {
  return (
    <div className="flex items-baseline justify-between text-[10.5px]">
      <span style={{ color: C.inkDim }}>{k}</span>
      <span
        className="tabular-nums"
        style={{ color: dim ? C.inkSoft : C.ink }}
      >
        {v}
      </span>
    </div>
  );
}

function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span
      className="relative inline-flex"
      style={{ width: 6, height: 6 }}
    >
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
      {/* outer ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: `1px solid ${hue}33`,
          animation: breathing ? "lyra-breathe 4s ease-in-out infinite" : undefined,
        }}
      />
      {/* mid ring (rotates slowly when SCANNING) */}
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
      {/* core */}
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

function MarketRow({
  symbol,
  mark,
  trend,
}: {
  symbol: string;
  mark?: number;
  trend?: string;
}) {
  const trendColor =
    trend === "up" ? C.emerald : trend === "down" ? C.rose : C.inkDim;
  return (
    <div className="flex items-baseline justify-between text-[10.5px] tabular-nums">
      <span style={{ color: C.inkSoft }}>{symbol}</span>
      <span className="flex items-baseline gap-2">
        <span style={{ color: trendColor, fontSize: 7 }}>
          {trend === "up" ? "▲" : trend === "down" ? "▼" : "•"}
        </span>
        <span style={{ color: mark ? C.ink : C.inkFaint }}>
          {mark
            ? mark.toLocaleString("en-US", { maximumFractionDigits: mark < 10 ? 4 : 2 })
            : "—"}
        </span>
      </span>
    </div>
  );
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
      <p
        className="mt-1.5 text-[11px] leading-[1.55]"
        style={{ color: C.inkSoft }}
      >
        {m.content}
      </p>
    </div>
  );
}

function FeedRow({ entry, isLast }: { entry: FeedEntry; isLast: boolean }) {
  const meta = TYPE_META[entry.type];
  const isThought = entry.type === "thought";
  const opacity =
    meta.weight === "ghost" ? 0.45 : meta.weight === "soft" ? 0.78 : 1;

  return (
    <div className="flex gap-4" style={{ opacity }}>
      <span
        className="w-[60px] shrink-0 pt-[2px] text-right text-[10px] tabular-nums"
        style={{ color: C.inkFaint }}
      >
        {entry.ts}
      </span>
      <span
        className="w-[50px] shrink-0 pt-[2px] text-right text-[9px] font-semibold tracking-[0.16em]"
        style={{ color: meta.color }}
      >
        {meta.label}
      </span>
      <span
        className={`flex-1 break-words text-[12px] leading-[1.65] ${isThought && isLast ? "lyra-cursor" : ""}`}
        style={{
          color: isThought ? C.ink : meta.color,
          fontFamily: isThought
            ? "Inter, ui-sans-serif, system-ui, sans-serif"
            : 'ui-monospace, "SF Mono", "JetBrains Mono", "Menlo", monospace',
          fontSize: isThought ? 12 : 11,
          letterSpacing: isThought ? 0 : "0.01em",
        }}
      >
        {entry.content}
      </span>
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
        <span
          className="text-[10px] tracking-[0.28em]"
          style={{ color: C.inkDim }}
        >
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
        font-size: 10px;
      }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${C.hairBold}; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #3a3835; }
    `}</style>
  );
}

// ─── Misc ───────────────────────────────────────────────────────────────────

function formatUptime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m${String(ss).padStart(2, "0")}s`;
  return `${ss}s`;
}
