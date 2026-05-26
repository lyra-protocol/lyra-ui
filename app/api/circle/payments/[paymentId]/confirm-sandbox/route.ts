import { NextResponse } from "next/server";
import { confirmPayment } from "@/core/server/circle-serverless";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await ctx.params;
  const result = confirmPayment(paymentId);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
