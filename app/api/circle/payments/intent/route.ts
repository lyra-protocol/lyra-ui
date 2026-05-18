import { NextResponse } from "next/server";
import { proxyAgentPost } from "@/lib/lyra-agent";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const res = await proxyAgentPost("/api/circle/payments/intent", body);
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Agent unreachable" }, { status: 502 });
  }
}
