"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Copy, ExternalLink } from "lucide-react";
import { BulkTopBar } from "@/components/workspace/bulk/bulk-top-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildMcpConnectorUrls, normalizeMcpBaseUrl } from "@/lib/mcp-connector-url";

function InstallBody() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();

  const baseFromEnv = process.env.NEXT_PUBLIC_LYRA_MCP_BASE_URL ?? "";
  const base = baseFromEnv ? normalizeMcpBaseUrl(baseFromEnv) : "";

  const urls = useMemo(
    () => (base && token ? buildMcpConnectorUrls(token, base) : null),
    [base, token],
  );

  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      setCopied(null);
    }
  }, []);

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <BulkTopBar />
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-10 md:py-14">
        <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/45">
          Lyra · Claude MCP
        </p>
        <h1 className="mt-1 text-lg font-medium tracking-tight">Finish your install</h1>
        <p className="mt-2 text-[12px] leading-relaxed text-foreground/55">
          This page is for people who already have a Lyra token (for example from email or support).
          Otherwise open the full hub to mint one.
        </p>

        {!token ? (
          <Card className="mt-8 border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="text-[11px] leading-relaxed text-foreground/70">
              Add <code className="rounded bg-foreground/[0.08] px-1 py-0.5 text-[10px]">?token=</code>{" "}
              to this URL, or go to the connect hub to generate a token while signed in.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/mcp">Open connect hub</Link>
            </Button>
          </Card>
        ) : !base ? (
          <Card className="mt-8 border-[var(--negative)]/35 bg-[var(--panel)] p-4">
            <p className="text-[11px] leading-relaxed text-foreground/80">
              This deployment is missing{" "}
              <code className="text-[10px]">NEXT_PUBLIC_LYRA_MCP_BASE_URL</code>. Set it to your Railway
              MCP origin, redeploy, then reload this page.
            </p>
          </Card>
        ) : (
          <>
            <Card className="mt-8 border border-[var(--line)] bg-[var(--panel)] p-4 md:p-5">
              <div className="text-[10px] font-medium uppercase tracking-wide text-foreground/45">
                Your token (keep private)
              </div>
              <p className="mt-1 font-mono text-[10px] leading-relaxed text-foreground/85 break-all">
                {token}
              </p>
            </Card>

            <div className="mt-8 space-y-5">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-foreground/45">
                  Connector URL (recommended)
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-2 font-mono text-[10px] leading-snug text-foreground/85 break-all">
                    {urls?.withQuery}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0 gap-1"
                    disabled={!urls?.withQuery}
                    onClick={() => urls?.withQuery && copy("q", urls.withQuery)}
                  >
                    {copied === "q" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </Button>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-foreground/45">
                  Path style (alternative)
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-2 font-mono text-[10px] leading-snug text-foreground/85 break-all">
                    {urls?.withPath}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0 gap-1"
                    disabled={!urls?.withPath}
                    onClick={() => urls?.withPath && copy("p", urls.withPath)}
                  >
                    {copied === "p" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <ol className="mt-10 list-decimal space-y-2 pl-5 text-[11px] leading-relaxed text-foreground/60">
              <li>Claude → Settings → Connectors → Add custom connector.</li>
              <li>Choose Streamable HTTP (remote MCP).</li>
              <li>Paste the connector URL. Name it &quot;Lyra&quot;.</li>
              <li>Enable the connector for a chat, then ask Claude to use Lyra tools.</li>
            </ol>

            <a
              className="mt-8 inline-flex items-center gap-1.5 text-[11px] text-foreground/55 underline-offset-4 hover:text-foreground/80 hover:underline"
              href="https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp"
              target="_blank"
              rel="noreferrer"
            >
              Anthropic: remote MCP connectors
              <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
            </a>
          </>
        )}
      </div>
    </main>
  );
}

export function McpInstallOnboarding() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] bg-background px-4 py-14 text-[12px] text-foreground/45">
          Loading…
        </main>
      }
    >
      <InstallBody />
    </Suspense>
  );
}
