import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import { BlogPostModel } from "@/lib/models/BlogPost";
import {
  MarketingShell,
  PageHeading,
} from "../components/landing/MarketingShell";

// Re-render on every request — admin publishes don't need to wait for
// a build to land.
export const dynamic = "force-dynamic";

export default async function BlogPage() {
  await connectToDatabase();
  const posts = await BlogPostModel.find({ published: true })
    .sort({ publishedAt: -1 })
    .select("slug title excerpt author publishedAt")
    .lean();

  return (
    <MarketingShell>
      <section className="relative px-6 pb-24 pt-36 md:pt-44">
        <div className="mx-auto max-w-3xl">
          <PageHeading
            eyebrow="THE BLOG"
            line1="Notes on"
            accent="getting strong."
            subtitle="Methodology, engineering write-ups, deep dives on RPE and progressive overload."
          />

          <div className="mt-20 space-y-4">
            {posts.length === 0 ? (
              <EmptyState />
            ) : (
              posts.map((p) => (
                <PostRow
                  key={String(p._id)}
                  slug={p.slug as string}
                  title={p.title as string}
                  excerpt={(p.excerpt as string) || ""}
                  author={(p.author as string) || "HEFTOR"}
                  publishedAt={p.publishedAt as Date}
                />
              ))
            )}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

function PostRow({
  slug,
  title,
  excerpt,
  author,
  publishedAt,
}: {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  publishedAt: Date;
}) {
  return (
    <Link
      href={`/blog/${slug}`}
      className="block rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-xl transition-colors hover:bg-white/[0.04] md:p-8"
    >
      <p className="text-[10px] font-extrabold tracking-widest text-white/45">
        {new Date(publishedAt)
          .toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
          .toUpperCase()}{" "}
        · {author.toUpperCase()}
      </p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
        {title}
      </h2>
      {excerpt && (
        <p className="mt-3 text-[14px] leading-relaxed text-white/65">
          {excerpt}
        </p>
      )}
      <p className="mt-4 text-[12px] font-bold tracking-tight text-white/70">
        Read post →
      </p>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-white/[0.08] bg-white/[0.02] px-8 py-20 text-center backdrop-blur-xl">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/[0.04]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h16M4 12h16M4 17h10"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h2
        className="mt-6 text-4xl tracking-tight text-white md:text-5xl"
        style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
      >
        Coming soon.
      </h2>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/55">
        We&apos;re writing. Check back shortly — the first post lands as
        soon as it&apos;s ready.
      </p>
    </div>
  );
}
