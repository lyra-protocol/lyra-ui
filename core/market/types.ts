export type MarketTimeframe = "15m" | "1h" | "4h" | "1d";

export type CoinbaseProduct = {
  id: string;
  base_currency: string;
  quote_currency: string;
  display_name: string;
  status: string;
  status_message: string;
  post_only: boolean;
  limit_only: boolean;
  cancel_only: boolean;
  trading_disabled: boolean;
};

export type MarketDirectoryItem = {
  id: string;
  provider_coin: string;
  symbol: string;
  name: string;
  image_url?: string;
  base_currency: string;
  quote_currency: string;
  display_name: string;
  current_price: number;
  market_cap: number | null;
  total_volume: number | null;
  exchange_volume_24h: number | null;
  price_change_percentage_24h: number | null;
  max_leverage: number | null;
  open_interest: number | null;
};

export type MarketCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MarketTicker = {
  productId: string;
  price: number;
  open24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  bestBid: number;
  bestAsk: number;
  lastSize: number;
  time: string;
};

export type MarketOrderBookLevel = {
  price: number;
  size: number;
  orders: number;
};

export type MarketOrderBook = {
  productId: string;
  time: number;
  bids: MarketOrderBookLevel[];
  asks: MarketOrderBookLevel[];
};

export type MarketTrade = {
  id: string;
  productId: string;
  side: "buy" | "sell";
  price: number;
  size: number;
  time: number;
};

export type CoinbaseTickerMessage = {
  type: string;
  product_id: string;
  price?: string;
  open_24h?: string;
  high_24h?: string;
  low_24h?: string;
  volume_24h?: string;
  best_bid?: string;
  best_ask?: string;
  last_size?: string;
  time?: string;
};
