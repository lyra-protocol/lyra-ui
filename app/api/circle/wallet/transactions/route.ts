import { NextResponse } from "next/server";
import { getWalletTransactions } from "@/core/server/circle-serverless";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getWalletTransactions());
}
