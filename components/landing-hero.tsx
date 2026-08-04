"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchActivity, fetchStatus, fetchWallet,
  type Decision, type StatusResponse, type WalletState,
} from "@/lib/painmap";

/**
 * The landing hero.
 *
 * Dark, and committed to it. `/lyra` is the light surface — the editorial one,
 * where she is argued for. This is the instrument surface, because the claim
 * being made here is not about her character but about a machine that is
 * running right now, and the fastest way to say that is to show it running.
 *
 * Three decisions worth naming:
 *
 * **The headline is a claim, not a category.** "AI trading agent" tells a
 * visitor what shelf this sits on and nothing about why it is different.
 * Publishing reasoning *before* the outcome is the only genuinely unusual thing
 * here, so that is the sentence.
 *
 * **The rail carries measured numbers, never marketing ones.** Accounts
 * tracked, position changes logged, her last decision and how long ago. If the
 * collector is down the rail says so rather than showing a plausible figure.
 *
 * **No gradient, no glow, no orbiting particles.** Every AI landing page in
 * 2026 has those, which is precisely why they no longer signal anything.
 * Restraint at this scale reads as confidence; decoration reads as compensation.
 */

const int = (n: number) => n.toLocaleString("en-US");

function ago(at: number): string {
  const m = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export function LandingHero() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [latest, setLatest] = useState<Decision | null>(null);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(new Date().toISOString().slice(11, 19) + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => {
      void fetchStatus().then((s) => alive && setStatus(s)).catch(() => {});
      void fetchWallet().then((w) => alive && setWallet(w)).catch(() => {});
      void fetchActivity().then((d) => alive && setLatest(d.decisions?.[0] ?? null)).catch(() => {});
    };
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const connected = status !== null;

  return (
    <section className="lh">
      {/* ── masthead ───────────────────────────────────────────────── */}
      <header className="lh-top">
        <div className="lh-mark">
          <span className="w">LYRABUILD</span>
          <span className="o">Scion Systems Ltd</span>
        </div>
        <div className="lh-meta">
          <span className={connected ? "lh-dot on" : "lh-dot"} />
          <span>{connected ? "SYSTEMS LIVE" : "CONNECTING"}</span>
          <span className="lh-sep" />
          <span className="lh-clock">{clock}</span>
        </div>
      </header>

      {/* ── the claim ──────────────────────────────────────────────── */}
      <div className="lh-body">
        <h1 className="lh-h1">
          Every trade,
          <br />
          explained before
          <br />
          <em>it happens.</em>
        </h1>

        <div className="lh-side">
          <p className="lh-lede">
            Lyra is an autonomous trading agent. She commits her reasoning to a public
            record before she places an order — and before anyone, including her, knows
            whether she was right.
          </p>
          <div className="lh-cta">
            <Link href="/lyra" className="lh-btn">Meet Lyra</Link>
            <Link href="/terminal" className="lh-btn ghost">Watch her work</Link>
          </div>
        </div>
      </div>

      {/* ── the rail: measured, never marketing ────────────────────── */}
      <div className="lh-rail">
        <Cell k="ACCOUNTS TRACKED" v={status ? int(status.addresses) : "—"} />
        <Cell k="POSITION CHANGES" v={status ? int(status.changesLogged) : "—"} />
        <Cell k="MARKETS WATCHED" v={status ? String(status.universe.length) : "—"} />
        <Cell k="OPEN NOW" v={wallet ? String(wallet.openPositions) : "—"} />
        <Cell
          k="LAST DECISION"
          v={latest ? `${latest.asset} ${latest.action.replace(/_/g, " ").toUpperCase()}` : "—"}
          note={latest ? ago(latest.at) : undefined}
          wide
        />
      </div>
    </section>
  );
}

function Cell({ k, v, note, wide }: { k: string; v: string; note?: string; wide?: boolean }) {
  return (
    <div className={wide ? "lh-cell wide" : "lh-cell"}>
      <span className="k">{k}</span>
      <span className="v">{v}</span>
      {note && <span className="n">{note}</span>}
    </div>
  );
}
