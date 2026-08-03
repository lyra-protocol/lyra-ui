"use client";

import type { Decision } from "@/lib/painmap";

/**
 * The reasoning chain.
 *
 * Her schema forces her to answer who is losing and where they exit *before*
 * she is permitted to name a trade, and DESIGN.md §4.1 measured the same model
 * reaching the opposite conclusion when that order was not enforced. So the
 * order is the evidence, and the rendering has to carry it.
 *
 * Two orientations, both numbered:
 *
 *   across — in the wide decision band, four steps left to right joined by a
 *            rule through the markers. The numbers do the sequencing work that
 *            a vertical wire does, which is why they are not decoration here.
 *   down   — in the narrow inspection panel, where a horizontal chain would
 *            wrap and stop being a chain.
 *
 * Numbering is legitimate here for the reason it usually is not: this genuinely
 * is a sequence, and step 4 is not permitted to exist without steps 1–3.
 */

const QUESTIONS = [
  "Which side is losing?",
  "Where forced orders sit",
  "Hypothesis",
  "Action",
] as const;

const HYPOTHESIS_PROSE: Record<string, string> = {
  magnet: "MAGNET — price drawn to the cluster",
  wall: "WALL — absorbs and reverses",
  cascade: "CASCADE — a breach accelerates",
  none: "NONE APPLIES",
};

const LOSING_PROSE: Record<string, string> = {
  longs: "LONGS",
  shorts: "SHORTS",
  neither: "NEITHER SIDE",
};

const FORCED_PROSE: Record<string, string> = {
  sells_below_spot: "SELLS BELOW SPOT",
  buys_above_spot: "BUYS ABOVE SPOT",
  mixed: "MIXED — NO CONCENTRATION",
};

/** Longer prose for the inspection panel, where there is room to explain. */
const GLOSS: Record<string, string> = {
  longs: "Longs are underwater. Their exits are sells.",
  shorts: "Shorts are underwater. Their exits are buys.",
  neither: "Neither side is meaningfully trapped.",
  sells_below_spot: "Liquidation prices cluster beneath the current price.",
  buys_above_spot: "Liquidation prices cluster above the current price.",
  mixed: "No single direction dominates the forced flow.",
  magnet: "Price tends toward resting liquidity.",
  wall: "The cluster absorbs the move and turns it.",
  cascade: "Breaching the level forces more of the same flow.",
  none: "No mechanism fits the observation.",
};

export function steps(d: Decision): { n: number; k: string; v: string; gloss: string }[] {
  return [
    { n: 1, k: QUESTIONS[0], v: LOSING_PROSE[d.losingSide] ?? d.losingSide, gloss: GLOSS[d.losingSide] ?? "" },
    { n: 2, k: QUESTIONS[1], v: FORCED_PROSE[d.forcedOrdersAre] ?? d.forcedOrdersAre, gloss: GLOSS[d.forcedOrdersAre] ?? "" },
    { n: 3, k: QUESTIONS[2], v: HYPOTHESIS_PROSE[d.hypothesis] ?? d.hypothesis, gloss: GLOSS[d.hypothesis] ?? "" },
    { n: 4, k: QUESTIONS[3], v: d.action.toUpperCase(), gloss: "" },
  ];
}

export function Chain({ decision, orientation = "across" }: {
  decision: Decision;
  orientation?: "across" | "down";
}) {
  const rows = steps(decision);
  return (
    <div className={`chain ${orientation}`}>
      {rows.map((s) => (
        <div key={s.n} className={`link${s.n === 4 ? " terminal" : ""}`}>
          <div className="mark">
            <span className="num">{s.n}</span>
            <span className="k">{s.k}</span>
          </div>
          <div className="v">{s.v}</div>
        </div>
      ))}
    </div>
  );
}
