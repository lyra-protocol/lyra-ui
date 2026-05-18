import { NextResponse } from "next/server";
import { proxyAgentPost } from "@/lib/lyra-agent";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ paymentId: string }> },
) {
  try {
    const { paymentId } = await ctx.params;
    const res = await proxyAgentPost(`/api/circle/payments/${paymentId}/confirm-sandbox`);
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Agent unreachable" }, { status: 502 });
  }
}
