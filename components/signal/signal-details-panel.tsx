"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { SignalAlert } from "@/core/signal/signal-types";
import { cn } from "@/lib/utils";
import {
  formatUsd,
  formatWallet,
  ruleLabel,
  severityBucket,
  severityLabel,
  signalName,
  signalSymbol,
  timeAgo,
  timestampLabel,
} from "@/components/signal/signal-format";
import {
  birdeyeSolanaTokenUrl,
  dexScreenerSolanaPairUrl,
  pumpFunCoinUrl,
} from "@/core/signal/token-explorer-urls";
import { SignalBirdeyeRadar } from "@/components/signal/signal-birdeye-radar";

type Props = {
  alert: SignalAlert | null;
};

export function SignalDetailsPanel({ alert }: Props) {
  if (!alert) {
    return (
      <aside className="flex h-full min-h-0 flex-col border-l border-[var(--line)] bg-[var(--panel)]">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/35">Inspector</p>
          <p className="mt-0.5 text-[12px] text-foreground/50">Select a signal to inspect</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SignalBirdeyeRadar />
        </div>
      </aside>
    );
  }

  const { event } = alert;
  const pump = event.metadata?.pump;
  const birdeye = event.metadata?.birdeye;
  const symbol = signalSymbol(alert)?.toUpperCase() ?? event.token.slice(0, 6).toUpperCase();
  const name = signalName(alert);
  const severity = severityBucket(alert);
  const mint = event.token;

  const severityColors: Record<string, string> = {
    critical: "border-red-500/30 bg-red-500/10 text-red-400",
    alert:    "border-amber-500/30 bg-amber-500/10 text-amber-400",
    notable:  "border-blue-500/30 bg-blue-500/10 text-blue-400",
    info:     "border-[var(--line)] bg-[var(--panel-2)] text-foreground/50",
  };

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-[var(--line)] bg-[var(--panel)]">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--line)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded-[4px] border px-1.5 py-px text-[9px] font-mono uppercase tracking-wider", severityColors[severity])}>
            {severityLabel(severity)}
          </span>
          <span className="rounded-[4px] border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-px text-[9px] font-mono uppercase tracking-wider text-foreground/50">
            {ruleLabel(alert.primaryRule)}
          </span>
          <span className="rounded-[4px] border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-px text-[9px] font-mono uppercase tracking-wider text-foreground/40">
            {event.action}
          </span>
          <span className="ml-auto font-mono text-[10px] text-foreground/35">
            {timestampLabel(alert.createdAt)} · {timeAgo(alert.createdAt)}
          </span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <h2 className="font-mono text-[22px] font-bold tracking-tight text-foreground leading-none">
            {symbol}
          </h2>
          {name && (
            <span className="text-[12px] text-foreground/45 truncate max-w-[160px]">{name}</span>
          )}
        </div>

        {event.sizeUsd >= 500 && (
          <p className="mt-0.5 font-mono text-[13px] tabular-nums text-foreground/70">
            {formatUsd(event.sizeUsd)}
          </p>
        )}

        <p className="mt-2.5 text-[13px] leading-[1.55] text-foreground/80">
          {alert.sentence}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Birdeye metrics grid */}
        {birdeye && (
          <div className="border-b border-[var(--line)] px-4 py-3">
            <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-foreground/35">
              Birdeye metrics
            </p>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--line)]">
              {typeof birdeye.safetyScore === "number" && (
                <MetricCell
                  label="Safety"
                  value={`${birdeye.safetyScore}/100`}
                  accent={
                    birdeye.safetyScore >= 80 ? "text-emerald-400" :
                    birdeye.safetyScore >= 60 ? "text-amber-400" :
                    "text-red-400"
                  }
                />
              )}
              {typeof birdeye.liquidityUsd === "number" && (
                <MetricCell label="Liquidity" value={formatUsd(birdeye.liquidityUsd)} />
              )}
              {typeof birdeye.marketCapUsd === "number" && (
                <MetricCell label="Market cap" value={formatUsd(birdeye.marketCapUsd)} />
              )}
              {typeof birdeye.price24hChangePercent === "number" && (
                <MetricCell
                  label="24h change"
                  value={`${birdeye.price24hChangePercent >= 0 ? "+" : ""}${birdeye.price24hChangePercent.toFixed(1)}%`}
                  accent={birdeye.price24hChangePercent >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}
                />
              )}
              {typeof birdeye.volume1hUsd === "number" && (
                <MetricCell label="Vol 1h" value={formatUsd(birdeye.volume1hUsd)} />
              )}
              {typeof birdeye.holderCount === "number" && (
                <MetricCell label="Holders" value={birdeye.holderCount.toLocaleString()} />
              )}
              {typeof birdeye.volumeSurgeMultiple === "number" && (
                <MetricCell label="Vol surge" value={`${birdeye.volumeSurgeMultiple.toFixed(1)}×`} accent="text-fuchsia-400" />
              )}
              {typeof birdeye.gainPercent === "number" && (
                <MetricCell
                  label="Gain"
                  value={`${birdeye.gainPercent >= 0 ? "+" : ""}${birdeye.gainPercent.toFixed(1)}%`}
                  accent={birdeye.gainPercent >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}
                />
              )}
              {typeof birdeye.priceUsd === "number" && (
                <MetricCell
                  label="Price"
                  value={birdeye.priceUsd < 0.01
                    ? `$${birdeye.priceUsd.toExponential(2)}`
                    : `$${birdeye.priceUsd.toFixed(4)}`}
                />
              )}
            </div>
            {birdeye.note && (
              <p className="mt-2 text-[10px] text-foreground/50">{birdeye.note}</p>
            )}
          </div>
        )}

        {/* Pump metadata */}
        {pump && (
          <div className="border-b border-[var(--line)] px-4 py-3">
            <p className="mb-1.5 text-[9px] uppercase tracking-[0.2em] text-foreground/35">
              Pump metadata
            </p>
            <div className="flex flex-col gap-[3px] text-[11px]">
              {typeof pump.marketCapSol === "number" && (
                <KVRow label="Market cap" value={`${pump.marketCapSol.toFixed(2)} SOL`} />
              )}
              {typeof pump.vSolInBondingCurve === "number" && (
                <KVRow label="Bonding curve" value={`${pump.vSolInBondingCurve.toFixed(2)} SOL`} />
              )}
              {pump.pool && <KVRow label="Pool" value={pump.pool} mono />}
              {pump.txType && pump.txType !== "heartbeat" && (
                <KVRow label="Tx type" value={pump.txType} />
              )}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="border-b border-[var(--line)] px-4 py-3">
          <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-foreground/35">
            Open in
          </p>
          <div className="flex flex-wrap gap-1.5">
            <LinkBtn href={birdeye?.birdeyeUrl ?? birdeyeSolanaTokenUrl(mint)} label="Birdeye" />
            <LinkBtn href={pumpFunCoinUrl(mint)} label="pump.fun" />
            <LinkBtn href={dexScreenerSolanaPairUrl(mint)} label="DexScreener" />
            <LinkBtn href={`https://solscan.io/token/${mint}`} label="Token · Solscan" />
            <LinkBtn href={`https://solscan.io/account/${event.wallet}`} label={`Wallet · ${formatWallet(event.wallet)}`} />
          </div>
        </div>

        {/* Identifiers */}
        <div className="px-4 py-3">
          <p className="mb-1.5 text-[9px] uppercase tracking-[0.2em] text-foreground/35">
            Identifiers
          </p>
          <div className="flex flex-col gap-[3px] text-[11px]">
            <CopyRow label="Token" value={mint} short />
            <CopyRow label="Wallet" value={event.wallet} short />
            {alert.score != null && (
              <KVRow label="Score" value={`${alert.score}/100`} />
            )}
            <KVRow label="Alert ID" value={alert.id.slice(0, 16) + "…"} mono />
          </div>
        </div>
      </div>
    </aside>
  );
}

