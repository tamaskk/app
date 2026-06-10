import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

// Duplicate of apps/web/lib/models/NewsletterSubscriber.ts — kept in sync so
// the admin app can run independently from the web app. Both connect to the
// same MongoDB collection.
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
    source: { type: String, default: "footer", trim: true, maxlength: 60 },
    status: {
      type: String,
      enum: ["active", "unsubscribed", "bounced"],
      default: "active",
      index: true,
    },
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
