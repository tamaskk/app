import { NextRequest } from "next/server";
import { COOKIE_NAME, credentialsValid, signSession, SESSION_MAX_AGE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  const username = (body.username ?? "").trim();
  const password = body.password ?? "";

  if (!credentialsValid(username, password)) {
    // Same error whether the username is wrong or the password is wrong —
    // gives a brute-force probe nothing to learn.
    return Response.json(
      { detail: "Invalid credentials" },
      { status: 401 },
    );
  }

  const value = signSession();
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieString(value, SESSION_MAX_AGE),
    },
  });
}

function cookieString(value: string, maxAge: number): string {
  const parts = [
    `${COOKIE_NAME}=${value}`,
    `Path=/`,
    `Max-Age=${maxAge}`,
    `HttpOnly`,
    `SameSite=Lax`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}
