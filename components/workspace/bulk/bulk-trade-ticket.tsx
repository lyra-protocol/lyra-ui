"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type OrderType = "market" | "limit" | "pro";

export function BulkTradeTicket() {
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [reduceOnly, setReduceOnly] = useState(false);
  const [tpsl, setTpsl] = useState(false);

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-[var(--line)] bg-[var(--panel)]">
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2 text-[11px]">
        <button className="rounded-[6px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-2 py-1 font-medium text-foreground/85">
          Cross
        </button>
        <button className="rounded-[6px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-2 py-1 font-medium text-foreground/85">
          50x
        </button>
        <button className="rounded-[6px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-2 py-1 font-medium text-foreground/85">
          PM
        </button>
      </div>

      <div className="flex items-center gap-4 border-b border-[var(--line)] px-3 py-2 text-[12px]">
        {(["market", "limit", "pro"] as OrderType[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setOrderType(id)}
            className={cn(
              "capitalize transition",
              orderType === id
                ? "text-foreground"
                : "text-foreground/45 hover:text-foreground/80"
            )}
          >
            {id === "pro" ? (
              <span className="flex items-center gap-1">
                Pro <ChevronDown className="h-3.5 w-3.5" />
              </span>
            ) : (
              id
            )}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 text-[11px]">
        <div>
          <div className="flex items-center justify-between text-foreground/60">
            <span>Size</span>
            <span>Available 10,008.49</span>
          </div>
          <div className="mt-1 flex h-9 items-center justify-between rounded-[8px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-3">
            <input
              defaultValue=""
              placeholder="0.00"
              className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-foreground/40"
            />
            <span className="text-foreground/60">USD</span>
            <ChevronDown className="ml-1 h-3.5 w-3.5 text-foreground/40" />
          </div>
        </div>

        <div className="pt-2">
          <div className="relative h-1 w-full rounded-full bg-foreground/10">
            <div className="absolute left-0 top-0 h-1 w-1/4 rounded-full bg-yellow-400" />
            <div className="absolute left-1/4 top-[-4px] h-3 w-3 -translate-x-1/2 rounded-full border border-yellow-400 bg-[var(--panel)]" />
          </div>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-foreground/60">
              <input
                type="checkbox"
                checked={reduceOnly}
                onChange={(event) => setReduceOnly(event.target.checked)}
                className="h-3 w-3 accent-foreground"
              />
              Reduce Only
            </label>
            <label className="flex items-center gap-2 text-foreground/60">
              <input
                type="checkbox"
                checked={tpsl}
                onChange={(event) => setTpsl(event.target.checked)}
                className="h-3 w-3 accent-foreground"
              />
              TP/SL
            </label>
          </div>
        </div>

        <div className="mt-1 grid grid-cols-2 gap-2">
          <button className="h-10 rounded-[8px] bg-[var(--positive)] text-[13px] font-semibold text-black">
            Buy / Long
          </button>
          <button className="h-10 rounded-[8px] bg-[var(--negative)] text-[13px] font-semibold text-black">
            Sell / Short
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-[11px]">
        <Stat label="Current Position" value="0.00 BTC" />
        <Stat label="Liq. Price" value="— / —" />
        <Stat label="Order Value" value="$0.00" />
        <Stat label="Margin Required" value="$0.00 / $0.00" accent="text-[var(--negative)]" />
        <Stat label="Fees" value="0.035% / 0.000%" />
      </div>

      <div className="border-t border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-[11px]">
        <p className="mb-2 text-foreground/55">Account</p>
        <Stat label="Portfolio Margin" value="" />
        <Stat label="Total Equity" value="$10,008.49" />
        <Stat label="Unrealized PNL" value="$0.00" accent="text-[var(--positive)]" />
        <Stat label="PortfolioMMR" value="0.00% Ⓘ" />
      </div>
    </aside>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-foreground/55">{label}</span>
      <span className={`tabular-nums ${accent ?? "text-foreground/90"}`}>{value}</span>
    </div>
  );
}
