type PreviewItem = {
  label: string;
  value: string;
  tone?: string;
};

export function PaperTradePreview({
  items,
  variant = "list",
}: {
  items: PreviewItem[];
  variant?: "list" | "grid";
}) {
  if (variant === "grid") {
    return (
      <div className="grid grid-cols-2 gap-px border-y border-black/6 bg-black/6">
        {items.map((item) => (
          <div key={item.label} className="bg-background px-2 py-1.5">
            <p className="text-[8px] uppercase tracking-[0.12em] text-black/28">{item.label}</p>
            <p className={["mt-0.5 text-[11px] font-medium tabular-nums text-black/78", item.tone ?? ""].join(" ")}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border-y border-black/6 bg-black/[0.02] px-2 py-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-3 text-[10px] leading-4">
          <span className="text-black/42">{item.label}</span>
          <span className={["text-right tabular-nums text-black/72", item.tone ?? ""].join(" ")}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
