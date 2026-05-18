import { NextResponse } from "next/server";
import { proxyAgentGet } from "@/lib/lyra-agent";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = url.searchParams.get("limit") ?? "50";
    const res = await proxyAgentGet(`/api/circle/payments/log?limit=${limit}`);
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Agent unreachable" }, { status: 502 });
  }
}
