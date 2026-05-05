import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AGENT_URL = process.env.LYRA_AGENT_URL ?? "http://localhost:4060";

export async function GET() {
  try {
    const res = await fetch(`${AGENT_URL}/compute`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false, error: "Agent unreachable" }, { status: 200 });
  }
}
