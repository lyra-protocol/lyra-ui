"use client";

import { useEffect, useState } from "react";
import { formatUsd } from "@/lib/venue";
import type { PainMap, WalletState } from "@/lib/painmap";

/** Freshness readout. A terminal should always say how old its data is. */
export function Age({ ms }: { ms: number | null }) {
  if (ms === null) return <span className="age">—</span>;
  return <span className="age">{ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`}</span>;
}

/**
 * The pain map.
 *
 * Below spot: longs liquidating, forced to sell — drawn solid.
 * Above spot: shorts liquidating, forced to buy — drawn open.
 *
 * The two directions are distinguishable by fill rather than colour, and the
 * labels state the mechanism explicitly. Getting this relationship backwards
 * inverts every conclusion drawn from the panel.
 */
export function PainMapPanel({ map }: { map: PainMap | null }) {
  if (!map) {
    return (
      <div className="pm">
        <div className="fade">Reconstructing positions…</div>
      </div>
    );
  }

  const below = map.forcedLevels
    .filter((l) => l.pctFromMid < 0 && l.notionalUsd > 1000)
    .sort((a, b) => b.pctFromMid - a.pctFromMid)
    .slice(0, 5);
  const above = map.forcedLevels
    .filter((l) => l.pctFromMid > 0 && l.notionalUsd > 1000)
    .sort((a, b) => a.pctFromMid - b.pctFromMid)
    .slice(0, 5);

  const rows = Math.max(below.length, above.length);
  const max = Math.max(1, ...map.forcedLevels.map((l) => l.notionalUsd));
  const mid = Number(map.midPx);
  const at = (pct: number) => (mid * (1 + pct / 100)).toLocaleString("en-US", { maximumFractionDigits: 0 });
  const m = (n: number) => `${(n / 1e6).toFixed(1)}M`;

  const biggestBelow = below.reduce<(typeof below)[number] | null>(
    (b, l) => (!b || l.notionalUsd > b.notionalUsd ? l : b), null);
  const biggestAbove = above.reduce<(typeof above)[number] | null>(
    (b, l) => (!b || l.notionalUsd > b.notionalUsd ? l : b), null);

  return (
    <div className="pm">
      <div className="pm-head">
        <div><b>Forced selling</b><br /><span className="fade">longs liquidating below</span></div>
        <div className="c">SPOT {map.midPx}</div>
        <div className="r"><b>Forced buying</b><br /><span className="fade">shorts liquidating above</span></div>
      </div>

      {Array.from({ length: rows }).map((_, i) => {
        const b = below[i], a = above[i];
        return (
          <div className="pm-row" key={i}>
            <span className="fade" style={{ textAlign: "right" }}>{b ? at(b.pctFromMid) : ""}</span>
            <span className="pm-l">
              {b && <><span>{m(b.notionalUsd)}</span>
                <span className="pm-bar sell" style={{ width: `${(b.notionalUsd / max) * 100}%` }} /></>}
            </span>
            <span className="pm-spine" />
            <span className="pm-r">
              {a && <><span className="pm-bar buy" style={{ width: `${(a.notionalUsd / max) * 100}%` }} />
                <span>{m(a.notionalUsd)}</span></>}
            </span>
            <span className="fade">{a ? at(a.pctFromMid) : ""}</span>
          </div>
        );
      })}

      {biggestBelow && (
        <div className="pm-note">
          <span className="k">{at(biggestBelow.pctFromMid)}</span>
          <span>Largest long cluster · {m(biggestBelow.notionalUsd)} · {biggestBelow.positions} accounts</span>
        </div>
      )}
      {biggestAbove && (
        <div className="pm-note" style={{ borderTop: "none", paddingTop: 0, marginTop: 3 }}>
          <span className="k">{at(biggestAbove.pctFromMid)}</span>
          <span>Largest short cluster · {m(biggestAbove.notionalUsd)} · {biggestAbove.positions} accounts</span>
        </div>
      )}
      <div className="pm-note" style={{ borderTop: "none", paddingTop: 0, marginTop: 3 }}>
        <span className="k">COVERAGE</span>
        <span>
          {map.positionsEnumerated.toLocaleString()} positions enumerated
          {map.coverage.fraction !== null && ` · ${(map.coverage.fraction * 100).toFixed(1)}% of open interest`}
        </span>
      </div>
    </div>
  );
}

/**
 * Account.
 *
 * The daily limit is shown as used / remaining / maximum rather than a single
 * percentage, because the discipline is the point: a visitor should see that a
 * hard floor exists and how much room is left before it.
 */
export function AccountPanel({ wallet }: { wallet: WalletState | null }) {
  if (!wallet) return <div className="fade" style={{ padding: 10 }}>Account state unavailable.</div>;

  const used = wallet.dailyLossUsed * 100;
  const max = 7;
  const remaining = Math.max(0, max - used);

  return (
    <>
      <div className="kv"><span className="mut">Equity</span><span>{formatUsd(wallet.equityUsd)}</span></div>
      <div className="kv"><span className="mut">Unrealised</span>
        <span className={wallet.unrealizedPnlUsd >= 0 ? "up" : "dn"}>
          {wallet.unrealizedPnlUsd >= 0 ? "+" : "−"}{formatUsd(Math.abs(wallet.unrealizedPnlUsd))}
        </span></div>
      <div className="kv"><span className="mut">Session</span>
        <span className={wallet.sessionPnlUsd >= 0 ? "up" : "dn"}>
          {wallet.sessionPnlUsd >= 0 ? "+" : "−"}{formatUsd(Math.abs(wallet.sessionPnlUsd))}
        </span></div>
      <div className="kv"><span className="mut">In positions</span><span>{formatUsd(wallet.notionalUsd)}</span></div>

      <div className="limit">
        <div><div className="k">USED</div><div className="v">{used.toFixed(2)}%</div></div>
        <div><div className="k">REMAINING</div><div className="v">{remaining.toFixed(2)}%</div></div>
        <div><div className="k">MAX DAILY</div><div className="v">{max.toFixed(2)}%</div></div>
      </div>
      <div className="meter"><i style={{ width: `${Math.min(100, (used / max) * 100)}%` }} /></div>
      <div className="meter-ends">
        <span>0</span>
        <span>halts new positions at {max.toFixed(2)}%</span>
      </div>
    </>
  );
}

/** Positions. Risk fields lead; PnL is last, which is the order a professional reads. */
export function PositionsPanel({ wallet }: { wallet: WalletState | null }) {
  const rows = wallet?.positions ?? [];
  if (rows.length === 0) {
    return (
      <div style={{ padding: 12 }}>
        <div className="mut" style={{ fontSize: "var(--t-10)" }}>No open positions.</div>
        <div className="fade" style={{ fontSize: "var(--t-9)", marginTop: 4, lineHeight: 1.5 }}>
          When she opens one it appears here with its stop, liquidation price and the share of
          equity at risk — before its PnL.
        </div>
      </div>
    );
  }
  return (
    <table>
      <thead><tr>
        <th>SYM</th><th>SIDE</th><th className="r">SIZE</th><th className="r">ENTRY</th>
        <th className="r">MARK</th><th className="r">STOP</th><th className="r">RISK</th>
        <th className="r">AGE</th><th className="r">UPNL</th>
      </tr></thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.asset}>
            <td>{p.asset}</td>
            <td>{p.side === "long" ? "LONG" : "SHORT"}</td>
            <td className="r">{Number(p.size).toLocaleString("en-US", { maximumFractionDigits: 4 })}</td>
            <td className="r">{p.entryPx}</td>
            <td className="r">{p.markPx}</td>
            {/* An unprotected position is stated, never left blank. */}
            <td className="r">{p.stopPx ? Number(p.stopPx).toPrecision(6) : "NONE"}</td>
            <td className="r">{p.riskUsd === null ? "—" : `−${p.riskUsd.toFixed(0)}`}</td>
            <td className="r">{held(p.openedAt)}</td>
            <td className={`r ${p.unrealizedPnlUsd >= 0 ? "up" : "dn"}`}>
              {p.unrealizedPnlUsd >= 0 ? "+" : "−"}{Math.abs(p.unrealizedPnlUsd).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** How long she has held it. Holds are meant to be long, so this is a claim. */
function held(openedAt: number): string {
  const m = Math.max(0, Math.round((Date.now() - openedAt) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h${String(m % 60).padStart(2, "0")}` : `${Math.floor(h / 24)}d${h % 24}h`;
}

/** Order book — real depth, at the venue's real 2s cadence. */
export function BookPanel({ asset }: { asset: string }) {
  const [book, setBook] = useState<{ bids: [number, number][]; asks: [number, number][] } | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "l2Book", coin: asset }),
      })
        .then((r) => r.json())
        .then((d: { levels?: { px: string; sz: string }[][] }) => {
          if (!alive || !d.levels) return;
          setBook({
            bids: (d.levels[0] ?? []).slice(0, 11).map((l) => [Number(l.px), Number(l.sz)]),
            asks: (d.levels[1] ?? []).slice(0, 11).map((l) => [Number(l.px), Number(l.sz)]),
          });
        })
        .catch(() => {});
    void load();
    const id = setInterval(load, 2000);
    return () => { alive = false; clearInterval(id); };
  }, [asset]);

  if (!book) return <div className="fade" style={{ padding: 10, fontSize: "var(--t-9)" }}>Loading book…</div>;

  const cum = (r: [number, number][]) => { let t = 0; return r.map(([p, s]) => [p, s, (t += s)] as const); };
  const A = cum(book.asks), B = cum(book.bids);
  const maxT = Math.max(A.at(-1)?.[2] ?? 1, B.at(-1)?.[2] ?? 1);

  const Row = ({ r, side }: { r: readonly [number, number, number]; side: "ask" | "bid" }) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "1.5px 8px",
                  position: "relative", color: side === "ask" ? "var(--loss)" : undefined }}>
      <span style={{ position: "relative", zIndex: 1 }}>{r[0].toFixed(r[0] > 1000 ? 1 : 4)}</span>
      <span style={{ position: "relative", zIndex: 1, textAlign: "right" }}>{r[1].toFixed(3)}</span>
      <span style={{ position: "relative", zIndex: 1, textAlign: "right" }}>{r[2].toFixed(2)}</span>
      <span style={{ position: "absolute", top: 0, bottom: 0, right: 0,
                     width: `${(r[2] / maxT) * 100}%`,
                     background: side === "ask" ? "var(--loss-bg)" : "#eeeef1" }} />
    </div>
  );

  const spread = (A[0]?.[0] ?? 0) - (B[0]?.[0] ?? 0);

  return (
    <div style={{ fontSize: "var(--t-9)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "3px 8px",
                    color: "var(--ink-3)", borderBottom: "1px solid var(--rule)", fontSize: "var(--t-8)" }}>
        <span>PRICE</span><span style={{ textAlign: "right" }}>SIZE</span><span style={{ textAlign: "right" }}>TOTAL</span>
      </div>
      {[...A].reverse().map((r, i) => <Row key={`a${i}`} r={r} side="ask" />)}
      <div style={{ display: "flex", justifyContent: "center", gap: 10, alignItems: "baseline",
                    padding: "4px 8px", borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)" }}>
        <span style={{ fontSize: "var(--t-12)" }}>{B[0]?.[0].toFixed(B[0]![0] > 1000 ? 1 : 4)}</span>
        <span className="fade" style={{ fontSize: "var(--t-8)" }}>SPR {spread.toFixed(spread > 1 ? 1 : 4)}</span>
      </div>
      {B.map((r, i) => <Row key={`b${i}`} r={r} side="bid" />)}
    </div>
  );
}
