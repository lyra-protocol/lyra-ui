import { create } from "zustand";
import { runTerminalCommand } from "@/core/terminal/run";
import { TerminalCommandOrigin, TerminalOutputStatus } from "@/core/terminal/types";
import { useWorkspaceStore } from "@/stores/workspace-store";

export type TerminalLogEntry = {
  id: string;
  command: string;
  output: string;
  status: TerminalOutputStatus;
  origin: TerminalCommandOrigin;
  timestamp: string;
};

type TerminalStore = {
  input: string;
  history: string[];
  historyIndex: number | null;
  outputs: TerminalLogEntry[];
  isExpanded: boolean;
  setInput: (value: string) => void;
  expand: () => void;
  collapse: () => void;
  navigateHistory: (direction: "older" | "newer") => void;
  executeInput: (origin?: TerminalCommandOrigin) => TerminalLogEntry | null;
  executeCommand: (command: string, origin?: TerminalCommandOrigin) => TerminalLogEntry | null;
};

function createLogId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pushEntry(state: TerminalStore, entry: TerminalLogEntry, command: string) {
  return {
    input: "",
    history: [...state.history, command].slice(-100),
    historyIndex: null,
    outputs: [...state.outputs, entry].slice(-200),
  };
}

export const useTerminalStore = create<TerminalStore>((set, get) => {
  const appendLog = (command: string, origin: TerminalCommandOrigin) => {
    const result = runTerminalCommand(command, {
      expandTerminal: () => get().expand(),
      collapseTerminal: () => get().collapse(),
    });
    const entry = {
      id: createLogId(),
      command,
      output: result.message,
      status: result.status,
      origin,
      timestamp: new Date().toISOString(),
    } satisfies TerminalLogEntry;

    set((state) => pushEntry(state, entry, command));
    return entry;
  };

  return {
    input: "",
    history: [],
    historyIndex: null,
    outputs: [],
    isExpanded: false,
    setInput: (value) => set({ input: value, historyIndex: null }),
    expand: () => {
      useWorkspaceStore.getState().setBottomPanelTab("terminal");
      set({ isExpanded: true });
    },
    collapse: () => {
      useWorkspaceStore.getState().closeBottomPanel();
      set({ isExpanded: false });
    },
    navigateHistory: (direction) =>
      set((state) => {
        if (state.history.length === 0) {
          return state;
        }

        if (direction === "older") {
          const nextIndex =
            state.historyIndex === null
              ? state.history.length - 1
              : Math.max(0, state.historyIndex - 1);
          return { historyIndex: nextIndex, input: state.history[nextIndex] ?? state.input };
        }

        if (state.historyIndex === null) {
          return state;
        }

        const nextIndex = state.historyIndex + 1;
        if (nextIndex >= state.history.length) {
          return { historyIndex: null, input: "" };
        }

        return { historyIndex: nextIndex, input: state.history[nextIndex] ?? "" };
      }),
    executeInput: (origin = "terminal") => {
      const command = get().input.trim();
      if (!command) {
        return null;
      }
      return appendLog(command, origin);
    },
    executeCommand: (command, origin = "terminal") => {
      const value = command.trim();
      if (!value) {
        return null;
      }
      if (origin === "palette") {
        get().expand();
      }
      return appendLog(value, origin);
    },
  };
});
