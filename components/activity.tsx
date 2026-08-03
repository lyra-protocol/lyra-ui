"use client";

import { useEffect, useState } from "react";
import { fetchActivity, type ActivityResponse } from "@/lib/painmap";

/**
 * What Lyra has decided.
 *
 * Every consultation is shown, including the ones where she declined to trade —
 * showing only the decisions that became trades would be selective reporting by
 * construction, and "she was right to stay out" would be unfalsifiable.
 *
 * When there is nothing, this says so and says why. It does not animate an
 * agent that is not running.
 */
export function Activity() {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchActivity()
        .then((d) => alive && setData(d))
        .catch(() => alive && setError(true));
    void load();
    const id = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <section>
      <div className="panel-head">
        <span className="label">decisions</span>
        <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
          every consultation, including the holds
        </span>
      </div>

      <div style={{ padding: 16 }}>
        {error || !data || !data.available || data.decisions.length === 0 ? (
          <div>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-2)", maxWidth: 620, lineHeight: 1.6 }}>
              Lyra has not made a trading decision yet.
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--ink-3)", maxWidth: 620, lineHeight: 1.6 }}>
              She is observing continuously and the Pain Map above is live. The decision loop is
              built and tested but not yet running against capital. When it starts, every
              consultation appears here — the direction she read, which side was losing, which
              hypothesis she bet on, and a link to the reasoning written to Arweave
              <em> before</em> the position opened.
            </p>
          </div>
        ) : (
          data.decisions.map((d) => (
            <div
              key={d.id}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid var(--rule-2)",
                display: "grid",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                  {new Date(d.at).toISOString().slice(11, 19)}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{d.asset}</span>
                <span className="mono" style={{ fontSize: 11.5 }}>{d.action}</span>
                <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
                  {d.losingSide} losing · {d.hypothesis} · conviction {d.conviction.toFixed(2)}
                </span>
                {d.reasoningId && (
                  <a
                    href={`https://gateway.irys.xyz/${d.reasoningId}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mono"
                    style={{ fontSize: 10.5, borderBottom: "1px solid var(--rule)" }}
                  >
                    reasoning ↗
                  </a>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55 }}>
                {d.reasoning}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
