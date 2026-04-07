function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatNotional(value: number) {
  if (value <= 0) {
    return "0";
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function PaperBalanceSlider({
  availableBalance,
  notional,
  onNotionalChange,
}: {
  availableBalance: number;
  notional: number;
  onNotionalChange: (value: string) => void;
}) {
  const percent = availableBalance > 0 ? Math.max(0, Math.min(100, (notional / availableBalance) * 100)) : 0;

  return (
    <div className="border-b border-black/8 px-1.5 py-1">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-black/40">Balance usage</span>
        <span className="tabular-nums text-black/78">{formatPercent(percent)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={percent}
        onChange={(event) => {
          const nextPercent = Number(event.target.value);
          const nextNotional = availableBalance * (nextPercent / 100);
          onNotionalChange(formatNotional(nextNotional));
        }}
        className="mt-1 block h-4 w-full cursor-pointer appearance-none bg-transparent accent-black"
        aria-label="Position size"
      />
      <div className="mt-0.5 flex items-center justify-between text-[8px] uppercase tracking-[0.12em] text-black/28">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
