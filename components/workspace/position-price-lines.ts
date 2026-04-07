import { IPriceLine, ISeriesApi, LineStyle } from "lightweight-charts";
import { getApproxLiquidationPrice } from "@/core/paper/leverage";
import { PaperPosition } from "@/core/paper/types";

export type PositionLineRefs = {
  entry: IPriceLine | null;
  stop: IPriceLine | null;
  takeProfit: IPriceLine | null;
  liquidation: IPriceLine | null;
};

function clearLine(series: ISeriesApi<"Candlestick">, line: IPriceLine | null) {
  if (line) {
    series.removePriceLine(line);
  }
}

export function syncPositionPriceLines(
  series: ISeriesApi<"Candlestick">,
  position: PaperPosition | null,
  refs: PositionLineRefs
) {
  clearLine(series, refs.entry);
  clearLine(series, refs.stop);
  clearLine(series, refs.takeProfit);
  clearLine(series, refs.liquidation);

  refs.entry = null;
  refs.stop = null;
  refs.takeProfit = null;
  refs.liquidation = null;

  if (!position) {
    return;
  }

  refs.entry = series.createPriceLine({
    price: position.entryPrice,
    color: "rgba(10,10,10,0.48)",
    lineWidth: 1,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: true,
    title: "Entry",
  });

  if (position.stopLoss) {
    refs.stop = series.createPriceLine({
      price: position.stopLoss,
      color: "rgba(169,68,66,0.72)",
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: "SL",
    });
  }

  if (position.takeProfit) {
    refs.takeProfit = series.createPriceLine({
      price: position.takeProfit,
      color: "rgba(31,122,77,0.72)",
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: "TP",
    });
  }

  const liquidationPrice = getApproxLiquidationPrice({
    direction: position.direction,
    entryPrice: position.entryPrice,
    leverage: position.leverage,
  });

  if (liquidationPrice) {
    refs.liquidation = series.createPriceLine({
      price: liquidationPrice,
      color: "rgba(120,76,28,0.72)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "Liq",
    });
  }
}
