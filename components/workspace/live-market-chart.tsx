"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
} from "lightweight-charts";
import { MarketCandle, MarketTicker, MarketTimeframe } from "@/core/market/types";
import { PaperPosition } from "@/core/paper/types";
import {
  buildRealtimeCandle,
  DOWN_COLOR,
  toVolumeData,
  UP_COLOR,
} from "@/components/workspace/live-market-chart-helpers";
import { getLiveChartTheme } from "@/components/workspace/live-market-chart-theme";
import {
  PositionLineRefs,
  syncPositionPriceLines,
} from "@/components/workspace/position-price-lines";
import { useMarketCandles } from "@/hooks/use-market-candles";
import { useThemeMode } from "@/providers/theme-provider";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useTerminalPreferencesStore } from "@/stores/terminal-preferences-store";

type LiveMarketChartProps = {
  productId: string;
  timeframe: MarketTimeframe;
  snapshot: MarketTicker | null;
  activePosition: PaperPosition | null;
};

export function LiveMarketChart({ productId, timeframe, snapshot, activePosition }: LiveMarketChartProps) {
  const setFocusedRegion = useWorkspaceStore((state) => state.setFocusedRegion);
  const indicators = useTerminalPreferencesStore((state) => state.indicators);
  const volumeEnabled = indicators.includes("volume");
  const { resolvedTheme } = useThemeMode();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const positionLinesRef = useRef<PositionLineRefs>({
    entry: null,
    stop: null,
    takeProfit: null,
    liquidation: null,
  });
  const candlesRef = useRef<MarketCandle[]>([]);
  const { data, isLoading, isError } = useMarketCandles(productId, timeframe);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const colors = getLiveChartTheme(resolvedTheme);

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: colors.background, type: ColorType.Solid },
        textColor: colors.text,
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      crosshair: {
        vertLine: { color: colors.crosshair, width: 1 },
        horzLine: { color: colors.crosshair, width: 1 },
      },
      timeScale: {
        borderColor: colors.border,
        timeVisible: timeframe !== "1d",
      },
      rightPriceScale: {
        borderColor: colors.border,
      },
      handleScroll: true,
      handleScale: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      borderVisible: false,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
      priceLineVisible: true,
      lastValueVisible: true,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      lastValueVisible: false,
      priceLineVisible: false,
    });

    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const observer = new ResizeObserver(() => chart.timeScale().fitContent());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      positionLinesRef.current = { entry: null, stop: null, takeProfit: null, liquidation: null };
    };
  }, [resolvedTheme, timeframe]);

  useEffect(() => {
    if (!data || !candleSeriesRef.current || !volumeSeriesRef.current) {
      return;
    }

    candlesRef.current = data;
    candleSeriesRef.current.setData(data.map((candle) => ({ ...candle, time: candle.time as UTCTimestamp })));
    volumeSeriesRef.current.setData(data.map(toVolumeData));
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  useEffect(() => {
    if (!snapshot || !candleSeriesRef.current || !volumeSeriesRef.current) {
      return;
    }

    const realtimeCandle = buildRealtimeCandle(candlesRef.current, snapshot, timeframe);
    if (!realtimeCandle) {
      return;
    }

    const previous = candlesRef.current[candlesRef.current.length - 1];
    candlesRef.current = !previous || realtimeCandle.time > previous.time
      ? [...candlesRef.current, realtimeCandle]
      : [...candlesRef.current.slice(0, -1), realtimeCandle];

    candleSeriesRef.current.update({ ...realtimeCandle, time: realtimeCandle.time as UTCTimestamp });
    volumeSeriesRef.current.update(toVolumeData(realtimeCandle));
  }, [snapshot, timeframe]);

  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) {
      return;
    }
    syncPositionPriceLines(series, activePosition, positionLinesRef.current);
  }, [activePosition]);

  useEffect(() => {
    const series = volumeSeriesRef.current;
    if (!series) return;
    series.applyOptions({ visible: volumeEnabled });
  }, [volumeEnabled]);

  return (
    <div className="relative h-full w-full" onPointerDown={() => setFocusedRegion("canvas")}>
      <div ref={containerRef} className="h-full w-full" />
      {isLoading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-black/42">
          Syncing {productId} candles…
        </div>
      ) : null}
      {isError ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-black/42">
          Unable to load market data right now.
        </div>
      ) : null}
    </div>
  );
}
