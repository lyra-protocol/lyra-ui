import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_TIMEFRAME } from "@/core/market/timeframes";
import { MarketTicker, MarketTimeframe } from "@/core/market/types";
import type {
  MarketDataSource,
  RailSection,
  SavedWorkspaceState,
  WorkspaceMode,
  WorkspaceRegion,
} from "@/stores/workspace-types";

export type {
  MarketDataSource,
  RailSection,
  SavedWorkspaceState,
  WorkspaceMode,
  WorkspaceRegion,
} from "@/stores/workspace-types";

type WorkspaceStore = {
  activeProductId: string;
  recentProductIds: string[];
  watchlistProductIds: string[];
  savedWorkspaces: SavedWorkspaceState[];
  activeTimeframe: MarketTimeframe;
  activeMarketSnapshot: MarketTicker | null;
  activeWorkspaceId: string | null;
  activeRailSection: RailSection;
  focusedRegion: WorkspaceRegion;
  dataSource: MarketDataSource;
  mode: WorkspaceMode;
  leftSidebarCollapsed: boolean;
  rightPanelOpen: boolean;
  bottomPanelOpen: boolean;
  bottomPanelTab: BottomPanelTab;
  bottomPanelHeight: number;
  setActiveProductId: (productId: string) => void;
  setActiveTimeframe: (timeframe: MarketTimeframe) => void;
  setActiveMarketSnapshot: (snapshot: MarketTicker | null) => void;
  setActiveRailSection: (section: RailSection) => void;
  setFocusedRegion: (region: WorkspaceRegion) => void;
  setMode: (mode: WorkspaceMode) => void;
  setDataSource: (source: MarketDataSource) => void;
  toggleWatchlistProduct: (productId: string) => void;
  saveActiveWorkspace: () => void;
  openSavedWorkspace: (workspaceId: string) => void;
  toggleLeftSidebar: () => void;
  openLeftSidebar: () => void;
  collapseLeftSidebar: () => void;
  toggleRightPanel: () => void;
  openRightPanel: () => void;
  closeRightPanel: () => void;
  setBottomPanelTab: (tab: BottomPanelTab) => void;
  setBottomPanelHeight: (height: number) => void;
  openBottomPanel: () => void;
  closeBottomPanel: () => void;
  toggleBottomPanel: () => void;
  resetLayout: () => void;
};

export type BottomPanelTab = "positions" | "trades" | "activity" | "ai" | "terminal";

type PersistedWorkspaceState = Pick<
  WorkspaceStore,
  | "activeProductId"
  | "recentProductIds"
  | "watchlistProductIds"
  | "savedWorkspaces"
  | "activeTimeframe"
  | "activeWorkspaceId"
  | "activeRailSection"
  | "focusedRegion"
  | "dataSource"
  | "mode"
  | "leftSidebarCollapsed"
  | "rightPanelOpen"
  | "bottomPanelOpen"
  | "bottomPanelTab"
  | "bottomPanelHeight"
>;

const BOTTOM_PANEL_MIN_HEIGHT = 180;
const BOTTOM_PANEL_MAX_HEIGHT = 520;
const BOTTOM_PANEL_DEFAULT_HEIGHT = 240;

function clampBottomPanelHeight(height: number) {
  return Math.min(BOTTOM_PANEL_MAX_HEIGHT, Math.max(BOTTOM_PANEL_MIN_HEIGHT, Math.round(height)));
}

