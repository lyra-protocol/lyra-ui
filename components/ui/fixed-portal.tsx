"use client";

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type PortalAnchorAlign = "start" | "end";

type FixedPortalProps = {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  align?: PortalAnchorAlign;
  width: number;
  /** Offset from the anchor bottom in px */
  offset?: number;
  /** onClose is called when clicking outside */
  onClose: () => void;
  className?: string;
  children: ReactNode;
};

function useIso() {
  return typeof window !== "undefined" ? useLayoutEffect : useEffect;
}

export function FixedPortal({
  anchorRef,
  open,
  align = "start",
  width,
  offset = 6,
  onClose,
  className,
  children,
}: FixedPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  const compute = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 8;
    const panelWidth = Math.min(width, window.innerWidth - margin * 2);
    let left =
      align === "end"
        ? Math.round(rect.right - panelWidth)
        : Math.round(rect.left);
    if (left + panelWidth > window.innerWidth - margin) {
      left = window.innerWidth - margin - panelWidth;
    }
    if (left < margin) left = margin;
    const top = Math.round(rect.bottom + offset);
    setPos({ top, left });
  };

  useIso()(() => {
    if (!open) return;
    compute();
    const onScroll = () => compute();
    const onResize = () => compute();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align, width, offset]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!mounted || !open || !pos) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        top: pos.top,
        left: pos.left,
        width: Math.min(
          width,
          typeof window !== "undefined" ? window.innerWidth - 16 : width
        ),
      }}
      className={cn(
        "fixed z-[9999] overflow-hidden rounded-[12px] border border-[var(--line-strong)] bg-[var(--panel)] shadow-[0_24px_64px_rgba(0,0,0,0.55)]",
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}
