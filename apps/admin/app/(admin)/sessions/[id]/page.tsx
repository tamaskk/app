import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { WorkoutSessionModel } from "@/lib/models/WorkoutSession";
import { UserModel } from "@/lib/models/User";
import { SessionEditor, type SessionShape } from "@/components/SessionEditor";

export const dynamic = "force-dynamic";

type LeanSet = { kg?: number; reps?: number; done?: boolean };
type LeanExercise = {
  exerciseId?: string;
  name?: string;
  gifUrl?: string;
  targetMuscles?: string[];
  sets?: LeanSet[];
};
type LeanSession = {
  _id: unknown;
  name?: string;
  userId?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  xpAwarded?: number;
  exercises?: LeanExercise[];
};

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectToDatabase();

  const s = (await WorkoutSessionModel.findById(id).lean()) as LeanSession | null;
  if (!s) notFound();

  let owner = "—";
  if (s.userId) {
    const u = (await UserModel.findById(s.userId)
      .select("email username")
      .lean()) as { email?: string; username?: string | null } | null;
    if (u) owner = u.username || u.email || "—";
  }

  const initial: SessionShape = {
    id: String(s._id),
    name: s.name ?? "",
    owner,
    startedAt: s.startedAt ? new Date(s.startedAt).toISOString() : null,
    finishedAt: s.finishedAt ? new Date(s.finishedAt).toISOString() : null,
    xpAwarded: s.xpAwarded ?? 0,
    exercises: (s.exercises ?? []).map((e) => ({
      exerciseId: e.exerciseId ?? "",
      name: e.name ?? "",
      gifUrl: e.gifUrl ?? "",
      targetMuscles: e.targetMuscles ?? [],
      sets: (e.sets ?? []).map((x) => ({
        kg: x.kg ?? 0,
        reps: x.reps ?? 0,
        done: !!x.done,
      })),
    })),
  };

  return <SessionEditor initial={initial} />;
}
