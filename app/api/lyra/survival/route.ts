import { NextResponse } from "next/server";
import { getVercelSurvivalSnapshot } from "@/core/server/lyra/store";
import { fetchAgentJson } from "@/core/server/lyra/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const upstream = await fetchAgentJson("/survival");
  if (upstream.ok) return NextResponse.json(upstream.data);

  return NextResponse.json(await getVercelSurvivalSnapshot());
}
