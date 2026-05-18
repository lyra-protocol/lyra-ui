import { NextResponse } from "next/server";
import { proxyAgentGet } from "@/lib/lyra-agent";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await proxyAgentGet("/api/circle/wallet/balance");
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Agent unreachable" }, { status: 502 });
  }
}
