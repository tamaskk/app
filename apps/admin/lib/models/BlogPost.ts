import mongoose, {
  Schema,
  model,
  models,
  type InferSchemaType,
} from "mongoose";

// Public blog post. Written in markdown so the admin form stays a textarea.
// The public `/blog` page on apps/web pulls published posts directly from
// this collection — same shape applies on both sides.
const BlogPostSchema = new Schema(
  {
    // URL slug. Unique, kebab-cased, no leading/trailing dashes.
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    excerpt: { type: String, default: "", trim: true, maxlength: 500 },
    content: { type: String, required: true },
    author: { type: String, default: "HEFTOR", trim: true, maxlength: 80 },
    // `published` toggles whether the post shows on the public listing.
    // `publishedAt` is set the first time `published` flips true and frozen
    // afterwards so reordering doesn't randomise the timeline.
    published: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type BlogPost = InferSchemaType<typeof BlogPostSchema>;

if (process.env.NODE_ENV !== "production" && models.BlogPost) {
  mongoose.deleteModel("BlogPost");
}

export const BlogPostModel =
  (models.BlogPost as mongoose.Model<BlogPost>) ??
  model<BlogPost>("BlogPost", BlogPostSchema);
