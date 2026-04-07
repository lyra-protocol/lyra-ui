import {
  PAPER_LEVERAGE_MIN,
  getPaperLeverageMarks,
} from "@/core/paper/leverage";

export function PaperLeverageSelector({
  value,
  onChange,
  max,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  max: number;
  disabled?: boolean;
}) {
  const marks = getPaperLeverageMarks(max);

  return (
    <div className="border border-black/8 bg-white px-2 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-black/40">Leverage</span>
        <span className="text-[10px] font-medium tabular-nums text-black/84">{value}x</span>
      </div>
      <input
        type="range"
        min={PAPER_LEVERAGE_MIN}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 block h-4 w-full cursor-pointer appearance-none bg-transparent accent-black disabled:cursor-not-allowed disabled:accent-black/20"
        aria-label="Leverage"
      />
      <div className="mt-0.5 flex items-center justify-between text-[8px] uppercase tracking-[0.12em] text-black/28">
        {marks.map((option) => (
          <span key={option}>{option}x</span>
        ))}
      </div>
    </div>
  );
}
