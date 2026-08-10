"use client";

import { useEffect, useState } from "react";
import {
  UNIVERSE, dayChange, fetchUniverse, formatPx, fundingAnnualPct, type AssetSnapshot,
} from "@/lib/venue";
import {
  fetchActivity, fetchPainMap, fetchTrades, fetchWallet,
  type Decision, type PainMap, type TradesResponse, type WalletState,
} from "@/lib/painmap";
import { Chain, steps } from "@/components/chain";
import { AccountPanel, Age, BookPanel, PainMapPanel, PositionsPanel, TradesPanel } from "@/components/panels";
import { Chart, INTERVALS, type Interval } from "@/components/chart";

/**
 * How a decision stands with respect to the permanent record.
 *
 * Three states, and conflating them is the one error this screen cannot afford:
 * its whole argument is that its claims are checkable, so a decision that was
 * never written must never be labelled as though it were.
 *
 *   no id            — she held. No position exists, so there is nothing to
 *                      timestamp. Not a failure: declining is often correct.
 *   "local:" prefix  — off-chain paper run. Reasoning exists locally but was
 *                      not uploaded, because Arweave has no delete and a ledger
 *                      of untuned noise is a permanent liability.
 *   anything else    — a real Arweave transaction id.
 */
function ledger(d: Decision): { tag: string; ledger: string; status: string } {
  if (!d.reasoningId) return { tag: "NO RECORD", ledger: "Not written", status: "Held — no position" };
  if (d.reasoningId.startsWith("local:"))
    return { tag: "PAPER · PENDING", ledger: "Local only", status: "Paper trading" };
  return { tag: "ON CHAIN", ledger: "Arweave", status: "Permanent" };
}

/**
 * The terminal.
 *
 * Two bands. The upper one is the market — chart, book, her account — and the
 * lower one is Lyra: every decision she has taken, and one of them opened.
 *
 * Splitting it this way rather than into four columns is what makes the
 * reasoning legible: the chain reads left to right across a wide row with its
 * steps numbered, and the market panels get the width they need to be read as
 * instruments rather than compressed into strips.
 *
 * The page never scrolls. Each panel is its own scroll region, the way VS Code
 * and Bloomberg work, so nothing is found by scrolling away from something else.
 *
 * Selecting a decision replaces the inspection panel rather than opening a
 * modal. Keeping one decision permanently open makes this an inspection tool
 * instead of a click-driven interface.
 */
