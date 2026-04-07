import { NextResponse } from "next/server";
import { isMarketTimeframe } from "@/core/market/timeframes";
import { fetchMarketCandlesServer } from "@/core/market/market-server";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { productId } = await context.params;
  const timeframe = new URL(request.url).searchParams.get("timeframe");

  if (!timeframe || !isMarketTimeframe(timeframe)) {
    return NextResponse.json({ message: "Invalid timeframe." }, { status: 400 });
  }

  try {
    const candles = await fetchMarketCandlesServer(productId, timeframe);
    return NextResponse.json(candles, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(`Market candles route failed for ${productId} ${timeframe}:`, error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : `Unable to load candles for ${productId}.`,
      },
      { status: 502 }
    );
  }
}
