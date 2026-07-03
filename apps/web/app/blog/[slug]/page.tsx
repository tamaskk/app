import Link from "next/link";
import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { BlogPostModel } from "@/lib/models/BlogPost";
import { MarketingShell } from "../../components/landing/MarketingShell";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connectToDatabase();
  const post = await BlogPostModel.findOne({ slug, published: true }).lean();
  if (!post) return notFound();

  return (
    <MarketingShell>
      <article className="relative mx-auto max-w-3xl px-6 pb-24 pt-36 md:pt-44">
        <Link
          href="/blog"
          className="text-[12px] font-bold tracking-tight text-white/55 transition-colors hover:text-white"
        >
          ← All posts
        </Link>

        <p className="mt-10 text-[11px] font-extrabold tracking-widest text-white/45">
          {new Date(post.publishedAt as Date)
            .toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
            .toUpperCase()}{" "}
          · {((post.author as string) || "HEFTOR").toUpperCase()}
        </p>
        <h1 className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-tight text-white md:text-6xl">
          {post.title as string}
        </h1>

        <div className="mt-12 whitespace-pre-wrap text-[16px] leading-relaxed text-white/80">
          {post.content as string}
        </div>
      </article>
    </MarketingShell>
  );
}
