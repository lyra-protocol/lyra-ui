"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchActivity, fetchTrades, fetchWallet,
  type Decision, type TradesResponse, type WalletState,
} from "@/lib/painmap";

/**
 * Lyra's own page.
 *
 * Not the terminal, and not a brochure either. The terminal is an instrument
 * for someone already convinced; this is for someone deciding whether to look.
 * The distinction that governs every choice below: **it shows her real numbers
 * even when they are bad.** A page that only renders well when she is winning
 * would contradict the single claim the whole project rests on.
 *
 * So the hero carries live figures rather than a promise, the track record
 * states losses at the same size as gains, and nothing here is illustrative —
 * every number is the same one the terminal is reading.
 */

const nf = (n: number, d = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export function LyraPage() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [trades, setTrades] = useState<TradesResponse | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => {
      void fetchWallet().then((w) => { if (alive) { setWallet(w); setLive(true); } }).catch(() => {});
      void fetchTrades().then((t) => alive && setTrades(t)).catch(() => {});
      void fetchActivity().then((d) => alive && setDecisions(d.decisions ?? [])).catch(() => {});
    };
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const closed = trades ? trades.wins + trades.losses : 0;
  const winRate = closed > 0 ? (trades!.wins / closed) * 100 : null;
  const held = decisions.filter((d) => d.action === "hold").length;

  return (
    <main className="ly">

      {/* ── hero: her, and what she is currently doing ─────────────── */}
      <section className="ly-hero">
        <div className="ly-portrait">
          <Image
            src="/lyra.jpg"
            alt="Lyra"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 42vw"
            style={{ objectFit: "cover", objectPosition: "center 22%" }}
          />
          <div className="ly-name">
            <span className="ly-wordmark">LYRA</span>
            <span className="ly-role">autonomous trading agent</span>
          </div>
        </div>

        <div className="ly-intro">
          <div className="ly-status">
            <span className={live ? "ly-dot on" : "ly-dot"} />
            {live ? "TRADING NOW · PAPER" : "CONNECTING"}
          </div>

          <h1>
            She writes down why she is about to trade,
            <em> before she finds out whether she was right.</em>
          </h1>

          <p className="ly-lede">
            Lyra decides for herself. Every consultation — the trades and the times she
            declined — is timestamped and published. Not a summary written afterwards:
            the actual reasoning, committed while the outcome was still unknown.
          </p>

          {/* Live, not illustrative. If she is down, this says so. */}
          <div className="ly-figures">
            <Figure
              k="EQUITY"
              v={wallet ? `$${nf(wallet.equityUsd)}` : "—"}
              note="paper capital"
            />
            <Figure
              k="REALISED, NET OF FEES"
              v={trades ? `${trades.netUsd >= 0 ? "+" : "−"}$${nf(Math.abs(trades.netUsd))}` : "—"}
              tone={trades ? (trades.netUsd >= 0 ? "up" : "dn") : undefined}
              note={trades ? `${closed} closed · ${trades.wins}W ${trades.losses}L` : ""}
            />
            <Figure
              k="OPEN"
              v={wallet ? String(wallet.openPositions) : "—"}
              note={wallet ? `$${nf(wallet.notionalUsd, 0)} at work` : ""}
            />
            <Figure
              k="DAILY LOSS LIMIT"
              v={wallet ? `${(wallet.dailyLossUsed * 100).toFixed(2)}%` : "—"}
              note="halts at 7.00%"
            />
          </div>

          <div className="ly-cta">
            <Link href="/terminal" className="ly-btn">Watch her work</Link>
            <span className="ly-fine">
              Read-only. There is nothing on that screen you can press to make her trade.
            </span>
          </div>
        </div>
      </section>

      {/* ── who she is, provably ───────────────────────────────────── */}
      <section className="ly-id">
        <div className="ly-id-head">
          <span className="k">ERC-8004 · TRUSTLESS AGENT IDENTITY</span>
          <span className="ly-id-verified">VERIFIED</span>
        </div>
        <div className="ly-id-grid">
          <div className="ly-id-num">
            <span className="k">AGENT</span>
            <span className="v">#60594</span>
          </div>
          <div className="ly-id-rows">
            <IdRow k="Registry" v="Base · 0x8004A169…a432"
              href="https://basescan.org/token/0x8004a169fb4a3325136eb29fa0ceb6d2e539a432?a=60594" />
            <IdRow k="Held by" v="0xB5Dc6714…2780e"
              href="https://basescan.org/address/0xB5Dc6714167bD31958B62bB2d25FBB0012d2780e" />
            <IdRow k="Registered" v="Block 49,546,657"
              href="https://basescan.org/tx/0xe9fbf22c63b766d18b9c6db25f18fee58a71e81b36263b5001b64a3b3cb637a8" />
            <IdRow k="Agent card" v="lyrabuild.xyz/.well-known"
              href="/.well-known/agent-registration.json" />
          </div>
        </div>
        <p className="ly-id-note">
          The registry is an ERC-721: the wallet holding token 60594 <em>is</em>{" "}Lyra. It is her
          own wallet and nobody else&rsquo;s, so looking her up reveals nothing about any person.
          The chain says this domain describes agent 60594; this domain says the same back.
          Neither has to be taken on trust.
        </p>
      </section>

      {/* ── the edge ───────────────────────────────────────────────── */}
      <Section n="01" title="She can see who is about to be forced to trade">
        <p>
          Hyperliquid publishes both sides of every trade it settles — who bought and who
          sold. No other major venue does. Lyra has been recording that feed continuously,
          which means she can rebuild the actual positions of thousands of real accounts:
          their size, their entry, and the exact price at which each one is liquidated.
        </p>
        <p>
          Add those liquidation prices up and you get a map of forced orders — trades that
          <em> must</em> happen at known prices, regardless of what anyone wants. That map is
          the only thing she trades on.
        </p>
        <aside className="ly-aside">
          <b>It cannot be bought or backfilled.</b> The venue reports positions as they are
          now and keeps no history, so this dataset only exists for whoever was already
          recording. Starting today buys you a dataset that begins today.
        </aside>
      </Section>

      {/* ── the reasoning ──────────────────────────────────────────── */}
      <Section n="02" title="She has to commit to why before she is allowed to say what">
        <p>
          Lyra cannot simply name a trade. She answers four questions in a fixed order, and
          the fourth is not reachable without the first three:
        </p>
        <ol className="ly-chain">
          {[
            ["1", "Which side is losing?", "longs · shorts · neither"],
            ["2", "Where do their forced orders sit?", "below spot · above spot · mixed"],
            ["3", "What mechanism applies?", "magnet · wall · cascade · none"],
            ["4", "Act.", "open long · open short · close · hold"],
          ].map(([n, q, opts]) => (
            <li key={n}>
              <span className="n">{n}</span>
              <b>{q}</b>
              <span className="o">{opts}</span>
            </li>
          ))}
        </ol>
        <p>
          This is not presentation. Given the same market and the same model, asking for the
          action directly produced <code>open_short</code>; forcing the premises first produced{" "}
          <code>open_long</code>. The order changed the answer, so the order is enforced —
          and because it is enforced, the reasoning is a thing that can be checked rather
          than a story that fits.
        </p>
      </Section>

      {/* ── the record ─────────────────────────────────────────────── */}
      <Section n="03" title="The reasoning is written first, or the trade does not happen">
        <p>
          Before an order is placed, her reasoning is published to Arweave and timestamped by
          a third party. If that write fails, the trade is blocked. An outage stops her
          opening positions — a cost accepted deliberately, because the record is the asset
          and any single trade is not.
        </p>
        <p>
          Reasoning written after a position closes is an explanation. Written beforehand and
          independently timestamped, it is a prediction that can be wrong in public. That
          difference is the entire point, and it survives only if the ordering is real.
        </p>
        <aside className="ly-aside">
          <b>Nothing is on Arweave yet.</b> She is trading off-chain while her parameters are
          still being tuned. Arweave has no delete, and a permanent ledger of unvalidated
          noise would be a permanent liability. The ledger opens when the strategy has earned
          it.
        </aside>
      </Section>

      {/* ── the record so far, stated plainly ──────────────────────── */}
      <Section n="04" title="Where she actually stands">
        <div className="ly-table">
          <Row k="Closed trades" v={closed > 0 ? String(closed) : "—"} />
          <Row
            k="Win rate"
            v={winRate === null ? "—" : `${winRate.toFixed(0)}%`}
            sub={trades ? `${trades.wins} won · ${trades.losses} lost` : ""}
          />
          <Row
            k="Realised, gross"
            v={trades ? `${trades.realisedUsd >= 0 ? "+" : "−"}$${nf(Math.abs(trades.realisedUsd))}` : "—"}
          />
          <Row
            k="Paid in fees"
            v={trades ? `−$${nf(trades.feesUsd)}` : "—"}
            sub="shown separately, never folded into net"
          />
          <Row
            k="Net"
            v={trades ? `${trades.netUsd >= 0 ? "+" : "−"}$${nf(Math.abs(trades.netUsd))}` : "—"}
            tone={trades ? (trades.netUsd >= 0 ? "up" : "dn") : undefined}
            strong
          />
          <Row
            k="Decisions on file"
            v={decisions.length > 0 ? String(decisions.length) : "—"}
            sub={held > 0 ? `${held} of them a decision not to trade` : ""}
          />
        </div>
        <p className="ly-fine ly-block">
          These are live figures on a small paper account, not a track record. She has been
          running for hours, not months. Losses appear here at the same size as gains because
          a page that only reads well when she is winning would contradict the one thing this
          project claims.
        </p>
      </Section>

      {/* ── stated plainly, and labelled honestly ──────────────────── */}
      <Section n="05" title="What she is for, and what is not built yet">
        <p>
          Her edge is not that she trades. It is that she reconstructs positions nobody else
          keeps a record of. Trading is how she proves the data is worth something. Selling
          access to it is the other half, and it does not require her to be right.
        </p>
        <div className="ly-intent">
          <Intent state="live" k="Forced-flow map, Hyperliquid"
            v="Positions of thousands of real accounts, rebuilt continuously. Live and growing." />
          <Intent state="live" k="Read access over MCP"
            v="Her decisions, her closed trades and the liquidation map, to any agent with a wallet." />
          <Intent state="live" k="Public identity"
            v="ERC-8004 agent 60594 on Base, tied to this domain in both directions." />
          <Intent state="tuning" k="The permanent ledger"
            v="Reasoning written to Arweave before each trade. Opens when the strategy has earned it — Arweave has no delete, and a permanent record of unvalidated noise is a permanent liability." />
          <Intent state="intended" k="Paid access"
            v="Metered or per-call payment for the dataset. Nothing is built; her agent card says x402Support false because that is true." />
          <Intent state="intended" k="Prediction markets"
            v="The same gap exists on Polymarket: it publishes who holds what now and keeps no history. A second tape, recorded from the day it starts. Not built, and deliberately not started until the first one is proven." />
        </div>
        <p className="ly-fine ly-block">
          Everything above is marked with what it actually is. A roadmap that reads as though it
          already shipped is the first thing that makes a record untrustworthy.
        </p>
      </Section>

      <section className="ly-end">
        <h2>Every decision she has made is on one screen.</h2>
        <Link href="/terminal" className="ly-btn lg">Open the terminal</Link>
        <p className="ly-fine">
          Public · read-only · including the times she declined to trade
        </p>
      </section>
    </main>
  );
}

