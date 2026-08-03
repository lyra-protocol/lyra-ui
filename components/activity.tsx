"use client";

import { useEffect, useState } from "react";
import { fetchActivity, type ActivityResponse } from "@/lib/painmap";

/**
 * Her reasoning.
 *
 * This panel is the product. Everything else on the terminal describes the
 * market; this describes her, and it is the only output of the whole system that
 * is falsifiable.
 *
 * ── Why it is a numbered chain rather than a paragraph ──────────────────────
 *
 * The decision schema forces its fields in a fixed order, and that order is not
 * cosmetic. The root DESIGN.md §4.1 measured the same model, on the same data,
 * answering "open_short" when it could name an action directly — and "open_long"
 * when required to commit to losing_side and forced_orders_are first. The second
 * is correct.
 *
 * So the sequence of commitments *is* the evidence. Flattening it into prose
 * destroys the exact property that makes the decision trustworthy. Each step is
 * therefore a discrete numbered row, in the order she was forced to answer, and
 * you can watch her commit to a premise before she is permitted to name a trade.
 *
 * Three layers: the call and the chain are always visible; the prose, the record
 * link and the cost are folded until asked for.
 */
export function Activity() {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchActivity()
        .then((d) => alive && setData(d))
        .catch(() => alive && setFailed(true));
    void load();
    const id = setInterval(load, 15_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const decisions = data?.decisions ?? [];

  return (
    <section>
      <div className="head">
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--s3)" }}>
          <span className="lbl">reasoning</span>
          <span className="dimmer" style={{ fontSize: "var(--t-micro)" }}>
            every consultation, including the ones she declined
          </span>
        </div>
        {decisions.length > 0 && (
          <span className="mono dimmer" style={{ fontSize: "var(--t-micro)" }}>
            {decisions.length} shown
          </span>
        )}
      </div>

      {failed || !data?.available || decisions.length === 0 ? (
        <Empty />
      ) : (
        <div className="scroll-y" style={{ maxHeight: "62vh" }}>
          {decisions.map((d) => (
            <DecisionCard key={d.id} decision={d} />
          ))}
        </div>
      )}
    </section>
  );
}

type Decision = ActivityResponse["decisions"][number];

function DecisionCard({ decision: d }: { decision: Decision }) {
  const [open, setOpen] = useState(false);
  const traded = d.action.startsWith("open") || d.action === "close";

  return (
    <article className="decision settle">
      {/* Layer 1 — the call. */}
      <div className="decision-call">
        <span className="mono dimmer" style={{ fontSize: "var(--t-micro)" }}>
          {new Date(d.at).toISOString().slice(11, 19)}
        </span>
        <span className="emph">{d.asset}</span>
        <span
          className="mono"
          style={{
            fontSize: "var(--t-data)",
            fontWeight: traded ? 500 : 400,
            color: traded ? "var(--ink)" : "var(--ink-2)",
          }}
        >
          {d.action}
        </span>
        <span style={{ flex: 1 }} />
        <Conviction value={d.conviction} />
      </div>

      {/* Layer 2 — the commitment chain, in the order she was forced to answer. */}
      <div className="chain">
        <Step n={1} label="losing side" value={d.losingSide} />
        <Step n={2} label="forced orders" value={humanise(d.forcedOrdersAre)} />
        <Step n={3} label="hypothesis" value={d.hypothesis} note={HYPOTHESIS[d.hypothesis]} />
        <Step n={4} label="action" value={d.action} emphasis />
      </div>

      {/* Layer 3 — folded. */}
      <button className="disclose" onClick={() => setOpen((v) => !v)}>
        {open ? "− hide reasoning" : "+ full reasoning"}
      </button>

      {open && (
        <div style={{ marginTop: "var(--s3)" }}>
          <p
            className="dim"
            style={{ margin: 0, fontSize: "var(--t-body)", lineHeight: 1.65, maxWidth: "68ch" }}
          >
            {d.reasoning}
          </p>

          {d.reasoningId && (
            <div style={{ marginTop: "var(--s3)" }}>
              <span className="lbl">written before the outcome</span>
              <div style={{ marginTop: "var(--s1)" }}>
                {d.reasoningId.startsWith("local:") ? (
                  <span className="mono dimmer" style={{ fontSize: "var(--t-micro)" }}>
                    {d.reasoningId} — held off chain while the parameters are still being tuned
                  </span>
                ) : (
                  <a
                    className="mono"
                    style={{ fontSize: "var(--t-micro)", borderBottom: "1px solid var(--rule)" }}
                    href={`https://gateway.irys.xyz/${d.reasoningId}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {d.reasoningId} ↗
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * One commitment.
 *
 * The number is not decoration — it marks a position in a sequence the schema
 * enforces, which is the thing being demonstrated.
 */
function Step({
  n, label, value, note, emphasis,
}: { n: number; label: string; value: string; note?: string; emphasis?: boolean }) {
  return (
    <div className="chain-step">
      <span className="chain-n mono">{n}</span>
      <span className="lbl">{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: "var(--s2)", flexWrap: "wrap" }}>
        <span className="mono" style={{ fontSize: "var(--t-data)", fontWeight: emphasis ? 500 : 400 }}>
          {value}
        </span>
        {note && <span className="dimmer" style={{ fontSize: "var(--t-micro)" }}>{note}</span>}
      </span>
    </div>
  );
}

/** Conviction as a bar, because a number between 0 and 1 is hard to feel. */
function Conviction({ value }: { value: number }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}>
      <span className="lbl">conviction</span>
      <span style={{ width: 46 }} className="track">
        <i style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }} />
      </span>
      <span className="mono dimmer" style={{ fontSize: "var(--t-micro)" }}>
        {value.toFixed(2)}
      </span>
    </span>
  );
}

/** What each hypothesis claims, so the word is not jargon on first encounter. */
const HYPOTHESIS: Record<string, string> = {
  magnet: "price is drawn toward the cluster",
  wall: "the cluster absorbs and reverses price",
  cascade: "once breached, forced flow accelerates the move",
  none: "no cluster is relevant here",
};

function humanise(v: string): string {
  return v.replace(/_/g, " ");
}

function Empty() {
  return (
    <div className="pad">
      <p className="dim" style={{ margin: 0, fontSize: "var(--t-body)", maxWidth: "64ch", lineHeight: 1.65 }}>
        No decisions in this window.
      </p>
      <p className="dimmer" style={{ margin: "var(--s2) 0 0", fontSize: "var(--t-body)", maxWidth: "64ch", lineHeight: 1.65 }}>
        She consults the model only when the world moves enough to be worth thinking about —
        positioning shifting materially, price approaching a forced-flow cluster, or an open
        position needing review. Most market updates are deliberately ignored. When she does
        look, the decision appears here whether or not she trades.
      </p>
    </div>
  );
}
