"use client";

import { useUIStore } from "@/stores/ui-store";

export function WorkspaceAiDetachedNotice() {
  const dockAiPanel = useUIStore((state) => state.dockAiPanel);

  return (
    <div className="flex h-full items-center justify-center bg-white px-4">
      <div className="max-w-sm text-center">
        <p className="text-[10px] uppercase tracking-[0.14em] text-black/30">AI detached</p>
        <p className="mt-2 text-[12px] leading-5 text-black/62">
          Lyra AI is open in a floating pane so you can keep it beside the chart.
        </p>
        <button
          type="button"
          onClick={dockAiPanel}
          className="mt-3 inline-flex h-8 items-center justify-center border border-black bg-black px-3 text-[10px] font-medium text-white transition hover:bg-black/88"
        >
          Dock AI back here
        </button>
      </div>
    </div>
  );
}
