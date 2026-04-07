import { MarketDirectoryItem, MarketTimeframe } from "@/core/market/types";
import type {
  MarketDataSource,
  RailSection,
  SavedWorkspaceState,
  WorkspaceMode,
  WorkspaceRegion,
} from "@/stores/workspace-types";
import { WorkspaceEventInput } from "@/stores/workspace-event-store";

export type TerminalCommandName =
  | "open"
  | "switch"
  | "watch"
  | "view"
  | "sidebar"
  | "browse"
  | "terminal"
  | "focus";

export type TerminalOutputStatus = "success" | "error" | "info";
export type TerminalCommandOrigin = "terminal" | "palette" | "system";

export type ParsedTerminalCommand = {
  raw: string;
  tokens: string[];
  command: string;
  args: string[];
};

export type NormalizedTerminalCommand = ParsedTerminalCommand & {
  command: string;
  args: string[];
};

export type WorkspaceSnapshot = {
  activeProductId: string;
  activeTimeframe: MarketTimeframe;
  activeRailSection: RailSection;
  focusedRegion: WorkspaceRegion;
  dataSource: MarketDataSource;
  mode: WorkspaceMode;
  leftSidebarCollapsed: boolean;
  savedWorkspaces: SavedWorkspaceState[];
  watchlistProductIds: string[];
  recentProductIds: string[];
};

export type TerminalResolutionContext = {
  markets: MarketDirectoryItem[];
  workspace: WorkspaceSnapshot;
};

export type ResolvedTerminalCommand = {
  commandName: TerminalCommandName;
  action: string;
  market?: MarketDirectoryItem;
  timeframe?: MarketTimeframe;
  subcommand?: string;
  rawTarget?: string;
  rawTimeframe?: string;
  viewName?: string;
  region?: WorkspaceRegion;
  railSection?: RailSection;
  collapse?: boolean;
};

export type TerminalValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export type TerminalExecutionResult = {
  status: TerminalOutputStatus;
  message: string;
  events: WorkspaceEventInput[];
  productId?: string;
  timeframe?: MarketTimeframe;
};

export type TerminalExecutionContext = TerminalResolutionContext & {
  expandTerminal: () => void;
  collapseTerminal: () => void;
};

export type TerminalCommandDefinition = {
  name: TerminalCommandName;
  aliases: string[];
  helpText: string;
  resolve: (
    command: NormalizedTerminalCommand,
    context: TerminalResolutionContext
  ) => ResolvedTerminalCommand | null;
  validate: (
    command: ResolvedTerminalCommand,
    context: TerminalExecutionContext
  ) => TerminalValidationResult;
  execute: (
    command: ResolvedTerminalCommand,
    context: TerminalExecutionContext
  ) => TerminalExecutionResult;
};
