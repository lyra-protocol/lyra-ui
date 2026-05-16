import { NextResponse } from "next/server";

const DEFAULT_SIGNAL_URL = "https://lyra-signal-production.up.railway.app";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 100);
  const upstream = `${resolveSignalHttpUrl()}/api/signals/recent?limit=${limit}`;
  try {
    const response = await fetch(upstream, { cache: "no-store" });
    const json = (await response.json()) as unknown;
    if (!response.ok) throw new Error(`Signal worker ${response.status}`);
    return NextResponse.json(json, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Signal recent proxy failed:", error);
    return NextResponse.json(
      { ok: false, signals: [], message: "Recent signals are unavailable." },
      { status: 502 },
    );
  }
}

function resolveSignalHttpUrl() {
  const raw = (process.env.LYRA_SIGNAL_URL || process.env.NEXT_PUBLIC_LYRA_SIGNAL_URL || DEFAULT_SIGNAL_URL)
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/feed$/, "");
  if (raw.startsWith("wss://")) return raw.replace(/^wss:\/\//, "https://");
  if (raw.startsWith("ws://")) return raw.replace(/^ws:\/\//, "http://");
  return raw;
}
