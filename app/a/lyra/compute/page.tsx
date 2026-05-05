"use client";

import { useEffect, useState, useCallback } from "react";

const C = {
  bg:       "#050505",
  panel:    "#0A0A09",
  ink:      "#ECECE6",
  inkSoft:  "#A8A69E",
  inkDim:   "#5A5852",
  inkFaint: "#2D2C28",
  hairline: "#1A1A18",
  hairBold: "#2A2926",
  amber:    "#F4A340",
  emerald:  "#5BC892",
  rose:     "#E07570",
  teal:     "#7AC9C0",
  violet:   "#B59AE8",
  gold:     "#E5C07B",
};

type HourBucket = {
  hour: string;
  inputTokens: number;
  outputTokens: number;
  cycles: number;
  turns: number;
  costUsd: number;
};

type ComputeStats = {
  buckets: HourBucket[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  totalCycles: number;
  totalTurns: number;
  inputCostPerM: number;
  outputCostPerM: number;
  error?: string;
};

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtCost(n: number): string {
  if (n < 0.001) return `<$0.001`;
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

function fmtHour(h: string): string {
  // "2026-05-05T17" → "May 5 · 17:00"
  try {
    const d = new Date(`${h}:00:00Z`);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
  } catch {
    return h;
  }
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="relative h-[3px] w-full overflow-hidden rounded-full" style={{ background: C.hairBold }}>
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, pct)}%`, background: color }}
      />
    </div>
  );
}

export default function ComputePage() {
  const [stats, setStats] = useState<ComputeStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/lyra/compute");
      if (res.ok) {
        setStats(await res.json() as ComputeStats);
        setLastUpdated(Date.now());
      }
    } catch { /* offline */ }
  }, []);

  useEffect(() => {
    fetchStats();
    const t = setInterval(fetchStats, 60_000);
    return () => clearInterval(t);
  }, [fetchStats]);

  const last24h = stats?.buckets.slice(0, 24) ?? [];
  const maxCost = Math.max(...last24h.map((b) => b.costUsd), 0.001);
  const maxTokens = Math.max(...last24h.map((b) => b.inputTokens + b.outputTokens), 1);

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: C.bg,
        color: C.ink,
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        fontFeatureSettings: '"ss01","cv11","tnum"',
      }}
    >
      {/* Header */}
      <header
        className="flex h-12 shrink-0 items-center justify-between px-8"
        style={{ borderBottom: `1px solid ${C.hairline}` }}
      >
        <div className="flex items-center gap-5">
          <a
            href="/a/lyra"
            className="text-[10px] tracking-[0.22em] transition-opacity hover:opacity-60"
            style={{ color: C.inkDim }}
          >
            ← LYRA
          </a>
          <span className="text-[13px] font-semibold tracking-[0.28em]" style={{ color: C.ink }}>
            COMPUTE
          </span>
          <span className="hidden text-[10px] tracking-[0.2em] sm:block" style={{ color: C.inkDim }}>
            TOKEN ACCOUNTABILITY
          </span>
        </div>
        {lastUpdated && (
          <span className="text-[10px] tabular-nums" style={{ color: C.inkFaint }}>
            updated {new Date(lastUpdated).toLocaleTimeString("en-US", { hour12: false })}
          </span>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-10">

        {!stats && (
          <div className="flex items-center justify-center py-32">
            <span className="text-[11px] tracking-[0.22em]" style={{ color: C.inkDim }}>
              CONNECTING TO AGENT…
            </span>
          </div>
        )}

        {stats?.error && (
          <div
            className="mb-8 rounded-sm px-5 py-4 text-[12px]"
            style={{ background: "rgba(224,117,112,0.05)", border: `1px solid rgba(224,117,112,0.2)`, color: C.rose }}
          >
            Agent unreachable — showing last persisted data
          </div>
        )}

        {stats && (
          <>
            {/* ── All-time summary ── */}
            <section className="mb-10">
              <SectionLabel>ALL-TIME</SectionLabel>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard label="TOTAL COST" value={fmtCost(stats.totalCostUsd)} color={C.amber} big />
                <StatCard label="CYCLES" value={String(stats.totalCycles)} color={C.ink} />
                <StatCard label="TURNS" value={String(stats.totalTurns)} color={C.inkSoft} />
                <StatCard label="INPUT" value={fmtTokens(stats.totalInputTokens)} color={C.teal} sub="tokens" />
                <StatCard label="OUTPUT" value={fmtTokens(stats.totalOutputTokens)} color={C.violet} sub="tokens" />
                <StatCard
                  label="RATIO"
                  value={stats.totalInputTokens > 0
                    ? `${(stats.totalOutputTokens / stats.totalInputTokens).toFixed(2)}×`
                    : "—"}
                  color={C.inkDim}
                  sub="out/in"
                />
              </div>
            </section>

            {/* ── Pricing reference ── */}
            <section className="mb-10">
              <SectionLabel>PRICING</SectionLabel>
              <div className="mt-4 flex flex-wrap gap-6 text-[11px]">
                <PricingRow label="Input tokens" value={`$${stats.inputCostPerM.toFixed(2)} / 1M`} color={C.teal} />
                <PricingRow label="Output tokens" value={`$${stats.outputCostPerM.toFixed(2)} / 1M`} color={C.violet} />
                <PricingRow label="Model" value="GPT-5.5 (Azure)" color={C.inkSoft} />
              </div>
            </section>

            {/* ── Hourly breakdown ── */}
            <section>
              <div className="flex items-center justify-between">
                <SectionLabel>LAST 24 HOURS</SectionLabel>
                <span className="text-[9px] tracking-[0.18em]" style={{ color: C.inkFaint }}>
                  UTC · MOST RECENT FIRST
                </span>
              </div>

              {last24h.length === 0 ? (
                <div className="mt-6 py-10 text-center text-[11px]" style={{ color: C.inkFaint }}>
                  No compute recorded yet — data appears once the agent completes a turn.
                </div>
              ) : (
                <div
                  className="mt-4 overflow-hidden rounded-sm"
                  style={{ border: `1px solid ${C.hairline}` }}
                >
                  {/* Table header */}
                  <div
                    className="grid grid-cols-[1fr_80px_64px_64px_90px_90px_80px] gap-x-4 px-5 py-2.5 text-[8.5px] font-semibold tracking-[0.22em]"
                    style={{ background: C.panel, borderBottom: `1px solid ${C.hairline}`, color: C.inkFaint }}
                  >
                    <span>HOUR (UTC)</span>
                    <span className="text-right">COST</span>
                    <span className="text-right">CYCLES</span>
                    <span className="text-right">TURNS</span>
                    <span className="text-right">INPUT TOK</span>
                    <span className="text-right">OUTPUT TOK</span>
                    <span className="text-right">ACTIVITY</span>
                  </div>

                  {last24h.map((b, i) => {
                    const totalTok = b.inputTokens + b.outputTokens;
                    const costPct  = (b.costUsd / maxCost) * 100;
                    const tokPct   = (totalTok / maxTokens) * 100;
                    const isHot    = costPct > 66;
                    const rowColor = isHot ? C.amber : i === 0 ? C.ink : C.inkSoft;

                    return (
                      <div
                        key={b.hour}
                        className="group grid grid-cols-[1fr_80px_64px_64px_90px_90px_80px] gap-x-4 px-5 py-3"
                        style={{
                          borderBottom: i < last24h.length - 1 ? `1px solid ${C.hairline}` : undefined,
                          background: i === 0 ? "rgba(255,255,255,0.012)" : undefined,
                        }}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px]" style={{ color: rowColor }}>
                            {fmtHour(b.hour)}
                          </span>
                          <Bar pct={tokPct} color={isHot ? C.amber : C.teal} />
                        </div>
                        <div className="flex flex-col items-end justify-center">
                          <span
                            className="text-[11px] font-semibold tabular-nums"
                            style={{ color: isHot ? C.amber : C.ink }}
                          >
                            {fmtCost(b.costUsd)}
                          </span>
                        </div>
                        <div className="flex items-center justify-end">
                          <span className="text-[11px] tabular-nums" style={{ color: C.inkSoft }}>
                            {b.cycles}
                          </span>
                        </div>
                        <div className="flex items-center justify-end">
                          <span className="text-[11px] tabular-nums" style={{ color: C.inkSoft }}>
                            {b.turns}
                          </span>
                        </div>
                        <div className="flex items-center justify-end">
                          <span className="text-[11px] tabular-nums" style={{ color: C.teal }}>
                            {fmtTokens(b.inputTokens)}
                          </span>
                        </div>
                        <div className="flex items-center justify-end">
                          <span className="text-[11px] tabular-nums" style={{ color: C.violet }}>
                            {fmtTokens(b.outputTokens)}
                          </span>
                        </div>
                        <div className="flex items-center justify-end">
                          <ActivityBar pct={costPct} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Cost projection ── */}
            {last24h.length > 0 && (
              <section className="mt-10">
                <SectionLabel>PROJECTION</SectionLabel>
                <div className="mt-4 flex flex-wrap gap-8">
                  <ProjectionStat
                    label="HOURLY AVG"
                    value={fmtCost(stats.totalCostUsd / Math.max(stats.totalCycles, 1) * (stats.totalCycles / Math.max(last24h.length, 1)))}
                    sub="last 24h"
                    color={C.inkSoft}
                  />
                  <ProjectionStat
                    label="DAILY EST"
                    value={fmtCost(last24h.reduce((s, b) => s + b.costUsd, 0) / Math.min(last24h.length, 24) * 24)}
                    sub="at current rate"
                    color={C.amber}
                  />
                  <ProjectionStat
                    label="MONTHLY EST"
                    value={fmtCost(last24h.reduce((s, b) => s + b.costUsd, 0) / Math.min(last24h.length, 24) * 24 * 30)}
                    sub="at current rate"
                    color={C.rose}
                  />
                  <ProjectionStat
                    label="COST / CYCLE"
                    value={stats.totalCycles > 0 ? fmtCost(stats.totalCostUsd / stats.totalCycles) : "—"}
                    sub="all-time avg"
                    color={C.teal}
                  />
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-semibold tracking-[0.28em]" style={{ color: C.inkDim }}>
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  color,
  sub,
  big,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
  big?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-sm p-4"
      style={{ background: C.panel, border: `1px solid ${C.hairline}` }}
    >
      <span className="text-[8.5px] tracking-[0.22em]" style={{ color: C.inkFaint }}>
        {label}
      </span>
      <span
        className={`tabular-nums ${big ? "text-[22px] font-semibold" : "text-[16px] font-medium"}`}
        style={{ color }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[9px]" style={{ color: C.inkFaint }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function PricingRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span style={{ color: C.inkDim }}>{label}</span>
      <span className="font-medium tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function ActivityBar({ pct }: { pct: number }) {
  const bars = 8;
  const filled = Math.round((pct / 100) * bars);
  return (
    <div className="flex items-center gap-[2px]">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: 10,
            borderRadius: 1,
            background: i < filled
              ? pct > 66 ? C.amber : C.teal
              : C.inkFaint,
          }}
        />
      ))}
    </div>
  );
}

function ProjectionStat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[8.5px] tracking-[0.22em]" style={{ color: C.inkFaint }}>
        {label}
      </span>
      <span className="text-[20px] font-semibold tabular-nums" style={{ color }}>
        {value}
      </span>
      <span className="text-[9px]" style={{ color: C.inkDim }}>
        {sub}
      </span>
    </div>
  );
}
