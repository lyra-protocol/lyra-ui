"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { BulkTopBar } from "@/components/workspace/bulk/bulk-top-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildMcpConnectorUrls, normalizeMcpBaseUrl } from "@/lib/mcp-connector-url";

function newSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function McpConnectorPage() {
  const baseFromEnv = process.env.NEXT_PUBLIC_LYRA_MCP_BASE_URL ?? "";
  const base = baseFromEnv ? normalizeMcpBaseUrl(baseFromEnv) : "";

  const [sessionId, setSessionId] = useState(() => newSessionId());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const urls = useMemo(
    () => (base ? buildMcpConnectorUrls(sessionId, base) : null),
    [base, sessionId],
  );

  const primaryUrl = urls?.withQuery ?? "";

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
  }, []);

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <BulkTopBar />
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-10 md:py-14">
        <h1 className="text-lg font-medium tracking-tight">Lyra MCP</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-foreground/55">
          Generate a session, copy the connector URL, then add it in Claude → Settings →
          Connectors → Add custom connector (Streamable HTTP).
        </p>

        {!base ? (
          <Card className="mt-8 border-[var(--negative)]/35 bg-[var(--panel)] p-4">
            <p className="text-[11px] leading-relaxed text-foreground/80">
              Set{" "}
              <code className="rounded bg-foreground/[0.08] px-1 py-0.5 text-[10px]">
                NEXT_PUBLIC_LYRA_MCP_BASE_URL
              </code>{" "}
              in Vercel to your MCP origin (no trailing slash), e.g.{" "}
              <code className="rounded bg-foreground/[0.08] px-1 py-0.5 text-[10px]">
                https://lyra-mcp-production.up.railway.app
              </code>
              , then redeploy.
            </p>
          </Card>
        ) : null}

        <Card className="mt-8 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-foreground/45">
                Session id
              </div>
              <div className="mt-1 font-mono text-[11px] text-foreground/90 break-all">
                {sessionId}
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 gap-1"
              onClick={regenerate}
            >
              <RefreshCw className="h-3 w-3" aria-hidden />
              New session
            </Button>
          </div>

          <div className="mt-6 border-t border-[var(--line)] pt-5">
            <div className="text-[10px] font-medium uppercase tracking-wide text-foreground/45">
              Connector URL (recommended)
            </div>
            <p className="mt-1 text-[10px] text-foreground/45">
              Paste this as the MCP server URL in Claude. Uses{" "}
              <code className="text-foreground/70">?session=</code>.
            </p>
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
          </div>

          {urls ? (
            <div className="mt-5 border-t border-[var(--line)] pt-5">
              <div className="text-[10px] font-medium uppercase tracking-wide text-foreground/45">
                Alternative (path session)
              </div>
              <p className="mt-1 text-[10px] text-foreground/45">
                Same server; some clients prefer a path instead of a query string.
              </p>
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

        <ol className="mt-8 list-decimal space-y-2 pl-5 text-[11px] leading-relaxed text-foreground/55">
          <li>Open Claude → Settings → Connectors.</li>
          <li>Add custom connector → choose Streamable HTTP (or your client’s MCP HTTP option).</li>
          <li>Paste the connector URL above. Name it e.g. &quot;Lyra&quot;.</li>
          <li>Start a chat and invoke Lyra tools when available.</li>
        </ol>

        <p className="mt-6 text-[10px] text-foreground/40">
          Sessions are generated in the browser for now; wire a friend API later to mint and
          validate tokens server-side.
        </p>
      </div>
    </main>
  );
}
