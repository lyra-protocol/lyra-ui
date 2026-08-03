"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/**
 * MCP connection page.
 *
 * Connect a wallet, sign one message, get a token. The signature proves control
 * of an address and nothing else — no transaction, no approval, no allowance —
 * and the page says so plainly, because someone is being asked to sign with a
 * wallet that holds their money.
 *
 * Everything the tools return is read-only. The session is not there to keep
 * the data secret; it is there so access can be attached to an address and,
 * later, metered or paid for. An MCP client is an untrusted caller and never
 * gets a write path to money (memo §5).
 *
 * Replaces a page that told visitors to run `npx @lyra-protocol/mcp`, which was
 * never published — the instructions could not have worked for anyone.
 */

type Eip1193 = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window { ethereum?: Eip1193 }
}

type Phase = "idle" | "connecting" | "signing" | "ready" | "error";

const STORE = "lyra.mcp.session";

export function Mcp() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [address, setAddress] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [detail, setDetail] = useState("");
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setHasWallet(typeof window !== "undefined" && !!window.ethereum);
    // A session survives a reload: it is a bearer token, not a login.
    try {
      const raw = localStorage.getItem(STORE);
      if (!raw) return;
      const s = JSON.parse(raw) as { token: string; address: string; expiresAt: number };
      if (s.expiresAt > Date.now()) {
        setToken(s.token); setAddress(s.address); setExpiresAt(s.expiresAt); setPhase("ready");
      } else {
        localStorage.removeItem(STORE);
      }
    } catch { /* a corrupt entry is simply no session */ }
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) { setHasWallet(false); return; }
    setPhase("connecting"); setDetail("");
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const account = accounts?.[0];
      if (!account) throw new Error("No account was returned by the wallet.");
      setAddress(account);

      const nonceRes = await fetch(`/api/session/nonce?address=${account}`);
      const nonceBody = await nonceRes.json();
      if (!nonceRes.ok) throw new Error(nonceBody.detail ?? nonceBody.error ?? "Could not start sign-in.");

      setPhase("signing");
      const signature = (await eth.request({
        method: "personal_sign",
        params: [nonceBody.message, account],
      })) as string;

      const verifyRes = await fetch("/api/session/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: account, message: nonceBody.message, signature }),
      });
      const verified = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verified.detail ?? verified.error ?? "Signature rejected.");

      const exp = Date.now() + verified.expiresInMs;
      setToken(verified.token); setExpiresAt(exp); setAddress(verified.address); setPhase("ready");
      localStorage.setItem(STORE, JSON.stringify({
        token: verified.token, address: verified.address, expiresAt: exp,
      }));
    } catch (error) {
      const e = error as { code?: number; message?: string };
      // Closing the wallet prompt is a choice, not a failure.
      if (e.code === 4001) { setPhase("idle"); return; }
      setDetail(e.message ?? "Something went wrong.");
      setPhase("error");
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORE);
    setToken(null); setAddress(null); setExpiresAt(null); setPhase("idle"); setDetail("");
  }, []);

  const copy = useCallback((text: string, what: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
    });
  }, []);

  const base = typeof window !== "undefined" ? window.location.origin : "https://www.lyrabuild.xyz";
  const config = JSON.stringify({
    mcpServers: {
      lyra: {
        type: "http",
        url: `${base}/api/mcp`,
        headers: { Authorization: `Bearer ${token ?? "<your token>"}` },
      },
    },
  }, null, 2);

  const hours = expiresAt ? Math.max(0, Math.round((expiresAt - Date.now()) / 3_600_000)) : null;

  return (
    <main className="hub">
      <header className="hub-top">
        <div className="hub-mark">
          <Link href="/" className="w">LYRABUILD</Link>
          <span className="b">Lyra over MCP</span>
        </div>
        <div className="hub-live">
          <span className={phase === "ready" ? "ly-dot on" : "ly-dot"} />
          {phase === "ready" ? "SESSION ACTIVE" : "READ-ONLY · NO WRITES"}
        </div>
      </header>

      <section className="hub-lede">
        <h1>Read Lyra&rsquo;s data from your own agent.</h1>
        <p>
          Four tools: the forced-liquidation map she trades on, her decisions including the
          ones not to trade, her closed trades with fees, and the size of the underlying
          dataset. Connect a wallet to get a session token.
        </p>
      </section>

      <Step n="01" title="Connect">
        {phase === "ready" ? (
          <>
            <div className="mcp-session">
              <div><span className="k">ADDRESS</span><span className="v">{address}</span></div>
              <div><span className="k">EXPIRES</span>
                <span className="v">in {hours} hour{hours === 1 ? "" : "s"}</span></div>
            </div>
            <div className="mcp-token"><code>{token}</code></div>
            <div className="mcp-actions">
              <button className="ly-btn" onClick={() => copy(token!, "token")}>
                {copied === "token" ? "Copied" : "Copy token"}
              </button>
              <button className="mcp-quiet" onClick={disconnect}>Forget this session</button>
            </div>
          </>
        ) : hasWallet === false ? (
          <p className="mcp-note">
            No Ethereum wallet detected in this browser. Install one — MetaMask, Rabby and
            Coinbase Wallet all work — then reload. Nothing here needs funds in it.
          </p>
        ) : (
          <>
            <p className="mcp-note">
              You will be asked to sign one message. It is not a transaction, it moves no
              funds, and it grants no permission over your wallet — it only proves you
              control the address.
            </p>
            <div className="mcp-actions">
              <button
                className="ly-btn"
                onClick={connect}
                disabled={phase === "connecting" || phase === "signing"}
              >
                {phase === "connecting" ? "Check your wallet…"
                  : phase === "signing" ? "Waiting for signature…"
                  : "Connect wallet"}
              </button>
            </div>
            {phase === "error" && <p className="mcp-err">{detail}</p>}
          </>
        )}
      </Step>

      <Step n="02" title="Add the server">
        <p className="mcp-note">
          Paste this into your MCP client&rsquo;s configuration — <code>claude_desktop_config.json</code>,
          or <code>.mcp.json</code> for Claude Code.
        </p>
        <pre className="mcp-pre"><code>{config}</code></pre>
        <div className="mcp-actions">
          <button className="ly-btn" onClick={() => copy(config, "config")} disabled={!token}>
            {copied === "config" ? "Copied" : token ? "Copy configuration" : "Connect first"}
          </button>
        </div>
      </Step>

      <Step n="03" title="What you can ask for">
        <div className="mcp-tools">
          <Tool k="pain_map"
            v="Forced-liquidation levels for one asset, rebuilt from enumerated real positions rather than estimated from open interest." />
          <Tool k="decisions"
            v="Her recent decisions, newest first, with the ordered premises behind each one and its record id. Includes the holds." />
          <Tool k="trades"
            v="Closed trades with entry, exit, gross, fees and net. Losses included — this is the whole record, not the good part." />
          <Tool k="dataset_status"
            v="Accounts tracked, position changes logged, closures observed, and how long collection has been running." />
        </div>
        <p className="mcp-note" style={{ marginTop: 20 }}>
          There is no tool here that can place an order, move funds or change anything.
        </p>
      </Step>

      <footer className="hub-foot">
        <div><b>Scion Systems Ltd</b><span>Lagos, Nigeria</span></div>
        <div className="hub-foot-r">
          Sessions are signed tokens, not database rows. Nothing about who connects is
          stored — which is also why a token cannot be revoked before it expires.
        </div>
      </footer>
    </main>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mcp-step">
      <div className="mcp-n">{n}</div>
      <div className="mcp-b">
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  );
}

function Tool({ k, v }: { k: string; v: string }) {
  return (
    <div className="mcp-tool">
      <code>{k}</code>
      <span>{v}</span>
    </div>
  );
}
