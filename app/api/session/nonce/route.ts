/**
 * Hands out a nonce to sign.
 *
 * Unauthenticated by necessity — this is the step before authentication. The
 * nonce carries its own timestamp and MAC, so issuing one costs no storage and
 * an old one cannot be presented later.
 */
import { NextResponse } from "next/server";
import { issueNonce, signInMessage } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json(
      { error: "bad_address", detail: "Pass ?address=0x… — a 20-byte hex address." },
      { status: 400 },
    );
  }
  try {
    const nonce = await issueNonce();
    return NextResponse.json(
      { nonce, message: signInMessage(address, nonce) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "not_configured", detail: (error as Error).message },
      { status: 503 },
    );
  }
}
