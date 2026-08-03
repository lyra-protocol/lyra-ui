"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Candlestick chart.
 *
 * Hand-drawn on one canvas rather than pulled from a charting library — candles,
 * a price axis, a volume pane and Lyra's own levels do not justify a dependency.
 * Drawing all four into a single canvas also means the price axis, the level
 * tags and the volume bars share one coordinate system exactly, which they do
 * not if they are separate DOM layers rounded independently.
 *
 * Candles come from Hyperliquid's public candleSnapshot, so what is shown is the
 * venue's own data rather than a redistribution of it.
 */

export type Candle = { t: number; o: string; h: string; l: string; c: string; v: string };

/** Levels Lyra has on the chart: her entry, her stop, forced-flow clusters. */
export type Marker = {
  px: number;
  label: string;
  kind: "entry" | "stop" | "cluster";
};

export const INTERVALS = ["5m", "15m", "1h", "4h"] as const;
export type Interval = (typeof INTERVALS)[number];

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

const PAPER = "#ffffff";
const INK = "#0a0a0b";
const FADE = "#8e8e97";
const GRID = "#f1f1f3";
const RULE = "#d8d8de";

/** Prices span six orders of magnitude across the universe; DOGE needs decimals. */
function fmtPx(px: number): string {
  if (px >= 1000) return px.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (px >= 1) return px.toFixed(3);
  return px.toFixed(5);
}

function fmtVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return v.toFixed(0);
}

