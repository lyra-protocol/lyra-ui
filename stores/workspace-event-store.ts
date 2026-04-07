import { create } from "zustand";

export type WorkspaceEventType =
  | "market/opened"
  | "timeframe/changed"
  | "watchlist/updated"
  | "view/saved"
  | "view/opened"
  | "view/deleted"
  | "layout/changed"
  | "focus/changed"
  | "terminal/expanded"
  | "terminal/collapsed";

export type WorkspaceEventInput = {
  type: WorkspaceEventType;
  detail?: Record<string, string | boolean | number | null | undefined>;
};

export type WorkspaceEvent = WorkspaceEventInput & {
  id: string;
  timestamp: string;
};

type WorkspaceEventStore = {
  events: WorkspaceEvent[];
  emit: (event: WorkspaceEventInput | WorkspaceEventInput[]) => void;
};

function createEventId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useWorkspaceEventStore = create<WorkspaceEventStore>((set) => ({
  events: [],
  emit: (event) => {
    const events = (Array.isArray(event) ? event : [event]).map((entry) => ({
      ...entry,
      id: createEventId(),
      timestamp: new Date().toISOString(),
    }));

    set((state) => ({
      events: [...state.events, ...events].slice(-100),
    }));
  },
}));
