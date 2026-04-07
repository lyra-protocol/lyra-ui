"use client";

import { formatCompactNumber } from "@/core/market/format";
import { usePaperBalanceBanner } from "@/hooks/use-paper-balance-banner";

export function ContextOnboardingNote({
  startingBalance,
  currency,
}: {
  startingBalance: number;
  currency: string;
}) {
  const { shouldShow, dismiss, isPending } = usePaperBalanceBanner();

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="border-b border-black/8 px-2 py-2">
      <p className="text-[10px] font-medium text-black/84">Paper account ready</p>
      <p className="mt-1 text-[10px] leading-4 text-black/56">
        {formatCompactNumber(startingBalance)} paper {currency} is ready for you to begin using the
        workspace.
      </p>
      <button
        type="button"
        onClick={dismiss}
        disabled={isPending}
        className="mt-2 h-7 border border-black/10 px-2.5 text-[10px] font-medium text-black/72 transition hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:text-black/28"
      >
        {isPending ? "Saving…" : "Got it"}
      </button>
    </div>
  );
}
