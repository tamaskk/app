import { connectToDatabase } from "@/lib/mongodb";
import { TrainingModel } from "@/lib/models/Training";
import { SimpleTable } from "@/components/SimpleTable";

export const dynamic = "force-dynamic";

export default async function TrainingsPage() {
  await connectToDatabase();

  const trainings = await TrainingModel.find({})
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const rows = trainings.map((t) => {
    const exercises = t.exercises as { sets?: unknown[] }[];
    return {
      id: String(t._id),
      name: (t.name as string) || "(Untitled)",
      source: (t.source as string) || "manual",
      exercises: exercises.length,
      sets: exercises.reduce((a, e) => a + (e.sets?.length ?? 0), 0),
      doneAt: t.doneAt ? new Date(t.doneAt as Date).toLocaleDateString() : "—",
      created: new Date(t.createdAt as Date).toLocaleDateString(),
    };
  });

  return (
    <div>
      <header className="mb-8">
        <p className="text-[10px] font-extrabold tracking-widest text-white/45">
          PLANS
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
          Trainings
        </h1>
        <p className="mt-2 text-[13px] text-white/55">
          {trainings.length} saved trainings (latest 500). Includes both
          manually created and generator output.
        </p>
      </header>
      <SimpleTable
        rows={rows}
        deleteEndpoint="/api/trainings"
        columns={[
          { key: "name", label: "Name" },
          { key: "source", label: "Source" },
          { key: "exercises", label: "Exercises" },
          { key: "sets", label: "Sets" },
          { key: "doneAt", label: "Last done" },
          { key: "created", label: "Created" },
        ]}
      />
    </div>
  );
}
