"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, ChevronRight, Copy, ExternalLink, Info } from "lucide-react";
import { BulkTopBar } from "@/components/workspace/bulk/bulk-top-bar";
import { Button } from "@/components/ui/button";
import { buildMcpConnectorUrls, normalizeMcpBaseUrl } from "@/lib/mcp-connector-url";

const ANTHROPIC_REMOTE_MCP_GUIDE =
  "https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp";

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
    <main className="relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(40vh,20rem)] bg-gradient-to-b from-foreground/[0.06] to-transparent"
        aria-hidden
      />
      <BulkTopBar />
      <div className="relative mx-auto w-full max-w-xl flex-1 px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/40">Lyra · Quick install</p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Finish in Claude
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/55">
          Paste your connector URL, enable the Lyra connector for a chat, and ask Claude to use your tools.
        </p>

        {!token ? (
          <div className="mt-10 rounded-2xl border border-foreground/[0.08] bg-[var(--panel)]/80 px-5 py-6 shadow-sm backdrop-blur-sm sm:px-6">
            <p className="text-[14px] leading-relaxed text-foreground/65">
              This short link is missing a token. Open the main connect page while signed in to create one, or
              open the link from your invite email again.
            </p>
            <Button asChild className="mt-5 rounded-full px-6" size="default">
              <Link href="/mcp">Back to connect</Link>
            </Button>
          </div>
        ) : !base ? (
          <div className="mt-10 flex gap-4 rounded-2xl border border-foreground/[0.08] bg-[var(--panel)]/90 px-5 py-5 shadow-sm backdrop-blur-sm sm:px-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/70">
              <Info className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-[15px] font-medium leading-snug text-foreground">Links aren’t ready here yet</p>
              <p className="text-[13px] leading-relaxed text-foreground/60">
                Your token is valid, but this site build isn’t linked to the live MCP server yet — so we can’t
                assemble the URL for Claude. On production this page shows copy buttons automatically.
              </p>
              <details className="group pt-1">
                <summary className="cursor-pointer list-none text-[12px] font-medium text-foreground/45 outline-none [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-1">
                    For whoever ships this
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 transition group-open:rotate-90" aria-hidden />
                  </span>
                </summary>
                <p className="mt-3 text-[12px] leading-relaxed text-foreground/50">
                  Point this frontend at your public MCP origin (no trailing slash), redeploy, reload — then the
                  install links populate.
                </p>
              </details>
              <Button asChild variant="secondary" className="mt-3 rounded-full border border-foreground/10 bg-transparent" size="sm">
                <Link href="/mcp">Open full connect page</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-10 space-y-8">
            <div className="rounded-2xl border border-foreground/[0.08] bg-[var(--panel)]/60 px-5 py-4 backdrop-blur-sm sm:px-6">
              <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/40">Your token</p>
              <p className="mt-2 break-all font-mono text-[12px] leading-relaxed text-foreground/85">{token}</p>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-[13px] font-medium text-foreground">Connector URL</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <div className="min-h-[3rem] flex-1 rounded-2xl border border-foreground/[0.08] bg-[var(--panel-2)] px-4 py-3 font-mono text-[11px] leading-snug text-foreground/80 break-all sm:py-3.5">
                    {urls?.withQuery}
                  </div>
                  <Button
                    type="button"
                    size="lg"
                    className="h-auto shrink-0 rounded-2xl px-6"
                    disabled={!urls?.withQuery}
                    onClick={() => urls?.withQuery && copy("q", urls.withQuery)}
                  >
                    {copied === "q" ? (
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
              <div>
                <p className="text-[12px] font-medium text-foreground/45">Path style (if your client prefers it)</p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <div className="min-h-[3rem] flex-1 rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3 font-mono text-[11px] leading-snug text-foreground/70 break-all">
                    {urls?.withPath}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="h-auto shrink-0 rounded-2xl border border-foreground/10 bg-transparent px-6"
                    disabled={!urls?.withPath}
                    onClick={() => urls?.withPath && copy("p", urls.withPath)}
                  >
                    {copied === "p" ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            </div>

            <ol className="list-decimal space-y-2.5 pl-5 text-[14px] leading-relaxed text-foreground/60 marker:text-foreground/35">
              <li>Claude → Settings → Connectors → Add custom connector.</li>
              <li>Choose Streamable HTTP (remote MCP).</li>
              <li>Paste the URL above, name it Lyra, save.</li>
              <li>Enable Lyra for the chat you want, then try a Lyra tool.</li>
            </ol>

            <a
              className="inline-flex items-center gap-2 text-[13px] font-medium text-foreground/55 transition hover:text-foreground"
              href={ANTHROPIC_REMOTE_MCP_GUIDE}
              target="_blank"
              rel="noreferrer"
            >
              Anthropic — remote MCP guide
              <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
            </a>
          </div>
        )}
      </div>
    </main>
  );
}

export function McpInstallOnboarding() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] bg-background px-5 py-16 text-[14px] text-foreground/45">Loading…</main>
      }
    >
      <InstallBody />
    </Suspense>
  );
}
