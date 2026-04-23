"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Info,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { BulkTopBar } from "@/components/workspace/bulk/bulk-top-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";
import { buildMcpConnectorUrls, normalizeMcpBaseUrl } from "@/lib/mcp-connector-url";
import { cn } from "@/lib/utils";

const ANTHROPIC_REMOTE_MCP_GUIDE =
  "https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp";

function newSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function shortenWallet(value: string | null | undefined) {
  if (!value) return null;
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-[13px] font-semibold text-background shadow-sm">
      {n}
    </span>
  );
}

export function McpConnectorPage() {
  const { ready, authenticated, login, logout, getAccessToken, walletAddress } = useWorkspaceAuth();
  const baseFromEnv = process.env.NEXT_PUBLIC_LYRA_MCP_BASE_URL ?? "";
  const base = baseFromEnv ? normalizeMcpBaseUrl(baseFromEnv) : "";

  const [sessionId, setSessionId] = useState(() => newSessionId());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [mintLoading, setMintLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [mintMessage, setMintMessage] = useState<string | null>(null);

  const urls = useMemo(
    () => (base ? buildMcpConnectorUrls(sessionId, base) : null),
    [base, sessionId],
  );

  const primaryUrl = urls?.withQuery ?? "";
  const isMintedTradingToken = sessionId.startsWith("lyt_");
  const [siteOrigin, setSiteOrigin] = useState("");
  useEffect(() => {
    setSiteOrigin(window.location.origin);
  }, []);
  const shareableInstallHref = siteOrigin
    ? `${siteOrigin}/mcp/install?token=${encodeURIComponent(sessionId)}`
    : "";

  const copy = useCallback(async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      window.setTimeout(() => setCopiedField((c) => (c === label ? null : c)), 2000);
    } catch {
      setCopiedField(null);
    }
  }, []);

  const regenerate = useCallback(() => {
    setSessionId(newSessionId());
    setCopiedField(null);
    setMintMessage(null);
  }, []);

  const mintServerToken = useCallback(async () => {
    setMintMessage(null);
    setMintLoading(true);
    try {
      const accessToken = await getAccessToken();
      const res = await fetch("/api/mcp/token", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = (await res.json()) as {
        ok?: boolean;
        token?: string;
        error?: string;
        hint?: string | null;
      };
      if (!res.ok || !body.ok || !body.token) {
        throw new Error(body.error ?? "Could not mint token.");
      }
      setSessionId(body.token);
      setCopiedField(null);
      const hasBase = Boolean(process.env.NEXT_PUBLIC_LYRA_MCP_BASE_URL?.trim());
      setMintMessage(
        hasBase
          ? "You’re set — copy the connector link below and add it in Claude."
          : "Your secure token is saved. When this site is linked to the Lyra MCP server, your install links will show up automatically below.",
      );
    } catch (e) {
      setMintMessage(e instanceof Error ? e.message : "Something went wrong. Try again in a moment.");
    } finally {
      setMintLoading(false);
    }
  }, []);

  const revokeServerTokens = useCallback(async () => {
    if (
      !window.confirm(
        "Revoke all Lyra MCP tokens for your account? Claude will stop working with old links until you create a new token.",
      )
    ) {
      return;
    }
    setMintMessage(null);
    setRevokeLoading(true);
    try {
      const accessToken = await getAccessToken();
      const res = await fetch("/api/mcp/token", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? "Revoke failed.");
      }
      setSessionId(newSessionId());
      setMintMessage("Previous tokens are no longer valid. Create a new one whenever you’re ready.");
    } catch (e) {
      setMintMessage(e instanceof Error ? e.message : "Couldn’t revoke tokens.");
    } finally {
      setRevokeLoading(false);
    }
  }, [getAccessToken]);

  const healthUrl = base ? `${base}/health` : "";

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(52vh,28rem)] bg-gradient-to-b from-foreground/[0.07] via-transparent to-transparent"
        aria-hidden
      />
      <BulkTopBar />
      <div className="relative mx-auto w-full max-w-3xl flex-1 px-5 pb-20 pt-10 sm:px-8 sm:pt-14 md:pb-28">
        {!base ? (
          <div
            className="mb-10 flex gap-4 rounded-2xl border border-foreground/[0.08] bg-[var(--panel)]/90 px-5 py-4 shadow-sm backdrop-blur-sm sm:items-start sm:px-6 sm:py-5"
            role="status"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/70">
              <Info className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-[15px] font-medium leading-snug tracking-tight text-foreground">
                Install links aren’t available on this preview yet
              </p>
              <p className="text-[13px] leading-relaxed text-foreground/60">
                Nothing is wrong with your account — this environment just isn’t wired to the live Lyra MCP
                server yet, so we can’t build the URL Claude needs. On production, this message goes away and
                you’ll see copyable links right here.
              </p>
              <details className="group pt-1">
                <summary className="cursor-pointer list-none text-[12px] font-medium text-foreground/45 outline-none transition hover:text-foreground/70 [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-1">
                    Hosting checklist
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 transition group-open:rotate-90" aria-hidden />
                  </span>
                </summary>
                <p className="mt-3 text-[12px] leading-relaxed text-foreground/50">
                  Ask whoever deploys Lyra to point this app at your MCP server URL (same host you use on
                  Railway), redeploy once, then refresh. If you’re that person, the setting is the public MCP
                  origin — no trailing slash.
                </p>
              </details>
            </div>
          </div>
        ) : null}

        <header className="text-center sm:text-left">
          <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/40">
            <Sparkles className="h-3.5 w-3.5 text-foreground/45" aria-hidden />
            Lyra for Claude
          </p>
          <h1 className="mt-3 text-balance text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-4xl sm:leading-[1.1]">
            Connect Claude in one calm flow
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-foreground/55 sm:mx-0 sm:text-[16px]">
            Lyra gives Claude structured tools for your Solana workspace — starting with paper execution and
            clear rules. Sign in, create a short-lived token, paste one URL into Claude, and you’re done.
          </p>
        </header>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          <span className="rounded-full border border-foreground/[0.08] bg-foreground/[0.04] px-4 py-1.5 text-[12px] text-foreground/65">
            Recommended: minted token + trading MCP
          </span>
          <span className="rounded-full border border-transparent px-2 text-[12px] text-foreground/40">
            Advanced: random session for Lens-only servers
          </span>
        </div>

        <section className="mt-14 space-y-12">
          <div className="flex gap-5">
            <StepBadge n={1} />
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h2 className="text-[17px] font-semibold tracking-tight text-foreground">Create your access</h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-foreground/55">
                  {authenticated
                    ? walletAddress
                      ? `Signed in · ${shortenWallet(walletAddress)}`
                      : "Signed in — you can mint a token for Claude."
                    : "Use the same Lyra account you use in the terminal so we can attach this connector to you."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!ready ? (
                  <span className="text-[13px] text-foreground/45">Checking session…</span>
                ) : !authenticated ? (
                  <Button type="button" size="default" className="rounded-full px-6" onClick={() => void login()}>
                    Sign in
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="default"
                      className="rounded-full px-6"
                      disabled={mintLoading}
                      onClick={() => void mintServerToken()}
                    >
                      {mintLoading ? "Creating…" : "Create Lyra token"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-full border border-foreground/10 bg-transparent"
                      disabled={revokeLoading}
                      onClick={() => void revokeServerTokens()}
                    >
                      {revokeLoading ? "Revoking…" : "Revoke tokens"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-foreground/45 hover:text-foreground/70"
                      onClick={() => void logout()}
                    >
                      Sign out
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-foreground/40 hover:text-foreground/65"
                  onClick={regenerate}
                >
                  <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden />
                  New dev session
                </Button>
              </div>
              {mintMessage ? (
                <p className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] px-4 py-3 text-[13px] leading-relaxed text-foreground/70">
                  {mintMessage}
                </p>
              ) : null}
              <div className="rounded-2xl border border-foreground/[0.06] bg-[var(--panel)]/60 px-4 py-4 sm:px-5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/40">Active token</p>
                <p className="mt-2 break-all font-mono text-[12px] leading-relaxed text-foreground/85">
                  {sessionId}
                </p>
                {isMintedTradingToken && shareableInstallHref ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-full"
                      onClick={() => void copy("install", shareableInstallHref)}
                    >
                      {copiedField === "install" ? (
                        <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      )}
                      Copy invite link
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="rounded-full" asChild>
                      <Link href={`/mcp/install?token=${encodeURIComponent(sessionId)}`}>Minimal install page</Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <Separator className="bg-foreground/[0.06]" />

          <div className="flex gap-5">
            <StepBadge n={2} />
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h2 className="text-[17px] font-semibold tracking-tight text-foreground">Copy the link for Claude</h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-foreground/55">
                  Claude needs the full Streamable HTTP address — not only the domain.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-medium text-foreground/40">Primary</p>
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <div
                      className={cn(
                        "min-h-[3.25rem] flex-1 rounded-2xl border border-foreground/[0.08] bg-[var(--panel-2)] px-4 py-3 font-mono text-[12px] leading-snug text-foreground/80 break-all sm:py-3.5",
                        !primaryUrl && "text-foreground/35",
                      )}
                    >
                      {primaryUrl || "—"}
                    </div>
                    <Button
                      type="button"
                      size="lg"
                      className="h-auto shrink-0 rounded-2xl px-6 sm:self-stretch"
                      disabled={!primaryUrl}
                      onClick={() => primaryUrl && copy("primary", primaryUrl)}
                    >
                      {copiedField === "primary" ? (
                        <>
                          <Check className="mr-2 h-4 w-4" aria-hidden />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" aria-hidden />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {urls ? (
                  <div>
                    <p className="text-[11px] font-medium text-foreground/40">Alternative path style</p>
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                      <div className="min-h-[3.25rem] flex-1 rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3 font-mono text-[11px] leading-snug text-foreground/70 break-all sm:py-3.5">
                        {urls.withPath}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="lg"
                        className="h-auto shrink-0 rounded-2xl border border-foreground/10 bg-transparent px-6 sm:self-stretch"
                        onClick={() => copy("path", urls.withPath)}
                      >
                        {copiedField === "path" ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <Separator className="bg-foreground/[0.06]" />

          <div className="flex gap-5">
            <StepBadge n={3} />
            <div className="min-w-0 flex-1 space-y-4">
              <h2 className="text-[17px] font-semibold tracking-tight text-foreground">Add it in Claude</h2>
              <Card className="overflow-hidden rounded-2xl border-foreground/[0.08] shadow-sm">
                <Tabs defaultValue="web" className="w-full">
                  <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b border-foreground/[0.06] bg-foreground/[0.02] p-1.5">
                    <TabsTrigger
                      value="web"
                      className="rounded-xl px-4 py-2.5 text-[13px] data-[state=active]:shadow-sm"
                    >
                      Claude in the browser
                    </TabsTrigger>
                    <TabsTrigger
                      value="desktop"
                      className="rounded-xl px-4 py-2.5 text-[13px] data-[state=active]:shadow-sm"
                    >
                      Desktop & Cursor
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="web" className="m-0 px-5 py-6 sm:px-6">
                    <ol className="list-decimal space-y-3 pl-5 text-[14px] leading-relaxed text-foreground/65 marker:text-foreground/35">
                      <li>Open Claude, then your profile → Settings.</li>
                      <li>Open Connectors (wording may vary slightly).</li>
                      <li>Add a custom connector and pick Streamable HTTP / remote MCP.</li>
                      <li>Paste the URL from step 2 and name it &quot;Lyra&quot;.</li>
                      <li>Enable Lyra for the chat where you want tools.</li>
                    </ol>
                  </TabsContent>
                  <TabsContent value="desktop" className="m-0 px-5 py-6 sm:px-6">
                    <ol className="list-decimal space-y-3 pl-5 text-[14px] leading-relaxed text-foreground/65 marker:text-foreground/35">
                      <li>
                        <span className="font-medium text-foreground/80">Claude Desktop:</span> use Connectors
                        when available, or the documented MCP config path for your version — same Streamable URL
                        as step 2.
                      </li>
                      <li>
                        <span className="font-medium text-foreground/80">Cursor:</span> Settings → MCP → add the
                        Streamable HTTP URL.
                      </li>
                      <li>Restart the client if the connector doesn’t show up immediately.</li>
                    </ol>
                  </TabsContent>
                </Tabs>
                <div className="border-t border-foreground/[0.06] bg-foreground/[0.02] px-5 py-4 sm:px-6">
                  <a
                    href={ANTHROPIC_REMOTE_MCP_GUIDE}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-[13px] font-medium text-foreground/55 transition hover:text-foreground"
                  >
                    Official Anthropic guide — remote MCP
                    <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
                  </a>
                </div>
              </Card>
            </div>
          </div>

          <div className="flex gap-5">
            <StepBadge n={4} />
            <div className="min-w-0 flex-1 space-y-3">
              <h2 className="text-[17px] font-semibold tracking-tight text-foreground">Try a first message</h2>
              <div className="space-y-2 rounded-2xl border border-foreground/[0.06] bg-[var(--panel)]/50 px-5 py-4">
                {[
                  "Call get_trading_context and summarize my Lyra state.",
                  "What are my trading rules in Lyra right now?",
                  "Record a small paper trade in Lyra: SOL to USDC for 0.01 SOL.",
                ].map((line) => (
                  <p
                    key={line}
                    className="border-l-2 border-foreground/15 pl-3 font-mono text-[12px] leading-relaxed text-foreground/70"
                  >
                    “{line}”
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {healthUrl ? (
          <div className="mt-14 flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-foreground/[0.08] bg-[var(--panel)]/50 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div className="flex items-start gap-3">
              <Activity className="mt-0.5 h-5 w-5 shrink-0 text-foreground/40" aria-hidden />
              <div>
                <p className="text-[14px] font-medium text-foreground">Check that the MCP server is up</p>
                <p className="mt-0.5 text-[13px] text-foreground/50">You should see a small JSON payload with ok: true.</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="shrink-0 rounded-full border border-foreground/10 bg-transparent" asChild>
              <a href={healthUrl} target="_blank" rel="noreferrer">
                Open health check
                <ExternalLink className="ml-2 h-3.5 w-3.5" aria-hidden />
              </a>
            </Button>
          </div>
        ) : null}

        <details className="group mt-12 rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] px-5 py-4 sm:px-6">
          <summary className="cursor-pointer list-none text-[14px] font-medium text-foreground/60 outline-none [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              Having trouble?
              <ChevronRight className="h-4 w-4 shrink-0 transition group-open:rotate-90" aria-hidden />
            </span>
          </summary>
          <ul className="mt-4 space-y-3 border-t border-foreground/[0.06] pt-4 text-[13px] leading-relaxed text-foreground/55">
            <li>
              <span className="font-medium text-foreground/75">403 from Claude:</span> the MCP host list on the
              server must include every domain you paste (custom domain and Railway hostname).
            </li>
            <li>
              <span className="font-medium text-foreground/75">“Unknown token”:</span> create a new token here;
              revoking invalidates old links on purpose.
            </li>
            <li>
              <span className="font-medium text-foreground/75">Empty data in tools:</span> database migrations
              may still be pending, or you haven’t set rules yet — use set_rule from Claude or the dashboard when
              it ships.
            </li>
          </ul>
        </details>
      </div>
    </main>
  );
}
