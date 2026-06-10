import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { BlogPostModel } from "@/lib/models/BlogPost";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: {
    slug?: string;
    title?: string;
    excerpt?: string;
    content?: string;
    author?: string;
    published?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const post = await BlogPostModel.findById(id);
    if (!post) return Response.json({ detail: "Not found" }, { status: 404 });

    if (typeof body.slug === "string") post.slug = body.slug.trim().toLowerCase();
    if (typeof body.title === "string") post.title = body.title.trim();
    if (typeof body.excerpt === "string") post.excerpt = body.excerpt.trim();
    if (typeof body.content === "string") post.content = body.content.trim();
    if (typeof body.author === "string") post.author = body.author.trim();
    if (typeof body.published === "boolean") {
      // Stamp publishedAt the first time the post goes live so the public
      // timeline is stable.
      if (body.published && !post.published && !post.publishedAt) {
        post.publishedAt = new Date();
      }
      post.published = body.published;
    }
    await post.save();
    return Response.json({ ok: true });
  } catch (err) {
    // Duplicate slug → 409
    const e = err as { code?: number };
    if (e && e.code === 11000) {
      return Response.json(
        { detail: "A post with this slug already exists" },
        { status: 409 },
      );
    }
    console.error("PATCH /api/blog/[id] failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await connectToDatabase();
    await BlogPostModel.findByIdAndDelete(id);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
