"use client";

import type { Decision } from "@/lib/painmap";

/**
 * The reasoning chain.
 *
 * Rendered as a connected top-to-bottom sequence, not a row of fields. The
 * order is the evidence: her schema forces her to answer who is losing and
 * where they exit *before* she is permitted to name a trade, and the root
 * DESIGN.md §4.1 measured the same model reaching the opposite conclusion when
 * that order was not enforced.
 *
 * Four fields laid out side by side read as four properties. A wired rail reads
 * as reasoning, which is what it is.
 */

const QUESTIONS = ["WHO IS LOSING", "WHERE THEY EXIT", "HYPOTHESIS", "ACTION"] as const;

const HYPOTHESIS_PROSE: Record<string, string> = {
  magnet: "Price is drawn toward the cluster",
  wall: "Liquidity wall — absorbs and reverses",
  cascade: "Cascade — a breach accelerates the move",
  none: "None applies",
};

const LOSING_PROSE: Record<string, string> = {
  longs: "Longs are trapped",
  shorts: "Shorts are trapped",
  neither: "Neither side",
};

const FORCED_PROSE: Record<string, string> = {
  sells_below_spot: "Forced selling below spot",
  buys_above_spot: "Forced buying above spot",
  mixed: "Mixed — no concentration",
};

export function steps(d: Decision): { k: string; v: string }[] {
  return [
    { k: QUESTIONS[0], v: LOSING_PROSE[d.losingSide] ?? d.losingSide },
    { k: QUESTIONS[1], v: FORCED_PROSE[d.forcedOrdersAre] ?? d.forcedOrdersAre },
    { k: QUESTIONS[2], v: HYPOTHESIS_PROSE[d.hypothesis] ?? d.hypothesis },
    { k: QUESTIONS[3], v: d.action.replace(/_/g, " ").toUpperCase() },
  ];
}

export function Chain({ decision }: { decision: Decision }) {
  const rows = steps(decision);
  return (
    <div className="chain">
      {rows.map((s, i) => {
        const terminal = i === rows.length - 1;
        return (
          <div key={s.k} className={terminal ? "link terminal" : "link"}>
            <span className="rail">
              <span className="node" />
              <span className="wire" />
            </span>
            <span className="txt">
              <span className="k">{s.k}</span>
              <div className="v">{s.v}</div>
              {terminal && (
                /* Confidence is the output of the reasoning, so it sits with the
                   action rather than floating at the edge of the card. */
                <div className="conf">
                  <span className="k">CONFIDENCE</span>
                  <span className="bar">
                    <i style={{ width: `${Math.max(2, decision.conviction * 100)}%` }} />
                  </span>
                  <span className="n">{(decision.conviction * 100).toFixed(0)}%</span>
                </div>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
