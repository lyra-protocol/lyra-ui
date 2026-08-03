"use client";

import type { ForcedLevel } from "@/lib/painmap";

/**
 * The forced-supply curve.
 *
 * For each price level, the notional that becomes a forced market order if price
 * reaches it — summed from actual liquidation prices, not modelled from open
 * interest and an assumed leverage distribution.
 *
 * That distinction is the whole point of the panel. Every liquidation heatmap in
 * existence estimates, because on the venues they were built for the underlying
 * data does not exist. Here it is enumerated, address by address.
 *
 * Longs liquidate BELOW spot and must sell; shorts liquidate ABOVE and must buy.
 * The chart is oriented so above-spot is above the line, which sounds obvious
 * and is exactly the relationship a model got backwards when it was allowed to
 * infer it (DESIGN.md §4.1).
 */
export function ForcedFlow({ levels, midPx }: { levels: ForcedLevel[]; midPx: string }) {
  if (levels.length === 0) {
    return (
      <div>
        <div className="lbl" style={{ marginBottom: 8 }}>forced flow</div>
        <p style={{ margin: 0, fontSize: "var(--t-body)", color: "var(--ink-2)" }}>
          No liquidation levels within 15% of spot in the observed sample.
        </p>
      </div>
    );
  }

  const above = levels.filter((l) => l.pctFromMid > 0).sort((a, b) => a.pctFromMid - b.pctFromMid);
  const below = levels.filter((l) => l.pctFromMid < 0).sort((a, b) => b.pctFromMid - a.pctFromMid);
  const max = Math.max(...levels.map((l) => l.notionalUsd));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span className="lbl">forced flow</span>
        <span style={{ fontSize: "var(--t-micro)", color: "var(--ink-3)" }}>
          notional that must trade if price reaches the level
        </span>
      </div>

      {/* Above spot: shorts liquidating, which forces buying. */}
      {above.reverse().map((l) => (
        <Row key={l.pctFromMid} level={l} max={max} />
      ))}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "7px 0",
          borderTop: "1px solid var(--ink)",
          borderBottom: "1px solid var(--ink)",
          margin: "3px 0",
        }}
      >
        <span className="lbl" style={{ color: "var(--ink)" }}>spot</span>
        <span className="mono" style={{ fontSize: "var(--t-body)", fontWeight: 600 }}>{midPx}</span>
      </div>

      {/* Below spot: longs liquidating, which forces selling. */}
      {below.map((l) => (
        <Row key={l.pctFromMid} level={l} max={max} />
      ))}
    </div>
  );
}

function Row({ level, max }: { level: ForcedLevel; max: number }) {
  const width = max > 0 ? (level.notionalUsd / max) * 100 : 0;
  const buys = level.direction === "forced_buys";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "52px 1fr 74px 46px",
        alignItems: "center",
        gap: 10,
        padding: "3px 0",
      }}
      title={`${level.positions} positions become ${level.direction.replace("_", " ")}`}
    >
      <span className="mono" style={{ fontSize: "var(--t-body)", color: "var(--ink-2)", textAlign: "right" }}>
        {level.pctFromMid > 0 ? "+" : ""}
        {level.pctFromMid.toFixed(1)}%
      </span>

      <div style={{ height: 14, background: "var(--rule-2)", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${Math.max(width, 1)}%`,
            /* Solid for forced buying, hatched for forced selling: distinguishable
               without relying on colour alone. */
            background: buys
              ? "var(--ink)"
              : "repeating-linear-gradient(45deg, var(--ink) 0 3px, transparent 3px 6px)",
            border: buys ? "none" : "1px solid var(--ink)",
          }}
        />
      </div>

      <span className="mono" style={{ fontSize: "var(--t-body)", }}>
        ${(level.notionalUsd / 1e6).toFixed(2)}M
      </span>
      <span className="mono" style={{ fontSize: "var(--t-micro)", color: "var(--ink-3)" }}>
        {level.positions}
      </span>
    </div>
  );
}
