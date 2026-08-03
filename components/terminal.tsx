"use client";

import { useEffect, useState } from "react";
import {
  UNIVERSE, dayChange, fetchUniverse, formatPx, fundingAnnualPct, type AssetSnapshot,
} from "@/lib/venue";
import {
  fetchActivity, fetchPainMap, fetchWallet,
  type Decision, type PainMap, type WalletState,
} from "@/lib/painmap";
import { Chain, steps } from "@/components/chain";
import { AccountPanel, Age, BookPanel, PainMapPanel, PositionsPanel } from "@/components/panels";
import { Chart, INTERVALS, type Interval } from "@/components/chart";

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
  const [selected, setSelected] = useState(0);
  const [ages, setAges] = useState<{ mkt: number | null; pm: number | null; acct: number | null }>(
    { mkt: null, pm: null, acct: null },
  );
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
      const t = performance.now();
      void fetchUniverse().then((a) => {
        if (!alive) return;
        setAssets(a);
        setAges((p) => ({ ...p, mkt: performance.now() - t }));
      }).catch(() => {});
    };
    load();
    const id = setInterval(load, 8000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => {
      const t = performance.now();
      void fetchPainMap(asset).then((m) => {
        if (!alive) return;
        setMap(m);
        setAges((p) => ({ ...p, pm: performance.now() - t }));
      }).catch(() => alive && setMap(null));
    };
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [asset]);

  useEffect(() => {
    let alive = true;
    const load = () => {
      const t = performance.now();
      void fetchWallet().then((w) => {
        if (!alive) return;
        setWallet(w);
        setAges((p) => ({ ...p, acct: performance.now() - t }));
      }).catch(() => {});
      void fetchActivity().then((d) => alive && setDecisions(d.decisions ?? [])).catch(() => {});
    };
    load();
    const id = setInterval(load, 10000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const current = decisions[selected];

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
        <span className="mut">PUBLIC VIEW · READ-ONLY · ALL DECISIONS PERMANENT</span>
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
            <div className="pb"><AccountPanel wallet={wallet} /></div>
          </div>
          <div className="panel">
            <div className="ph"><span>OPEN POSITIONS</span><span className="sp" />
              <span className="fade">{wallet?.positions.length ?? 0}</span></div>
            <div className="pb"><PositionsPanel wallet={wallet} /></div>
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
            <span className="fade">EVERY CONSULTATION · INCLUDING HOLDS</span>
          </div>
          <div className="pb">
            {decisions.length === 0 ? (
              <div className="empty">
                <div className="mut">No new decisions.</div>
                <div className="fade">
                  Lyra is observing the market. She consults the model when positioning
                  shifts materially or price approaches a forced-flow cluster.
                </div>
              </div>
            ) : (
              decisions.map((d, i) => (
                <button
                  key={d.id}
                  className="dec"
                  aria-current={i === selected}
                  onClick={() => setSelected(i)}
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
                    <span><span className="k">COMMITTED</span>
                      <span className="v">{new Date(d.at).toISOString().slice(11, 19)} UTC</span></span>
                    <span><span className="k">RECORD</span>
                      <span className="v">{d.reasoningId ?? "—"}</span></span>
                    <span className="tag">
                      {d.reasoningId?.startsWith("local:") ? "PAPER · PENDING" : "ON CHAIN"}
                    </span>
                    <span className="fade">written before the outcome was known</span>
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
                    <span>{current.reasoningId ?? "—"}</span></div>
                  <div className="exp-kv"><span className="fade">Ledger</span>
                    <span>{current.reasoningId?.startsWith("local:") ? "Pending" : "Committed"}</span></div>
                  <div className="exp-kv"><span className="fade">Status</span>
                    <span>{current.reasoningId?.startsWith("local:") ? "Paper trading" : "Live"}</span></div>
                  <div className="exp-kv last">
                    <span className="fade">Written before outcome</span><span>Yes</span></div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
