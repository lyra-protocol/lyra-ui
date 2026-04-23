"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
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
      setMintMessage(
        body.hint
          ? `Token ready. ${body.hint}`
          : "Server token saved. Use the connector URL below in Claude — this ties the MCP to your Lyra workspace (Supabase).",
      );
    } catch (e) {
      setMintMessage(e instanceof Error ? e.message : "Mint failed.");
    } finally {
      setMintLoading(false);
    }
  }, [getAccessToken]);

  const revokeServerTokens = useCallback(async () => {
    if (
      !window.confirm(
        "Revoke all Lyra MCP tokens for your account? Claude connectors using the old URL will stop until you mint a new token.",
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
      setMintMessage("All MCP tokens revoked. Mint a new one when you are ready.");
    } catch (e) {
      setMintMessage(e instanceof Error ? e.message : "Revoke failed.");
    } finally {
      setRevokeLoading(false);
    }
  }, [getAccessToken]);

  const healthUrl = base ? `${base}/health` : "";

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <BulkTopBar />
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 md:py-16">
        {/* Hero — aligns with docs/lyra-technical-spec.md §1 / §6 F2,F6 */}
        <div className="rounded-xl border border-[var(--line)] bg-gradient-to-b from-[var(--panel)] to-background px-5 py-6 md:px-7 md:py-8">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-foreground/45">
            <Sparkles className="h-3.5 w-3.5 text-foreground/50" aria-hidden />
            Claude · Streamable HTTP MCP
          </div>
          <h1 className="mt-2 text-xl font-medium tracking-tight text-foreground md:text-2xl">
            Connect Claude to Lyra
          </h1>
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-foreground/60 md:text-[14px]">
            Trade on Solana with Claude — rule-backed tools, paper execution today, live execution on the
            roadmap. This page is the <strong className="text-foreground/80">install hub</strong>: mint a
            secure token, copy one URL into Claude, then follow the steps below.
          </p>
        </div>

        <div className="mt-8 grid gap-3 text-[12px] leading-relaxed text-foreground/55 md:grid-cols-2">
          <Card className="border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-foreground/45">
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              Trading MCP
            </div>
            <p className="mt-2">
              Sign in here, mint a <code className="text-[10px] text-foreground/75">lyt_…</code> token, paste
              the connector URL into Claude. The MCP server must run with{" "}
              <code className="text-[10px] text-foreground/75">LYRA_MCP_MODE=trading</code> and Supabase keys
              (same project as this app).
            </p>
          </Card>
          <Card className="border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-foreground/45">
              Lens / dev
            </div>
            <p className="mt-2">
              <strong className="text-foreground/70">Random session</strong> is only for{" "}
              <code className="text-[10px] text-foreground/75">LYRA_MCP_MODE=lens</code> experiments. It is
              not stored in Supabase. Prefer a minted token for anything real.
            </p>
          </Card>
        </div>

        {!base ? (
          <Card className="mt-8 border-[var(--negative)]/35 bg-[var(--panel)] p-4 md:p-5">
            <p className="text-[12px] leading-relaxed text-foreground/80">
              Set{" "}
              <code className="rounded bg-foreground/[0.08] px-1.5 py-0.5 text-[11px]">
                NEXT_PUBLIC_LYRA_MCP_BASE_URL
              </code>{" "}
              in Vercel to your MCP origin (no trailing slash), e.g.{" "}
              <code className="rounded bg-foreground/[0.08] px-1.5 py-0.5 text-[11px]">
                https://lyra-mcp-production.up.railway.app
              </code>
              , then redeploy this site so connector URLs can be generated.
            </p>
          </Card>
        ) : null}

        <section className="mt-10">
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
            Step 1 — Generate your session
          </h2>
          <Card className="mt-3 border-[var(--line)] p-4 md:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[12px] leading-relaxed text-foreground/60">
                  {authenticated ? (
                    <>
                      Signed in
                      {walletAddress ? (
                        <>
                          {" "}
                          · linked wallet{" "}
                          <span className="font-mono text-[11px] text-foreground/80">
                            {shortenWallet(walletAddress)}
                          </span>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>Sign in with the same account you use in Lyra Terminal so we can mint a server token.</>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!ready ? (
                    <span className="text-[11px] text-foreground/45">Checking session…</span>
                  ) : !authenticated ? (
                    <Button type="button" size="sm" onClick={() => void login()}>
                      Sign in to mint token
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        disabled={mintLoading}
                        onClick={() => void mintServerToken()}
                      >
                        {mintLoading ? "Minting…" : "Mint Lyra MCP token"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={revokeLoading}
                        onClick={() => void revokeServerTokens()}
                      >
                        {revokeLoading ? "Revoking…" : "Revoke MCP tokens"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-foreground/50"
                        onClick={() => void logout()}
                      >
                        Sign out
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 sm:max-w-[220px]">
                <div className="text-[9px] font-medium uppercase tracking-wide text-foreground/40">
                  Optional (Lens)
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2 w-full gap-1"
                  onClick={regenerate}
                >
                  <RefreshCw className="h-3 w-3" aria-hidden />
                  New random session
                </Button>
              </div>
            </div>
            {mintMessage ? (
              <p className="mt-4 text-[11px] leading-relaxed text-foreground/70">{mintMessage}</p>
            ) : null}
            <Separator className="my-5 bg-[var(--line)]" />
            <div className="text-[10px] font-medium uppercase tracking-wide text-foreground/45">
              Active session / token
            </div>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-foreground/90 break-all">
              {sessionId}
            </p>
            {isMintedTradingToken && shareableInstallHref ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1"
                  onClick={() => void copy("install", shareableInstallHref)}
                >
                  {copiedField === "install" ? (
                    <Check className="h-3 w-3" aria-hidden />
                  ) : (
                    <Copy className="h-3 w-3" aria-hidden />
                  )}
                  Copy shareable install link
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-foreground/55" asChild>
                  <Link href={`/mcp/install?token=${encodeURIComponent(sessionId)}`}>
                    Open install-only page
                  </Link>
                </Button>
              </div>
            ) : null}
          </Card>
        </section>

        <section className="mt-10">
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
            Step 2 — Copy connector URL
          </h2>
          <p className="mt-2 text-[12px] text-foreground/55">
            Claude expects the <strong className="text-foreground/75">full Streamable HTTP URL</strong>{" "}
            (not just the host). Prefer the query form unless your client docs say otherwise.
          </p>
          <Card className="mt-3 border-[var(--line)] p-4 md:p-5">
            <div className="text-[10px] font-medium uppercase tracking-wide text-foreground/45">
              Recommended — <code className="text-foreground/65">?session=</code>
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-2 font-mono text-[10px] leading-snug text-foreground/85 break-all">
                {primaryUrl || "—"}
              </div>
              <Button
                type="button"
                size="sm"
                className="shrink-0 gap-1"
                disabled={!primaryUrl}
                onClick={() => primaryUrl && copy("primary", primaryUrl)}
              >
                {copiedField === "primary" ? (
                  <Check className="h-3 w-3" aria-hidden />
                ) : (
                  <Copy className="h-3 w-3" aria-hidden />
                )}
                Copy
              </Button>
            </div>
            {urls ? (
              <div className="mt-5 border-t border-[var(--line)] pt-5">
                <div className="text-[10px] font-medium uppercase tracking-wide text-foreground/45">
                  Alternative — path session
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-2 font-mono text-[10px] leading-snug text-foreground/85 break-all">
                    {urls.withPath}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => copy("path", urls.withPath)}
                  >
                    {copiedField === "path" ? (
                      <Check className="h-3 w-3" aria-hidden />
                    ) : (
                      <Copy className="h-3 w-3" aria-hidden />
                    )}
                    Copy
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        </section>

        <section className="mt-10">
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
            Step 3 — Add in Claude (fine integration)
          </h2>
          <Card className="mt-3 border-[var(--line)] overflow-hidden p-0">
            <Tabs defaultValue="web" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b border-[var(--line)] bg-[var(--panel)] px-2">
                <TabsTrigger value="web">Claude (web)</TabsTrigger>
                <TabsTrigger value="desktop">Desktop &amp; Cursor</TabsTrigger>
              </TabsList>
              <TabsContent value="web" className="m-0 p-4 md:p-5">
                <ol className="list-decimal space-y-2.5 pl-5 text-[12px] leading-relaxed text-foreground/65">
                  <li>Open Claude in the browser.</li>
                  <li>Go to <strong className="text-foreground/80">Settings</strong> (profile menu).</li>
                  <li>Open <strong className="text-foreground/80">Connectors</strong> (or Connectors &amp; skills).</li>
                  <li>
                    <strong className="text-foreground/80">Add custom connector</strong> → choose{" "}
                    <strong className="text-foreground/80">Streamable HTTP</strong> / remote MCP.
                  </li>
                  <li>Paste the <strong className="text-foreground/80">connector URL</strong> from Step 2.</li>
                  <li>Name it e.g. &quot;Lyra&quot;, save, then enable this connector for the chat where you want tools.</li>
                </ol>
              </TabsContent>
              <TabsContent value="desktop" className="m-0 p-4 md:p-5">
                <ol className="list-decimal space-y-2.5 pl-5 text-[12px] leading-relaxed text-foreground/65">
                  <li>
                    <strong className="text-foreground/80">Claude Desktop:</strong> Settings → Developer → Edit
                    config is the classic path; many builds now use{" "}
                    <strong className="text-foreground/80">Connectors</strong> like the web app — use the same
                    Streamable HTTP URL from Step 2 when offered.
                  </li>
                  <li>
                    <strong className="text-foreground/80">Cursor:</strong> Settings → MCP → add server URL
                    (Streamable HTTP) with the same URL.
                  </li>
                  <li>Restart the app if the client does not pick up the new connector immediately.</li>
                </ol>
              </TabsContent>
            </Tabs>
            <div className="border-t border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 md:px-5">
              <a
                href={ANTHROPIC_REMOTE_MCP_GUIDE}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-foreground/55 underline-offset-4 hover:text-foreground/85 hover:underline"
              >
                Anthropic — Get started with custom connectors (remote MCP)
                <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
              </a>
            </div>
          </Card>
        </section>

        <section className="mt-10">
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
            Step 4 — Try in chat
          </h2>
          <Card className="mt-3 border-[var(--line)] bg-[var(--panel)] p-4 md:p-5">
            <p className="text-[12px] leading-relaxed text-foreground/60">
              After the connector is enabled for a conversation, ask Claude something like:
            </p>
            <ul className="mt-3 space-y-2 font-mono text-[11px] leading-relaxed text-foreground/75">
              <li>&quot;Call get_trading_context and summarize my Lyra state.&quot;</li>
              <li>&quot;What are my current trading rules in Lyra?&quot;</li>
              <li>&quot;Record a small paper trade in Lyra: SOL → USDC for 0.01 SOL.&quot;</li>
            </ul>
          </Card>
        </section>

        {healthUrl ? (
          <section className="mt-10">
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
              Verify MCP server
            </h2>
            <Card className="mt-3 flex flex-col gap-3 border-[var(--line)] bg-[var(--panel)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-[12px] text-foreground/60">
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-foreground/45" aria-hidden />
                <span>
                  Open the health JSON in a new tab. You should see{" "}
                  <code className="text-[10px] text-foreground/80">{`"ok": true`}</code>.
                </span>
              </div>
              <Button variant="secondary" size="sm" className="shrink-0 gap-1" asChild>
                <a href={healthUrl} target="_blank" rel="noreferrer">
                  Open /health
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </Button>
            </Card>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
            Troubleshooting
          </h2>
          <Card className="mt-3 border-[var(--line)] bg-[var(--panel)] p-4 md:p-5">
            <ul className="space-y-2.5 text-[12px] leading-relaxed text-foreground/60">
              <li>
                <strong className="text-foreground/75">403 / Host not allowed:</strong> add every public host
                Claude hits (e.g. <code className="text-[10px]">mcp.lyrabuild.xyz</code> and your{" "}
                <code className="text-[10px]">*.up.railway.app</code>) to{" "}
                <code className="text-[10px]">MCP_ALLOWED_HOSTS</code> on Railway.
              </li>
              <li>
                <strong className="text-foreground/75">Unknown token in Claude:</strong> mint again on this
                page; old URLs stop working after revoke.
              </li>
              <li>
                <strong className="text-foreground/75">Empty rules in tools:</strong> apply the Supabase
                migration for <code className="text-[10px]">lyra_*</code> tables, then use{" "}
                <code className="text-[10px]">set_rule</code> from Claude or wire the dashboard rules form
                (spec §6 F4).
              </li>
            </ul>
          </Card>
        </section>

        <p className="mt-12 text-center text-[10px] text-foreground/40">
          Product spec: <code className="text-foreground/50">docs/lyra-technical-spec.md</code> (F2 dashboard,
          F6 MCP install). Branded <code className="text-foreground/50">mcp.lyrabuild.xyz/install?token=</code> can
          proxy to this hub or Railway — see <code className="text-foreground/50">lyra-mcp/README.md</code>.
        </p>
      </div>
    </main>
  );
}
