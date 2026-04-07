import { NextResponse } from "next/server";
import { fetchMarketOverviewServer } from "@/core/market/market-server";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { productId } = await context.params;

  try {
    const overview = await fetchMarketOverviewServer(productId);
    return NextResponse.json(overview, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(`Market overview route failed for ${productId}:`, error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : `Unable to load market overview for ${productId}.`,
      },
      { status: 502 }
    );
  }
}
