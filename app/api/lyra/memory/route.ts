import { NextResponse } from "next/server";
import { getVercelMemoryLessons } from "@/core/server/lyra/store";
import { fetchAgentJson } from "@/core/server/lyra/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const upstream = await fetchAgentJson("/memory");
  if (upstream.ok) return NextResponse.json(upstream.data);

  const memories = await getVercelMemoryLessons(20);
  return NextResponse.json({ memories, count: memories.length, mode: "vercel" });
}
