import { NextResponse } from "next/server";
import { getVercelComputeStats } from "@/core/server/lyra/compute";
import { fetchAgentJson } from "@/core/server/lyra/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const upstream = await fetchAgentJson("/compute");
  if (upstream.ok) return NextResponse.json(upstream.data);

  return NextResponse.json(getVercelComputeStats());
}
