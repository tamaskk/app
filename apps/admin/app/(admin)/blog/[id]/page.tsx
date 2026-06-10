import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { BlogPostModel } from "@/lib/models/BlogPost";
import { BlogEditor } from "@/components/BlogEditor";

export const dynamic = "force-dynamic";

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectToDatabase();
  const post = await BlogPostModel.findById(id).lean();
  if (!post) return notFound();

  return (
    <div>
      <header className="mb-8">
        <p className="text-[10px] font-extrabold tracking-widest text-white/45">
          EDIT POST
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
          {post.title as string}
        </h1>
      </header>
      <BlogEditor
        mode="edit"
        initial={{
          id: String(post._id),
          slug: post.slug as string,
          title: post.title as string,
          excerpt: (post.excerpt as string) ?? "",
          content: post.content as string,
          author: (post.author as string) ?? "HEFTOR",
          published: post.published as boolean,
        }}
      />
    </div>
  );
}
