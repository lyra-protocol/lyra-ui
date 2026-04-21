"use client";

import { Check, SlidersHorizontal, X } from "lucide-react";
import { TerminalPopover, PopoverHeader } from "@/components/ui/terminal-popover";
import {
  applyFilters,
  countActiveFilters,
  useSignalFiltersStore,
  type SignalAction,
  type SignalRule,
} from "@/stores/signal-filters-store";
import type { SignalAlert, SignalSourceId } from "@/core/signal/signal-types";
import { cn } from "@/lib/utils";

type Props = {
  alerts: SignalAlert[];
};

const RULES: Array<{ id: SignalRule; label: string }> = [
  { id: "large_wallet_usd", label: "Whale" },
  { id: "early_buy_index", label: "Early buy" },
  { id: "volume_acceleration", label: "Volume surge" },
];

const ACTIONS: Array<{ id: SignalAction; label: string }> = [
  { id: "buy", label: "Buy" },
  { id: "sell", label: "Sell" },
  { id: "create", label: "Create" },
  { id: "migrate", label: "Migrate" },
  { id: "unknown", label: "Other" },
];

const SOURCES: Array<{ id: SignalSourceId; label: string }> = [
  { id: "pump", label: "pump.fun" },
  { id: "dexscreener", label: "dexscreener" },
  { id: "gmgn", label: "gmgn" },
];

const USD_PRESETS = [100, 500, 1_000, 5_000, 25_000];

export function SignalFilterPopover({ alerts }: Props) {
  const filters = useSignalFiltersStore();
  const active = countActiveFilters(filters);
  const matching = applyFilters(alerts, filters).length;

  return (
    <TerminalPopover
      width={340}
      align="start"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2.5 text-[11px] transition",
            active > 0
              ? "border-yellow-500/40 text-yellow-400"
              : "text-foreground/75 hover:text-foreground"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter
          {active > 0 ? (
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-yellow-500/20 px-1 text-[10px] tabular-nums text-yellow-300">
              {active}
            </span>
          ) : null}
        </button>
      )}
    >
      {(close) => (
        <>
          <PopoverHeader>
            <span className="flex items-center justify-between">
              <span>Filters</span>
              <span className="text-foreground/50">{matching.toLocaleString()} match</span>
            </span>
          </PopoverHeader>
          <div className="max-h-[60vh] overflow-y-auto px-3 py-3">
            <Section title="Rule">
              <PillGroup
                options={RULES}
                selected={filters.rules}
                onToggle={filters.toggleRule}
              />
            </Section>
            <Section title="Action">
              <PillGroup
                options={ACTIONS}
                selected={filters.actions}
                onToggle={filters.toggleAction}
              />
            </Section>
            <Section title="Source">
              <PillGroup
                options={SOURCES}
                selected={filters.sources}
                onToggle={filters.toggleSource}
              />
            </Section>
            <Section title="Min notional">
              <div className="flex items-center gap-2">
                <div className="flex h-8 flex-1 items-center rounded-[6px] border border-[var(--line-strong)] bg-[var(--panel-2)] px-2 text-[12px]">
                  <span className="text-foreground/50">$</span>
                  <input
                    value={filters.minUsd || ""}
                    placeholder="0"
                    inputMode="decimal"
                    onChange={(event) => {
                      const value = Number(event.target.value.replace(/[,_]/g, ""));
                      filters.setMinUsd(
                        Number.isFinite(value) && value > 0 ? value : 0
                      );
                    }}
                    className="w-full bg-transparent text-foreground outline-none placeholder:text-foreground/35"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => filters.setMinUsd(0)}
                  className="text-[10px] text-foreground/45 transition hover:text-foreground"
                >
                  clear
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {USD_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => filters.setMinUsd(amount)}
                    className={cn(
                      "rounded-[4px] border px-1.5 py-0.5 text-[10px] transition",
                      filters.minUsd === amount
                        ? "border-yellow-500/40 bg-yellow-500/15 text-yellow-300"
                        : "border-[var(--line)] text-foreground/55 hover:text-foreground"
                    )}
                  >
                    ≥ ${amount.toLocaleString()}
                  </button>
                ))}
              </div>
            </Section>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--line)] px-3 py-2">
            <button
              type="button"
              onClick={() => filters.reset()}
              className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[11px] text-foreground/60 transition hover:text-foreground"
            >
              <X className="h-3 w-3" /> Reset
            </button>
            <button
              type="button"
              onClick={close}
              className="inline-flex items-center gap-1 rounded-[6px] bg-foreground px-3 py-1 text-[11px] font-medium text-background transition hover:opacity-90"
            >
              <Check className="h-3 w-3" /> Done
            </button>
          </div>
        </>
      )}
    </TerminalPopover>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-foreground/40">
        {title}
      </p>
      {children}
    </div>
  );
}

function PillGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: Array<{ id: T; label: string }>;
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(option.id)}
            className={cn(
              "inline-flex h-7 items-center rounded-[6px] border px-2 text-[11px] transition",
              active
                ? "border-yellow-500/40 bg-yellow-500/15 text-yellow-300"
                : "border-[var(--line)] bg-[var(--panel-2)] text-foreground/70 hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