export function Terminal() {
  const [asset, setAsset] = useState("BTC");
  const [interval, setInterval_] = useState<Interval>("15m");
  const [assets, setAssets] = useState<AssetSnapshot[]>([]);
  const [map, setMap] = useState<PainMap | null>(null);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const [trades, setTrades] = useState<TradesResponse | null>(null);
  /** Which half of her book: what she is in, or what it was worth. */
  const [book, setBook] = useState<"open" | "closed">("open");
  /** A feed of every consultation buries the few that became trades. */
  const [onlyTrades, setOnlyTrades] = useState(false);
  const [ages, setAges] = useState<{ mkt: number | null; pm: number | null; acct: number | null }>(
    { mkt: null, pm: null, acct: null },
  );
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => {
      setClock(new Date().toISOString().slice(11, 19) + " UTC");
      setAges((previous) => ({
        mkt: previous.mkt === null ? null : previous.mkt + 1000,
        pm: previous.pm === null ? null : previous.pm + 1000,
        acct: previous.acct === null ? null : previous.acct + 1000,
      }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => {
      void fetchUniverse().then((a) => {
        if (!alive) return;
        setAssets(a);
        setAges((p) => ({ ...p, mkt: 0 }));
      }).catch(() => {});
    };
    load();
    const id = setInterval(load, 2000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => {
      void fetchPainMap(asset).then((m) => {
        if (!alive) return;
        setMap(m);
        setAges((p) => ({ ...p, pm: 0 }));
      }).catch(() => alive && setMap(null));
    };
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [asset]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const [w, d, t] = await Promise.all([fetchWallet(), fetchActivity(), fetchTrades()]);
        if (!alive) return;
        setWallet(w);
        setDecisions(d.decisions ?? []);
        setTrades(t);
        setAges((p) => ({ ...p, acct: 0 }));
      } catch {
        // Keep the last good snapshot; its age visibly continues increasing.
      } finally {
        if (alive) timer = setTimeout(load, 2000);
      }
    };
    void load();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, []);

  // A decision that produced a position is the one worth finding. Holds are
  // shown by default because declining is a real decision, but they must not
  // make the trades unfindable.
  const shown = onlyTrades ? decisions.filter((d) => d.action !== "hold") : decisions;
  const selectedDecision = shown.find((d) => d.id === selectedDecisionId);
  const current = selectedDecision ?? shown[0];
  const tradeCount = decisions.filter((d) => d.action !== "hold").length;

  /* Only clusters large enough to matter reach the chart. Drawing every level
     would turn her signal into an indicator, which is the opposite of the
     claim the panel makes. */
  const markers = (map?.forcedLevels ?? [])
    .filter((l) => l.notionalUsd > 500_000)
    .sort((a, b) => b.notionalUsd - a.notionalUsd)
    .slice(0, 3)
    .map((l) => ({
      px: Number(map!.midPx) * (1 + l.pctFromMid / 100),
      label: "Liq cluster",
      kind: "cluster" as const,
    }));

  const snap = assets.find((a) => a.coin === asset);

  return (
    <div className="app">
      {/* ── top bar ────────────────────────────────────────────────── */}
      <div className="bar">
        <span className="brand">LYRA TERMINAL</span>
        <span><span className="dot" />LIVE</span>
        <span className="mut">PUBLIC VIEW · READ-ONLY · EVERY CONSULTATION SHOWN</span>
        <span className="sp" />
        <span className="fresh"><span className="fade">MARKET</span><b><Age ms={ages.mkt} /></b></span>
        <span className="fresh"><span className="fade">ENGINE</span>
          <b>{decisions.length > 0 ? "RUNNING" : "OBSERVING"}</b></span>
        <span className="fresh"><span className="fade">LEDGER</span><b>PAPER · PENDING</b></span>
        <span className="fresh"><span className="fade">TIME</span><b>{clock}</b></span>
      </div>

      {/* ── universe ───────────────────────────────────────────────── */}
      <div className="mkts">
        {UNIVERSE.map((coin) => {
          const a = assets.find((x) => x.coin === coin);
          const chg = a ? dayChange(a) : 0;
          return (
            <div
              key={coin}
              className={`mkt${coin === asset ? " on" : ""}`}
              onClick={() => setAsset(coin)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setAsset(coin)}
            >
              <div className="s">{coin}</div>
              <div className="n">
                <span>{a ? formatPx(a.markPx) : "—"}</span>
                {a && <span className={chg >= 0 ? "up" : "dn"}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</span>}
                {a && <span className="fade">{fundingAnnualPct(a).toFixed(1)}%</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── market band: chart · book · her account ────────────────── */}
      <div className="body">

        <div className="col">
          <div className="panel">
            <div className="ph">
              <span>{asset}-PERP · {interval} · HYPERLIQUID</span>
              <span className="sp" />
              {snap && (
                <span className={dayChange(snap) >= 0 ? "up" : "dn"}>
                  {dayChange(snap) >= 0 ? "+" : ""}{dayChange(snap).toFixed(2)}% 24h
                </span>
              )}
              <span className="ivs">
                {INTERVALS.map((iv) => (
                  <button
                    key={iv}
                    className={iv === interval ? "iv on" : "iv"}
                    onClick={() => setInterval_(iv)}
                  >{iv}</button>
                ))}
              </span>
            </div>
            <div className="pb nooverflow"><Chart asset={asset} interval={interval} markers={markers} /></div>
          </div>
        </div>

        <div className="col">
          <div className="panel">
            <div className="ph">
              <span>ORDER BOOK</span>
              <span className="sp" />
              <span className="fade">{asset} · 2s</span>
            </div>
            <div className="pb"><BookPanel asset={asset} /></div>
          </div>
        </div>

        <div className="col col-rail">
          <div className="panel">
            <div className="ph"><span>ACCOUNT</span><span className="sp" /><Age ms={ages.acct} /></div>
            <div className="pb"><AccountPanel wallet={wallet} trades={trades} /></div>
          </div>
          <div className="panel">
            <div className="ph">
              <button className={book === "open" ? "tab on" : "tab"} onClick={() => setBook("open")}>
                OPEN POSITIONS <b>{wallet?.positions.length ?? 0}</b>
              </button>
              <button className={book === "closed" ? "tab on" : "tab"} onClick={() => setBook("closed")}>
                CLOSED <b>{trades ? trades.wins + trades.losses : 0}</b>
              </button>
              <span className="sp" />
              {trades && trades.trades.length > 0 && (
                <span className={trades.netUsd >= 0 ? "up" : "dn"}>
                  {trades.netUsd >= 0 ? "+" : "−"}${Math.abs(trades.netUsd).toFixed(2)} net
                </span>
              )}
            </div>
            <div className="pb">
              {book === "open" ? <PositionsPanel wallet={wallet} /> : <TradesPanel data={trades} />}
            </div>
          </div>
          <div className="panel">
            <div className="ph">
              <span>PAIN MAP · ENUMERATED LIQUIDATIONS</span>
              <span className="sp" />
              <Age ms={ages.pm} />
            </div>
            <div className="pb"><PainMapPanel map={map} /></div>
          </div>
        </div>
      </div>

      {/* ── decision band: the product ─────────────────────────────── */}
      <div className="band">

        <div className="panel">
          <div className="ph">
            <span>DECISION FEED</span>
            <span className="sp" />
            <button className={onlyTrades ? "tab" : "tab on"} onClick={() => setOnlyTrades(false)}>
              ALL <b>{decisions.length}</b>
            </button>
            <button className={onlyTrades ? "tab on" : "tab"} onClick={() => setOnlyTrades(true)}>
              TRADES ONLY <b>{tradeCount}</b>
            </button>
          </div>
          <div className="pb">
            {shown.length === 0 ? (
              <div className="empty">
                <div className="mut">
                  {onlyTrades ? "No trades in this window." : "No new decisions."}
                </div>
                <div className="fade">
                  {onlyTrades
                    ? "She consulted the model and declined every time. Declining is a decision — switch to ALL to read the reasoning."
                    : "Lyra is observing the market. She consults the model when positioning shifts materially or price approaches a forced-flow cluster."}
                </div>
              </div>
            ) : (
              shown.map((d) => (
                <button
                  key={d.id}
                  className={d.action === "hold" ? "dec" : "dec traded"}
                  aria-current={d.id === current?.id}
                  onClick={() => setSelectedDecisionId(d.id)}
                >
                  <div className="dec-id">
                    <div className="t">{new Date(d.at).toISOString().slice(11, 19)}</div>
                    <div className="fade">{new Date(d.at).toISOString().slice(0, 10)}</div>
                    <div className="sym">{d.asset}</div>
                  </div>

                  <Chain decision={d} orientation="across" />

                  <div className="dec-conv">
                    <span className="k">CONVICTION</span>
                    <span className="n">{d.conviction.toFixed(2)}</span>
                    <span className="bar"><i style={{ width: `${Math.max(2, d.conviction * 100)}%` }} /></span>
                  </div>

                  {/* The record is the differentiator, so it is never a detail
                      that can be overlooked. */}
                  <div className="rec">
                    <span><span className="k">DECIDED</span>
                      <span className="v">{new Date(d.at).toISOString().slice(11, 19)} UTC</span></span>
                    {d.reasoningId ? (
                      <>
                        <span><span className="k">RECORD</span>
                          <span className="v">{d.reasoningId}</span></span>
                        <span className="tag">{ledger(d).tag}</span>
                        <span className="fade">written before the outcome was known</span>
                      </>
                    ) : (
                      <>
                        <span className="tag">NO RECORD</span>
                        <span className="fade">
                          she declined to trade, so there is no position to timestamp
                        </span>
                      </>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="ph">
            <span>DECISION (EXPANDED)</span>
            <span className="sp" />
            <span className="fade">{current?.reasoningId ?? "—"}</span>
          </div>
          <div className="pb">
            {!current ? (
              <div className="empty">
                <div className="mut">Nothing selected.</div>
                <div className="fade">
                  Choosing a decision in the feed opens it here, and it stays open —
                  this is an inspection panel, not a dialog.
                </div>
              </div>
            ) : (
              <>
                <div className="exp-hero">
                  <div className="sym">{current.asset}</div>
                  <div className="meta">
                    <span className="fade">
                      {new Date(current.at).toISOString().slice(0, 19).replace("T", " ")} UTC
                    </span>
                    <span>{current.action.replace(/_/g, " ").toUpperCase()}</span>
                    <span className="fade">conviction {current.conviction.toFixed(2)}</span>
                  </div>
                </div>

                {steps(current).map((s) => (
                  <div className="exp-step" key={s.n}>
                    <span className="num">{s.n}</span>
                    <span>
                      <span className="k">{s.k}</span>
                      <div className="v">{s.v}</div>
                      {s.gloss && <div className="gloss">{s.gloss}</div>}
                    </span>
                  </div>
                ))}

                <div className="exp-why">
                  <span className="k">
                    {current.action === "hold" ? "WHY NOT TRADE" : "REASONING"}
                  </span>
                  <div className="why">{current.reasoning}</div>
                </div>

                <div className="exp-foot">
                  <div className="exp-kv"><span className="fade">Committed</span>
                    <span>{new Date(current.at).toISOString().slice(0, 19).replace("T", " ")} UTC</span></div>
                  <div className="exp-kv"><span className="fade">Record ID</span>
                    <span>{current.reasoningId ?? "none"}</span></div>
                  <div className="exp-kv"><span className="fade">Ledger</span>
                    <span>{ledger(current).ledger}</span></div>
                  <div className="exp-kv"><span className="fade">Status</span>
                    <span>{ledger(current).status}</span></div>
                  <div className="exp-kv last">
                    <span className="fade">Written before outcome</span>
                    <span>{current.reasoningId ? "Yes" : "n/a — no position taken"}</span></div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
