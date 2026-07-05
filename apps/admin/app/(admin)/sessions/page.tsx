import { connectToDatabase } from "@/lib/mongodb";
import { WorkoutSessionModel } from "@/lib/models/WorkoutSession";
import { UserModel } from "@/lib/models/User";
import { SimpleTable } from "@/components/SimpleTable";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  await connectToDatabase();

  const sessions = await WorkoutSessionModel.find({})
    .sort({ finishedAt: -1, createdAt: -1 })
    .limit(500)
    .lean();

  // Pull every owner in one query so each row doesn't trigger its own find.
  const userIds = Array.from(
    new Set(sessions.map((s) => s.userId).filter((u): u is string => !!u)),
  );
  const owners = await UserModel.find({ _id: { $in: userIds } })
    .select("email username name")
    .lean();
  const ownerMap = new Map(
    owners.map((o) => [String(o._id), (o.username as string | null) || (o.email as string)]),
  );

  const rows = sessions.map((s) => ({
    id: String(s._id),
    name: (s.name as string) || "(Untitled)",
    owner: s.userId ? ownerMap.get(s.userId as string) ?? "—" : "—",
    sets: (s.exercises as { sets?: { kg?: number; reps?: number; done?: boolean }[] }[]).reduce(
      (a, e) => a + (e.sets?.length ?? 0),
      0,
    ),
    xp: (s.xpAwarded as number) ?? 0,
    finishedAt: s.finishedAt
      ? new Date(s.finishedAt as Date).toLocaleString()
      : "—",
  }));

  return (
    <div>
      <header className="mb-8">
        <p className="text-[10px] font-extrabold tracking-widest text-white/45">
          ACTIVITY
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
          Sessions
        </h1>
        <p className="mt-2 text-[13px] text-white/55">
          {sessions.length} logged workouts (latest 500).
        </p>
      </header>
      <SimpleTable
        rows={rows}
        deleteEndpoint="/api/sessions"
        editBase="/sessions"
        columns={[
          { key: "name", label: "Name" },
          { key: "owner", label: "Owner" },
          { key: "sets", label: "Sets" },
          { key: "xp", label: "XP" },
          { key: "finishedAt", label: "Finished" },
        ]}
      />
    </div>
  );
}
