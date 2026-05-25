import { NextResponse } from "next/server";
import { runVercelAgentTick } from "@/core/server/lyra/tick";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function run() {
  return NextResponse.json(await runVercelAgentTick());
}

export async function GET() {
  return run();
}

export async function POST() {
  return run();
}
