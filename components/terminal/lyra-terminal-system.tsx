"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef } from "react";
import { TerminalLog } from "@/components/terminal/terminal-log";
import {
  autocompleteTerminalInput,
  getTerminalSuggestions,
} from "@/core/terminal/autocomplete";
import { useMarketCatalogStore } from "@/stores/market-catalog-store";
import { useTerminalStore } from "@/stores/terminal-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function TerminalInputRow({ expanded }: { expanded: boolean }) {
  const input = useTerminalStore((state) => state.input);
  const setInput = useTerminalStore((state) => state.setInput);
  const navigateHistory = useTerminalStore((state) => state.navigateHistory);
  const executeInput = useTerminalStore((state) => state.executeInput);
  const expand = useTerminalStore((state) => state.expand);
  const collapse = useTerminalStore((state) => state.collapse);
  const markets = useMarketCatalogStore((state) => state.markets);
  const savedWorkspaces = useWorkspaceStore((state) => state.savedWorkspaces);
  const setFocusedRegion = useWorkspaceStore((state) => state.setFocusedRegion);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteContext = useMemo(() => {
    const workspace = useWorkspaceStore.getState();

    return {
      markets,
      workspace: {
        activeProductId: workspace.activeProductId,
        activeTimeframe: workspace.activeTimeframe,
        activeRailSection: workspace.activeRailSection,
        focusedRegion: workspace.focusedRegion,
        dataSource: workspace.dataSource,
        mode: workspace.mode,
        leftSidebarCollapsed: workspace.leftSidebarCollapsed,
        savedWorkspaces,
        watchlistProductIds: workspace.watchlistProductIds,
        recentProductIds: workspace.recentProductIds,
      },
    };
  }, [markets, savedWorkspaces]);
  const suggestions = useMemo(
    () => (expanded ? getTerminalSuggestions(input, autocompleteContext) : []),
    [autocompleteContext, expanded, input]
  );

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus();
    }
  }, [expanded]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    expand();
    setFocusedRegion("shell");
    executeInput();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      navigateHistory("older");
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      navigateHistory("newer");
    }

    if (event.key === "Escape") {
      event.preventDefault();
      collapse();
      setFocusedRegion("canvas");
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const completion = autocompleteTerminalInput(input, autocompleteContext);
      if (completion.nextInput !== input) {
        setInput(completion.nextInput);
      }
    }
  };

  return (
    <div>
      {expanded && suggestions.length > 0 ? (
        <div className="border-t border-black/6 px-3 py-1 text-[10px] text-black/36">
          {suggestions.slice(0, 4).join(" · ")}
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit}
        onClick={() => {
          expand();
          setFocusedRegion("shell");
          inputRef.current?.focus();
        }}
        className="grid h-11 grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 px-3"
      >
        <span className="font-mono text-[13px] leading-none text-black/42">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="help"
          spellCheck={false}
          className="w-full bg-transparent text-[13px] leading-5 text-black/84 outline-none placeholder:text-black/24"
        />
        <span className="text-[10px] uppercase tracking-[0.12em] text-black/26">Tab · Enter</span>
      </form>
    </div>
  );
}

export function TerminalPanelContent() {
  const outputs = useTerminalStore((state) => state.outputs);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TerminalLog outputs={outputs} />
      <div className="border-t border-black/8">
        <TerminalInputRow expanded />
      </div>
    </div>
  );
}
