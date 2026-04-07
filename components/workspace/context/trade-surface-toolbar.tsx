"use client";

export function TradeSurfaceToolbar({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="border-b border-black/8 px-2 py-1.5">
      <div>
        <p className="text-[9px] uppercase tracking-[0.14em] text-black/30">{title}</p>
        <p className="mt-0.5 text-[10px] text-black/56">{subtitle}</p>
      </div>
    </div>
  );
}
