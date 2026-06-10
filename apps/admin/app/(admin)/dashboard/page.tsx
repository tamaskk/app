import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { WorkoutSessionModel } from "@/lib/models/WorkoutSession";
import { TrainingModel } from "@/lib/models/Training";
import { ContactMessageModel } from "@/lib/models/ContactMessage";
import { BlogPostModel } from "@/lib/models/BlogPost";
import { ChangelogEntryModel } from "@/lib/models/ChangelogEntry";
import { NewsletterSubscriberModel } from "@/lib/models/NewsletterSubscriber";
import { rankForXp } from "@/lib/rank";

// Server component — runs on every page load (no caching) so the numbers
// are always current. For a heavier deployment we'd cache the aggregate
// queries with revalidate, but at this scale a direct count is fine.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await connectToDatabase();

  const [
    userCount,
    sessionCount,
    trainingCount,
    contactNewCount,
    blogPosts,
    changelogEntries,
    newsletterActive,
    topByXp,
    recentSessions,
    recentContact,
  ] = await Promise.all([
    UserModel.countDocuments({}),
    WorkoutSessionModel.countDocuments({}),
    TrainingModel.countDocuments({}),
    ContactMessageModel.countDocuments({ status: "new" }),
    BlogPostModel.countDocuments({}),
    ChangelogEntryModel.countDocuments({}),
    NewsletterSubscriberModel.countDocuments({ status: "active" }),
    UserModel.find({}).sort({ xp: -1 }).limit(5).lean(),
    WorkoutSessionModel.find({})
      .sort({ finishedAt: -1 })
      .limit(5)
      .select("name finishedAt exercises userId")
      .lean(),
    ContactMessageModel.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email subject createdAt status")
      .lean(),
  ]);

  // Sum total XP awarded across all users — quick health metric.
  const xpAgg = await UserModel.aggregate([
    { $group: { _id: null, total: { $sum: "$xp" } } },
  ]);
  const totalXp = xpAgg[0]?.total ?? 0;

  return (
    <div>
      <header className="mb-10">
        <p className="text-[10px] font-extrabold tracking-widest text-white/45">
          OVERVIEW
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
          Dashboard
        </h1>
        <p className="mt-2 text-[13px] text-white/55">
          Live counts pulled from MongoDB on every load. No caching.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-7">
        <Stat label="Users" value={userCount} />
        <Stat label="Sessions" value={sessionCount} />
        <Stat label="Trainings" value={trainingCount} />
        <Stat label="Total XP" value={totalXp} compact />
        <Stat label="Subscribers" value={newsletterActive} />
        <Stat label="Blog posts" value={blogPosts} />
        <Stat label="Changelog" value={changelogEntries} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel
          title="Top by XP"
          empty={topByXp.length === 0 ? "No users yet." : undefined}
        >
          {topByXp.map((u, i) => (
            <Row
              key={String(u._id)}
              left={`${i + 1}. ${(u.username as string | null) || (u.name as string | null) || (u.email as string)}`}
              right={`${formatNumber(u.xp ?? 0)} XP · ${
                rankForXp(u.xp ?? 0).numeral
              }`}
            />
          ))}
        </Panel>

        <Panel
          title="Recent sessions"
          empty={recentSessions.length === 0 ? "Nothing logged yet." : undefined}
        >
          {recentSessions.map((s) => {
            const sets = (
              s.exercises as { sets?: unknown[] }[] | undefined
            )?.reduce((a, e) => a + (e.sets?.length ?? 0), 0) ?? 0;
            return (
              <Row
                key={String(s._id)}
                left={(s.name as string) || "Untitled"}
                right={`${sets} set · ${fmtDate(s.finishedAt as Date | null | undefined)}`}
              />
            );
          })}
        </Panel>

        <Panel
          title="Recent contact"
          badge={contactNewCount > 0 ? `${contactNewCount} new` : undefined}
          empty={recentContact.length === 0 ? "Inbox is empty." : undefined}
        >
          {recentContact.map((m) => (
            <Row
              key={String(m._id)}
              left={`${m.name as string} · ${(m.subject as string) || "(no subject)"}`}
              right={`${m.status as string} · ${fmtDate(m.createdAt as Date)}`}
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="text-[10px] font-extrabold tracking-widest text-white/45">
        {label.toUpperCase()}
      </p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-white">
        {compact ? formatNumber(value) : value}
      </p>
    </div>
  );
}

function Panel({
  title,
  badge,
  empty,
  children,
}: {
  title: string;
  badge?: string;
  empty?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-extrabold tracking-widest text-white/45">
          {title.toUpperCase()}
        </p>
        {badge && (
          <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-extrabold tracking-widest text-black">
            {badge.toUpperCase()}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {empty ? (
          <p className="text-[13px] text-white/40">{empty}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.04] pb-2 last:border-0">
      <span className="truncate text-[13px] text-white/85">{left}</span>
      <span className="shrink-0 text-[11px] font-bold tracking-tight text-white/45">
        {right}
      </span>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
