import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { ChangelogEntryModel } from "@/lib/models/ChangelogEntry";
import { ChangelogEditor } from "@/components/ChangelogEditor";

export const dynamic = "force-dynamic";

export default async function EditChangelogEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectToDatabase();
  const entry = await ChangelogEntryModel.findById(id).lean();
  if (!entry) return notFound();

  return (
    <div>
      <header className="mb-8">
        <p className="text-[10px] font-extrabold tracking-widest text-white/45">
          EDIT ENTRY
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
          {entry.version as string}
        </h1>
      </header>
      <ChangelogEditor
        mode="edit"
        initial={{
          id: String(entry._id),
          version: entry.version as string,
          title: (entry.title as string) ?? "",
          summary: (entry.summary as string) ?? "",
          changes: (entry.changes as { type: string; text: string }[]).map(
            (c) => ({ type: c.type, text: c.text }),
          ),
          published: entry.published as boolean,
        }}
      />
    </div>
  );
}
