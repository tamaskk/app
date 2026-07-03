import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import { ChangelogEntryModel } from "@/lib/models/ChangelogEntry";
import {
  MarketingShell,
  PageHeading,
} from "../components/landing/MarketingShell";

export const dynamic = "force-dynamic";

export default async function ChangelogPage() {
  await connectToDatabase();
  const entries = await ChangelogEntryModel.find({ published: true })
    .sort({ releasedAt: -1 })
    .lean();

  return (
    <MarketingShell>
      <section className="relative px-6 pb-24 pt-36 md:pt-44">
        <div className="mx-auto max-w-3xl">
          <PageHeading
            eyebrow="CHANGELOG"
            line1="What we"
            accent="shipped."
            subtitle="Every release, line by line. Dated, signed, indexed for the search-curious."
          />

          <div className="mt-20 space-y-10">
            {entries.length === 0 ? (
              <EmptyState />
            ) : (
              entries.map((e) => (
                <EntryBlock
                  key={String(e._id)}
                  version={e.version as string}
                  title={(e.title as string) || ""}
                  summary={(e.summary as string) || ""}
                  changes={e.changes as { type: string; text: string }[]}
                  releasedAt={e.releasedAt as Date}
                />
              ))
            )}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

function EntryBlock({
  version,
  title,
  summary,
  changes,
  releasedAt,
}: {
  version: string;
  title: string;
  summary: string;
  changes: { type: string; text: string }[];
  releasedAt: Date;
}) {
  return (
    <article className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-xl md:p-8">
      <header className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
        <div>
          <p className="text-[10px] font-extrabold tracking-widest text-white/45">
            V{version}
          </p>
          {title && (
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              {title}
            </h2>
          )}
        </div>
        <p className="text-[12px] tracking-widest text-white/40">
          {new Date(releasedAt)
            .toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
            .toUpperCase()}
        </p>
      </header>

      {summary && (
        <p className="mt-4 text-[14px] leading-relaxed text-white/65">
          {summary}
        </p>
      )}

      {changes.length > 0 && (
        <ul className="mt-6 space-y-2">
          {changes.map((c, i) => (
            <li key={i} className="flex items-start gap-3 text-[13px] text-white/85">
              <TypeBadge type={c.type} />
              <span className="leading-relaxed">{c.text}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function TypeBadge({ type }: { type: string }) {
  const label = type.toUpperCase();
  const cls =
    type === "fix"
      ? "border-white/30 text-white"
      : type === "feature"
        ? "bg-white text-black border-white"
        : type === "improvement"
          ? "border-white/20 text-white/80"
          : "border-white/10 text-white/40";
  return (
    <span
      className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-extrabold tracking-widest ${cls}`}
    >
      {label}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-white/[0.08] bg-white/[0.02] px-8 py-20 text-center backdrop-blur-xl">
      <h2
        className="text-4xl tracking-tight text-white md:text-5xl"
        style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
      >
        On its way.
      </h2>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/55">
        First public release notes are landing soon.
      </p>
      <Link
        href="/#download"
        className="mt-8 inline-block cursor-pointer rounded-full bg-white px-7 py-3 text-[13px] font-bold tracking-tight text-black"
      >
        Get the app →
      </Link>
    </div>
  );
}
