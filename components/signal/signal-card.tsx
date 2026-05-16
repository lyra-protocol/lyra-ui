"use client";

import { ExternalLink } from "lucide-react";
import type { SignalAlert } from "@/core/signal/signal-types";
import { cn } from "@/lib/utils";
import {
  formatUsd,
  formatWallet,
  ruleLabel,
  severityBucket,
  signalName,
  signalSymbol,
  timeAgo,
} from "@/components/signal/signal-format";
import {
  birdeyeSolanaTokenUrl,
  dexScreenerSolanaPairUrl,
  pumpFunCoinUrl,
} from "@/core/signal/token-explorer-urls";

const RULE_STYLE: Record<string, { bar: string; chip: string; label: string }> = {
  large_wallet_usd: { bar: "bg-amber-400",   chip: "border-amber-400/35 bg-amber-400/10 text-amber-300",   label: "WHALE"    },
  whale_move:       { bar: "bg-amber-400",   chip: "border-amber-400/35 bg-amber-400/10 text-amber-300",   label: "WHALE"    },
  new_launch:       { bar: "bg-blue-400",    chip: "border-blue-400/35 bg-blue-400/10 text-blue-300",      label: "LAUNCH"   },
  early_buy_index:  { bar: "bg-sky-400",     chip: "border-sky-400/35 bg-sky-400/10 text-sky-300",         label: "EARLY"    },
  volume_acceleration: { bar: "bg-fuchsia-400", chip: "border-fuchsia-400/35 bg-fuchsia-400/10 text-fuchsia-300", label: "SURGE" },
  trending_breakout:{ bar: "bg-purple-400",  chip: "border-purple-400/35 bg-purple-400/10 text-purple-300", label: "TREND"   },
  bonding_migration:{ bar: "bg-emerald-400", chip: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300", label: "GRAD"  },
  top_gainer:       { bar: "bg-emerald-400", chip: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300", label: "GAIN"  },
  momentum_spike:   { bar: "bg-orange-400",  chip: "border-orange-400/35 bg-orange-400/10 text-orange-300",  label: "MOMEN"  },
};

const DEFAULT_RULE_STYLE = {
  bar: "bg-foreground/20",
  chip: "border-[var(--line)] bg-[var(--panel-2)] text-foreground/50",
  label: "SIGNAL",
};

function getRuleStyle(rule: string) {
  return RULE_STYLE[rule] ?? DEFAULT_RULE_STYLE;
}

function sourceLabel(source: string) {
  if (!source || source === "unknown") return null;
  return source.toUpperCase();
}

type Props = {
  alert: SignalAlert;
  active: boolean;
  onSelect: () => void;
  now: number;
};

export function SignalCard({ alert, active, onSelect, now }: Props) {
  const { event } = alert;
  const severity = severityBucket(alert);
  const style = getRuleStyle(alert.primaryRule);
  const symbol = signalSymbol(alert)?.toUpperCase() ?? event.token.slice(0, 6).toUpperCase();
  const name = signalName(alert);
  const fresh = now - new Date(alert.createdAt).getTime() < 8_000;
  const birdeye = event.metadata?.birdeye;
  const src = sourceLabel(event.source);
  const mint = event.token;
  const explorerBase = event.source === "birdeye"
    ? birdeyeSolanaTokenUrl(mint)
    : pumpFunCoinUrl(mint);

  const usdStr = event.sizeUsd >= 500 ? formatUsd(event.sizeUsd) : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex w-full overflow-hidden rounded-[10px] border text-left transition-all duration-100",
        active
          ? "border-foreground/20 bg-foreground/[0.05] shadow-[0_0_0_1px_rgba(255,255,255,0.05)]"
          : "border-[var(--line)] bg-[var(--panel)] hover:border-foreground/14 hover:bg-foreground/[0.02]",
        fresh && !active && "shadow-[0_0_16px_rgba(250,204,21,0.04)]",
      )}
    >
      {/* Severity accent bar */}
      <span
        className={cn("w-[3px] shrink-0 rounded-l-[10px]", style.bar)}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-3.5 py-2.5">
        {/* Row 1: rule chip · symbol · sentence · usd · time */}
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "shrink-0 rounded-[4px] border px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.1em]",
              style.chip,
            )}
          >
            {style.label !== "SIGNAL" ? style.label : ruleLabel(alert.primaryRule)}
          </span>

          <span className="shrink-0 font-mono text-[13px] font-bold tabular-nums text-foreground">
            {symbol}
          </span>

          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[12px] leading-snug",
              active ? "text-foreground/85" : "text-foreground/50",
            )}
          >
            {alert.sentence}
          </span>

          {usdStr && (
            <span
              className={cn(
                "shrink-0 font-mono text-[12px] font-medium tabular-nums",
                severity === "critical" ? "text-red-400" :
                severity === "alert"    ? "text-amber-400" :
                severity === "notable"  ? "text-foreground/80" :
                "text-foreground/50",
              )}
            >
              {usdStr}
            </span>
          )}

          <span className="shrink-0 font-mono text-[10px] tabular-nums text-foreground/30">
            {timeAgo(alert.createdAt)}
          </span>
        </div>

        {/* Row 2: action · source · wallet · (active: quick metrics) · links */}
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-[3px] border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-px font-mono text-[8px] uppercase tracking-wider text-foreground/40">
            {event.action}
          </span>

          {src && (
            <span className="text-[10px] uppercase tracking-wider text-foreground/25">
              {src}
            </span>
          )}

          <span className="font-mono text-[10px] text-foreground/30">
            {formatWallet(event.wallet)}
          </span>

          {name && !active && (
            <span className="max-w-[120px] truncate text-[10px] text-foreground/30">
              {name}
            </span>
          )}

          {/* Inline birdeye metrics when active */}
          {active && birdeye && (
            <div className="ml-1 flex items-center gap-2 text-[10px]">
              {typeof birdeye.safetyScore === "number" && (
                <span
                  className={cn(
                    "rounded-[4px] border px-1.5 py-px font-mono tabular-nums",
                    birdeye.safetyScore >= 80
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : birdeye.safetyScore >= 60
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      : "border-red-500/30 bg-red-500/10 text-red-400",
                  )}
                >
                  Safety {birdeye.safetyScore}
                </span>
              )}
              {typeof birdeye.liquidityUsd === "number" && (
                <span className="text-foreground/45">
                  Liq {formatUsd(birdeye.liquidityUsd)}
                </span>
              )}
              {typeof birdeye.price24hChangePercent === "number" && (
                <span
                  className={cn(
                    "font-mono tabular-nums",
                    birdeye.price24hChangePercent >= 0
                      ? "text-[var(--positive)]"
                      : "text-[var(--negative)]",
                  )}
                >
                  {birdeye.price24hChangePercent >= 0 ? "+" : ""}
                  {birdeye.price24hChangePercent.toFixed(0)}%
                </span>
              )}
            </div>
          )}

          {/* Quick-link buttons — visible on hover */}
          <div
            className="ml-auto flex shrink-0 items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <a
              href={explorerBase}
              target="_blank"
              rel="noreferrer noopener"
              title={event.source === "birdeye" ? "Open on Birdeye" : "Open on pump.fun"}
              className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] border border-[var(--line)] text-foreground/30 opacity-0 transition group-hover:opacity-100 hover:border-foreground/20 hover:text-foreground"
            >
              <span className="text-[8px] font-bold leading-none">
                {event.source === "birdeye" ? "B" : "P"}
              </span>
            </a>
            <a
              href={dexScreenerSolanaPairUrl(mint)}
              target="_blank"
              rel="noreferrer noopener"
              title="DexScreener"
              className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] border border-[var(--line)] text-foreground/30 opacity-0 transition group-hover:opacity-100 hover:border-foreground/20 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </button>
  );
}
