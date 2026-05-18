import { NextResponse } from "next/server";
import { LYRA_AGENT_URL } from "@/lib/lyra-agent";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const paymentId = req.headers.get("x-payment-id");
    const headers: HeadersInit = {};
    if (paymentId) headers["X-Payment-Id"] = paymentId;

    const res = await fetch(`${LYRA_AGENT_URL}/api/signals/trending-breakout`, {
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
