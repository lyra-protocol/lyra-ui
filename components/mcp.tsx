"use client";

import { useState } from "react";

/**
 * MCP connection page.
 *
 * Read-only and unauthenticated. There is no token to mint and no account to
 * create, because everything an MCP client can ask for here is already public:
 * the record is on Arweave, the venue data is on Hyperliquid.
 *
 * An MCP client is an untrusted caller and never gets a write path to money
 * (REBUILD-MEMO.md §5).
 */

const CONFIG = `{
  "mcpServers": {
    "lyra": {
      "command": "npx",
      "args": ["-y", "@lyra-protocol/mcp"]
    }
  }
}`;

export function Mcp() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "56px 24px 96px" }}>
      <a href="/" className="display" style={{ fontSize: 24 }}>
        Lyra
      </a>

      <h1 style={{ fontSize: 18, fontWeight: 500, margin: "28px 0 0" }}>
        Read the record from an MCP client
      </h1>
      <p style={{ color: "var(--slate)", fontSize: 14, margin: "12px 0 0", maxWidth: 620, lineHeight: 1.6 }}>
        Claude, Cursor, or anything else that speaks MCP can query Lyra&rsquo;s trade
        history and the venue data behind it. No key, no account, no signup —
        every tool is read-only.
      </p>

      <Block title="Install">
        <Code text={CONFIG} />
        <p style={{ fontSize: 12.5, color: "var(--slate)", margin: "12px 0 0" }}>
          Add to your MCP client&rsquo;s config file, then restart it.
        </p>
      </Block>

      <Block title="Tools">
        <Tool name="get_lyra_record" desc="Full trade history, each entry with its Arweave id and the venue wallet that executed it." />
        <Tool name="get_lyra_stats" desc="Win rate, cumulative pnl, drawdown — returned with the derivation, not just the figure." />
        <Tool name="verify_trade" desc="Takes a claimed trade and returns the chain and venue data to check it against. Returns evidence, never a verdict." />
        <Tool name="get_venue_state" desc="Current mark price, funding and open interest for the assets she watches." />
      </Block>

      <Block title="What it will not do">
        <p style={{ fontSize: 13, color: "var(--slate)", margin: 0, lineHeight: 1.65 }}>
          There is no tool to place a trade, move a stop, or touch a wallet. An MCP
          client is an untrusted caller, and untrusted callers do not get a write
          path to money. If you find one, it is a bug — report it.
        </p>
      </Block>

      <footer style={{ marginTop: 56, paddingTop: 20, borderTop: "1px solid var(--rule)", fontSize: 12.5, color: "var(--slate)", display: "flex", gap: 20 }}>
        <a href="/" style={{ borderBottom: "1px solid var(--rule)" }}>home</a>
        <a href="/terminal" style={{ borderBottom: "1px solid var(--rule)" }}>terminal</a>
      </footer>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2
        style={{
          margin: "0 0 14px",
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "0.04em",
          borderBottom: "1px solid var(--rule-strong)",
          paddingBottom: 8,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Tool({ name, desc }: { name: string; desc: string }) {
  return (
    <div style={{ padding: "9px 0", borderBottom: "1px solid var(--rule)" }}>
      <div className="mono" style={{ fontSize: 13 }}>{name}</div>
      <div style={{ fontSize: 12.5, color: "var(--slate)", marginTop: 3 }}>{desc}</div>
    </div>
  );
}

function Code({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <pre
        className="mono scroll-x"
        style={{
          margin: 0,
          padding: 14,
          background: "var(--panel)",
          border: "1px solid var(--rule)",
          fontSize: 12.5,
          lineHeight: 1.6,
        }}
      >
        {text}
      </pre>
      <button
        onClick={() => {
          void navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "var(--night)",
          border: "1px solid var(--rule)",
          color: "var(--slate)",
          fontSize: 11,
          padding: "3px 9px",
          cursor: "pointer",
        }}
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
