import { create } from "zustand";
import { persist } from "zustand/middleware";

import { PAPER_LEVERAGE_DEFAULT, PAPER_LEVERAGE_MAX, PAPER_LEVERAGE_MIN } from "@/core/paper/leverage";

export type MarginMode = "cross" | "isolated";
export type PositionMode = "one-way" | "hedge";
export type PriceReference = "mark" | "oracle";
export type ChartOverlay = "chart" | "depth" | "info";

export type ChartIndicator = "ema" | "sma" | "rsi" | "macd" | "bollinger" | "volume";

type TerminalPreferencesState = {
  marginMode: MarginMode;
  leverage: number;
  positionMode: PositionMode;
  priceReference: PriceReference;
  chartOverlay: ChartOverlay;
  indicators: ChartIndicator[];
  logScale: boolean;
  setMarginMode: (mode: MarginMode) => void;
  setLeverage: (value: number) => void;
  setPositionMode: (mode: PositionMode) => void;
  setPriceReference: (ref: PriceReference) => void;
  setChartOverlay: (overlay: ChartOverlay) => void;
  toggleIndicator: (indicator: ChartIndicator) => void;
  toggleLogScale: () => void;
};

export const useTerminalPreferencesStore = create<TerminalPreferencesState>()(
  persist(
    (set) => ({
      marginMode: "cross",
      leverage: PAPER_LEVERAGE_DEFAULT,
      positionMode: "one-way",
      priceReference: "oracle",
      chartOverlay: "chart",
      indicators: ["volume"],
      logScale: false,
      setMarginMode: (marginMode) => set({ marginMode }),
      setLeverage: (leverage) =>
        set({
          leverage: Math.max(
            PAPER_LEVERAGE_MIN,
            Math.min(PAPER_LEVERAGE_MAX, Math.round(Number(leverage)) || PAPER_LEVERAGE_MIN),
          ),
        }),
      setPositionMode: (positionMode) => set({ positionMode }),
      setPriceReference: (priceReference) => set({ priceReference }),
      setChartOverlay: (chartOverlay) => set({ chartOverlay }),
      toggleIndicator: (indicator) =>
        set((state) => ({
          indicators: state.indicators.includes(indicator)
            ? state.indicators.filter((item) => item !== indicator)
            : [...state.indicators, indicator],
        })),
      toggleLogScale: () => set((state) => ({ logScale: !state.logScale })),
    }),
    {
      name: "lyra-terminal-preferences",
      version: 2,
      migrate: (persisted) => {
        const root = persisted as { state?: { leverage?: number } } | undefined;
        const lev = root?.state?.leverage;
        if (typeof lev !== "number" || !Number.isFinite(lev) || lev <= PAPER_LEVERAGE_MAX) {
          return persisted as never;
        }
        return {
          ...root,
          state: { ...root!.state!, leverage: PAPER_LEVERAGE_MAX },
        } as never;
      },
    }
  )
);
