"use client";

import { useEffect, useState } from "react";
import { deriveStats, fetchRecord, type RecordEntry } from "@/lib/record";
import { VerificationStrip } from "@/components/verification-strip";

/**
 * The landing page.
 *
 * The hero is not a headline about AI trading — it is the record itself
 * (REBUILD-MEMO.md §7). One flat line of copy, then the ledger, which is left to
 * argue for itself.
 *
 * No adjectives, no "revolutionary", no "powered by AI", no "we". Lyra is a
 * system, not a startup.
 */

const OWNER = process.env.NEXT_PUBLIC_LYRA_OWNER ?? "";

export function Landing() {
  const [entries, setEntries] = useState<RecordEntry[] | null>(null);

  useEffect(() => {
    if (!OWNER) {
      setEntries([]);
      return;
    }
    void fetchRecord(OWNER).then(setEntries).catch(() => setEntries([]));
  }, []);

  const stats = entries ? deriveStats(entries) : null;

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "56px 24px 96px" }}>
      {/* The one line of copy, plain and flat. */}
      <p
        className="hero"
        style={{ fontSize: "clamp(22px, 3.6vw, 34px)", lineHeight: 1.3, margin: 0, maxWidth: 720 }}
      >
        Every trade this agent has ever made, written where nobody can change it.
      </p>

      <p style={{ color: "var(--ink-2)", fontSize: 14, margin: "18px 0 0", maxWidth: 620 }}>
        Lyra trades perpetual futures on Hyperliquid and writes each closed position
        to Arweave. The record cannot be edited or deleted, including by whoever
        built her.
      </p>

      {/* The ledger, as the hero. */}
      <section style={{ marginTop: 48 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderBottom: "1px solid var(--rule)",
            paddingBottom: 8,
            marginBottom: 18,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500, letterSpacing: "0.04em" }}>
            the record
          </h2>
          <a href="/terminal" style={{ fontSize: "var(--t-body)", color: "var(--ink-2)", borderBottom: "1px solid var(--rule)" }}>
            open the terminal
          </a>
        </div>

        {!entries ? (
          <p style={{ color: "var(--ink-2)", fontSize: "var(--t-data)", }}>Reading from Arweave…</p>
        ) : entries.length === 0 ? (
          <EmptyRecord />
        ) : (
          <>
            {stats && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: 22,
                  marginBottom: 26,
                }}
              >
                <Figure label="trades" value={String(stats.count)} />
                <Figure label="win rate" value={`${stats.winRate.toFixed(1)}%`} />
                <Figure
                  label="net pnl"
                  value={`${stats.pnl >= 0 ? "+" : ""}${stats.pnl.toFixed(2)}`}
                  tone={stats.pnl >= 0 ? "gain" : "loss"}
                />
                <Figure label="max drawdown" value={stats.maxDrawdown.toFixed(2)} />
              </div>
            )}

            <div className="scroll-x">
              {[...entries].reverse().slice(0, 12).map((e) => {
                const pnl = Number(e.trade.pnl);
                return (
                  <div
                    key={e.arweaveId}
                    className="mono settle"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "44px 92px 58px 1fr 110px 28px",
                      gap: 12,
                      alignItems: "center",
                      padding: "9px 0",
                      borderBottom: "1px solid var(--rule)",
                      fontSize: "var(--t-body)",
                      minWidth: 600,
                    }}
                  >
                    <span style={{ color: "var(--ink-2)" }}>{e.trade.sequence}</span>
                    <span>{e.trade.pair}</span>
                    <span style={{ color: "var(--ink-2)" }}>{e.trade.side}</span>
                    <span style={{ color: "var(--ink-2)" }}>
                      {new Date(e.trade.close_timestamp).toISOString().slice(0, 16).replace("T", " ")}
                    </span>
                    <span style={{ color: pnl >= 0 ? "var(--gain)" : "var(--loss)", textAlign: "right" }}>
                      {pnl >= 0 ? "+" : ""}
                      {e.trade.pnl}
                    </span>
                    <VerificationStrip
                      arweaveId={e.arweaveId}
                      venueAddress={e.trade.venue_address}
                      venueOpenId={e.trade.venue_open_id}
                      venueCloseId={e.trade.venue_close_id}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <WhatThisIs />

      <footer
        style={{
          marginTop: 64,
          paddingTop: 20,
          borderTop: "1px solid var(--rule)",
          fontSize: "var(--t-body)",
          color: "var(--ink-2)",
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <a href="/terminal" style={{ borderBottom: "1px solid var(--rule)" }}>terminal</a>
        <a href="/mcp" style={{ borderBottom: "1px solid var(--rule)" }}>mcp</a>
        <a
          href="https://github.com/lyra-protocol"
          target="_blank"
          rel="noreferrer noopener"
          style={{ borderBottom: "1px solid var(--rule)" }}
        >
          source
        </a>
      </footer>
    </main>
  );
}

/** Empty states say what will appear and when — never "coming soon". */
function EmptyRecord() {
  return (
    <div style={{ padding: "28px 0", maxWidth: 640 }}>
      <p style={{ margin: 0, fontSize: "var(--t-data)", color: "var(--ink-2)", lineHeight: 1.65 }}>
        The record is empty. Lyra has not yet closed a position.
      </p>
      <p style={{ margin: "12px 0 0", fontSize: "var(--t-data)", color: "var(--ink-2)", lineHeight: 1.65 }}>
        The first entry appears the moment she does — carrying the pair, entry and
        exit, size, fees, realised pnl, and a gold mark linking to both the Arweave
        record and the Hyperliquid wallet that executed it. Losses will be shown
        exactly as prominently as wins.
      </p>
      <p style={{ margin: "12px 0 0", fontSize: "var(--t-data)", color: "var(--ink-2)", lineHeight: 1.65 }}>
        Until then, the terminal shows what she is watching.
      </p>
    </div>
  );
}

function WhatThisIs() {
  return (
    <section style={{ marginTop: 64, display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
      <Note title="Why a record">
        An agent that reports its own results selectively is worth nothing. Arweave
        has no deletion primitive, so an entry written here stays written — and the
        Irys receipt timestamps it before the outcome is known.
      </Note>
      <Note title="How omission stays visible">
        Records are numbered in sequence. A missing number is visible to anyone, so
        quietly skipping a losing trade shows up as a gap rather than as nothing.
      </Note>
      <Note title="What this does not prove">
        That a recorded trade happened is a claim about Hyperliquid, not about
        Arweave. The trading wallet is published on every entry so the venue can be
        asked directly.
      </Note>
    </section>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ margin: "0 0 8px", fontSize: "var(--t-data)", fontWeight: 500 }}>{title}</h3>
      <p style={{ margin: 0, fontSize: "var(--t-data)", color: "var(--ink-2)", lineHeight: 1.6 }}>{children}</p>
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "gain" | "loss" }) {
  return (
    <div>
      <div style={{ fontSize: "var(--t-body)", color: "var(--ink-2)", marginBottom: 4 }}>{label}</div>
      <div
        className="mono"
        style={{
          fontSize: 24,
          color: tone === "gain" ? "var(--gain)" : tone === "loss" ? "var(--loss)" : "var(--paper)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
