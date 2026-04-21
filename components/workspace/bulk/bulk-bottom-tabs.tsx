"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  "Positions",
  "Open Orders",
  "Balances",
  "Order History",
  "Trade History",
  "Funding History",
  "Position History",
];

export function BulkBottomTabs() {
  const [active, setActive] = useState<string>("Positions");
  const [currentMarket, setCurrentMarket] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-[var(--line)] bg-[var(--panel)]">
      <div className="flex h-8 items-center justify-between border-b border-[var(--line)] px-2">
        <div className="flex items-center gap-4 text-[11px]">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              className={cn(
                "relative inline-flex h-7 items-center px-1 transition",
                active === tab
                  ? "text-foreground"
                  : "text-foreground/50 hover:text-foreground/85"
              )}
            >
              {tab}
              {tab === active ? (
                <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-foreground" />
              ) : null}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-foreground/55">
          <input
            type="checkbox"
            checked={currentMarket}
            onChange={(event) => setCurrentMarket(event.target.checked)}
            className="h-3 w-3 accent-foreground"
          />
          Current Market
        </label>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center text-[11px] text-foreground/40">
        You have no positions yet.
      </div>
    </div>
  );
}
