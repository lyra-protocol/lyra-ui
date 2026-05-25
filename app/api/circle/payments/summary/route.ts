import { NextResponse } from "next/server";
import { getPaymentSummary } from "@/core/server/circle-serverless";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getPaymentSummary());
}
