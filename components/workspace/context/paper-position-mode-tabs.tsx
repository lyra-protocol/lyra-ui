export function PaperPositionModeTabs({
  value,
  onChange,
}: {
  value: "manage" | "add" | "exit";
  onChange: (value: "manage" | "add" | "exit") => void;
}) {
  const items = [
    { id: "manage", label: "Manage" },
    { id: "add", label: "Add" },
    { id: "exit", label: "Exit" },
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-px border-y border-black/6 bg-black/6">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={[
            "h-7 bg-background px-2 text-[10px] font-medium uppercase tracking-[0.12em] transition",
            value === item.id ? "bg-black text-white" : "text-black/34 hover:text-black/72",
          ].join(" ")}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
