"use client";

import { RefObject, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function formatAddress(value?: string) {
  if (!value) return "--";
  return value.length <= 12 ? value : `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function WalletSessionMenu({
  open,
  anchorRef,
  menuRef,
  walletAddress,
  walletCount,
  onConnectWallet,
  onDisconnect,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLDivElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  walletAddress?: string;
  walletCount: number;
  onConnectWallet: () => void;
  onDisconnect: () => void;
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const canUsePortal = typeof window !== "undefined" && typeof document !== "undefined";

  useEffect(() => {
    if (!open || !anchorRef.current) {
      return;
    }

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      setPosition({
        top: rect.bottom + 1,
        left: Math.max(8, rect.right - 224),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, open]);

  const content = useMemo(() => {
    if (!open || !canUsePortal) {
      return null;
    }

    return (
      <div
        ref={menuRef}
        className="fixed z-[200] w-56 border border-black/10 ring-1 ring-black/6"
        style={{
          top: position.top,
          left: position.left,
          backgroundColor: "var(--background)",
        }}
      >
        <div className="border-b border-black/8 px-2 py-2">
          <p className="text-[9px] uppercase tracking-[0.14em] text-black/30">Wallet</p>
          <p className="mt-1 text-[10px] text-black/84">{formatAddress(walletAddress)}</p>
        </div>

        <div className="border-b border-black/8 px-2 py-1.5 text-[10px] text-black/46">
          {walletCount === 1 ? "1 linked wallet" : `${walletCount} linked wallets`}
        </div>

        <button
          type="button"
          onClick={onConnectWallet}
          className="flex h-8 w-full items-center justify-between border-b border-black/6 px-2 text-left text-[10px] text-black/84 transition hover:bg-black/[0.02]"
        >
          <span>Connect wallet</span>
          <span className="text-[9px] uppercase tracking-[0.14em] text-black/30">Privy</span>
        </button>

        <button
          type="button"
          onClick={onDisconnect}
          className="flex h-8 w-full items-center justify-between px-2 text-left text-[10px] text-black/84 transition hover:bg-black/[0.02]"
        >
          <span>Disconnect session</span>
          <span className="text-[9px] uppercase tracking-[0.14em] text-black/30">Logout</span>
        </button>
      </div>
    );
  }, [canUsePortal, menuRef, onConnectWallet, onDisconnect, open, position.left, position.top, walletAddress, walletCount]);

  if (!content) {
    return null;
  }

  return createPortal(content, document.body);
}