const createWorkspaceId = () =>
  `workspace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      activeProductId: "",
      recentProductIds: [],
      watchlistProductIds: [],
      savedWorkspaces: [],
      activeTimeframe: DEFAULT_TIMEFRAME,
      activeMarketSnapshot: null,
      activeWorkspaceId: null,
      activeRailSection: "memory",
      focusedRegion: "canvas",
      dataSource: "hyperliquid",
      mode: "paper",
      leftSidebarCollapsed: false,
      rightPanelOpen: true,
      bottomPanelOpen: true,
      bottomPanelTab: "positions",
      bottomPanelHeight: BOTTOM_PANEL_DEFAULT_HEIGHT,
      setActiveProductId: (productId) =>
        set((state) => ({
          activeProductId: productId,
          activeWorkspaceId: null,
          recentProductIds: [productId, ...state.recentProductIds.filter((id) => id !== productId)].slice(0, 12),
        })),
      setActiveTimeframe: (timeframe) => set({ activeTimeframe: timeframe, activeWorkspaceId: null }),
      setActiveMarketSnapshot: (snapshot) => set({ activeMarketSnapshot: snapshot }),
      setActiveRailSection: (section) => set({ activeRailSection: section }),
      setFocusedRegion: (region) => set({ focusedRegion: region }),
      setMode: (mode) => set({ mode }),
      setDataSource: (source) => set({ dataSource: source }),
      toggleWatchlistProduct: (productId) =>
        set((state) => ({
          watchlistProductIds: state.watchlistProductIds.includes(productId)
            ? state.watchlistProductIds.filter((id) => id !== productId)
            : [productId, ...state.watchlistProductIds].slice(0, 24),
        })),
      saveActiveWorkspace: () =>
        set((state) => {
          if (!state.activeProductId) {
            return state;
          }
          const nextWorkspace = {
            id: createWorkspaceId(),
            name: `${state.activeProductId} · ${state.activeTimeframe}`,
            productId: state.activeProductId,
            timeframe: state.activeTimeframe,
            updatedAt: new Date().toISOString(),
          } satisfies SavedWorkspaceState;
          return {
            activeWorkspaceId: nextWorkspace.id,
            savedWorkspaces: [nextWorkspace, ...state.savedWorkspaces].slice(0, 12),
          };
        }),
      openSavedWorkspace: (workspaceId) =>
        set((state) => {
          const nextWorkspace = state.savedWorkspaces.find((workspace) => workspace.id === workspaceId);
          if (!nextWorkspace) {
            return state;
          }
          return {
            activeWorkspaceId: nextWorkspace.id,
            activeProductId: nextWorkspace.productId,
            activeTimeframe: nextWorkspace.timeframe,
            recentProductIds: [nextWorkspace.productId, ...state.recentProductIds.filter((id) => id !== nextWorkspace.productId)].slice(0, 12),
          };
        }),
      toggleLeftSidebar: () => set((state) => ({ leftSidebarCollapsed: !state.leftSidebarCollapsed })),
      openLeftSidebar: () => set({ leftSidebarCollapsed: false }),
      collapseLeftSidebar: () => set({ leftSidebarCollapsed: true }),
      toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
      openRightPanel: () => set({ rightPanelOpen: true }),
      closeRightPanel: () => set({ rightPanelOpen: false }),
      setBottomPanelTab: (tab) => set({ bottomPanelTab: tab, bottomPanelOpen: true }),
      setBottomPanelHeight: (height) => set({ bottomPanelHeight: clampBottomPanelHeight(height) }),
      openBottomPanel: () => set({ bottomPanelOpen: true }),
      closeBottomPanel: () => set({ bottomPanelOpen: false }),
      toggleBottomPanel: () => set((state) => ({ bottomPanelOpen: !state.bottomPanelOpen })),
      resetLayout: () =>
        set({
          activeRailSection: "memory",
          focusedRegion: "canvas",
          leftSidebarCollapsed: false,
          rightPanelOpen: true,
          bottomPanelOpen: true,
          bottomPanelTab: "positions",
          bottomPanelHeight: BOTTOM_PANEL_DEFAULT_HEIGHT,
        }),
    }),
    {
      name: "lyra-workspace-shell",
      version: 12,
      migrate: (persistedState) => {
        const state = persistedState as Partial<PersistedWorkspaceState> & { bottomPanelOpen?: boolean };
        const legacyFocusedRegion = state.focusedRegion as string | undefined;
        return {
          activeProductId: state.activeProductId ?? "",
          recentProductIds: state.recentProductIds ?? [],
          watchlistProductIds: state.watchlistProductIds ?? [],
          savedWorkspaces: state.savedWorkspaces ?? [],
          activeTimeframe: state.activeTimeframe ?? DEFAULT_TIMEFRAME,
          activeWorkspaceId: state.activeWorkspaceId ?? null,
          activeRailSection: state.activeRailSection === "browse" ? "browse" : "memory",
          focusedRegion: legacyFocusedRegion === "operator" ? "context" : (state.focusedRegion ?? "canvas"),
          dataSource: state.dataSource ?? "hyperliquid",
          mode: state.mode ?? "paper",
          leftSidebarCollapsed: state.leftSidebarCollapsed ?? false,
          rightPanelOpen: true,
          bottomPanelOpen: state.bottomPanelOpen ?? true,
          bottomPanelTab: state.bottomPanelTab ?? "positions",
          bottomPanelHeight: clampBottomPanelHeight(state.bottomPanelHeight ?? BOTTOM_PANEL_DEFAULT_HEIGHT),
        } satisfies PersistedWorkspaceState;
      },
      partialize: (state) => ({
        activeProductId: state.activeProductId,
        recentProductIds: state.recentProductIds,
        watchlistProductIds: state.watchlistProductIds,
        savedWorkspaces: state.savedWorkspaces,
        activeTimeframe: state.activeTimeframe,
        activeWorkspaceId: state.activeWorkspaceId,
        activeRailSection: state.activeRailSection,
        focusedRegion: state.focusedRegion,
        dataSource: state.dataSource,
        mode: state.mode,
        leftSidebarCollapsed: state.leftSidebarCollapsed,
        rightPanelOpen: state.rightPanelOpen,
        bottomPanelOpen: state.bottomPanelOpen,
        bottomPanelTab: state.bottomPanelTab,
        bottomPanelHeight: state.bottomPanelHeight,
      }),
    }
  )
);
