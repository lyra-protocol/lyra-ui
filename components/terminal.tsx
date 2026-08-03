"use client";

import { useEffect, useRef, useState } from "react";
import {
  UNIVERSE,
  WS_URL,
  dayChange,
  fetchUniverse,
  formatPx,
  formatUsd,
  fundingAnnualPct,
  type AssetSnapshot,
} from "@/lib/venue";
import { fetchPainMap, type PainMap } from "@/lib/painmap";
import { ForcedFlow } from "@/components/forced-flow";
import { Activity } from "@/components/activity";

/**
 * The operations terminal.
 *
 * What Lyra can see, as she sees it. Live venue tape, the universe she watches,
 * and the Pain Map — the forced-flow structure reconstructed from enumerated
 * positions, which is the one view here that exists nowhere else.
 *
 * Everything on this screen is measured. Where a panel has no data it says so
 * and says why; nothing is animated to look busier than it is, because a
 * terminal that performs activity it is not doing is the exact failure the
 * grounding rule exists to prevent.
 */
export function Terminal() {
  const [asset, setAsset] = useState("BTC");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar />
      <UniverseStrip selected={asset} onSelect={setAsset} />
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 380px)",
          borderTop: "1px solid var(--rule)",
        }}
        className="terminal-grid"
      >
        <div style={{ borderRight: "1px solid var(--rule)", minWidth: 0 }}>
          <PainPanel asset={asset} />
          <Activity />
        </div>
        <Tape />
      </div>
      <style>{`
        @media (max-width: 900px) {
          .terminal-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function TopBar() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString().slice(11, 19) + "Z");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        height: 48,
        borderBottom: "1px solid var(--rule)",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <a href="/" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em" }}>
          LYRA
        </a>
        <span className="label">terminal</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* Honest status. She observes continuously; she does not yet trade. */}
        <Status />
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
          {now}
        </span>
        <a href="/mcp" className="label" style={{ color: "var(--ink-2)" }}>
          mcp
        </a>
      </div>
    </header>
  );
}

function Status() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span
        className="pulse"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--live)",
          display: "inline-block",
        }}
      />
      <span className="label" style={{ color: "var(--ink-2)" }}>
        observing
      </span>
    </div>
  );
}

/** The universe, as a selectable strip. */
function UniverseStrip({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (a: string) => void;
}) {
  const [assets, setAssets] = useState<AssetSnapshot[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () => fetchUniverse().then((a) => alive && setAssets(a)).catch(() => {});
    void load();
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="scroll-x" style={{ display: "flex", minHeight: 62 }}>
      {UNIVERSE.map((coin) => {
        const a = assets.find((x) => x.coin === coin);
        const chg = a ? dayChange(a) : 0;
        const active = coin === selected;
        return (
          <button
            key={coin}
            onClick={() => onSelect(coin)}
            style={{
              flex: "1 0 120px",
              textAlign: "left",
              padding: "10px 14px",
              border: "none",
              borderRight: "1px solid var(--rule)",
              borderBottom: active ? "2px solid var(--ink)" : "2px solid transparent",
              background: active ? "var(--rule-2)" : "var(--paper)",
              cursor: "pointer",
              font: "inherit",
              color: "inherit",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.02em" }}>{coin}</div>
            <div className="mono" style={{ fontSize: 13, marginTop: 2 }}>
              {a ? formatPx(a.markPx) : "—"}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 10.5,
                marginTop: 1,
                color: !a ? "var(--ink-3)" : chg >= 0 ? "var(--gain)" : "var(--loss)",
              }}
            >
              {a ? `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%` : ""}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** The Pain Map for the selected asset. The view nothing else has. */
function PainPanel({ asset }: { asset: string }) {
  const [map, setMap] = useState<PainMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const load = () =>
      fetchPainMap(asset)
        .then((m) => {
          if (!alive) return;
          setMap(m);
          setLoading(false);
        })
        .catch((e: Error) => {
          if (!alive) return;
          setError(e.message);
          setLoading(false);
        });
    void load();
    const id = setInterval(load, 20_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [asset]);

  return (
    <section style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="panel-head">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="label">pain map</span>
          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
            {asset} · positions enumerated from the venue
          </span>
        </div>
        {map && (
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            {map.positionsEnumerated.toLocaleString()} positions
            {map.coverage.fraction !== null &&
              ` · ${(map.coverage.fraction * 100).toFixed(1)}% of OI`}
          </span>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {loading ? (
          <Muted>Reading positions…</Muted>
        ) : error ? (
          <div>
            <Muted>The Pain Map is not reachable right now.</Muted>
            <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--ink-3)", maxWidth: 560 }}>
              It is reconstructed from a dataset only this project holds — Hyperliquid serves no
              position history, so it can only be built by watching continuously. Unlike the trade
              record, which lives on Arweave and needs nobody&rsquo;s permission to verify, this view
              depends on our collector being reachable.
            </p>
            <p className="mono" style={{ margin: "8px 0 0", fontSize: 10.5, color: "var(--ink-3)" }}>
              {error}
            </p>
          </div>
        ) : map ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 18,
                marginBottom: 20,
              }}
            >
              <Metric
                label="losing side"
                value={map.losingSide}
                tone={map.losingSide === "neither" ? undefined : "attention"}
              />
              <Metric
                label="crowd unrealised"
                value={formatUsd(map.aggregateUnrealizedPnlUsd)}
                tone={map.aggregateUnrealizedPnlUsd >= 0 ? "gain" : "loss"}
              />
              <Metric label="mean leverage" value={`${map.meanLeverage.toFixed(1)}x`} />
              <Metric
                label="concentration"
                value={`${(map.concentration * 100).toFixed(0)}%`}
                hint="largest single position"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
              <SideBar
                label="longs"
                count={map.longs.count}
                notional={map.longs.notionalUsd}
                pnl={map.longs.unrealizedPnlUsd}
                total={map.longs.notionalUsd + map.shorts.notionalUsd}
              />
              <SideBar
                label="shorts"
                count={map.shorts.count}
                notional={map.shorts.notionalUsd}
                pnl={map.shorts.unrealizedPnlUsd}
                total={map.longs.notionalUsd + map.shorts.notionalUsd}
              />
            </div>

            <ForcedFlow levels={map.forcedLevels} midPx={map.midPx} />
          </>
        ) : null}
      </div>
    </section>
  );
}

function SideBar({
  label,
  count,
  notional,
  pnl,
  total,
}: {
  label: string;
  count: number;
  notional: number;
  pnl: number;
  total: number;
}) {
  const share = total > 0 ? (notional / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="label">{label}</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
          {count.toLocaleString()}
        </span>
      </div>
      <div className="mono" style={{ fontSize: 15, marginTop: 3 }}>
        {formatUsd(notional)}
      </div>
      <div
        style={{
          height: 3,
          background: "var(--rule-2)",
          marginTop: 6,
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", inset: 0, width: `${share}%`, background: "var(--ink)" }} />
      </div>
      <div
        className="mono"
        style={{ fontSize: 11, marginTop: 5, color: pnl >= 0 ? "var(--gain)" : "var(--loss)" }}
      >
        {pnl >= 0 ? "+" : ""}
        {formatUsd(Math.abs(pnl)).replace("$", "$")} unrealised
      </div>
    </div>
  );
}

/** Live prints from the venue. */
function Tape() {
  const [prints, setPrints] = useState<
    { id: string; coin: string; px: string; sz: string; side: string; time: number }[]
  >([]);
  const [connected, setConnected] = useState(false);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      setConnected(true);
      for (const coin of UNIVERSE) {
        ws.send(JSON.stringify({ method: "subscribe", subscription: { type: "trades", coin } }));
      }
    };
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        if (msg.channel !== "trades" || !Array.isArray(msg.data)) return;
        const fresh = msg.data
          .filter((t: { tid: number }) => !seen.current.has(String(t.tid)))
          .map((t: { tid: number; coin: string; px: string; sz: string; side: string; time: number }) => {
            seen.current.add(String(t.tid));
            return { id: String(t.tid), coin: t.coin, px: t.px, sz: t.sz, side: t.side, time: t.time };
          });
        if (fresh.length) setPrints((p) => [...fresh, ...p].slice(0, 60));
      } catch {
        /* a malformed frame is not worth breaking the page over */
      }
    };
    return () => ws.close();
  }, []);

  return (
    <aside style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div className="panel-head">
        <span className="label">venue tape</span>
        <span className="label" style={{ color: connected ? "var(--live)" : "var(--ink-3)" }}>
          {connected ? "live" : "connecting"}
        </span>
      </div>
      <div className="scroll-y mono" style={{ flex: 1, maxHeight: "70vh", fontSize: 11 }}>
        {prints.length === 0 ? (
          <div style={{ padding: 16 }}>
            <Muted>Prints appear here as they happen on Hyperliquid.</Muted>
          </div>
        ) : (
          prints.map((t) => (
            <div
              key={t.id}
              className="settle"
              style={{
                display: "grid",
                gridTemplateColumns: "46px 1fr auto",
                gap: 10,
                padding: "5px 14px",
                borderBottom: "1px solid var(--rule-2)",
              }}
            >
              <span style={{ color: "var(--ink-2)" }}>{t.coin}</span>
              <span style={{ color: t.side === "B" ? "var(--gain)" : "var(--loss)" }}>
                {formatPx(t.px)}
              </span>
              <span style={{ color: "var(--ink-3)" }}>{t.sz}</span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function Metric({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "gain" | "loss" | "attention";
  hint?: string;
}) {
  const color =
    tone === "gain" ? "var(--gain)" : tone === "loss" ? "var(--loss)" : "var(--ink)";
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mono" style={{ fontSize: 17, marginTop: 3, color }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 1 }}>{hint}</div>
      )}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-2)", maxWidth: 560, lineHeight: 1.6 }}>
      {children}
    </p>
  );
}
