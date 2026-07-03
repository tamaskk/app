import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

// One row per email address that asked to hear from us via the footer form
// (or, later, a dedicated marketing endpoint). Status is admin-flippable so
// bounces and unsubs can be triaged without deleting the row — keeping the
// record around prevents accidental re-add after the user explicitly opted
// out.
const NewsletterSubscriberSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      maxlength: 200,
    },
    // Where the subscribe came from. Free-form string so we can add more
    // surfaces (about page, dashboard, etc.) without a migration.
    source: { type: String, default: "footer", trim: true, maxlength: 60 },
    status: {
      type: String,
      enum: ["active", "unsubscribed", "bounced"],
      default: "active",
      index: true,
    },
    // Best-effort metadata for abuse review.
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true },
);

export type NewsletterSubscriber = InferSchemaType<
  typeof NewsletterSubscriberSchema
>;

if (process.env.NODE_ENV !== "production" && models.NewsletterSubscriber) {
  mongoose.deleteModel("NewsletterSubscriber");
}

export const NewsletterSubscriberModel =
  (models.NewsletterSubscriber as mongoose.Model<NewsletterSubscriber>) ??
  model<NewsletterSubscriber>(
    "NewsletterSubscriber",
    NewsletterSubscriberSchema,
  );
