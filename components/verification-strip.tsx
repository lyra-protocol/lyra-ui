"use client";

import { useState } from "react";

/**
 * The verification strip (REBUILD-MEMO.md §7, "signature element").
 *
 * A small gold mark on every trade row that expands to show the Arweave
 * transaction and the Hyperliquid reference side by side, with copy buttons.
 *
 * It is the one thing on this page no competing project has, so it is the one
 * thing a visitor should remember. Gold is used here and essentially nowhere
 * else, because here is where something is actually verifiable.
 */

export function VerificationStrip({
  arweaveId,
  venueAddress,
  venueOpenId,
  venueCloseId,
}: {
  arweaveId: string;
  venueAddress: string;
  venueOpenId: string;
  venueCloseId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Show verification detail"
        title="Verify this trade"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--vega)",
          padding: "2px 6px",
          fontSize: 13,
          lineHeight: 1,
        }}
      >
        ◆
      </button>

      {open && (
        <div
          style={{
            gridColumn: "1 / -1",
            marginTop: 8,
            padding: "12px 14px",
            border: "1px solid rgba(201,162,39,0.28)",
            background: "rgba(201,162,39,0.04)",
            display: "grid",
            gap: 10,
          }}
        >
          <Row
            label="Arweave record"
            value={arweaveId}
            href={`https://gateway.irys.xyz/${arweaveId}`}
          />
          <Row
            label="Hyperliquid wallet"
            value={venueAddress}
            href={`https://app.hyperliquid.xyz/explorer/address/${venueAddress}`}
          />
          <Row label="Venue order — open" value={venueOpenId} />
          <Row label="Venue order — close" value={venueCloseId} />
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "var(--slate)",
              borderTop: "1px solid var(--rule)",
              paddingTop: 8,
            }}
          >
            The record is on Arweave and cannot be edited or deleted. The wallet is
            public on Hyperliquid. Neither requires trusting this page — check both
            yourself.
          </p>
        </div>
      )}
    </>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(140px, auto) 1fr auto",
        gap: 12,
        alignItems: "baseline",
        fontSize: 12,
      }}
    >
      <span style={{ color: "var(--slate)" }}>{label}</span>
      {href ? (
        <a className="mono verify" href={href} target="_blank" rel="noreferrer noopener" style={{ wordBreak: "break-all" }}>
          {value}
        </a>
      ) : (
        <span className="mono" style={{ wordBreak: "break-all" }}>
          {value}
        </span>
      )}
      <button
        onClick={() => {
          void navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
        style={{
          background: "none",
          border: "1px solid var(--rule)",
          color: "var(--slate)",
          cursor: "pointer",
          fontSize: 11,
          padding: "2px 8px",
        }}
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
