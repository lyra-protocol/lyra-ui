import { AiSignalSummary } from "@/core/ai/signal";

function buildIntent(signal: AiSignalSummary | null | undefined) {
  if (!signal) {
    return "Working from the current chart and workspace context.";
  }

  if (signal.verdict === "trade" && signal.bias === "long") {
    return "Interested in a long, but only if the trigger confirms.";
  }
  if (signal.verdict === "trade" && signal.bias === "short") {
    return "Interested in a short, but only if the trigger confirms.";
  }
  if (signal.verdict === "watch") {
    return "Watching this one. Not entering until price proves it.";
  }
  return "Standing aside here unless structure improves.";
}

export function AiSignalContextGrid({
  signal,
  reasons,
  trigger,
  invalidation,
}: {
  signal?: AiSignalSummary | null;
  reasons: string[];
  trigger?: string | null;
  invalidation?: string | null;
}) {
  const visibleReasons = reasons.filter(Boolean).slice(0, 2);
  const intent = buildIntent(signal);

  return (
    <div className="grid gap-2 border-t border-black/6 pt-2 text-[10px] sm:grid-cols-2">
      <div>
        <p className="uppercase tracking-[0.12em] text-black/30">What I see</p>
        {visibleReasons.length > 0 ? (
          <ul className="mt-1 space-y-1 text-black/66">
            {visibleReasons.map((line) => (
              <li key={line} className="leading-4">• {line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 leading-4 text-black/66">Reading price structure and current workspace context.</p>
        )}
      </div>
      <div>
        <p className="uppercase tracking-[0.12em] text-black/30">Intent</p>
        <p className="mt-1 leading-4 text-black/66">{intent}</p>
      </div>
      <div>
        <p className="uppercase tracking-[0.12em] text-black/30">Act when</p>
        <p className="mt-1 leading-4 text-black/66">{trigger ?? "Wait for a cleaner trigger."}</p>
      </div>
      <div>
        <p className="uppercase tracking-[0.12em] text-black/30">Risk if wrong</p>
        <p className="mt-1 leading-4 text-black/66">{invalidation ?? "No clean invalidation yet."}</p>
      </div>
    </div>
  );
}
