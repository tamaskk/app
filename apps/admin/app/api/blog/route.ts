import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { BlogPostModel } from "@/lib/models/BlogPost";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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

  const slug = (body.slug ?? "").trim().toLowerCase();
  const title = (body.title ?? "").trim();
  const content = (body.content ?? "").trim();
  if (!slug || !title || !content) {
    return Response.json(
      { detail: "slug, title and content are required" },
      { status: 422 },
    );
  }

  try {
    await connectToDatabase();
    const existing = await BlogPostModel.findOne({ slug }).lean();
    if (existing) {
      return Response.json(
        { detail: "A post with this slug already exists" },
        { status: 409 },
      );
    }
    const published = body.published === true;
    const doc = await BlogPostModel.create({
      slug,
      title,
      excerpt: (body.excerpt ?? "").trim(),
      content,
      author: (body.author ?? "HEFTOR").trim(),
      published,
      publishedAt: published ? new Date() : null,
    });
    return Response.json({ id: String(doc._id) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/blog failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}
