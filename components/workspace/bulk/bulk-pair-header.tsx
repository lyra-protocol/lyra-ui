"use client";

import { Star, ChevronDown } from "lucide-react";
import { useMarketUniverse } from "@/hooks/use-market-universe";
import { formatPrice, formatPercent, getPercentChange } from "@/core/market/format";
import { useWorkspaceStore } from "@/stores/workspace-store";

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col justify-center">
      <span className="text-[10px] uppercase tracking-[0.08em] text-foreground/40">{label}</span>
      <span className={`text-[11px] tabular-nums ${accent ?? "text-foreground/85"}`}>{value}</span>
    </div>
  );
}

export function BulkPairHeader() {
  const { activeProductId, activeMarketSnapshot } = useWorkspaceStore();
  const universe = useMarketUniverse();
  const market = universe.data?.find((m) => m.id === activeProductId) ?? null;

  const price = activeMarketSnapshot?.price ?? market?.current_price ?? 0;
  const change = getPercentChange(activeMarketSnapshot);
  const changeAbs =
    typeof change === "number" && price > 0 ? (price * change) / 100 : null;
  const changeClass =
    typeof change === "number"
      ? change >= 0
        ? "text-[var(--positive)]"
        : "text-[var(--negative)]"
      : "text-foreground/60";
  const symbol = market?.symbol ?? activeProductId?.replace(/-USD$/i, "") ?? "—";

  return (
    <div className="flex min-h-[52px] items-center gap-6 overflow-x-auto border-b border-[var(--line)] bg-[var(--panel)] px-3">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1 text-left transition hover:bg-foreground/[0.04]"
      >
        <Star className="h-3.5 w-3.5 text-yellow-400" />
        <span className="text-[12px] font-semibold text-foreground/90">{symbol}-USD</span>
        <span className="rounded-[4px] border border-[var(--line)] px-1 text-[9px] uppercase text-foreground/55">
          Perp
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-foreground/45" />
      </button>

      <div className="flex flex-col justify-center">
        <span className="text-[18px] font-semibold leading-tight tabular-nums text-foreground/95">
          {formatPrice(price)}
        </span>
        <span className={`text-[11px] tabular-nums ${changeClass}`}>
          {changeAbs !== null
            ? `${changeAbs >= 0 ? "+" : "-"}${Math.abs(changeAbs).toFixed(2)}`
            : "—"}{" "}
          {formatPercent(change)}
        </span>
      </div>

      <Stat label="Last Price" value={formatPrice(price)} />
      <Stat label="Oracle" value={formatPrice(price)} />
      <Stat
        label="24h Volume"
        value={
          market?.exchange_volume_24h
            ? `$${Math.round(market.exchange_volume_24h).toLocaleString()}`
            : "—"
        }
      />
      <Stat
        label="Open Interest"
        value={
          market?.open_interest
            ? `$${Math.round(market.open_interest).toLocaleString()}`
            : "—"
        }
      />
      <Stat label="Funding/Countdown" value="—" />
      <Stat label="24h High" value={formatPrice(activeMarketSnapshot?.high24h)} />
      <Stat label="24h Low" value={formatPrice(activeMarketSnapshot?.low24h)} />
    </div>
  );
}
