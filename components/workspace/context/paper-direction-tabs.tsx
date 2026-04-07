import { PaperPositionDirection } from "@/core/paper/types";

export function PaperDirectionTabs({
  value,
  onChange,
}: {
  value: PaperPositionDirection;
  onChange: (value: PaperPositionDirection) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-px border-y border-black/6 bg-black/6">
      <button
        type="button"
        onClick={() => onChange("long")}
        className={[
          "h-7 bg-background px-2 text-[10px] font-medium uppercase tracking-[0.12em] transition",
          value === "long" ? "bg-black text-white" : "text-black/34 hover:text-black/72",
        ].join(" ")}
      >
        Long
      </button>
      <button
        type="button"
        onClick={() => onChange("short")}
        className={[
          "h-7 bg-background px-2 text-[10px] font-medium uppercase tracking-[0.12em] transition",
          value === "short" ? "bg-black text-white" : "text-black/34 hover:text-black/72",
        ].join(" ")}
      >
        Short
      </button>
    </div>
  );
}
