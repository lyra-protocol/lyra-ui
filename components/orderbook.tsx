"use client";

import { useEffect, useState } from "react";

/**
 * Order book, read-only.
 *
 * The same depth Lyra sees. Note the cadence: Hyperliquid throttled public
 * book updates in June 2026 to 20 levels every 2 seconds, or 5 levels every
 * 0.5s with fast mode. This is the real constraint she trades inside, so the
 * panel shows it rather than implying a faster feed than exists.
 */
export function OrderBook({ asset }: { asset: string }) {
  const [book, setBook] = useState<{ bids: [string, string][]; asks: [string, string][] } | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "l2Book", coin: asset }),
      })
        .then((r) => r.json())
        .then((d: { levels: { px: string; sz: string }[][] }) => {
          if (!alive || !d.levels) return;
          setBook({
            bids: (d.levels[0] ?? []).slice(0, 11).map((l) => [l.px, l.sz]),
            asks: (d.levels[1] ?? []).slice(0, 11).map((l) => [l.px, l.sz]),
          });
        })
        .catch(() => {});
    void load();
    const id = setInterval(load, 2000);
    return () => { alive = false; clearInterval(id); };
  }, [asset]);

  if (!book) {
    return (
      <div style={{ padding: 14 }}>
        <span className="lbl">loading book</span>
      </div>
    );
  }

  const maxSz = Math.max(
    ...book.bids.map((b) => Number(b[1])),
    ...book.asks.map((a) => Number(a[1])),
    1,
  );
  const spread =
    book.asks[0] && book.bids[0] ? Number(book.asks[0][0]) - Number(book.bids[0][0]) : 0;

  return (
    <div className="mono" style={{ fontSize: "var(--t-micro)", }}>
      {[...book.asks].reverse().map(([px, sz], i) => (
        <Level key={`a${i}`} px={px} sz={sz} max={maxSz} side="ask" />
      ))}
      <div
        style={{
          padding: "5px 12px",
          borderTop: "1px solid var(--rule)",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: "var(--ink-3)" }}>spread</span>
        <span>{spread.toFixed(spread < 1 ? 4 : 1)}</span>
      </div>
      {book.bids.map(([px, sz], i) => (
        <Level key={`b${i}`} px={px} sz={sz} max={maxSz} side="bid" />
      ))}
    </div>
  );
}

function Level({ px, sz, max, side }: { px: string; sz: string; max: number; side: "bid" | "ask" }) {
  const pct = (Number(sz) / max) * 100;
  return (
    <div style={{ position: "relative", padding: "2px 12px", display: "flex", justifyContent: "space-between" }}>
      <div
        style={{
          position: "absolute",
          top: 0, bottom: 0, right: 0,
          width: `${pct}%`,
          background: side === "bid" ? "rgba(21,128,61,0.07)" : "rgba(185,28,28,0.07)",
        }}
      />
      <span style={{ position: "relative", color: side === "bid" ? "var(--gain)" : "var(--loss)" }}>{px}</span>
      <span style={{ position: "relative", color: "var(--ink-2)" }}>{sz}</span>
    </div>
  );
}
