/**
 * Lyra over MCP.
 *
 * Streamable-HTTP JSON-RPC, implemented directly rather than through the MCP
 * SDK: the whole surface is four read-only tools, and the SDK's transports
 * assume a long-lived Node process rather than a request handler.
 *
 * ── What a caller can and cannot do ─────────────────────────────────────────
 *
 * Every tool is a read. There is no order path, no key, and no write of any
 * kind — an MCP client is an untrusted caller and never gets one (memo §5).
 * The worst a stolen session token can do is read data that is, by design,
 * going to be public anyway.
 *
 * Sessions exist to make the data *sellable* later, not to make it secret: to
 * attach a request to an address so access can eventually be metered or paid
 * for. That is why gating is at the transport and not inside each tool.
 */

import { NextResponse } from "next/server";
import { bearer, readToken } from "@/lib/session";

export const dynamic = "force-dynamic";

const COLLECTOR = process.env.LYRA_COLLECTOR_URL ?? "";
const PROTOCOL_VERSION = "2025-06-18";

type RpcId = string | number | null;

const TOOLS = [
  {
    name: "pain_map",
    description:
      "Forced-liquidation map for one asset: the price levels where other traders' " +
      "positions are liquidated, aggregated into forced buying above spot and forced " +
      "selling below it. Rebuilt from enumerated real positions, not estimated.",
    inputSchema: {
      type: "object",
      properties: {
        asset: {
          type: "string",
          description: "BTC, ETH, HYPE, SOL, PAXG, KAITO, XRP or DOGE.",
        },
      },
      required: ["asset"],
    },
    path: (a: Record<string, unknown>) => `painmap?asset=${encodeURIComponent(String(a.asset ?? "BTC"))}`,
  },
  {
    name: "decisions",
    description:
      "Lyra's recent decisions, newest first. Includes the ones where she declined " +
      "to trade, the ordered premises behind each, and its record id.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "1–100. Default 25." } },
    },
    path: (a: Record<string, unknown>) => `activity?limit=${clamp(a.limit, 25, 100)}`,
  },
  {
    name: "trades",
    description:
      "Closed trades with entry, exit, gross PnL, fees and net. Losses included; " +
      "this is the whole record, not the good part of it.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "1–200. Default 40." } },
    },
    path: (a: Record<string, unknown>) => `trades?limit=${clamp(a.limit, 40, 200)}`,
  },
  {
    name: "dataset_status",
    description:
      "Size and coverage of the underlying dataset: accounts tracked, position " +
      "changes logged, closures observed, and how long collection has been running.",
    inputSchema: { type: "object", properties: {} },
    path: () => "status",
  },
] as const;

function clamp(v: unknown, fallback: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), 1), max);
}

function rpc(id: RpcId, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result }, {
    headers: { "cache-control": "no-store" },
  });
}

function rpcError(id: RpcId, code: number, message: string, status = 200) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  // ── the session gate ─────────────────────────────────────────────────────
  const session = await readToken(bearer(request.headers.get("authorization"))).catch(() => null);
  if (!session) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message:
            "No valid session. Connect a wallet at https://www.lyrabuild.xyz/mcp to get a " +
            "token, then send it as `Authorization: Bearer <token>`.",
        },
      },
      { status: 401, headers: { "www-authenticate": "Bearer" } },
    );
  }

  let body: { jsonrpc?: string; id?: RpcId; method?: string; params?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  const id = body.id ?? null;
  const method = body.method;

  if (method === "initialize") {
    return rpc(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "lyra", version: "1.0.0" },
      instructions:
        "Lyra is an autonomous trading agent. These tools read her live decisions, her " +
        "closed trades, and the forced-liquidation map she trades on. Everything is " +
        "read-only — there is no tool here that can place an order.",
    });
  }

  // Notifications carry no id and expect no response body.
  if (method === "notifications/initialized") return new NextResponse(null, { status: 202 });

  if (method === "ping") return rpc(id, {});

  if (method === "tools/list") {
    return rpc(id, {
      tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
    });
  }

  if (method === "tools/call") {
    const name = body.params?.name as string | undefined;
    const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) return rpcError(id, -32602, `Unknown tool: ${name}`);

    if (!COLLECTOR) {
      return rpc(id, {
        isError: true,
        content: [{
          type: "text",
          text: "The collector is not configured, so this server has nothing to read.",
        }],
      });
    }

    try {
      const target = `${COLLECTOR.replace(/\/+$/, "")}/api/${tool.path(args)}`;
      const res = await fetch(target, { headers: { accept: "application/json" }, cache: "no-store" });
      const text = await res.text();
      if (!res.ok) {
        return rpc(id, {
          isError: true,
          content: [{ type: "text", text: `Collector returned ${res.status}: ${text.slice(0, 400)}` }],
        });
      }
      return rpc(id, { content: [{ type: "text", text }] });
    } catch (error) {
      return rpc(id, {
        isError: true,
        content: [{ type: "text", text: `Could not reach the collector: ${(error as Error).message}` }],
      });
    }
  }

  return rpcError(id, -32601, `Method not found: ${method}`);
}

/** A GET is how most clients probe the endpoint, so it should explain itself. */
export async function GET() {
  return NextResponse.json({
    name: "lyra",
    protocolVersion: PROTOCOL_VERSION,
    transport: "streamable-http",
    authentication: "Bearer token from https://www.lyrabuild.xyz/mcp",
    tools: TOOLS.map((t) => t.name),
    writes: false,
  });
}
