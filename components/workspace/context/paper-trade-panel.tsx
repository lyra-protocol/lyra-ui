"use client";

import { TradeSurfaceToolbar } from "@/components/workspace/context/trade-surface-toolbar";
import { PaperPositionManagementPanel } from "@/components/workspace/context/paper-position-management-panel";
import { PaperTradeSetupPanel } from "@/components/workspace/context/paper-trade-setup-panel";
import { PAPER_LEVERAGE_MAX } from "@/core/paper/leverage";
import { usePaperWorkspace } from "@/hooks/use-paper-workspace";
import { PaperPosition } from "@/core/paper/types";

export function PaperTradePanel({
  authenticated,
  symbol,
  productId,
  price,
  availableBalance,
  activePosition,
  onConnectWallet,
}: {
  authenticated: boolean;
  symbol: string;
  productId: string;
  price: number;
  availableBalance: number;
  activePosition: PaperPosition | null;
  onConnectWallet: () => void;
}) {
  const workspace = usePaperWorkspace();
  const executionMaxLeverage = workspace.data?.capabilities.maxLeverage ?? 3;

  if (!authenticated) {
    return (
      <section className="border-b border-black/8">
        <TradeSurfaceToolbar
          title="Trade center"
          subtitle="Connect a wallet to begin paper trading."
        />
        <div className="px-2 py-1.5">
          <button
            type="button"
            onClick={onConnectWallet}
            className="h-8 border border-black/10 bg-black px-3 text-[10px] font-medium text-white transition hover:bg-black/88"
          >
            Connect wallet
          </button>
        </div>
      </section>
    );
  }

  if (activePosition) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <TradeSurfaceToolbar
          title="Trade center"
          subtitle={`${activePosition.direction === "short" ? "Short" : "Long"} ${symbol} · ${activePosition.leverage}x`}
        />
        <PaperPositionManagementPanel
          key={`${activePosition.id}:${activePosition.updatedAt}`}
          symbol={symbol}
          productId={productId}
          price={price}
          availableBalance={availableBalance}
          activePosition={activePosition}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TradeSurfaceToolbar title="Trade center" subtitle={`${symbol} · define the trade before opening`} />
      <PaperTradeSetupPanel
        symbol={symbol}
        productId={productId}
        price={price}
        availableBalance={availableBalance}
        sliderMaxLeverage={PAPER_LEVERAGE_MAX}
        executionMaxLeverage={executionMaxLeverage}
      />
    </div>
  );
}
