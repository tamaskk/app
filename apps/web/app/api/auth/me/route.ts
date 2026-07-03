import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { TrainingModel } from "@/lib/models/Training";
import { WorkoutSessionModel } from "@/lib/models/WorkoutSession";
import { publicUserJson } from "@/lib/user-json";
import {
  bearerToken,
  verifyToken,
  verifyPassword,
  hashPassword,
} from "@/lib/auth";

export const runtime = "nodejs";

function userId(req: NextRequest): string | null {
  const token = bearerToken(req);
  return token ? verifyToken(token)?.userId ?? null : null;
}

// Return the current user for a valid bearer token. Used to restore sessions.
export async function GET(req: NextRequest) {
  const id = userId(req);
  if (!id) return Response.json({ detail: "Unauthorized" }, { status: 401 });
  try {
    await connectToDatabase();
    const user = await UserModel.findById(id).lean();
    if (!user) return Response.json({ detail: "Unauthorized" }, { status: 401 });
    // Use the shared serializer so session restore returns the SAME fully
    // hydrated user as login — including subscription. Omitting it here made
    // every relaunch default to Subscription.free(), so paying users saw the
    // "Start 3-day free trial" paywall CTA and Account showed "Free".
    return Response.json({ user: publicUserJson(user) });
  } catch {
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}

// Update the profile: name and/or password (password change needs the current one).
export async function PATCH(req: NextRequest) {
  const id = userId(req);
  if (!id) return Response.json({ detail: "Unauthorized" }, { status: 401 });

  let body: {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const user = await UserModel.findById(id);
    if (!user) return Response.json({ detail: "Unauthorized" }, { status: 401 });

    if (typeof body.name === "string") {
      user.name = body.name.trim();
    }

    if (body.newPassword) {
      // OAuth-only accounts can't change a non-existent password here.
      if (
        !body.currentPassword ||
        !user.passwordHash ||
        !verifyPassword(body.currentPassword, user.passwordHash)
      ) {
        return Response.json(
          { detail: "A jelenlegi jelszó helytelen." },
          { status: 401 },
        );
      }
      if (body.newPassword.length < 6) {
        return Response.json(
          { detail: "Az új jelszó legalább 6 karakter legyen." },
          { status: 422 },
        );
      }
      user.passwordHash = hashPassword(body.newPassword);
    }

    await user.save();
    return Response.json({
      user: { id: String(user._id), email: user.email, name: user.name },
    });
  } catch {
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}

// Delete the account. The UI promises irreversible deletion, so this must
// also remove the user's owned data — otherwise their trainings and workout
// history stayed in the collection (and, worse, leaked to the next account
// that reused an anonymous/null scope).
export async function DELETE(req: NextRequest) {
  const id = userId(req);
  if (!id) return Response.json({ detail: "Unauthorized" }, { status: 401 });
  try {
    await connectToDatabase();
    await Promise.all([
      TrainingModel.deleteMany({ userId: id }),
      WorkoutSessionModel.deleteMany({ userId: id }),
    ]);
    await UserModel.findByIdAndDelete(id);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