export function Chart({
  asset,
  interval,
  markers = [],
}: {
  asset: string;
  interval: Interval;
  markers?: Marker[];
}) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const spanMs: Record<Interval, number> = {
      "5m": 5 * 60_000, "15m": 15 * 60_000, "1h": 3_600_000, "4h": 4 * 3_600_000,
    };
    const end = Date.now();
    const start = end - spanMs[interval] * 130;

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
        setCandles(Array.isArray(d) ? d.slice(-130) : []);
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [asset, interval]);

  /* The canvas is sized from the region the fixed shell gives it, never the
     reverse — a chart that imposes a height is how a no-scroll layout breaks. */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const bounds = useMemo(() => {
    if (candles.length === 0) return null;
    let hi = -Infinity, lo = Infinity, vmax = 0;
    for (const c of candles) {
      hi = Math.max(hi, Number(c.h));
      lo = Math.min(lo, Number(c.l));
      vmax = Math.max(vmax, Number(c.v));
    }
    // Levels are only allowed to stretch the axis a little. A cluster 30% away
    // would otherwise flatten the candles into a line to keep its tag on screen.
    const span = hi - lo;
    for (const m of markers) {
      if (m.px < hi + span * 1.2 && m.px > lo - span * 1.2) {
        hi = Math.max(hi, m.px);
        lo = Math.min(lo, m.px);
      }
    }
    const pad = (hi - lo) * 0.07 || hi * 0.01;
    return { hi: hi + pad, lo: lo - pad, vmax };
  }, [candles, markers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const { w, h } = size;
    if (!canvas || !bounds || candles.length === 0 || w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.textBaseline = "middle";

    /* ── panes ──────────────────────────────────────────────────────────── */
    const axisW = 74;              // right price axis
    const timeH = 15;              // time labels along the bottom
    const volH = Math.min(58, Math.max(34, Math.round(h * 0.17)));
    const plotW = w - axisW;
    const volTop = h - timeH - volH;
    const priceH = volTop;

    const y = (px: number) =>
      ((bounds.hi - px) / (bounds.hi - bounds.lo)) * (priceH - 14) + 7;

    const cw = plotW / candles.length;
    const x = (i: number) => i * cw + cw / 2;

    /* ── grid + price axis ──────────────────────────────────────────────── */
    ctx.font = `10px ${MONO}`;
    for (let i = 0; i <= 5; i++) {
      const px = bounds.lo + ((bounds.hi - bounds.lo) * i) / 5;
      const yy = Math.round(y(px)) + 0.5;
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(plotW, yy);
      ctx.stroke();
      ctx.fillStyle = FADE;
      ctx.textAlign = "left";
      ctx.fillText(fmtPx(px), plotW + 7, yy);
    }

    /* ── candles ────────────────────────────────────────────────────────── */
    const bodyW = Math.max(1, Math.min(cw * 0.66, 8));
    ctx.lineWidth = 1;
    candles.forEach((c, i) => {
      const o = Number(c.o), cl = Number(c.c), hi = Number(c.h), lo = Number(c.l);
      const cx = Math.round(x(i)) + 0.5;
      const up = cl >= o;
      // Filled for up, hollow for down. Direction survives without colour.
      ctx.strokeStyle = INK;
      ctx.fillStyle = up ? INK : PAPER;

      ctx.beginPath();
      ctx.moveTo(cx, y(hi));
      ctx.lineTo(cx, y(lo));
      ctx.stroke();

      const top = y(Math.max(o, cl));
      const bh = Math.max(1, Math.abs(y(o) - y(cl)));
      ctx.fillRect(cx - bodyW / 2, top, bodyW, bh);
      ctx.strokeRect(cx - bodyW / 2, top, bodyW, bh);
    });

    /* ── Lyra's levels ──────────────────────────────────────────────────── */
    // Drawn as a dashed rule across the plot with a tag on the axis, so the
    // level is legible without a black box sitting over the candles.
    for (const m of markers) {
      if (m.px > bounds.hi || m.px < bounds.lo) continue;
      const yy = Math.round(y(m.px)) + 0.5;
      ctx.strokeStyle = INK;
      ctx.setLineDash(m.kind === "stop" ? [3, 3] : m.kind === "cluster" ? [2, 4] : []);
      ctx.lineWidth = m.kind === "entry" ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(plotW, yy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = INK;
      ctx.fillRect(plotW + 1, yy - 10, axisW - 1, 20);
      ctx.fillStyle = PAPER;
      ctx.textAlign = "left";
      ctx.font = `10px ${MONO}`;
      ctx.fillText(fmtPx(m.px), plotW + 6, yy - 4);
      ctx.font = `8px ${MONO}`;
      ctx.fillText(m.label, plotW + 6, yy + 6);
    }

    /* ── last price ─────────────────────────────────────────────────────── */
    const last = candles[candles.length - 1]!;
    const lastPx = Number(last.c);
    const ly = Math.round(y(lastPx)) + 0.5;
    ctx.strokeStyle = INK;
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, ly);
    ctx.lineTo(plotW, ly);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = INK;
    ctx.fillRect(plotW + 1, ly - 10, axisW - 1, 20);
    ctx.fillStyle = PAPER;
    ctx.textAlign = "left";
    ctx.font = `10px ${MONO}`;
    ctx.fillText(fmtPx(lastPx), plotW + 6, ly - 4);
    ctx.font = `8px ${MONO}`;
    ctx.fillText(new Date(last.t).toISOString().slice(11, 16), plotW + 6, ly + 6);

    /* ── volume ─────────────────────────────────────────────────────────── */
    ctx.strokeStyle = RULE;
    ctx.beginPath();
    ctx.moveTo(0, volTop + 0.5);
    ctx.lineTo(w, volTop + 0.5);
    ctx.stroke();

    const volBase = h - timeH - 1;
    const volScale = (volH - 14) / (bounds.vmax || 1);
    candles.forEach((c, i) => {
      const bh = Math.max(0.5, Number(c.v) * volScale);
      const up = Number(c.c) >= Number(c.o);
      ctx.fillStyle = up ? INK : "#c9c9d0";
      ctx.fillRect(Math.round(x(i)) - bodyW / 2, volBase - bh, bodyW, bh);
    });

    ctx.fillStyle = FADE;
    ctx.font = `9px ${MONO}`;
    ctx.textAlign = "left";
    ctx.fillText(`Vol ${fmtVol(Number(last.v))}`, 6, volTop + 10);
    ctx.fillText(fmtVol(bounds.vmax), plotW + 7, volTop + 10);
    ctx.fillText("0", plotW + 7, volBase - 4);

    /* ── time axis ──────────────────────────────────────────────────────── */
    ctx.strokeStyle = RULE;
    ctx.beginPath();
    ctx.moveTo(0, h - timeH + 0.5);
    ctx.lineTo(w, h - timeH + 0.5);
    ctx.stroke();
    ctx.fillStyle = FADE;
    ctx.font = `9px ${MONO}`;
    const every = Math.max(1, Math.floor(candles.length / 7));
    candles.forEach((c, i) => {
      if (i % every !== 0 || i === 0) return;
      const d = new Date(c.t);
      const hh = d.getUTCHours();
      // Day boundaries get the date instead of 00:00 — the reader needs to see
      // where one session ends without counting midnights.
      const label = hh === 0
        ? `${d.getUTCDate()}`
        : `${String(hh).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
      ctx.textAlign = "center";
      ctx.fillText(label, x(i), h - timeH / 2 + 1);
    });

    /* ── axis separator ─────────────────────────────────────────────────── */
    ctx.strokeStyle = RULE;
    ctx.beginPath();
    ctx.moveTo(plotW + 0.5, 0);
    ctx.lineTo(plotW + 0.5, h);
    ctx.stroke();
  }, [candles, bounds, markers, size]);

  const last = candles[candles.length - 1];

  return (
    <div className="chartwrap">
      {last && (
        <div className="ohlc">
          <span className="fade">O</span><span>{fmtPx(Number(last.o))}</span>
          <span className="fade">H</span><span>{fmtPx(Number(last.h))}</span>
          <span className="fade">L</span><span>{fmtPx(Number(last.l))}</span>
          <span className="fade">C</span><span>{fmtPx(Number(last.c))}</span>
          <span className={Number(last.c) >= Number(last.o) ? "up" : "dn"}>
            {Number(last.c) >= Number(last.o) ? "+" : "−"}
            {Math.abs(((Number(last.c) - Number(last.o)) / Number(last.o)) * 100).toFixed(2)}%
          </span>
        </div>
      )}
      <div ref={wrapRef} className="canvaswrap">
        {loading && <div className="chartload fade">loading candles</div>}
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
