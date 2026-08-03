"use client";

import { useEffect, useState } from "react";
import {
  UNIVERSE,
  dayChange,
  fetchUniverse,
  formatPx,
  formatUsd,
  fundingAnnualPct,
  type AssetSnapshot,
} from "@/lib/venue";
import { fetchPainMap, type PainMap } from "@/lib/painmap";
import { Chart, type Marker } from "@/components/chart";
import { OrderBook } from "@/components/orderbook";
import { ForcedFlow } from "@/components/forced-flow";
import { Activity } from "@/components/activity";
import { Wallet, ReadOnlyBadge } from "@/components/wallet";

/**
 * The terminal.
 *
 * Laid out like a perpetuals desk — chart centre, book right, account and
 * positions in the rail — with one difference that is stated rather than
 * implied: there is nothing to click. Every panel is observation.
 *
 * Nothing here is performed. Where a panel has no data it says so and says why.
 * An agent that animates work it is not doing would be a demo, and the whole
 * point of this project is that it is not one.
 */
export function Terminal() {
  const [asset, setAsset] = useState("BTC");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar asset={asset} />
      <UniverseStrip selected={asset} onSelect={setAsset} />

      <div className="desk">
        <main style={{ minWidth: 0, borderRight: "1px solid var(--rule)" }}>
          <ChartWithLevels asset={asset} />
          <PainPanel asset={asset} />
          <Activity />
        </main>

        <aside style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Wallet />
          <section style={{ borderBottom: "1px solid var(--rule)" }}>
            <div className="panel-head">
              <span className="label">order book</span>
              <span style={{ fontSize: 10, color: "var(--ink-3)" }}>{asset} · 2s</span>
            </div>
            <OrderBook asset={asset} />
          </section>
        </aside>
      </div>

      <style>{`
        .desk {
          flex: 1;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(290px, 340px);
          border-top: 1px solid var(--rule);
        }
        @media (max-width: 940px) {
          .desk { grid-template-columns: 1fr; }
          .desk > main { border-right: none !important; }
        }
      `}</style>
    </div>
  );
}

function TopBar({ asset }: { asset: string }) {
  const [now, setNow] = useState("");
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
        height: 46,
        borderBottom: "1px solid var(--rule)",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <a href="/" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em" }}>
          LYRA
        </a>
        <span className="label">{asset} perpetual</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <ReadOnlyBadge />
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{now}</span>
        <a href="/mcp" className="label" style={{ color: "var(--ink-2)" }}>mcp</a>
      </div>
    </header>
  );
}

function UniverseStrip({ selected, onSelect }: { selected: string; onSelect: (a: string) => void }) {
  const [assets, setAssets] = useState<AssetSnapshot[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () => fetchUniverse().then((a) => alive && setAssets(a)).catch(() => {});
    void load();
    const id = setInterval(load, 10_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div className="scroll-x" style={{ display: "flex" }}>
      {UNIVERSE.map((coin) => {
        const a = assets.find((x) => x.coin === coin);
        const chg = a ? dayChange(a) : 0;
        const active = coin === selected;
        return (
          <button
            key={coin}
            onClick={() => onSelect(coin)}
            style={{
              flex: "1 0 116px",
              textAlign: "left",
              padding: "8px 13px",
              border: "none",
              borderRight: "1px solid var(--rule)",
              borderBottom: active ? "2px solid var(--ink)" : "2px solid transparent",
              background: active ? "var(--rule-2)" : "var(--paper)",
              cursor: "pointer",
              font: "inherit",
              color: "inherit",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 10.5, fontWeight: 600 }}>{coin}</span>
              <span className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)" }}>
                {a ? `${fundingAnnualPct(a) >= 0 ? "+" : ""}${fundingAnnualPct(a).toFixed(0)}%` : ""}
              </span>
            </div>
            <div className="mono" style={{ fontSize: 12.5, marginTop: 2 }}>
              {a ? formatPx(a.markPx) : "—"}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 10,
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

/**
 * The chart, with Lyra's own levels drawn on it.
 *
 * The markers are the forced-flow clusters she is watching — not decoration,
 * and not drawn where she has not looked. When she holds a position her entry
 * and stop appear here too.
 */
function ChartWithLevels({ asset }: { asset: string }) {
  const [markers, setMarkers] = useState<Marker[]>([]);

  useEffect(() => {
    let alive = true;
    fetchPainMap(asset)
      .then((m) => {
        if (!alive) return;
        const mid = Number(m.midPx);
        setMarkers(
          m.forcedLevels
            .filter((l) => l.notionalUsd > 500_000)
            .slice(0, 3)
            .map((l) => ({
              px: mid * (1 + l.pctFromMid / 100),
              label: `${(l.notionalUsd / 1e6).toFixed(1)}M ${l.direction === "forced_buys" ? "buys" : "sells"}`,
              kind: "cluster" as const,
            })),
        );
      })
      .catch(() => alive && setMarkers([]));
    return () => { alive = false; };
  }, [asset]);

  return (
    <section style={{ borderBottom: "1px solid var(--rule)" }}>
      <Chart asset={asset} markers={markers} height={330} />
      {markers.length > 0 && (
        <div style={{ padding: "7px 14px", borderTop: "1px solid var(--rule)" }}>
          <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
            Dotted lines are forced-flow clusters — price levels where enumerated positions must
            close. Not drawn from an indicator; summed from real liquidation prices.
          </span>
        </div>
      )}
    </section>
  );
}

function PainPanel({ asset }: { asset: string }) {
  const [map, setMap] = useState<PainMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    const load = () =>
      fetchPainMap(asset)
        .then((m) => alive && setMap(m))
        .catch((e: Error) => alive && setError(e.message));
    void load();
    const id = setInterval(load, 20_000);
    return () => { alive = false; clearInterval(id); };
  }, [asset]);

  return (
    <section style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="panel-head">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="label">pain map</span>
          <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
            positions enumerated from the venue, not estimated
          </span>
        </div>
        {map && (
          <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
            {map.positionsEnumerated.toLocaleString()}
            {map.coverage.fraction !== null && ` · ${(map.coverage.fraction * 100).toFixed(1)}% of OI`}
          </span>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {error ? (
          <div>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6, maxWidth: 620 }}>
              The Pain Map is not reachable right now.
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.6, maxWidth: 620 }}>
              Unlike the trade record — which lives on Arweave and needs nobody&rsquo;s permission to
              verify — this view is reconstructed from a dataset only this project holds.
              Hyperliquid serves no position history, so it exists only because a collector has been
              watching continuously.
            </p>
          </div>
        ) : !map ? (
          <span className="label">reading positions</span>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                gap: 18,
                marginBottom: 20,
              }}
            >
              <Metric label="losing side" value={map.losingSide} />
              <Metric
                label="crowd unrealised"
                value={formatUsd(Math.abs(map.aggregateUnrealizedPnlUsd))}
                tone={map.aggregateUnrealizedPnlUsd >= 0 ? "gain" : "loss"}
              />
              <Metric label="mean leverage" value={`${map.meanLeverage.toFixed(1)}x`} />
              <Metric label="concentration" value={`${(map.concentration * 100).toFixed(0)}%`} />
            </div>
            <ForcedFlow levels={map.forcedLevels} midPx={map.midPx} />
          </>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "gain" | "loss" }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div
        className="mono"
        style={{
          fontSize: 16,
          marginTop: 3,
          color: tone === "gain" ? "var(--gain)" : tone === "loss" ? "var(--loss)" : "var(--ink)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