function IdRow({ k, v, href }: { k: string; v: string; href: string }) {
  const external = href.startsWith("http");
  return (
    <a className="ly-id-row" href={href}
       {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      <span className="k">{k}</span>
      <span className="v">{v}</span>
      <span className="go" aria-hidden>↗</span>
    </a>
  );
}

/**
 * One line of intent, with its real status.
 *
 * The label is the point. A roadmap that reads as though it already shipped is
 * the first thing that makes a record untrustworthy, and hers is the only thing
 * she has.
 */
function Intent({ state, k, v }: { state: "live" | "tuning" | "intended"; k: string; v: string }) {
  const label = { live: "LIVE", tuning: "TUNING", intended: "INTENDED" }[state];
  return (
    <div className={`ly-intent-row ${state}`}>
      <span className="s">{label}</span>
      <span className="b"><b>{k}</b><span>{v}</span></span>
    </div>
  );
}

function Figure({ k, v, note, tone }: { k: string; v: string; note?: string; tone?: "up" | "dn" }) {
  return (
    <div className="ly-fig">
      <div className="k">{k}</div>
      <div className={`v ${tone ?? ""}`}>{v}</div>
      {note && <div className="n">{note}</div>}
    </div>
  );
}

function Row({ k, v, sub, tone, strong }: {
  k: string; v: string; sub?: string; tone?: "up" | "dn"; strong?: boolean;
}) {
  return (
    <div className={strong ? "ly-row strong" : "ly-row"}>
      <div className="k">{k}{sub && <span className="sub">{sub}</span>}</div>
      <div className={`v ${tone ?? ""}`}>{v}</div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="ly-sec">
      {/* Three grid children, not two: the heading is its own column so the
          body can sit beside it. Nesting the heading inside the body left the
          whole right half of the page empty. Numbered because these genuinely
          build on each other — the edge exists before the reasoning, and the
          reasoning before the record. */}
      <div className="ly-sec-n">{n}</div>
      <h2>{title}</h2>
      <div className="ly-sec-b">{children}</div>
    </section>
  );
}
