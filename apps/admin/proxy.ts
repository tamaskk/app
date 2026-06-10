import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

// Next.js 16 renamed the `middleware` file convention to `proxy`. Proxy
// defaults to the Node.js runtime (the `runtime` export is not allowed
// here and would throw at build-time), which is exactly what we need so
// node:crypto.timingSafeEqual + Hmac in verifySession keep working.
//
// Gates every page except the login form and the auth routes themselves.
export const config = {
  matcher: [
    // Skip static assets and the auth endpoints (login form needs to be
    // reachable without a session).
    "/((?!_next/static|_next/image|favicon.ico|api/auth|login).*)",
  ],
};

export function proxy(req: NextRequest) {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (verifySession(cookie)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  // Preserve where the user wanted to go so login can bounce them back.
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}
