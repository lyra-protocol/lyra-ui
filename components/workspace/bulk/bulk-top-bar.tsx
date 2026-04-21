"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Globe, Settings, Wallet, LogOut } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";
import { cn } from "@/lib/utils";

function shortenWallet(value: string | null | undefined) {
  if (!value) return null;
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function BulkTopBar() {
  const openAiChat = useUIStore((s) => s.openAiChat);
  const auth = useWorkspaceAuth();
  const pathname = usePathname();
  const isTerminal = pathname?.startsWith("/terminal");
  const isSignal = pathname?.startsWith("/signal");

  const shortWallet = shortenWallet(auth.walletAddress);
  const label = auth.authenticated
    ? shortWallet || auth.displayName || auth.email || "Connected"
    : "Connect wallet";

  return (
    <header className="flex h-11 items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-3 text-[11px]">
      <div className="flex items-center gap-4">
        <Link href="/terminal" className="flex items-center gap-1.5 text-foreground/90">
          <span className="text-[12px] font-semibold tracking-widest">✦ LYRA</span>
        </Link>
        <nav className="flex items-center gap-4 text-foreground/70">
          <Link
            href="/terminal"
            className={cn("transition", isTerminal ? "text-foreground" : "hover:text-foreground")}
          >
            Trade
          </Link>
          <Link
            href="/signal"
            className={cn("transition", isSignal ? "text-foreground" : "hover:text-foreground")}
          >
            Signal
          </Link>
          <button type="button" className="hover:text-foreground">
            Stake
          </button>
          <button type="button" onClick={openAiChat} className="hover:text-foreground">
            Assistant
          </button>
        </nav>
      </div>
      <div className="flex items-center gap-3 text-foreground/55">
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] hover:bg-foreground/[0.05] hover:text-foreground"
          aria-label="Theme"
        >
          <Moon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] hover:bg-foreground/[0.05] hover:text-foreground"
          aria-label="Language"
        >
          <Globe className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] hover:bg-foreground/[0.05] hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>

        {auth.authenticated ? (
          <div className="flex items-center gap-1">
            <span className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2 font-mono text-[11px] text-foreground/90">
              <Wallet className="h-3.5 w-3.5 text-foreground/60" />
              {label}
            </span>
            <button
              type="button"
              onClick={() => auth.logout()}
              title="Disconnect"
              className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-foreground/55 transition hover:bg-foreground/[0.05] hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => auth.login()}
            className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[var(--line-strong)] bg-foreground px-2.5 text-[11px] font-medium text-background transition hover:opacity-90"
          >
            <Wallet className="h-3.5 w-3.5" />
            Connect
          </button>
        )}
      </div>
    </header>
  );
}
