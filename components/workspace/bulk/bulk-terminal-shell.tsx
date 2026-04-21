"use client";

import { CommandPalette } from "@/components/shell/command-palette";
import { WorkspaceAiChatModal } from "@/components/workspace/context/workspace-ai-chat-modal";
import { AiTradeEntryModal } from "@/components/workspace/context/ai-trade-entry-modal";
import { TerminalOnboardingModal } from "@/components/workspace/onboarding/terminal-onboarding-modal";
import { ActiveMarketSync } from "@/components/workspace/active-market-sync";
import { MarketBootstrap } from "@/components/workspace/market-bootstrap";
import { WorkspaceHotkeys } from "@/components/workspace/workspace-hotkeys";
import { WorkspaceSessionSync } from "@/components/workspace/workspace-session-sync";
import { WorkspaceRealtimeSync } from "@/components/workspace/workspace-realtime-sync";
import { LiveMarketChart } from "@/components/workspace/live-market-chart";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { usePaperPositions } from "@/hooks/use-paper-positions";
import { useMarketUniverse } from "@/hooks/use-market-universe";
import { BulkTopBar } from "@/components/workspace/bulk/bulk-top-bar";
import { BulkMiniTickerStrip } from "@/components/workspace/bulk/bulk-mini-ticker-strip";
import { BulkPairHeader } from "@/components/workspace/bulk/bulk-pair-header";
import { BulkChartToolRail } from "@/components/workspace/bulk/bulk-chart-tool-rail";
import { BulkTimeframeBar } from "@/components/workspace/bulk/bulk-timeframe-bar";
import { BulkOrderbook } from "@/components/workspace/bulk/bulk-orderbook";
import { BulkTradeTicket } from "@/components/workspace/bulk/bulk-trade-ticket";
import { BulkBottomTabs } from "@/components/workspace/bulk/bulk-bottom-tabs";
import { useTpSlWatcher } from "@/hooks/use-tp-sl-watcher";
import { useTerminalPreferencesStore } from "@/stores/terminal-preferences-store";
import {
  formatCompactNumber,
  formatPercent,
  formatPrice,
  getPercentChange,
} from "@/core/market/format";

export function BulkTerminalShell() {
  const { activeProductId, activeTimeframe, activeMarketSnapshot } = useWorkspaceStore();
  const positions = usePaperPositions();
  const activePosition =
    positions.find((position) => position.productId === activeProductId) ?? null;
  const chartOverlay = useTerminalPreferencesStore((state) => state.chartOverlay);

  // Background watcher: auto-closes any position when its SL or TP is hit.
  useTpSlWatcher();

  return (
    <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
      <WorkspaceHotkeys />
      <WorkspaceSessionSync />
      <WorkspaceRealtimeSync />
      <MarketBootstrap />
      <ActiveMarketSync />

      <BulkTopBar />
      <BulkMiniTickerStrip />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left: chart column with its own bottom tabs sitting under chart + orderbook only */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <section className="flex min-w-0 flex-1 flex-col">
              <BulkPairHeader />
              <BulkTimeframeBar />
              <div className="flex min-h-0 flex-1">
                <BulkChartToolRail />
                <div className="relative min-h-0 min-w-0 flex-1 bg-background">
                  {chartOverlay === "chart" ? (
                    <LiveMarketChart
                      productId={activeProductId}
                      timeframe={activeTimeframe}
                      snapshot={activeMarketSnapshot}
                      activePosition={activePosition}
                    />
                  ) : chartOverlay === "depth" ? (
                    <DepthSurface />
                  ) : (
                    <MarketInfoSurface />
                  )}
                </div>
              </div>
            </section>

            <aside className="hidden w-[18%] min-w-[240px] max-w-[320px] shrink-0 md:flex">
              <BulkOrderbook />
            </aside>
          </div>

          {/* Bottom tabs span chart + orderbook only */}
          <div className="h-[240px] min-h-[240px] shrink-0 border-t border-[var(--line)]">
            <BulkBottomTabs />
          </div>
        </div>

        {/* Right: trade ticket is full height, top to bottom */}
        <aside className="hidden w-[22%] min-w-[300px] max-w-[380px] shrink-0 lg:flex">
          <BulkTradeTicket />
        </aside>
      </div>

      <CommandPalette />
      <WorkspaceAiChatModal />
      <AiTradeEntryModal />
      <TerminalOnboardingModal />
    </main>
  );
}

