import { create } from "zustand";

export type WalletAction = "connect" | "link" | "logout";

type UIStore = {
  commandPaletteOpen: boolean;
  commandPaletteQuery: string;
  aiPanelDetached: boolean;
  walletAction: WalletAction | null;
  walletActionRequestId: number;
  openCommandPalette: (query?: string) => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  setCommandPaletteQuery: (query: string) => void;
  detachAiPanel: () => void;
  dockAiPanel: () => void;
  toggleAiPanelDetached: () => void;
  requestWalletAction: (action: WalletAction) => void;
  clearWalletAction: () => void;
};

export const useUIStore = create<UIStore>((set) => ({
  commandPaletteOpen: false,
  commandPaletteQuery: "",
  aiPanelDetached: false,
  walletAction: null,
  walletActionRequestId: 0,
  openCommandPalette: (query = "") => set({ commandPaletteOpen: true, commandPaletteQuery: query }),
  closeCommandPalette: () => set({ commandPaletteOpen: false, commandPaletteQuery: "" }),
  toggleCommandPalette: () =>
    set((state) => ({
      commandPaletteOpen: !state.commandPaletteOpen,
      commandPaletteQuery: state.commandPaletteOpen ? "" : state.commandPaletteQuery,
    })),
  setCommandPaletteQuery: (query) => set({ commandPaletteQuery: query }),
  detachAiPanel: () => set({ aiPanelDetached: true }),
  dockAiPanel: () => set({ aiPanelDetached: false }),
  toggleAiPanelDetached: () => set((state) => ({ aiPanelDetached: !state.aiPanelDetached })),
  requestWalletAction: (action) =>
    set(() => ({
      walletAction: action,
      walletActionRequestId: Date.now(),
    })),
  clearWalletAction: () => set({ walletAction: null }),
}));
