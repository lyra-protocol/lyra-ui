"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Candlestick chart.
 *
 * Hand-drawn on a canvas rather than pulled from a charting library. The chart
 * needs candles, a price axis and Lyra's own levels drawn on it — nothing that
 * justifies adding a dependency to a package that has three.
 *
 * Candles come from Hyperliquid's public candleSnapshot, so what you see is the
 * venue's own data rather than a redistribution of it.
 */

export type Candle = { t: number; o: string; h: string; l: string; c: string; v: string };

/** Levels Lyra has on the chart: her entry, her stop, forced-flow clusters. */
export type Marker = {
  px: number;
  label: string;
  kind: "entry" | "stop" | "cluster";
};

const INTERVALS = ["5m", "15m", "1h", "4h"] as const;
export type Interval = (typeof INTERVALS)[number];

export function Chart({
  asset,
  markers = [],
  height,
}: {
  asset: string;
  markers?: Marker[];
  height?: number;
}) {
  const [interval, setInterval_] = useState<Interval>("15m");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const spanMs: Record<Interval, number> = {
      "5m": 5 * 60_000, "15m": 15 * 60_000, "1h": 3_600_000, "4h": 4 * 3_600_000,
    };
    const end = Date.now();
    const start = end - spanMs[interval] * 120;

    fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "candleSnapshot",
        req: { coin: asset, interval, startTime: start, endTime: end },
      }),
    })
      .then((r) => r.json())
      .then((d: Candle[]) => {
        if (!alive) return;
        setCandles(Array.isArray(d) ? d.slice(-120) : []);
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [asset, interval]);

  const bounds = useMemo(() => {
    if (candles.length === 0) return null;
    const highs = candles.map((c) => Number(c.h));
    const lows = candles.map((c) => Number(c.l));
    let hi = Math.max(...highs);
    let lo = Math.min(...lows);
    for (const m of markers) { hi = Math.max(hi, m.px); lo = Math.min(lo, m.px); }
    const pad = (hi - lo) * 0.08 || hi * 0.01;
    return { hi: hi + pad, lo: lo - pad };
  }, [candles, markers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !bounds || candles.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    // Measured from the region it sits in, so the chart fills whatever the
    // fixed layout gives it rather than imposing a height on the shell.
    const h = wrap.clientHeight || 260;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const axisW = 62;
    const plotW = w - axisW;
    const y = (px: number) => ((bounds.hi - px) / (bounds.hi - bounds.lo)) * (h - 20) + 10;

    // Horizontal grid and the price axis.
    ctx.font = '10px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const px = bounds.lo + ((bounds.hi - bounds.lo) * i) / 4;
      const yy = y(px);
      ctx.strokeStyle = "#f4f4f5";
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(plotW, yy);
      ctx.stroke();
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(px >= 1000 ? px.toFixed(0) : px.toFixed(3), plotW + 8, yy);
    }

    const cw = plotW / candles.length;
    const bodyW = Math.max(1, Math.min(cw * 0.62, 9));

    candles.forEach((c, i) => {
      const o = Number(c.o), cl = Number(c.c), hi = Number(c.h), lo = Number(c.l);
      const x = i * cw + cw / 2;
      const up = cl >= o;
      // Near-black for up, hollow for down: readable without relying on colour.
      ctx.strokeStyle = "#0a0a0a";
      ctx.fillStyle = up ? "#0a0a0a" : "#ffffff";
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(x, y(hi));
      ctx.lineTo(x, y(lo));
      ctx.stroke();

      const top = y(Math.max(o, cl));
      const bh = Math.max(1, Math.abs(y(o) - y(cl)));
      ctx.fillRect(x - bodyW / 2, top, bodyW, bh);
      ctx.strokeRect(x - bodyW / 2, top, bodyW, bh);
    });

    // Lyra's levels, drawn over the candles.
    for (const m of markers) {
      const yy = y(m.px);
      ctx.strokeStyle = "#0a0a0a";
      ctx.setLineDash(m.kind === "stop" ? [3, 3] : m.kind === "cluster" ? [1, 3] : []);
      ctx.lineWidth = m.kind === "entry" ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(plotW, yy);
      ctx.stroke();
      ctx.setLineDash([]);

      const label = m.label;
      ctx.font = '9px ui-monospace, Menlo, monospace';
      const tw = ctx.measureText(label).width + 8;
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(2, yy - 7, tw, 14);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, 6, yy);
    }
  }, [candles, bounds, height, markers]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: "var(--t-data)", fontWeight: 600 }}>{asset}</span>
          <span className="lbl">perpetual</span>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {INTERVALS.map((iv) => (
            <button
              key={iv}
              onClick={() => setInterval_(iv)}
              className="mono"
              style={{
                fontSize: "var(--t-micro)",
                padding: "3px 8px",
                border: "1px solid",
                borderColor: iv === interval ? "var(--ink)" : "transparent",
                background: iv === interval ? "var(--ink)" : "transparent",
                color: iv === interval ? "#fff" : "var(--ink-2)",
                cursor: "pointer",
              }}
            >
              {iv}
            </button>
          ))}
        </div>
      </div>
      <div ref={wrapRef} style={{ position: "relative", height: height ?? "100%", flex: 1, minHeight: 0 }}>
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <span className="lbl">loading candles</span>
          </div>
        )}
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
