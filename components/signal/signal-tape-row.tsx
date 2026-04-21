"use client";

import { ArrowDownRight, ArrowUpRight, Sparkles, Zap } from "lucide-react";
import type { SignalAlert } from "@/core/signal/signal-types";
import { cn } from "@/lib/utils";
import {
  formatToken,
  formatUsd,
  formatWallet,
  ruleAccent,
  ruleLabel,
  severityOf,
  timestampLabel,
} from "@/components/signal/signal-format";

type Props = {
  alert: SignalAlert;
  active: boolean;
  onSelect: () => void;
};

/**
 * Single tape row. Severity controls visual weight so the feed reads like a
 * tape — whales stand out, dust stays muted.
 */
export function SignalTapeRow({ alert, active, onSelect }: Props) {
  const { event } = alert;
  const severity = severityOf(alert);
  const isBuy = event.action === "buy" || event.action === "create";
  const isSell = event.action === "sell";
  const Icon =
    event.action === "create" ? Sparkles : isSell ? ArrowDownRight : isBuy ? ArrowUpRight : Zap;
  const sideClass = isBuy
    ? "text-[var(--positive)]"
    : isSell
      ? "text-[var(--negative)]"
      : "text-foreground/70";
  const symbol = event.metadata?.pump?.symbol;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group grid w-full grid-cols-[64px_28px_1fr_90px_100px_44px] items-center gap-2 px-4 py-1.5 text-left transition",
        active ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.03]",
        severity === 3 && "text-foreground",
        severity === 2 && "text-foreground/90",
        severity === 1 && "text-foreground/80",
        severity === 0 && "text-foreground/55"
      )}
    >
      <span className="font-mono text-[10px] tabular-nums text-foreground/40">
        {timestampLabel(alert.createdAt)}
      </span>
      <span className={cn("flex h-4 w-4 items-center justify-center", sideClass)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="flex min-w-0 items-center gap-2 text-[12px]">
        <span
          className={cn(
            "shrink-0 rounded-[3px] border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-px text-[9px] uppercase tracking-wider",
            ruleAccent(alert.primaryRule)
          )}
        >
          {ruleLabel(alert.primaryRule)}
        </span>
        <span
          className={cn(
            "shrink-0 font-medium",
            severity >= 2 ? "text-foreground" : "text-foreground/85"
          )}
        >
          {formatToken(event.token, symbol)}
        </span>
        <span className="truncate text-[11px] text-foreground/55">
          {alert.sentence}
        </span>
      </span>
      <span
        className={cn(
          "text-right font-mono tabular-nums",
          severity >= 2 ? "text-foreground" : "text-foreground/65"
        )}
      >
        {formatUsd(event.sizeUsd)}
      </span>
      <span className="text-right font-mono text-[10px] text-foreground/45">
        {formatWallet(event.wallet)}
      </span>
      <span className="text-right font-mono text-[10px] uppercase tracking-wider text-foreground/35">
        {event.source}
      </span>
    </button>
  );
}
