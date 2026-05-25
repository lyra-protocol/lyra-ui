import { NextResponse } from "next/server";
import { getTrendingBreakoutSignals } from "@/core/server/circle-serverless";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentId = req.headers.get("x-payment-id") ?? url.searchParams.get("paymentId");
  const payload = await getTrendingBreakoutSignals(paymentId);
  return NextResponse.json(payload, { status: payload.ok ? 200 : 402 });
}
