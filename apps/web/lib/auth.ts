import crypto from "crypto";

// Self-contained auth primitives — no external deps. Password hashing uses
// scrypt; the session token is a compact HMAC-signed `payload.signature`
// (a minimal JWT-alike). Requires the JWT_SECRET env var (see .env.local).

function requireSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "Missing JWT_SECRET environment variable. Add it to apps/web/.env.local",
    );
  }
  return secret;
}

/** Hash a plaintext password as "salt:hash" using scrypt. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Constant-time verify of a plaintext password against a stored "salt:hash". */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(test, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Sign a token carrying `userId`, valid for `expiresInSec` (default 30 days). */
export function signToken(
  userId: string,
  expiresInSec = 60 * 60 * 24 * 30,
): string {
  const body = { userId, exp: Math.floor(Date.now() / 1000) + expiresInSec };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", requireSecret())
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

/** Verify a token; returns `{ userId }` or null if invalid/expired/tampered. */
export function verifyToken(token: string): { userId: string } | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expected = crypto
      .createHmac("sha256", requireSecret())
      .update(data)
      .digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const body = JSON.parse(Buffer.from(data, "base64url").toString());
    if (typeof body.exp === "number" && body.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { userId: String(body.userId) };
  } catch {
    return null;
  }
}

/** Extract the bearer token from an Authorization header, if present. */
export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
