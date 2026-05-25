import { NextResponse } from "next/server";
import { parseAgentStatus } from "@/lib/agent-status";
import { getVercelAgentStatus } from "@/core/server/lyra/status";
import { fetchAgentJson } from "@/core/server/lyra/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const upstream = await fetchAgentJson("/status");
  if (upstream.ok) {
    const status = parseAgentStatus(upstream.data);
    if (status) return NextResponse.json({ ...status, mode: "proxy", reachable: true });
  }

  return NextResponse.json(getVercelAgentStatus(false));
}
