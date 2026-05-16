"use client";

import { Bot, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

export function SignalTelegramBadge() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/telegram/bot")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { url?: string } | null) => {
        if (!cancelled && json?.url) setUrl(json.url);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--panel)] px-4 py-2">
      <div className="inline-flex items-center gap-2 text-[11px] text-foreground/70">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel-2)] text-foreground/80">
          <Bot className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-foreground/90">🤖 Lyra Signal Bot</p>
          <p className="text-[10px] text-foreground/45">Telegram alerts mirror this live Birdeye feed.</p>
        </div>
      </div>
      <a
        href={url ?? "#"}
        target={url ? "_blank" : undefined}
        rel={url ? "noreferrer noopener" : undefined}
        aria-disabled={!url}
        className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2.5 text-[11px] text-foreground/75 transition hover:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        Subscribe on Telegram <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    </div>
  );
}
