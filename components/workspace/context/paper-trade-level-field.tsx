import {
  getTradeLevelPercentFromValue,
  getTradeLevelValueFromPercent,
  parseTradeLevelInput,
  PaperTradeLevelKind,
} from "@/core/paper/trade-levels";
import { PaperPositionDirection } from "@/core/paper/types";

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "";
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatPriceValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "";
  }

  return value.toFixed(4).replace(/\.?0+$/, "");
}

export function PaperTradeLevelField({
  label,
  kind,
  value,
  onChange,
  direction,
  referencePrice,
  invalid = false,
  hint,
}: {
  label: string;
  kind: PaperTradeLevelKind;
  value: string;
  onChange: (value: string) => void;
  direction: PaperPositionDirection;
  referencePrice: number;
  invalid?: boolean;
  hint?: string | null;
}) {
  const parsedValue = parseTradeLevelInput(value);
  const percentValue = formatPercent(
    getTradeLevelPercentFromValue({
      direction,
      referencePrice,
      level: parsedValue,
      kind,
    })
  );

  return (
    <div className="border border-black/8 bg-white px-2 py-1">
      <div className="flex items-center justify-between pb-1 text-[10px]">
        <span className="text-black/42">{label}</span>
        <span className="text-black/28">Value / %</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid grid-cols-[1fr_auto] items-center border border-black/8 px-2">
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={invalid}
            className={`h-8 min-w-0 bg-white text-right text-[12px] tabular-nums outline-none ${
              invalid ? "text-[#8a3b3b]" : "text-black/84"
            }`}
          />
          <span className="pl-2 text-[10px] text-black/36">USD</span>
        </label>
        <label className="grid grid-cols-[1fr_auto] items-center border border-black/8 px-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={percentValue}
            onChange={(event) => {
              const raw = event.target.value.trim();
              if (!raw) {
                onChange("");
                return;
              }
              const nextPercent = Number(raw);
              if (!Number.isFinite(nextPercent) || nextPercent < 0) {
                onChange(raw);
                return;
              }
              onChange(
                formatPriceValue(
                  getTradeLevelValueFromPercent({
                    direction,
                    referencePrice,
                    percent: nextPercent,
                    kind,
                  })
                )
              );
            }}
            aria-invalid={invalid}
            className={`h-8 min-w-0 bg-white text-right text-[12px] tabular-nums outline-none ${
              invalid ? "text-[#8a3b3b]" : "text-black/84"
            }`}
          />
          <span className="pl-2 text-[10px] text-black/36">%</span>
        </label>
      </div>
      {hint ? <p className="pt-1 text-[9px] leading-4 text-[#8a3b3b]">{hint}</p> : null}
    </div>
  );
}
