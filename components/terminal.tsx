"use client";

import { useEffect, useRef, useState } from "react";
import {
  UNIVERSE,
  WS_URL,
  dayChange,
  fetchUniverse,
  formatPx,
  formatUsd,
  fundingAnnualPct,
  type AssetSnapshot,
} from "@/lib/venue";
import { deriveStats, fetchRecord, findGaps, type RecordEntry } from "@/lib/record";
import { VerificationStrip } from "@/components/verification-strip";

/**
 * The terminal.
 *
 * One job (REBUILD-MEMO.md §6): let a stranger see what Lyra is doing and
 * verify it, in under thirty seconds, without an account.
 *
 * There is no chat, no command line, no assistant and no login. Everything here
 * is read directly from Hyperliquid and Arweave in the browser, so nothing on
 * screen depends on trusting a server we run.
 */

const OWNER = process.env.NEXT_PUBLIC_LYRA_OWNER ?? "";

export function Terminal() {
  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 24px 96px" }}>
      <Header />
      <LiveTape />
      <Watching />
      <Record />
      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
        <a href="/" className="display" style={{ fontSize: 26, letterSpacing: "0.02em" }}>
          Lyra
        </a>
        <span style={{ color: "var(--slate)", fontSize: 13 }}>terminal</span>
      </div>
      <p style={{ margin: "10px 0 0", color: "var(--slate)", fontSize: 14, maxWidth: 640 }}>
        Every trade she has made, and what she is watching right now. Read straight
        from Hyperliquid and Arweave — no account, and nothing here asks you to
        trust it.
      </p>
    </header>
  );
}

