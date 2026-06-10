import { COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

// POST so this can't be triggered by a stray GET — admin actions stay
// behind a real form submission.
export async function POST() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    },
  });
}
