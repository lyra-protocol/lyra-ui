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
import { Chart } from "@/components/chart";

/**
 * The terminal.
 *
 * Four columns, and the middle one is the point. Lyra does not sell price data —
 * she sells a decision process committed to a permanent record before the
 * outcome is known, so the decision feed is the spine and everything else is
 * subordinate to it. The chart is deliberately the smallest it can be while
 * remaining readable.
 *
 * The page never scrolls. Each panel is its own scroll region, the way an IDE
 * works, so nothing is found by scrolling away from something else.
 *
 * Selecting a decision replaces the pinned inspection panel rather than opening
 * a modal. Keeping one decision permanently open makes this an inspection tool
 * instead of a click-driven interface.
 */
export function Terminal() {
  const [asset, setAsset] = useState("BTC");
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
  const markers = (map?.forcedLevels ?? [])
    .filter((l) => l.notionalUsd > 500_000)
    .slice(0, 3)
    .map((l) => ({
      px: Number(map!.midPx) * (1 + l.pctFromMid / 100),
      label: `${(l.notionalUsd / 1e6).toFixed(1)}M ${l.direction === "forced_buys" ? "buys" : "sells"}`,
      kind: "cluster" as const,
    }));

  const snap = assets.find((a) => a.coin === asset);

  return (
    <div className="app">
      {/* ── top bar ────────────────────────────────────────────────── */}
      <div className="bar">
        <span className="brand">LYRA TERMINAL</span>
        <span><span className="dot" />LIVE</span>
        <span className="mut">PUBLIC · READ-ONLY · EVERY DECISION RECORDED</span>
        <span className="sp" />
        <span className="fresh"><span className="fade">MARKET</span><b><Age ms={ages.mkt} /></b></span>
        <span className="fresh"><span className="fade">ENGINE</span><b>{decisions.length > 0 ? "RUNNING" : "OBSERVING"}</b></span>
        <span className="fresh"><span className="fade">LEDGER</span><b>PAPER · PENDING</b></span>
        <span>{clock}</span>
      </div>

      {/* ── markets ────────────────────────────────────────────────── */}
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
              style={{ cursor: "pointer" }}
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

      {/* ── four columns ───────────────────────────────────────────── */}
      <div className="body">

        <div className="col col-left">
          <div className="panel">
            <div className="ph">
              <span>{asset}-PERP · 15m</span>
              <span className="sp" />
              {snap && <span className={dayChange(snap) >= 0 ? "up" : "dn"}>
                {dayChange(snap) >= 0 ? "+" : ""}{dayChange(snap).toFixed(2)}%
              </span>}
            </div>
            <div className="pb chart"><Chart asset={asset} markers={markers} /></div>
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

        {/* the spine */}
        <div className="col">
          <div className="panel">
            <div className="ph">
              <span>DECISION FEED</span>
              <span className="sp" />
              <span className="fade">EVERY CONSULTATION · INCLUDING HOLDS</span>
            </div>
            <div className="pb">
              {decisions.length === 0 ? (
                <div className="empty">
                  <div className="mut">No decisions in this window.</div>
                  <div className="fade">
                    She consults the model only when positioning shifts materially or price
                    approaches a forced-flow cluster.
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
                    <div className="dec-top">
                      <span className="sym">{d.asset}</span>
                      <span className="sp" />
                      <span className="fade">{new Date(d.at).toISOString().slice(11, 19)}</span>
                    </div>
                    <Chain decision={d} />
                    <div className="rec">
                      <span><span className="k">COMMITTED</span>
                        <span className="v">{new Date(d.at).toISOString().slice(11, 19)} UTC</span></span>
                      <span><span className="k">RECORD</span>
                        <span className="v">{d.reasoningId ?? "—"}</span></span>
                      <span className="tag">
                        {d.reasoningId?.startsWith("local:") ? "PAPER · PENDING" : "ON CHAIN"}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* pinned inspection */}
        <div className="col">
          <div className="panel">
            <div className="ph">
              <span>SELECTED DECISION</span>
              <span className="sp" />
              <span className="fade">{current?.reasoningId ?? "—"}</span>
            </div>
            <div className="pb">
              {!current ? (
                <div className="empty">
                  <div className="mut">Nothing selected.</div>
                  <div className="fade">
                    Choosing a decision in the feed opens it here. It stays open — this is an
                    inspection panel, not a dialog.
                  </div>
                </div>
              ) : (
                <>
                  <div className="exp-hero">
                    <div className="sym">{current.asset}</div>
                    <div className="meta">
                      <span className="fade">{new Date(current.at).toISOString().slice(0, 19).replace("T", " ")} UTC</span>
                      <span>{current.action.replace(/_/g, " ").toUpperCase()}</span>
                      <span className="fade">confidence {(current.conviction * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  {steps(current).map((s) => (
                    <div className="exp-step" key={s.k}>
                      <span className="rail"><span className="node" /><span className="wire" /></span>
                      <span>
                        <span className="k">{s.k}</span>
                        <div className="v">{s.v}</div>
                      </span>
                    </div>
                  ))}

                  <div className="exp-step" style={{ gridTemplateColumns: "1fr" }}>
                    <span>
                      <span className="k">
                        {current.action === "hold" ? "WHY NOT TRADE" : "REASONING"}
                      </span>
                      <div className="why" style={{ marginTop: 4 }}>{current.reasoning}</div>
                    </span>
                  </div>

                  <div className="exp-foot">
                    <div className="exp-kv"><span className="fade">Committed</span>
                      <span>{new Date(current.at).toISOString().slice(0, 19).replace("T", " ")} UTC</span></div>
                    <div className="exp-kv"><span className="fade">Record</span>
                      <span>{current.reasoningId ?? "—"}</span></div>
                    <div className="exp-kv"><span className="fade">Ledger</span>
                      <span>{current.reasoningId?.startsWith("local:") ? "Pending" : "Committed"}</span></div>
                    <div className="exp-kv"><span className="fade">Status</span>
                      <span>{current.reasoningId?.startsWith("local:") ? "Paper trading" : "Live"}</span></div>
                    <div className="exp-kv" style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--rule-2)" }}>
                      <span className="fade">Written before outcome</span><span>Yes</span></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* account, positions, book */}
        <div className="col col-far">
          <div className="panel">
            <div className="ph"><span>ACCOUNT</span><span className="sp" /><Age ms={ages.acct} /></div>
            <div className="pb"><AccountPanel wallet={wallet} /></div>
          </div>
          <div className="panel">
            <div className="ph"><span>POSITIONS</span><span className="sp" />
              <span className="fade">{wallet?.positions.length ?? 0}</span></div>
            <div className="pb"><PositionsPanel wallet={wallet} /></div>
          </div>
          <div className="panel">
            <div className="ph"><span>ORDER BOOK</span><span className="sp" />
              <span className="fade">{asset} · 2s</span></div>
            <div className="pb"><BookPanel asset={asset} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
