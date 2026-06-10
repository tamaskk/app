import mongoose, {
  Schema,
  model,
  models,
  type InferSchemaType,
} from "mongoose";

// One row per release. Public `/changelog` page on apps/web pulls published
// entries sorted by `releasedAt` descending.
const ChangeSchema = new Schema(
  {
    // What kind of change this line describes — drives the color/dot accent
    // when we render it on the public page.
    type: {
      type: String,
      enum: ["feature", "fix", "improvement", "chore"],
      default: "feature",
    },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false },
);

const ChangelogEntrySchema = new Schema(
  {
    // Semver tag — "1.4.0", "0.9.1", etc. Unique so duplicates can't slip in.
    version: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: { type: String, default: "", trim: true, maxlength: 200 },
    summary: { type: String, default: "", trim: true, maxlength: 600 },
    changes: { type: [ChangeSchema], default: [] },
    published: { type: Boolean, default: false, index: true },
    releasedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type ChangelogEntry = InferSchemaType<typeof ChangelogEntrySchema>;

if (process.env.NODE_ENV !== "production" && models.ChangelogEntry) {
  mongoose.deleteModel("ChangelogEntry");
}

export const ChangelogEntryModel =
  (models.ChangelogEntry as mongoose.Model<ChangelogEntry>) ??
  model<ChangelogEntry>("ChangelogEntry", ChangelogEntrySchema);
