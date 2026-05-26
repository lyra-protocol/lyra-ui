/**
 * Build Streamable HTTP MCP connector URLs for Lyra MCP.
 * `base` must be an origin only, e.g. https://lyra-mcp-vercel.vercel.app
 */

/** Shared MCP origin — used when `NEXT_PUBLIC_LYRA_MCP_BASE_URL` is unset (no env required for Lyra builds). */
export const LYRA_MCP_DEFAULT_PUBLIC_ORIGIN = "https://lyra-mcp-vercel.vercel.app";

export function normalizeMcpBaseUrl(base: string): string {
  return base.trim().replace(/\/$/, "");
}

/** Public MCP origin: optional env override for forks; otherwise Lyra’s Vercel MCP host. */
export function resolveLyraMcpPublicOrigin(envValue?: string | null): string {
  const trimmed = (envValue ?? "").trim();
  const raw = trimmed || LYRA_MCP_DEFAULT_PUBLIC_ORIGIN;
  return normalizeMcpBaseUrl(raw);
}

export function buildMcpConnectorUrls(sessionId: string, base: string) {
  const origin = normalizeMcpBaseUrl(base);
  const q = encodeURIComponent(sessionId);
  return {
    /** POST /mcp?session= — supported by lyra-mcp */
    withQuery: `${origin}/mcp?session=${q}`,
    /** POST /u/:session/mcp — path style */
    withPath: `${origin}/u/${q}/mcp`,
  };
}
