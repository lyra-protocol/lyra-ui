"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchStatus, fetchTrades, fetchWallet,
  type StatusResponse, type TradesResponse, type WalletState,
} from "@/lib/painmap";

/**
 * lyrabuild.xyz — the hub.
 *
 * Not a second pitch. `/lyra` argues for her; this is the index that says what
 * exists, who built it, and where each piece lives. So it is written as a
 * directory rather than a page with a hero: rows, counts, and links.
 *
 * Everything numeric here is measured, never claimed. The dataset figures come
 * from the collector that is building it, so the page cannot overstate the one
 * asset the project actually owns.
 */

const int = (n: number) => n.toLocaleString("en-US");
const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function Hub() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [trades, setTrades] = useState<TradesResponse | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      void fetchStatus().then((s) => alive && setStatus(s)).catch(() => {});
      void fetchWallet().then((w) => alive && setWallet(w)).catch(() => {});
      void fetchTrades().then((t) => alive && setTrades(t)).catch(() => {});
    };
    load();
    const id = setInterval(load, 20000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const days = status
    ? Math.max(1, Math.round((Date.now() - status.observingSince) / 86_400_000))
    : null;

  return (
    <main className="hub">

      <header className="hub-top">
        <div className="hub-mark">
          <span className="w">LYRABUILD</span>
          <span className="b">Scion Systems Ltd</span>
        </div>
        <div className="hub-live">
          <span className={wallet ? "ly-dot on" : "ly-dot"} />
          {wallet
            ? `LYRA TRADING · ${wallet.openPositions} OPEN · PAPER`
            : "CONNECTING"}
        </div>
      </header>

      <section className="hub-lede">
        <h1>
          Lyra is an autonomous trading agent that writes down why she is about to
          trade, before she finds out whether she was right.
        </h1>
        <p>
          This is where her work is published. Everything below is live, read-only,
          and open to anyone — including the record of the times she was wrong.
        </p>
      </section>

      {/* The surfaces. An index, so each row says what it is and how big it is. */}
      <section className="hub-index">
        <Row
          href="/lyra"
          k="Lyra"
          what="Who she is, how she decides, and where she currently stands."
          v={trades ? `${trades.netUsd >= 0 ? "+" : "−"}${usd(Math.abs(trades.netUsd))} net` : "—"}
          tone={trades ? (trades.netUsd >= 0 ? "up" : "dn") : undefined}
        />
        <Row
          href="/terminal"
          k="Terminal"
          what="Every decision as she makes it, including the ones not to trade. Her positions, her stops, the forced-flow map she trades on."
          v={wallet ? `${wallet.openPositions} open` : "—"}
        />
        <Row
          href="/mcp"
          k="Data"
          what="The Pain Map over MCP. Read-only and unauthenticated — there is no write path to money here."
          v={status ? `${int(status.addresses)} accounts` : "—"}
        />
        <Row
          href="https://www.npmjs.com/package/@lyra-protocol/record"
          external
          k="Record"
          what="The library that writes and verifies her ledger on Arweave. Anyone can check her record without trusting this site."
          v="npm"
        />
      </section>

      {/* The dataset. The one thing here that cannot be acquired later. */}
      <section className="hub-data">
        <h2>What has been observed so far</h2>
        <p className="hub-note">
          Hyperliquid publishes both counterparties of every trade it settles, but reports
          positions only as they are now — it keeps no history. This dataset therefore
          exists only for whoever was already recording, and cannot be bought or
          backfilled.
        </p>
        <div className="hub-figs">
          <Fig k="ACCOUNTS TRACKED" v={status ? int(status.addresses) : "—"} />
          <Fig k="POSITION CHANGES" v={status ? int(status.changesLogged) : "—"} />
          <Fig k="CLOSURES OBSERVED" v={status ? int(status.closuresObserved) : "—"} />
          <Fig
            k="COLLECTING FOR"
            v={days ? `${days} day${days === 1 ? "" : "s"}` : "—"}
            note={status ? status.universe.join(" · ") : ""}
          />
        </div>
      </section>

      <footer className="hub-foot">
        <div>
          <b>Scion Systems Ltd</b>
          <span>Lagos, Nigeria</span>
        </div>
        <div className="hub-foot-r">
          Lyra runs on her own keys and decides for herself. Nothing on any of these
          pages can place an order.
        </div>
      </footer>
    </main>
  );
}

function Row({ href, k, what, v, tone, external }: {
  href: string; k: string; what: string; v: string;
  tone?: "up" | "dn"; external?: boolean;
}) {
  const inner = (
    <>
      <span className="k">{k}</span>
      <span className="what">{what}</span>
      <span className={`v ${tone ?? ""}`}>{v}</span>
      <span className="go" aria-hidden>→</span>
    </>
  );
  return external ? (
    <a className="hub-row" href={href} target="_blank" rel="noreferrer">{inner}</a>
  ) : (
    <Link className="hub-row" href={href}>{inner}</Link>
  );
}

function Fig({ k, v, note }: { k: string; v: string; note?: string }) {
  return (
    <div className="hub-fig">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {note && <div className="n">{note}</div>}
    </div>
  );
}
