import { authenticatePrivyRequest } from "@/core/server/auth/privy-server";
import {
  mintLyraMcpConnectorToken,
  revokeLyraMcpConnectorTokens,
} from "@/core/server/services/mcp-token-service";
import { buildMcpConnectorUrls, normalizeMcpBaseUrl } from "@/lib/mcp-connector-url";

export async function POST(request: Request) {
  try {
    const auth = await authenticatePrivyRequest(request);
    const { token } = await mintLyraMcpConnectorToken(auth.privyUserId);

    const baseRaw = process.env.NEXT_PUBLIC_LYRA_MCP_BASE_URL?.trim() ?? "";
    const base = baseRaw ? normalizeMcpBaseUrl(baseRaw) : "";
    const urls = base ? buildMcpConnectorUrls(token, base) : null;

    return Response.json({
      ok: true,
      token,
      connectorUrlWithQuery: urls?.withQuery ?? null,
      connectorUrlWithPath: urls?.withPath ?? null,
      hint: base
        ? null
        : "Set NEXT_PUBLIC_LYRA_MCP_BASE_URL (MCP origin, no trailing slash) to include ready-to-paste Claude URLs.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to mint MCP token.";
    const status = message.toLowerCase().includes("bearer") || message.toLowerCase().includes("missing")
      ? 401
      : 400;
    return Response.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authenticatePrivyRequest(request);
    await revokeLyraMcpConnectorTokens(auth.privyUserId);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to revoke MCP tokens.";
    const status = message.toLowerCase().includes("bearer") || message.toLowerCase().includes("missing")
      ? 401
      : 400;
    return Response.json({ ok: false, error: message }, { status });
  }
}
