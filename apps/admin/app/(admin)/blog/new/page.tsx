import { BlogEditor } from "@/components/BlogEditor";

export default function NewBlogPostPage() {
  return (
    <div>
      <header className="mb-8">
        <p className="text-[10px] font-extrabold tracking-widest text-white/45">
          NEW POST
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
          New blog post
        </h1>
      </header>
      <BlogEditor mode="create" />
    </div>
  );
}
