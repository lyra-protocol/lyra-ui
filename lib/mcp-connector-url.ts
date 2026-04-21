/**
 * Build Streamable HTTP MCP connector URLs for Lyra MCP (Railway or proxied domain).
 * `base` must be an origin only, e.g. https://lyra-mcp-production.up.railway.app
 */

export function normalizeMcpBaseUrl(base: string): string {
  return base.trim().replace(/\/$/, "");
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
