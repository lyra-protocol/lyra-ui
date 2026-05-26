import { NextResponse } from "next/server";
import { verifyPayment } from "@/core/server/circle-serverless";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await ctx.params;
  return NextResponse.json(verifyPayment(paymentId));
}
