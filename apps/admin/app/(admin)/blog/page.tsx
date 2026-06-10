import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import { BlogPostModel } from "@/lib/models/BlogPost";
import { BlogTable } from "@/components/BlogTable";

export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  await connectToDatabase();
  const posts = await BlogPostModel.find({})
    .sort({ updatedAt: -1 })
    .lean();

  const rows = posts.map((p) => ({
    id: String(p._id),
    slug: p.slug as string,
    title: p.title as string,
    author: (p.author as string) || "",
    published: p.published as boolean,
    publishedAt: p.publishedAt
      ? new Date(p.publishedAt as Date).toLocaleDateString()
      : "—",
    updated: new Date(p.updatedAt as Date).toLocaleDateString(),
  }));

  return (
    <div>
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-extrabold tracking-widest text-white/45">
            CONTENT
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
            Blog
          </h1>
          <p className="mt-2 text-[13px] text-white/55">
            {posts.length} posts. Drafts stay invisible on the public site.
          </p>
        </div>
        <Link
          href="/blog/new"
          className="cursor-pointer rounded-full bg-white px-5 py-2.5 text-[12px] font-bold tracking-tight text-black transition-colors hover:bg-white/90"
        >
          + New post
        </Link>
      </header>
      <BlogTable rows={rows} />
    </div>
  );
}
