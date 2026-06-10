import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import { ChangelogEntryModel } from "@/lib/models/ChangelogEntry";
import { ChangelogTable } from "@/components/ChangelogTable";

export const dynamic = "force-dynamic";

export default async function ChangelogIndexPage() {
  await connectToDatabase();
  const entries = await ChangelogEntryModel.find({})
    .sort({ releasedAt: -1, createdAt: -1 })
    .lean();

  const rows = entries.map((e) => ({
    id: String(e._id),
    version: e.version as string,
    title: (e.title as string) || "",
    changes: (e.changes as { type?: string; text?: string }[]).length,
    published: e.published as boolean,
    releasedAt: e.releasedAt
      ? new Date(e.releasedAt as Date).toLocaleDateString()
      : "—",
  }));

  return (
    <div>
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-extrabold tracking-widest text-white/45">
            RELEASES
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
            Changelog
          </h1>
          <p className="mt-2 text-[13px] text-white/55">
            {entries.length} entries. Drafts stay hidden.
          </p>
        </div>
        <Link
          href="/changelog/new"
          className="cursor-pointer rounded-full bg-white px-5 py-2.5 text-[12px] font-bold tracking-tight text-black hover:bg-white/90"
        >
          + New entry
        </Link>
      </header>
      <ChangelogTable rows={rows} />
    </div>
  );
}
