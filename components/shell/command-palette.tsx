"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { getAiCommandSurfaceActions } from "@/core/commands/ai-command-surface";
import {
  CommandPaletteAction,
  getCommandPaletteActions,
} from "@/core/commands/workspace-command-palette";
import { useAiCommandSubmission } from "@/hooks/use-ai-command-submission";
import { useTerminalStore } from "@/stores/terminal-store";
import { useUIStore } from "@/stores/ui-store";

type PaletteItem =
  | ({ type: "workspace" } & CommandPaletteAction)
  | {
      type: "ai";
      id: string;
      label: string;
      description: string;
      command: string;
      prompt: string;
    };

function matchesItem(item: PaletteItem, query: string) {
  const value = `${item.label} ${item.description} ${item.command}`.toLowerCase();
  return value.includes(query.toLowerCase());
}

function CommandPaletteDialog() {
  const close = useUIStore((state) => state.closeCommandPalette);
  const initialQuery = useUIStore((state) => state.commandPaletteQuery);
  const setCommandPaletteQuery = useUIStore((state) => state.setCommandPaletteQuery);
  const executeCommand = useTerminalStore((state) => state.executeCommand);
  const { submitAiCommand } = useAiCommandSubmission();
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const workspaceActions = getCommandPaletteActions().map((item) => ({
    ...item,
    type: "workspace" as const,
  }));
  const aiActions = getAiCommandSurfaceActions().map((item) => ({
    type: "ai" as const,
    id: item.id,
    label: item.label,
    description: item.description,
    command: item.slash,
    prompt: item.prompt,
  }));
  const aiMode = query.trim().startsWith("/");
  const items = useMemo(
    () => (aiMode ? aiActions : [...workspaceActions, ...aiActions]),
    [aiActions, aiMode, workspaceActions]
  );

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return items;
    }

    return items.filter((item) => matchesItem(item, query));
  }, [items, query]);

  const runQuery = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed.startsWith("/")) {
      void submitAiCommand(trimmed);
    } else {
      executeCommand(trimmed, "palette");
    }
    close();
  };

  const executeItem = (item?: PaletteItem) => {
    if (!item) {
      runQuery(query);
      return;
    }

    if (item.type === "ai") {
      void submitAiCommand(item.prompt);
      close();
      return;
    }

    executeCommand(item.command, "palette");
    close();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => Math.min(current + 1, filteredItems.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => Math.max(current - 1, 0));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      executeItem(filteredItems[selectedIndex]);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/12" onClick={close}>
      <div
        className="mx-auto mt-20 w-[min(720px,calc(100vw-32px))] border border-black/10 bg-background"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-black/8 px-3 py-2">
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCommandPaletteQuery(event.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or /ask intelligence"
            className="w-full bg-transparent text-[14px] text-black/90 outline-none placeholder:text-black/34"
          />
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <button
              type="button"
              onClick={() => runQuery(query)}
              className="flex w-full items-center justify-between px-3 py-3 text-left text-[12px] text-black/84 hover:bg-black/[0.02]"
            >
              <span>{aiMode ? `Ask intelligence: ${query}` : `Run “${query}”`}</span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-black/34">Enter</span>
            </button>
          ) : (
            filteredItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => executeItem(item)}
                className={[
                  "flex w-full items-start justify-between border-b border-black/6 px-3 py-3 text-left transition last:border-b-0",
                  index === selectedIndex ? "bg-black/[0.03]" : "hover:bg-black/[0.02]",
                ].join(" ")}
              >
                <div>
                  <p className="text-[12px] font-medium text-black/90">{item.label}</p>
                  <p className="mt-0.5 text-[11px] leading-5 text-black/48">{item.description}</p>
                </div>
                <span className="text-[11px] text-black/38">{item.command}</span>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-black/8 px-3 py-2 text-[11px] text-black/42">
          Cmd/Ctrl + K for commands · Type / for contextual intelligence
        </div>
      </div>
    </div>
  );
}

export function CommandPalette() {
  const open = useUIStore((state) => state.commandPaletteOpen);
  return open ? <CommandPaletteDialog /> : null;
}
