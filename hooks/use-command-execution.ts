"use client";

import { useMemo } from "react";
import { useTerminalStore } from "@/stores/terminal-store";

export function useCommandExecution() {
  const input = useTerminalStore((state) => state.input);
  const outputs = useTerminalStore((state) => state.outputs);
  const isExpanded = useTerminalStore((state) => state.isExpanded);
  const setInput = useTerminalStore((state) => state.setInput);
  const executeInput = useTerminalStore((state) => state.executeInput);
  const executeCommand = useTerminalStore((state) => state.executeCommand);
  const expand = useTerminalStore((state) => state.expand);
  const collapse = useTerminalStore((state) => state.collapse);
  const navigateHistory = useTerminalStore((state) => state.navigateHistory);

  return useMemo(
    () => ({
      input,
      outputs,
      isExpanded,
      setInput,
      executeInput,
      executeCommand,
      expand,
      collapse,
      navigateHistory,
    }),
    [
      collapse,
      executeCommand,
      executeInput,
      expand,
      input,
      isExpanded,
      navigateHistory,
      outputs,
      setInput,
    ]
  );
}
