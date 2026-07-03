import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { verifyPassword, signToken } from "@/lib/auth";
import { publicUserJson } from "@/lib/user-json";

export const runtime = "nodejs";

// Verify credentials and return a session token.
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return Response.json(
      { detail: "Email and password are required" },
      { status: 422 },
    );
  }

  try {
    await connectToDatabase();
    const user = await UserModel.findOne({ email });
    // OAuth-only accounts have no passwordHash — treat them as wrong-password
    // for anti-enumeration. Same response whether email/pw is bad or absent.
    if (
      !user ||
      !user.passwordHash ||
      !verifyPassword(password, user.passwordHash)
    ) {
      return Response.json(
        { detail: "Invalid email or password" },
        { status: 401 },
      );
    }
    const token = signToken(String(user._id));
    return Response.json({
      token,
      user: publicUserJson(user),
    });
  } catch {
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
