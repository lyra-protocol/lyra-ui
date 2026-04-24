"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/core/market/format";
import { useBirdeyeRadar, type BirdeyeRadarMode, type BirdeyeRadarToken } from "@/hooks/use-birdeye-radar";
import { Button } from "@/components/ui/button";

function badgeTone(score: number) {
  if (score >= 80) return "bg-[var(--positive)]/15 text-[var(--positive)] border-[var(--positive)]/25";
  if (score >= 60) return "bg-yellow-400/15 text-yellow-300 border-yellow-400/25";
  return "bg-[var(--negative)]/12 text-[var(--negative)] border-[var(--negative)]/20";
}

function formatCompactUsd(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function tokenKey(t: BirdeyeRadarToken) {
  return `${t.address}:${t.symbol}`;
}

export function BulkRadarPanel() {
  const [mode, setMode] = useState<BirdeyeRadarMode>("trending");
  const radar = useBirdeyeRadar({ mode, limit: 12 });
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  const rows = useMemo(() => radar.data?.tokens ?? [], [radar.data?.tokens]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/[0.06] ring-1 ring-foreground/10">
            <Image src="/lyra.svg" alt="Lyra" width={18} height={18} className="opacity-95" unoptimized />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-foreground/90">Radar</p>
            <p className="text-[10px] text-foreground/45">
              Powered by Birdeye: trending + new listings + token security
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-foreground/10 bg-foreground/[0.03] p-0.5 text-[11px]">
          {(["trending", "new"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                "rounded-full px-3 py-1 transition",
                mode === id ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground"
              )}
            >
              {id === "trending" ? "Trending" : "New"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2">
        <p className="text-[10px] text-foreground/50">
          Publish top picks into <span className="font-mono text-foreground/60">lyra_trading_signals</span> so Claude{" "}
          <span className="font-medium text-foreground/65">get_alerts</span> becomes a real feed.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full"
          disabled={publishing || radar.isLoading}
          onClick={async () => {
            setPublishMessage(null);
            setPublishing(true);
            try {
              const res = await fetch("/api/birdeye/signals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode, limit: 10 }),
              });
              const json = (await res.json()) as { ok?: boolean; inserted?: number; message?: string };
              if (!res.ok || !json.ok) {
                throw new Error(json.message ?? "Unable to publish signals.");
              }
              setPublishMessage(`Published ${json.inserted ?? 0} signal(s).`);
            } catch (e) {
              setPublishMessage(e instanceof Error ? e.message : "Publish failed.");
            } finally {
              setPublishing(false);
            }
          }}
        >
          {publishing ? "Publishing…" : "Publish signals"}
        </Button>
      </div>

      {publishMessage ? (
        <div className="border-b border-[var(--line)] px-3 py-2 text-[10px] text-foreground/55">
          {publishMessage}
        </div>
      ) : null}

      {radar.isLoading ? (
        <div className="flex flex-1 items-center justify-center text-[11px] text-foreground/45">Loading radar…</div>
      ) : radar.error instanceof Error ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center text-[11px] text-[var(--negative)]">
          {radar.error.message}
        </div>
      ) : !rows.length ? (
        <div className="flex flex-1 items-center justify-center text-[11px] text-foreground/45">No tokens yet.</div>
      ) : (
        <>
          <div className="grid shrink-0 grid-cols-[1.2fr_0.7fr_0.9fr_0.9fr_0.7fr] gap-0 border-b border-[var(--line)] px-3 py-1.5 text-[9px] uppercase tracking-wider text-foreground/40">
            <span>Token</span>
            <span className="text-right">Score</span>
            <span className="text-right">Liquidity</span>
            <span className="text-right">Vol 24h</span>
            <span className="text-right">24h</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {rows.map((t) => (
              <button
                key={tokenKey(t)}
                type="button"
                className="grid w-full grid-cols-[1.2fr_0.7fr_0.9fr_0.9fr_0.7fr] items-center gap-0 border-b border-[var(--line)] px-3 py-2 text-left text-[11px] transition hover:bg-foreground/[0.05]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-foreground/10 bg-foreground/[0.03]">
                    {t.logoURI ? (
                      <Image src={t.logoURI} alt="" width={32} height={32} className="h-8 w-8 object-cover" unoptimized />
                    ) : (
                      <span className="text-[10px] font-semibold text-foreground/50">
                        {t.symbol.slice(0, 3).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground/90">{t.symbol}</p>
                    <p className="truncate text-[10px] text-foreground/45">{t.name}</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px] tabular-nums", badgeTone(t.score))}>
                    {t.score}
                  </span>
                </div>

                <span className="text-right font-mono tabular-nums text-foreground/70">
                  {formatCompactUsd(t.liquidityUSD)}
                </span>
                <span className="text-right font-mono tabular-nums text-foreground/70">
                  {formatCompactUsd(t.volume24hUSD)}
                </span>
                <span
                  className={cn(
                    "text-right font-mono tabular-nums",
                    (t.price24hChangePercent ?? 0) >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                  )}
                >
                  {t.price24hChangePercent == null ? "—" : `${t.price24hChangePercent >= 0 ? "+" : ""}${t.price24hChangePercent.toFixed(0)}%`}
                </span>

                <div className="col-span-5 mt-2 grid grid-cols-2 gap-2 rounded-xl border border-foreground/[0.06] bg-[var(--panel-2)]/40 px-3 py-2">
                  <div className="space-y-1">
                    <p className="text-[9px] font-medium uppercase tracking-wider text-foreground/40">Why</p>
                    <ul className="space-y-0.5 text-[10px] text-foreground/65">
                      {t.why.slice(0, 3).map((w, i) => (
                        <li key={i}>- {w}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-medium uppercase tracking-wider text-foreground/40">Warnings</p>
                    {t.warnings.length ? (
                      <ul className="space-y-0.5 text-[10px] text-foreground/60">
                        {t.warnings.slice(0, 3).map((w, i) => (
                          <li key={i}>- {w}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[10px] text-foreground/55">None flagged.</p>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center justify-between pt-1 text-[10px] text-foreground/45">
                    <span className="font-mono">{t.address.slice(0, 6)}…{t.address.slice(-4)}</span>
                    <span>
                      {t.priceUSD != null ? `Price ${formatPrice(t.priceUSD)}` : "Price —"}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="shrink-0 border-t border-[var(--line)] px-3 py-2 text-[10px] text-foreground/45">
        {radar.data?.updatedAt ? `Updated ${new Date(radar.data.updatedAt).toLocaleTimeString()}` : "—"}
      </div>
    </div>
  );
}

