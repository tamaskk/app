import { connectToDatabase } from "@/lib/mongodb";
import { NewsletterSubscriberModel } from "@/lib/models/NewsletterSubscriber";
import { NewsletterTable } from "@/components/NewsletterTable";

export const dynamic = "force-dynamic";

export default async function NewsletterPage() {
  await connectToDatabase();

  const subs = await NewsletterSubscriberModel.find({})
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  const rows = subs.map((s) => ({
    id: String(s._id),
    email: s.email as string,
    source: (s.source as string) || "footer",
    status: (s.status as string) || "active",
    ip: (s.ip as string | null) ?? null,
    userAgent: (s.userAgent as string | null) ?? null,
    // Pre-formatted on the server with a fixed locale so the client renders
    // byte-identical strings (avoids hydration mismatches).
    createdAt: new Date(s.createdAt as Date).toISOString().slice(0, 10),
  }));

  const active = rows.filter((r) => r.status === "active").length;
  const unsub = rows.filter((r) => r.status === "unsubscribed").length;
  const bounced = rows.filter((r) => r.status === "bounced").length;

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold tracking-widest text-white/45">
            MAILING LIST
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
            Newsletter
          </h1>
          <p className="mt-2 text-[13px] text-white/55">
            {rows.length} total · {active} active · {unsub} unsubscribed ·{" "}
            {bounced} bounced.
          </p>
        </div>
      </header>
      <NewsletterTable rows={rows} />
    </div>
  );
}
