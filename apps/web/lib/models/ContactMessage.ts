import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

// Inbound message from the public /contact page. Stored even when no email
// reply is wired up yet, so the inbox is browseable in the database while
// outbound mail is still being set up (see lib/mailer.ts).
const ContactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
    },
    subject: { type: String, default: "", trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    // Best-effort source metadata for triage and abuse review. Optional —
    // a proxied request may not carry an IP, and bots can spoof UA.
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    // Status the support team can flip when the message is dealt with.
    status: {
      type: String,
      enum: ["new", "read", "archived", "spam"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true },
);

export type ContactMessage = InferSchemaType<typeof ContactMessageSchema>;

if (process.env.NODE_ENV !== "production" && models.ContactMessage) {
  mongoose.deleteModel("ContactMessage");
}

export const ContactMessageModel =
  (models.ContactMessage as mongoose.Model<ContactMessage>) ??
  model<ContactMessage>("ContactMessage", ContactMessageSchema);
