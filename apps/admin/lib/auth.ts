// Tiny admin session helper. No user table — just compares the submitted
// credentials against ADMIN_USERNAME / ADMIN_PASSWORD in the environment
// and hands out an HMAC-signed cookie. Anything beyond that lives in a real
// auth system, not here.

import crypto from "crypto";

export const COOKIE_NAME = "heftor_admin";
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function requireSecret(): string {
  const s = process.env.ADMIN_JWT_SECRET;
  if (!s) {
    throw new Error(
      "Missing ADMIN_JWT_SECRET. Generate one with `openssl rand -hex 32` and set it in apps/admin/.env.local.",
    );
  }
  return s;
}

/** Constant-time credential check against env vars. */
export function credentialsValid(username: string, password: string): boolean {
  const u = process.env.ADMIN_USERNAME ?? "";
  const p = process.env.ADMIN_PASSWORD ?? "";
  if (!u || !p) return false;
  // Use timingSafeEqual on equal-length buffers to dodge timing leaks. Pad
  // with zeros first so submitted inputs of any length still go through the
  // constant-time path.
  return safeEqual(username, u) && safeEqual(password, p);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  // pad to the longer length so equal-length precondition holds
  const len = Math.max(ab.length, bb.length);
  const ap = Buffer.alloc(len);
  const bp = Buffer.alloc(len);
  ab.copy(ap);
  bb.copy(bp);
  // Ensure the lengths matched in the first place to avoid the all-zero
  // shortcut.
  return ab.length === bb.length && crypto.timingSafeEqual(ap, bp);
}

/** Mint a fresh signed session cookie value. */
export function signSession(): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TTL_SECONDS;
  const body = `${now}.${exp}`;
  const sig = crypto
    .createHmac("sha256", requireSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

/** Returns true when [value] is a valid, unexpired cookie. */
export function verifySession(value: string | undefined | null): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [issuedAt, expiresAt, sig] = parts;
  if (!issuedAt || !expiresAt || !sig) return false;
  let expected: string;
  try {
    expected = crypto
      .createHmac("sha256", requireSecret())
      .update(`${issuedAt}.${expiresAt}`)
      .digest("base64url");
  } catch {
    return false;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  const exp = Number(expiresAt);
  if (!Number.isFinite(exp)) return false;
  return exp > Math.floor(Date.now() / 1000);
}

export const SESSION_MAX_AGE = TTL_SECONDS;