function MetricCell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-0.5 bg-[var(--panel)] px-2.5 py-2">
      <span className="text-[9px] uppercase tracking-[0.12em] text-foreground/35">{label}</span>
      <span className={cn("font-mono text-[12px] tabular-nums text-foreground/85", accent)}>
        {value}
      </span>
    </div>
  );
}

function KVRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-[2px]">
      <span className="text-foreground/45">{label}</span>
      <span className={cn("max-w-[200px] truncate text-right", mono ? "font-mono tabular-nums text-foreground/80" : "text-foreground/75")}>
        {value}
      </span>
    </div>
  );
}

function CopyRow({ label, value, short }: { label: string; value: string; short?: boolean }) {
  const [copied, setCopied] = useState(false);
  const display = short && value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
  return (
    <div className="flex items-center justify-between gap-2 py-[2px]">
      <span className="text-foreground/45">{label}</span>
      <div className="flex min-w-0 items-center gap-1">
        <span className="max-w-[160px] truncate font-mono text-[10px] text-foreground/75">{display}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(value).catch(() => null);
            setCopied(true);
            setTimeout(() => setCopied(false), 1000);
          }}
          className="inline-flex h-5 w-5 items-center justify-center text-foreground/35 transition hover:text-foreground"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="h-3 w-3 text-[var(--positive)]" /> : <Copy className="h-3 w-3" />}
        </button>
        <a
          href={`https://solscan.io/${label === "Wallet" ? "account" : "token"}/${value}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-5 w-5 items-center justify-center text-foreground/35 transition hover:text-foreground"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function LinkBtn({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1 text-[10px] text-foreground/65 transition hover:border-foreground/20 hover:text-foreground"
    >
      <ExternalLink className="h-2.5 w-2.5" />
      {label}
    </a>
  );
}
