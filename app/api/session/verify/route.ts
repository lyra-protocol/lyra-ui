/**
 * Turns a signature into a session.
 *
 * The address is never taken on trust from the request body — it is recovered
 * from the signature. A caller can claim to be anyone; only the key can prove
 * it.
 */
import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { issueToken, nonceIsValid, SESSION_TTL_MS } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { address?: string; message?: string; signature?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const { address, message, signature } = body;
  if (!address || !message || !signature) {
    return NextResponse.json(
      { error: "missing_fields", detail: "address, message and signature are all required." },
      { status: 400 },
    );
  }

  // The nonce must be one we issued, recently. Without this the same signature
  // is replayable forever.
  const nonce = /^Nonce: (.+)$/m.exec(message)?.[1];
  if (!nonce || !(await nonceIsValid(nonce))) {
    return NextResponse.json(
      { error: "bad_nonce", detail: "That sign-in request has expired. Ask for a new one." },
      { status: 401 },
    );
  }

  // Bind the message to the address it claims, so a signature collected for one
  // address cannot be submitted under another.
  if (!message.includes(address)) {
    return NextResponse.json({ error: "address_mismatch" }, { status: 401 });
  }

  let ok = false;
  try {
    ok = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    ok = false;
  }
  if (!ok) return NextResponse.json({ error: "bad_signature" }, { status: 401 });

  try {
    const token = await issueToken(address);
    return NextResponse.json(
      { token, address: address.toLowerCase(), expiresInMs: SESSION_TTL_MS },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "not_configured", detail: (error as Error).message },
      { status: 503 },
    );
  }
}
