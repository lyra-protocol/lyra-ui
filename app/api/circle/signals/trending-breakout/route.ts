import { NextResponse } from "next/server";
import { LYRA_AGENT_URL } from "@/lib/lyra-agent";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const paymentId =
      req.headers.get("x-payment-id") ??
      req.headers.get("X-Payment-Id") ??
      url.searchParams.get("paymentId");
    const headers: HeadersInit = {};
    if (paymentId) headers["X-Payment-Id"] = paymentId;

    const agentUrl = new URL(`${LYRA_AGENT_URL}/api/signals/trending-breakout`);
    if (paymentId) agentUrl.searchParams.set("paymentId", paymentId);

    const res = await fetch(agentUrl.toString(), {
      headers,
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Agent unreachable" }, { status: 502 });
  }
}
