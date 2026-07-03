// Apple / Google ID token validation. No external dependencies — we fetch
// the provider's JWKS, cache it for an hour, and verify RS256 signatures
// with Node's built-in crypto module.

import crypto from "crypto";

export type OAuthProvider = "apple" | "google";

export interface OAuthIdentity {
  provider: OAuthProvider;
  subject: string; // provider-issued stable user id
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

interface ProviderConfig {
  issuers: string[];
  jwksUrl: string;
  audiences: () => string[];
}

// Configure audiences via env so the same code works for staging/prod.
// APPLE_CLIENT_ID: usually your iOS bundle id (e.g. "io.blcks.eronlet").
// GOOGLE_CLIENT_IDS: comma-separated — typically one per platform.
const PROVIDERS: Record<OAuthProvider, ProviderConfig> = {
  apple: {
    issuers: ["https://appleid.apple.com"],
    jwksUrl: "https://appleid.apple.com/auth/keys",
    audiences: () =>
      (process.env.APPLE_CLIENT_ID ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  },
  google: {
    issuers: ["accounts.google.com", "https://accounts.google.com"],
    jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
    audiences: () =>
      (process.env.GOOGLE_CLIENT_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  },
};

interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
}

const jwksCache = new Map<string, { fetchedAt: number; keys: Jwk[] }>();
const JWKS_TTL_MS = 60 * 60 * 1000; // 1h

async function loadJwks(url: string): Promise<Jwk[]> {
  const cached = jwksCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) {
    return cached.keys;
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS from ${url}: ${res.status}`);
  }
  const body = (await res.json()) as { keys?: Jwk[] };
  const keys = body.keys ?? [];
  jwksCache.set(url, { fetchedAt: Date.now(), keys });
  return keys;
}

function jwkToPem(jwk: Jwk): crypto.KeyObject {
  // Node 16+ supports JWK directly via createPublicKey.
  return crypto.createPublicKey({ key: jwk as never, format: "jwk" });
}

function parseSegment<T>(seg: string): T {
  return JSON.parse(Buffer.from(seg, "base64url").toString()) as T;
}

interface JwtHeader {
  alg: string;
  kid: string;
}

interface IdTokenClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

/**
 * Verify a provider-issued ID token. Throws if the signature, issuer,
 * audience, or expiry is wrong. Returns a stable identity on success.
 */
export async function verifyIdToken(
  provider: OAuthProvider,
  idToken: string,
): Promise<OAuthIdentity> {
  const cfg = PROVIDERS[provider];
  const audiences = cfg.audiences();
  if (audiences.length === 0) {
    throw new Error(
      `${provider.toUpperCase()} client id not configured — set the env var (see lib/oauth.ts).`,
    );
  }

  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed ID token");
  const [headerSeg, payloadSeg, signatureSeg] = parts;

  const header = parseSegment<JwtHeader>(headerSeg);
  const claims = parseSegment<IdTokenClaims>(payloadSeg);

  if (header.alg !== "RS256") {
    throw new Error(`Unsupported alg: ${header.alg}`);
  }

  // Look up the signing key from the provider's JWKS by `kid`.
  const keys = await loadJwks(cfg.jwksUrl);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("Signing key not found in JWKS");

  // Verify the RS256 signature over `header.payload`.
  const signingInput = Buffer.from(`${headerSeg}.${payloadSeg}`);
  const signature = Buffer.from(signatureSeg, "base64url");
  const valid = crypto.verify(
    "RSA-SHA256",
    signingInput,
    jwkToPem(jwk),
    signature,
  );
  if (!valid) throw new Error("Invalid ID token signature");

  // Standard JWT claim checks.
  if (!cfg.issuers.includes(claims.iss)) {
    throw new Error(`Unexpected issuer: ${claims.iss}`);
  }
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.some((a) => audiences.includes(a))) {
    throw new Error(`Unexpected audience: ${aud.join(",")}`);
  }
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp < now) throw new Error("ID token expired");

  const emailVerified =
    claims.email_verified === true || claims.email_verified === "true";

  const name =
    claims.name ??
    ([claims.given_name, claims.family_name].filter(Boolean).join(" ").trim() ||
      null);

  return {
    provider,
    subject: claims.sub,
    email: claims.email ?? null,
    emailVerified,
    name: name || null,
  };
}
