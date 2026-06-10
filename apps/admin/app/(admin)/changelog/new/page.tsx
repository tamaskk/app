import { ChangelogEditor } from "@/components/ChangelogEditor";

export default function NewChangelogEntryPage() {
  return (
    <div>
      <header className="mb-8">
        <p className="text-[10px] font-extrabold tracking-widest text-white/45">
          NEW ENTRY
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
          New changelog entry
        </h1>
      </header>
      <ChangelogEditor mode="create" />
    </div>
  );
}