/** Live trades from the venue. The only animated thing on the site. */
function LiveTape() {
  const [prints, setPrints] = useState<
    { id: string; coin: string; px: string; sz: string; side: string; time: number }[]
  >([]);
  const [connected, setConnected] = useState(false);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      setConnected(true);
      for (const coin of UNIVERSE) {
        ws.send(JSON.stringify({ method: "subscribe", subscription: { type: "trades", coin } }));
      }
    };
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        if (msg.channel !== "trades" || !Array.isArray(msg.data)) return;
        const fresh = msg.data
          .filter((t: { tid: number }) => !seen.current.has(String(t.tid)))
          .map((t: { tid: number; coin: string; px: string; sz: string; side: string; time: number }) => {
            seen.current.add(String(t.tid));
            return { id: String(t.tid), coin: t.coin, px: t.px, sz: t.sz, side: t.side, time: t.time };
          });
        if (fresh.length) setPrints((p) => [...fresh, ...p].slice(0, 12));
      } catch {
        /* a malformed frame is not worth breaking the page over */
      }
    };
    return () => ws.close();
  }, []);

  return (
    <Section
      title="Live venue tape"
      note={connected ? "connected to Hyperliquid" : "connecting…"}
    >
      <div style={{ minHeight: 180 }}>
        {prints.length === 0 ? (
          <Empty>Trades will appear here as they print on Hyperliquid.</Empty>
        ) : (
          <div className="mono" style={{ fontSize: 12.5 }}>
            {prints.map((t) => (
              <div
                key={t.id}
                className="settle"
                style={{
                  display: "grid",
                  gridTemplateColumns: "68px 1fr auto auto",
                  gap: 14,
                  padding: "5px 0",
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                <span>{t.coin}</span>
                <span style={{ color: t.side === "B" ? "var(--gain)" : "var(--loss)" }}>
                  {t.side === "B" ? "buy " : "sell"}
                </span>
                <span>{formatPx(t.px)}</span>
                <span style={{ color: "var(--slate)" }}>{t.sz}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

/** The universe she watches, and why each asset is in it. */
function Watching() {
  const [assets, setAssets] = useState<AssetSnapshot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchUniverse()
        .then((a) => alive && setAssets(a))
        .catch((e: Error) => alive && setError(e.message));
    void load();
    const id = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <Section
      title="What she is watching"
      note={`${UNIVERSE.length} assets, selected for decorrelation`}
    >
      {error ? (
        <Empty>Could not reach Hyperliquid: {error}</Empty>
      ) : !assets ? (
        <Empty>Loading venue state…</Empty>
      ) : (
        <div className="scroll-x">
          <table className="mono" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 640 }}>
            <thead>
              <tr style={{ color: "var(--slate)", textAlign: "right" }}>
                <th style={{ textAlign: "left", padding: "6px 0", fontWeight: 400 }}>asset</th>
                <th style={{ padding: "6px 12px", fontWeight: 400 }}>mark</th>
                <th style={{ padding: "6px 12px", fontWeight: 400 }}>24h</th>
                <th style={{ padding: "6px 12px", fontWeight: 400 }}>funding /yr</th>
                <th style={{ padding: "6px 12px", fontWeight: 400 }}>open interest</th>
                <th style={{ padding: "6px 0 6px 12px", fontWeight: 400 }}>24h volume</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => {
                const chg = dayChange(a);
                const fund = fundingAnnualPct(a);
                return (
                  <tr key={a.coin} style={{ borderTop: "1px solid var(--rule)", textAlign: "right" }}>
                    <td style={{ textAlign: "left", padding: "7px 0" }}>{a.coin}</td>
                    <td style={{ padding: "7px 12px" }}>{formatPx(a.markPx)}</td>
                    <td style={{ padding: "7px 12px", color: chg >= 0 ? "var(--gain)" : "var(--loss)" }}>
                      {chg >= 0 ? "+" : ""}
                      {chg.toFixed(2)}%
                    </td>
                    <td style={{ padding: "7px 12px", color: "var(--slate)" }}>
                      {fund >= 0 ? "+" : ""}
                      {fund.toFixed(1)}%
                    </td>
                    <td style={{ padding: "7px 12px", color: "var(--slate)" }}>
                      {formatUsd(Number(a.openInterest) * Number(a.markPx))}
                    </td>
                    <td style={{ padding: "7px 0 7px 12px", color: "var(--slate)" }}>
                      {formatUsd(a.dayNtlVlm)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

/** The record itself. Losses shown as prominently as wins. */
function Record() {
  const [entries, setEntries] = useState<RecordEntry[] | null>(null);

  useEffect(() => {
    if (!OWNER) {
      setEntries([]);
      return;
    }
    void fetchRecord(OWNER)
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  const stats = entries ? deriveStats(entries) : null;
  const gaps = entries ? findGaps(entries) : [];

  return (
    <Section title="The record" note="written to Arweave, cannot be edited or deleted">
      {!entries ? (
        <Empty>Reading the record from Arweave…</Empty>
      ) : entries.length === 0 ? (
        <Empty>
          No trades recorded yet. The first will appear here the moment Lyra closes a
          position and writes it to Arweave — with a link to the record and to the
          Hyperliquid wallet, so you can check it against the venue yourself.
        </Empty>
      ) : (
        <>
          {stats && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 20,
                paddingBottom: 20,
                marginBottom: 20,
                borderBottom: "1px solid var(--rule)",
              }}
            >
              <Stat label="trades" value={String(stats.count)} derivation="count of records" />
              <Stat
                label="win rate"
                value={`${stats.winRate.toFixed(1)}%`}
                derivation={`${stats.wins} of ${stats.count}`}
              />
              <Stat
                label="net pnl"
                value={`${stats.pnl >= 0 ? "+" : ""}${stats.pnl.toFixed(2)}`}
                tone={stats.pnl >= 0 ? "gain" : "loss"}
                derivation="sum of pnl fields"
              />
              <Stat label="fees paid" value={stats.fees.toFixed(2)} derivation="sum of fees fields" />
              <Stat
                label="max drawdown"
                value={stats.maxDrawdown.toFixed(2)}
                derivation="peak-to-trough of cumulative pnl"
              />
            </div>
          )}

          {gaps.length > 0 && (
            <p style={{ fontSize: 12.5, color: "var(--slate)", marginTop: 0 }}>
              Sequence gaps at {gaps.join(", ")}. A gap means a sequence number was
              never written — it is how omission stays visible. It is not proof of
              anything on its own: a crash leaves one, and so does indexing lag.
            </p>
          )}

          <div className="scroll-x">
            {[...entries].reverse().map((e) => {
              const pnl = Number(e.trade.pnl);
              return (
                <div
                  key={e.arweaveId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 90px 60px 1fr 1fr 110px 28px",
                    gap: 12,
                    alignItems: "center",
                    padding: "9px 0",
                    borderBottom: "1px solid var(--rule)",
                    fontSize: 12.5,
                    minWidth: 640,
                  }}
                  className="mono"
                >
                  <span style={{ color: "var(--slate)" }}>{e.trade.sequence}</span>
                  <span>{e.trade.pair}</span>
                  <span style={{ color: "var(--slate)" }}>{e.trade.side}</span>
                  <span style={{ color: "var(--slate)" }}>{e.trade.entry_price}</span>
                  <span style={{ color: "var(--slate)" }}>{e.trade.exit_price}</span>
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
    </Section>
  );
}

function Footer() {
  return (
    <footer style={{ marginTop: 56, paddingTop: 20, borderTop: "1px solid var(--rule)", fontSize: 12.5, color: "var(--slate)" }}>
      <p style={{ margin: 0, maxWidth: 680 }}>
        Prices and trades come from Hyperliquid&rsquo;s public API. The record comes
        from Arweave. Both are queryable by anyone — this page holds no data of its
        own and stores nothing about you.
      </p>
      <p style={{ margin: "10px 0 0" }}>
        <a href="/mcp" style={{ color: "var(--slate)", borderBottom: "1px solid var(--rule)" }}>
          connect over MCP
        </a>
      </p>
    </footer>
  );
}

/* ── shared shell ───────────────────────────────────────────────────────── */

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 44 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 16,
          borderBottom: "1px solid var(--rule-strong)",
          paddingBottom: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500, letterSpacing: "0.04em", textTransform: "lowercase" }}>
          {title}
        </h2>
        {note && <span style={{ fontSize: 12, color: "var(--slate)" }}>{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  derivation,
  tone,
}: {
  label: string;
  value: string;
  derivation: string;
  tone?: "gain" | "loss";
}) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: "var(--slate)", marginBottom: 4 }}>{label}</div>
      <div
        className="mono"
        style={{
          fontSize: 20,
          color: tone === "gain" ? "var(--gain)" : tone === "loss" ? "var(--loss)" : "var(--paper)",
        }}
      >
        {value}
      </div>
      {/* Every number shows its derivation — memo §6. */}
      <div style={{ fontSize: 11, color: "var(--slate)", marginTop: 3, opacity: 0.75 }}>{derivation}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13, color: "var(--slate)", margin: 0, maxWidth: 620, lineHeight: 1.6 }}>{children}</p>
  );
}
