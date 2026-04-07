"use client";

import { useEffect, useRef } from "react";
import { TerminalLogEntry } from "@/stores/terminal-store";

export function TerminalLog({ outputs }: { outputs: TerminalLogEntry[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    element.scrollTop = element.scrollHeight;
  }, [outputs]);

  return (
    <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
      {outputs.length === 0 ? (
        <div className="whitespace-pre-wrap text-[12px] leading-5 text-black/36">
          {"Lyra terminal ready.\nType help for workspace commands.\nPress Cmd/Ctrl + K for intelligence actions."}
        </div>
      ) : (
        outputs.map((entry) => (
          <div key={entry.id} className="pb-2 last:pb-0">
            <p className="font-mono text-[12px] leading-5 text-black/78">$ {entry.command}</p>
            <p className="whitespace-pre-wrap pl-3 text-[12px] leading-5 text-black/52">&gt; {entry.output}</p>
          </div>
        ))
      )}
    </div>
  );
}