function DepthSurface() {
  const { activeProductId, activeMarketSnapshot } = useWorkspaceStore();
  const mid = activeMarketSnapshot?.price ?? 0;
  const symbol = activeProductId?.replace(/-USD$/i, "") || "—";
  // Simple synthetic depth curve so the view renders meaningful bars.
  const levels = 20;
  const step = Math.max(0.25, mid * 0.00005);
  const rows = Array.from({ length: levels }, (_, i) => {
    const bidPrice = mid - (i + 1) * step;
    const askPrice = mid + (i + 1) * step;
    const bidSize = Math.round((100_000 / (i + 1)) * (1 + Math.sin(i) * 0.1));
    const askSize = Math.round((100_000 / (i + 1)) * (1 + Math.cos(i) * 0.1));
    return { bidPrice, askPrice, bidSize, askSize };
  });
  const maxSize = Math.max(1, ...rows.flatMap((row) => [row.bidSize, row.askSize]));

  return (
    <div className="flex h-full min-h-0 flex-col px-6 py-4">
      <div className="mb-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/45">
          Market depth
        </p>
        <h2 className="text-[18px] font-semibold tracking-tight">
          {symbol}-USD
        </h2>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
        <DepthColumn
          label="Bids"
          accent="var(--positive)"
          rows={rows.map((row) => ({ price: row.bidPrice, size: row.bidSize }))}
          maxSize={maxSize}
          direction="right"
        />
        <DepthColumn
          label="Asks"
          accent="var(--negative)"
          rows={rows.map((row) => ({ price: row.askPrice, size: row.askSize }))}
          maxSize={maxSize}
          direction="left"
        />
      </div>
    </div>
  );
}

function DepthColumn({
  label,
  accent,
  rows,
  maxSize,
  direction,
}: {
  label: string;
  accent: string;
  rows: Array<{ price: number; size: number }>;
  maxSize: number;
  direction: "left" | "right";
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-foreground/45">
        {label}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.map((row, index) => (
          <div
            key={index}
            className="relative grid grid-cols-2 items-center py-[3px] text-[11px]"
          >
            <div
              className="absolute inset-y-0 opacity-20"
              style={{
                background: accent,
                width: `${(row.size / maxSize) * 100}%`,
                right: direction === "left" ? 0 : undefined,
                left: direction === "right" ? 0 : undefined,
              }}
            />
            <span
              className="relative tabular-nums"
              style={{ color: accent }}
            >
              {formatPrice(row.price)}
            </span>
            <span className="relative text-right tabular-nums text-foreground/75">
              {row.size.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketInfoSurface() {
  const { activeProductId, activeMarketSnapshot } = useWorkspaceStore();
  const universe = useMarketUniverse();
  const market = universe.data?.find((item) => item.id === activeProductId) ?? null;
  const symbol = market?.symbol ?? activeProductId?.replace(/-USD$/i, "") ?? "—";
  const change = getPercentChange(activeMarketSnapshot);
  const changeClass =
    typeof change === "number"
      ? change >= 0
        ? "text-[var(--positive)]"
        : "text-[var(--negative)]"
      : "text-foreground/60";

  return (
    <div className="h-full min-h-0 overflow-y-auto px-6 py-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/45">
        Market info
      </p>
      <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
        {symbol}-USD
      </h2>
      <p className="mt-0.5 text-[12px] text-foreground/55">
        Perpetual contract · margin in USD
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <InfoTile
          label="Last price"
          value={formatPrice(activeMarketSnapshot?.price ?? market?.current_price ?? undefined)}
        />
        <InfoTile
          label="24h change"
          value={formatPercent(change)}
          accent={changeClass}
        />
        <InfoTile
          label="Max leverage"
          value={market?.max_leverage ? `${market.max_leverage}x` : "—"}
        />
        <InfoTile
          label="24h volume"
          value={
            market?.exchange_volume_24h
              ? `$${formatCompactNumber(market.exchange_volume_24h)}`
              : "—"
          }
        />
        <InfoTile
          label="Open interest"
          value={
            market?.open_interest
              ? `$${formatCompactNumber(market.open_interest)}`
              : "—"
          }
        />
        <InfoTile label="Funding" value="—" />
        <InfoTile
          label="24h high"
          value={formatPrice(activeMarketSnapshot?.high24h)}
        />
        <InfoTile
          label="24h low"
          value={formatPrice(activeMarketSnapshot?.low24h)}
        />
      </div>

      <section className="mt-6 rounded-[10px] border border-[var(--line)] bg-[var(--panel-2)] p-4 text-[12px] leading-[1.55] text-foreground/70">
        <p className="text-[10px] uppercase tracking-[0.18em] text-foreground/45">
          About {symbol}
        </p>
        <p className="mt-1.5">
          Lyra aggregates orderbook, trade and funding data across venues and
          routes execution through its paper engine today. Mainnet routing will
          ship alongside the same tools you see here.
        </p>
      </section>
    </div>
  );
}

function InfoTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-[10px] border border-[var(--line)] bg-[var(--panel-2)] p-3">
      <p className="text-[10px] uppercase tracking-wider text-foreground/45">
        {label}
      </p>
      <p className={`mt-1 text-[14px] font-semibold tabular-nums ${accent ?? "text-foreground/90"}`}>
        {value}
      </p>
    </div>
  );
}
