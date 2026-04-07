import { formatCompactNumber } from "@/core/market/format";

type AccountSummaryCardProps = {
  currency: string;
  cashBalance: number;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  positionCount: number;
};

function formatBalance(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function Metric({ label, value, tone = "text-black/84" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-background px-2 py-1">
      <p className={["text-[10px] font-medium tabular-nums", tone].join(" ")}>{value}</p>
      <p className="mt-0.5 text-[7px] uppercase tracking-[0.12em] text-black/28">{label}</p>
    </div>
  );
}

export function AccountSummaryCard({
  currency,
  cashBalance,
  equity,
  realizedPnl,
  unrealizedPnl,
  positionCount,
}: AccountSummaryCardProps) {
  return (
    <section className="border-b border-black/8">
      <div className="px-2 pb-1 pt-1.5">
        <p className="text-[16px] font-semibold tracking-tight tabular-nums text-black/92">
          {formatBalance(cashBalance)} {currency}
        </p>
        <p className="mt-0.5 text-[8px] uppercase tracking-[0.14em] text-black/28">Paper balance</p>
      </div>
      <div className="grid grid-cols-2 gap-px border-y border-black/6 bg-black/6">
        <Metric label="Equity" value={`${formatCompactNumber(equity)} ${currency}`} />
        <Metric
          label="Realized"
          value={`${realizedPnl >= 0 ? "+" : ""}${formatCompactNumber(realizedPnl)} ${currency}`}
          tone={realizedPnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}
        />
        <Metric
          label="Unrealized"
          value={`${unrealizedPnl >= 0 ? "+" : ""}${formatCompactNumber(unrealizedPnl)} ${currency}`}
          tone={unrealizedPnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}
        />
        <Metric label="Open positions" value={`${positionCount}`} />
      </div>
    </section>
  );
}
