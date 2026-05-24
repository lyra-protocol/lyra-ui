import { NextResponse } from "next/server";
import { parseAgentStatus } from "@/lib/agent-status";

export const dynamic = "force-dynamic";

const AGENT_URL = process.env.LYRA_AGENT_URL ?? "http://localhost:4060";

export async function GET() {
  try {
    const res = await fetch(`${AGENT_URL}/status`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, reachable: false, error: `Agent status ${res.status}` },
        { status: 503 },
      );
    }
    const data: unknown = await res.json();
    const status = parseAgentStatus(data);
    if (!status) {
      return NextResponse.json(
        { ok: false, reachable: false, error: "Invalid agent status payload" },
        { status: 503 },
      );
    }
    return NextResponse.json(status);
  } catch {
    return NextResponse.json(
      { ok: false, reachable: false, error: "Agent unreachable" },
      { status: 503 },
    );
  }
}
