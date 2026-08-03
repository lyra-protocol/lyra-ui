"use client";

import { useEffect, useState } from "react";
import { fetchWallet, type WalletState } from "@/lib/painmap";
import { formatUsd } from "@/lib/venue";

/**
 * Lyra's account, as anyone can see it.
 *
 * This is the panel a trading terminal puts an order form in. Here there is
 * nothing to submit — the whole surface is observation. That is stated plainly
 * rather than implied by the absence of buttons, because a visitor should know
 * whether they are looking at a demo or at an agent.
 *
 * Every figure is what she actually has. When she has not started, it says so.
 */
export function Wallet() {
  const [state, setState] = useState<WalletState | null>(null);
  const [reachable, setReachable] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchWallet()
        .then((w) => alive && setState(w))
        .catch(() => alive && setReachable(false));
    void load();
    const id = setInterval(load, 10_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const trading = state?.trading ?? false;

  return (
    <section style={{ borderBottom: "1px solid var(--rule)" }}>
      <div className="panel-head">
        <span className="label">account</span>
        <ReadOnlyBadge />
      </div>

      <div style={{ padding: 14 }}>
        {!reachable || !state ? (
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Account state is served by Lyra&rsquo;s own collector, which is not reachable right now.
          </p>
        ) : !trading ? (
          <>
            <div className="mono" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>
              {formatUsd(state.equityUsd)}
            </div>
            <div className="label" style={{ marginTop: 3 }}>equity</div>
            <p style={{ margin: "12px 0 0", fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
              She has not opened a position yet. The decision loop is built and tested; it has not
              been pointed at capital. Nothing here is simulated to look busier than it is.
            </p>
          </>
        ) : (
          <>
            <div style={{ display: "grid", gap: 14 }}>
              <Figure label="equity" value={formatUsd(state.equityUsd)} big />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Figure label="in positions" value={formatUsd(state.notionalUsd)} />
                <Figure
                  label="unrealised"
                  value={`${state.unrealizedPnlUsd >= 0 ? "+" : ""}${formatUsd(Math.abs(state.unrealizedPnlUsd))}`}
                  tone={state.unrealizedPnlUsd >= 0 ? "gain" : "loss"}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Figure label="open positions" value={String(state.openPositions)} />
                <Figure
                  label="today"
                  value={`${state.sessionPnlUsd >= 0 ? "+" : ""}${formatUsd(Math.abs(state.sessionPnlUsd))}`}
                  tone={state.sessionPnlUsd >= 0 ? "gain" : "loss"}
                />
              </div>
            </div>

            {/* The breaker is part of the account, not a footnote. */}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--rule)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="label">daily loss limit</span>
                <span className="mono" style={{ fontSize: 11 }}>
                  {(state.dailyLossUsed * 100).toFixed(1)}% of 7%
                </span>
              </div>
              <div style={{ height: 3, background: "var(--rule-2)", marginTop: 6, position: "relative" }}>
                <div
                  style={{
                    position: "absolute", inset: 0,
                    width: `${Math.min(100, (state.dailyLossUsed / 0.07) * 100)}%`,
                    background: state.dailyLossUsed >= 0.07 ? "var(--loss)" : "var(--ink)",
                  }}
                />
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 10.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
                At 7% down on the session she stops opening positions until tomorrow. Exits stay
                permitted — a halt must never trap the position it was protecting.
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/** Says what this is, once, clearly. */
export function ReadOnlyBadge() {
  return (
    <span
      title="Nothing on this page can place, change or cancel an order."
      style={{
        fontSize: 9.5,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        border: "1px solid var(--rule)",
        padding: "2px 7px",
        color: "var(--ink-2)",
        whiteSpace: "nowrap",
      }}
    >
      watching only
    </span>
  );
}

function Figure({
  label, value, tone, big,
}: { label: string; value: string; tone?: "gain" | "loss"; big?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div
        className="mono"
        style={{
          fontSize: big ? 22 : 15,
          marginTop: 2,
          letterSpacing: big ? "-0.02em" : undefined,
          color: tone === "gain" ? "var(--gain)" : tone === "loss" ? "var(--loss)" : "var(--ink)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
