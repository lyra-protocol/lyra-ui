"use client";

type CoinGeckoMarket = {
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number | null;
  total_volume: number | null;
  price_change_percentage_24h: number | null;
};

const COINGECKO_URL = "https://api.coingecko.com/api/v3";

export async function fetchCoinGeckoMarkets() {
  const apiKey = process.env.NEXT_PUBLIC_COINGECKO_DEMO_API_KEY;
  const response = await fetch(
    `${COINGECKO_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`,
    {
      headers: apiKey ? { "x-cg-demo-api-key": apiKey } : undefined,
    }
  );

  if (!response.ok) {
    throw new Error(`CoinGecko request failed: ${response.status}`);
  }

  return (await response.json()) as CoinGeckoMarket[];
}
