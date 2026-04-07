/* eslint-disable @next/next/no-img-element */
import { MouseEventHandler } from "react";
import { formatPercent, formatPrice } from "@/core/market/format";

type MarketListRowProps = {
  id: string;
  symbol: string;
  name: string;
  imageUrl?: string;
  lastPrice: number;
  change24h: number | null;
  active?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
};

export function MarketListRow({
  id,
  symbol,
  name,
  imageUrl,
  lastPrice,
  change24h,
  active,
  onClick,
}: MarketListRowProps) {
  const percentClass =
    typeof change24h === "number"
      ? change24h >= 0
        ? "text-[var(--positive)]"
        : "text-[var(--negative)]"
      : "text-black/40";
  const symbolClass = symbol.length > 9 ? "text-[9px]" : "text-[10px]";

  return (
    <button
      type="button"
      onClick={onClick}
      title={id}
      className={[
        "grid h-8 w-full grid-cols-[minmax(0,1fr)_64px_44px] items-center gap-1.5 border-b border-black/6 px-2 text-left text-[10px] tabular-nums transition",
        active ? "bg-black/[0.03]" : "hover:bg-black/[0.02]",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-3.5 w-3.5 shrink-0 rounded-full" />
        ) : (
          <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-black/8" />
        )}
        <div className="min-w-0">
          <p className={["truncate font-medium tracking-[0.01em] text-black/88", symbolClass].join(" ")}>
            {symbol}
          </p>
          <p className="truncate text-[8px] leading-3 text-black/32">{name}</p>
        </div>
      </div>
      <span className="text-right text-[9px] text-black/64">{formatPrice(lastPrice)}</span>
      <span className={["text-right text-[9px]", percentClass].join(" ")}>
        {formatPercent(change24h)}
      </span>
    </button>
  );
}
