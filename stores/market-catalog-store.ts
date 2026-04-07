import { create } from "zustand";
import { MarketDirectoryItem } from "@/core/market/types";

type MarketCatalogStore = {
  markets: MarketDirectoryItem[];
  setMarkets: (markets: MarketDirectoryItem[]) => void;
};

export const useMarketCatalogStore = create<MarketCatalogStore>((set) => ({
  markets: [],
  setMarkets: (markets) => set({ markets }),
}));
