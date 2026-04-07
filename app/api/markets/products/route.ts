import { NextResponse } from "next/server";
import { fetchMarketProductsServer } from "@/core/market/market-server";

export async function GET() {
  try {
    const products = await fetchMarketProductsServer();
    return NextResponse.json(products, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Market products route failed:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to load market products.",
      },
      { status: 502 }
    );
  }
}
