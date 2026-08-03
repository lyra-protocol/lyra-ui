/**
 * Sessions, without a database.
 *
 * A visitor proves control of an address by signing a message, and gets back a
 * token that says so. The token is the whole session: address, issue time,
 * expiry, and an HMAC over those three. Nothing is stored.
 *
 * That is a deliberate constraint rather than a shortcut. This project keeps no
 * record of who looks at it (REBUILD-MEMO §6), and a sessions table is exactly
 * the sort of thing that quietly becomes one — every connect logged, every
 * address retained, forever. A stateless token cannot accumulate what it never
 * writes down.
 *
 * The cost is that a token cannot be revoked before it expires, which is why
 * they are short-lived. Rotating LYRA_SESSION_SECRET invalidates every token at
 * once if that is ever needed.
 */

const ENC = new TextEncoder();

/** Twelve hours: long enough to be usable, short enough that expiry is the revocation. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** Nonces are only allowed a few minutes between issue and signature. */
export const NONCE_TTL_MS = 10 * 60 * 1000;

export const SIGN_IN_DOMAIN = "lyrabuild.xyz";

function secret(): string {
  const s = process.env.LYRA_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "LYRA_SESSION_SECRET is missing or too short. It must be at least 32 characters; " +
        "generate one with `openssl rand -hex 32`.",
    );
  }
  return s;
}

/** base64url without padding — safe in headers, query strings and JSON. */
function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", ENC.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, ENC.encode(message));
  return b64url(new Uint8Array(sig));
}

/**
 * Constant-time comparison.
 *
 * A `===` on a MAC leaks how many leading bytes matched, which is enough to
 * forge one a byte at a time given enough attempts.
 */
function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ── nonces ──────────────────────────────────────────────────────────────── */

/**
 * A nonce that carries its own issue time, so replay is bounded without a store.
 *
 * The random half stops two visitors ever being handed the same string; the
 * timestamp half stops a signature from last week being presented today.
 */
export async function issueNonce(): Promise<string> {
  const rand = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const body = `${rand}.${Date.now()}`;
  return `${body}.${await hmac(body)}`;
}

export async function nonceIsValid(nonce: string, now = Date.now()): Promise<boolean> {
  const parts = nonce.split(".");
  if (parts.length !== 3) return false;
  const [rand, issued, mac] = parts as [string, string, string];
  if (!equal(mac, await hmac(`${rand}.${issued}`))) return false;
  const at = Number(issued);
  return Number.isFinite(at) && now - at >= 0 && now - at < NONCE_TTL_MS;
}

/* ── the message that gets signed ────────────────────────────────────────── */

/**
 * Human-readable, and specific about what it is not.
 *
 * Someone is being asked to sign something with a wallet that holds their
 * money, so the text has to say plainly that this authorises nothing on-chain.
 * A blob of hex would be indistinguishable from a transaction to most people.
 */
export function signInMessage(address: string, nonce: string): string {
  return [
    `${SIGN_IN_DOMAIN} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to read Lyra's data over MCP.",
    "",
    "This signature proves you control this address. It is not a transaction,",
    "it moves no funds, and it grants no permission over your wallet.",
    "",
    `URI: https://${SIGN_IN_DOMAIN}/mcp`,
    "Version: 1",
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join("\n");
}

/* ── tokens ──────────────────────────────────────────────────────────────── */

export type Session = { address: string; issuedAt: number; expiresAt: number };

export async function issueToken(address: string, now = Date.now()): Promise<string> {
  // Lower-cased so a checksummed and an unchecksummed address are one session.
  const body = `${address.toLowerCase()}.${now}.${now + SESSION_TTL_MS}`;
  return `${body}.${await hmac(body)}`;
}

/** Returns the session, or null. Never throws on malformed input — that is a 401. */
export async function readToken(token: string | null, now = Date.now()): Promise<Session | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [address, issued, expires, mac] = parts as [string, string, string, string];
  if (!equal(mac, await hmac(`${address}.${issued}.${expires}`))) return null;
  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || now >= expiresAt) return null;
  return { address, issuedAt: Number(issued), expiresAt };
}

/** Pulls a bearer token out of an Authorization header. */
export function bearer(header: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1]!.trim() : null;
}
