/* eslint-disable @next/next/no-img-element */
import { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-3">
      <p className="text-[9px] uppercase tracking-[0.14em] text-black/26">{children}</p>
    </div>
  );
}

export function MemoryRow({
  active = false,
  label,
  meta,
  onClick,
}: {
  active?: boolean;
  label: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "grid h-7 w-full grid-cols-[1fr_auto] items-center gap-2 px-2 text-left text-[10px] transition",
        active ? "bg-black/[0.035]" : "hover:bg-black/[0.02]",
      ].join(" ")}
    >
      <span className="truncate font-medium text-black/86">{label}</span>
      <span className="text-[9px] uppercase tracking-[0.08em] text-black/34">{meta}</span>
    </button>
  );
}

export function MarketMemoryRow({
  active = false,
  label,
  meta,
  imageUrl,
  onClick,
}: {
  active?: boolean;
  label: string;
  meta: string;
  imageUrl?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-8 w-full items-center gap-2 px-2 text-left transition",
        active ? "bg-black/[0.035]" : "hover:bg-black/[0.02]",
      ].join(" ")}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center bg-black/8 text-[8px] font-medium uppercase text-black/54">
          {label.slice(0, 1)}
        </span>
      )}
      <span className="min-w-0 flex flex-1 items-center gap-1.5">
        <span className="shrink-0 font-medium text-black/88">{label}</span>
        <span className="truncate text-[9px] text-black/36">{meta}</span>
      </span>
    </button>
  );
}
