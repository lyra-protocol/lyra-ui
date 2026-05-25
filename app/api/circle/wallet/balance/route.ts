import { NextResponse } from "next/server";
import { getWalletBalance } from "@/core/server/circle-serverless";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getWalletBalance());
}
