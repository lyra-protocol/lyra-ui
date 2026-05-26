import { NextResponse } from "next/server";
import { createPaymentIntent } from "@/core/server/circle-serverless";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(createPaymentIntent(body));
}
