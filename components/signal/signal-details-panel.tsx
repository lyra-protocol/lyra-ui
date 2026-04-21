"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { SignalAlert } from "@/core/signal/signal-types";
import { cn } from "@/lib/utils";
import {
  formatToken,
  formatUsd,
  formatWallet,
  ruleAccent,
  ruleLabel,
  timeAgo,
  timestampLabel,
} from "@/components/signal/signal-format";

type Props = {
  alert: SignalAlert | null;
};

export function SignalDetailsPanel({ alert }: Props) {
  if (!alert) {
    return (
      <aside className="flex h-full min-h-0 flex-col border-l border-[var(--line)] bg-[var(--panel)]">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-foreground/45">
            Inspector
          </p>
          <h2 className="mt-1 text-[13px] font-semibold text-foreground/90">
            Select an alert
          </h2>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-[11px] text-foreground/45">
          Click any row on the left to see the full event, wallet, and pump
          metadata here.
        </div>
      </aside>
    );
  }

  const { event } = alert;
  const pump = event.metadata?.pump;
  const symbol = pump?.symbol;
  const tokenDisplay = formatToken(event.token, symbol);
  const solscanToken = `https://solscan.io/token/${event.token}`;
  const solscanWallet = `https://solscan.io/account/${event.wallet}`;
  const pumpUrl = `https://pump.fun/${event.token}`;

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-[var(--line)] bg-[var(--panel)]">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-[4px] border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-px text-[9px] uppercase tracking-wider",
              ruleAccent(alert.primaryRule)
            )}
          >
            {ruleLabel(alert.primaryRule)}
          </span>
          <span className="text-[11px] uppercase text-foreground/55">{event.action}</span>
          <span className="ml-auto font-mono text-[10px] text-foreground/45">
            {timestampLabel(alert.createdAt)} · {timeAgo(alert.createdAt)} ago
          </span>
        </div>
        <h2 className="mt-1.5 text-[18px] font-semibold tracking-tight text-foreground">
          {tokenDisplay}
        </h2>
        {pump?.name ? (
          <p className="text-[12px] text-foreground/55">{pump.name}</p>
        ) : null}
        <p className="mt-3 text-[13px] leading-[1.55] text-foreground/80">
          {alert.sentence}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Event">
          <Row label="Notional" value={formatUsd(event.sizeUsd)} mono />
          <Row label="Action" value={event.action} />
          <Row label="Source" value={event.source} />
          <Row
            label="When"
            value={`${timestampLabel(alert.createdAt)} · ${timeAgo(alert.createdAt)} ago`}
            mono
          />
          {event.dedupeKey ? (
            <Row label="Dedupe" value={event.dedupeKey.slice(0, 18) + "…"} mono />
          ) : null}
        </Section>

        {pump ? (
          <Section title="Pump metadata">
            {typeof pump.marketCapSol === "number" ? (
              <Row
                label="Market cap"
                value={`${pump.marketCapSol.toFixed(2)} SOL`}
                mono
              />
            ) : null}
            {typeof pump.vSolInBondingCurve === "number" ? (
              <Row
                label="Bonding curve"
                value={`${pump.vSolInBondingCurve.toFixed(2)} SOL`}
                mono
              />
            ) : null}
            {typeof pump.vTokensInBondingCurve === "number" ? (
              <Row
                label="BC tokens"
                value={pump.vTokensInBondingCurve.toLocaleString()}
                mono
              />
            ) : null}
            {typeof pump.initialBuyTokens === "number" ? (
              <Row
                label="Initial buy"
                value={pump.initialBuyTokens.toLocaleString()}
                mono
              />
            ) : null}
            {pump.pool ? <Row label="Pool" value={pump.pool} mono /> : null}
            {pump.txType ? <Row label="Tx type" value={pump.txType} /> : null}
          </Section>
        ) : null}

        <Section title="Identifiers">
          <CopyableRow label="Token" value={event.token} link={solscanToken} />
          <CopyableRow label="Wallet" value={event.wallet} link={solscanWallet} short />
          <CopyableRow label="Alert id" value={alert.id} />
        </Section>

        <Section title="Shortcuts">
          <div className="flex flex-wrap gap-2 px-1">
            <ExternalLinkButton href={pumpUrl} label="Open on pump.fun" />
            <ExternalLinkButton href={solscanToken} label="Token · Solscan" />
            <ExternalLinkButton
              href={solscanWallet}
              label={`Wallet · ${formatWallet(event.wallet)}`}
            />
          </div>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--line)] px-4 py-3 last:border-b-0">
      <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-foreground/40">
        {title}
      </p>
      <div className="flex flex-col gap-[2px] text-[11px]">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-[2px]">
      <span className="text-foreground/55">{label}</span>
      <span
        className={cn(
          "max-w-[220px] truncate text-right",
          mono ? "font-mono tabular-nums text-foreground/90" : "text-foreground/85"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function CopyableRow({
  label,
  value,
  link,
  short,
}: {
  label: string;
  value: string;
  link?: string;
  short?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const display = short && value.length > 12
    ? `${value.slice(0, 6)}…${value.slice(-4)}`
    : value;
  return (
    <div className="flex items-center justify-between gap-2 py-[2px]">
      <span className="text-foreground/55">{label}</span>
      <div className="flex min-w-0 items-center gap-1">
        <span className="max-w-[170px] truncate font-mono text-[10px] text-foreground/85">
          {display}
        </span>
        <button
          type="button"
          onClick={() => {
            if (typeof navigator === "undefined") return;
            navigator.clipboard?.writeText(value).catch(() => null);
            setCopied(true);
            setTimeout(() => setCopied(false), 1000);
          }}
          className="inline-flex h-5 w-5 items-center justify-center text-foreground/40 transition hover:text-foreground"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="h-3 w-3 text-yellow-400" /> : <Copy className="h-3 w-3" />}
        </button>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-5 w-5 items-center justify-center text-foreground/40 transition hover:text-foreground"
            aria-label={`Open ${label}`}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ExternalLinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1 text-[11px] text-foreground/75 transition hover:text-foreground"
    >
      <ExternalLink className="h-3 w-3" />
      {label}
    </a>
  );
}
