/**
 * Server-side proxy to Lyra's collector.
 *
 * The browser cannot reach the collector directly: it speaks plain HTTP on a
 * non-standard port, and this page is HTTPS, so the request would be blocked as
 * mixed content even once the port is open.
 *
 * Proxying here solves that — server-to-server has no mixed-content rule — and
 * it keeps the collector's address out of the client bundle.
 *
 * Read-only by construction: only GET is exported, so there is no method a
 * visitor could use to write anything, whatever they send.
 */

import { NextResponse } from "next/server";

const COLLECTOR = process.env.LYRA_COLLECTOR_URL ?? "";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  if (!COLLECTOR) {
    return NextResponse.json(
      {
        error: "collector_not_configured",
        detail:
          "LYRA_COLLECTOR_URL is not set. The Pain Map is reconstructed from a dataset only " +
          "this project holds, so unlike the trade record it depends on the collector being reachable.",
      },
      { status: 503 },
    );
  }

  const { path } = await context.params;
  const search = new URL(request.url).search;
  const target = `${COLLECTOR.replace(/\/+$/, "")}/api/${path.join("/")}${search}`;

  try {
    const upstream = await fetch(target, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "public, max-age=5, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "collector_unreachable", detail: (error as Error).message },
      { status: 502 },
    );
  }
}
