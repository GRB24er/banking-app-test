// src/models/AdminEmail.ts
// Every admin-composed email is logged here for compliance + searching.

import mongoose, { Schema, type Document, type Model } from "mongoose";

export type AdminEmailStatus = "queued" | "sent" | "failed" | "bounced";

export interface IAdminEmail extends Document {
  recipientEmail: string;
  recipientUserId?: mongoose.Types.ObjectId | null;
  subject: string;
  bodyPreview: string;            // first ~200 chars of the text body
  bodyHtml: string;
  bodyText: string;
  tag?: string;                   // optional "category chip" shown in compose UI
  ctaLabel?: string;
  ctaUrl?: string;
  signature?: { name: string; title?: string; department?: string };
  status: AdminEmailStatus;
  messageId?: string;
  errorReason?: string;
  sentBy: mongoose.Types.ObjectId;
  sentByEmail?: string;
  createdAt: Date;
  sentAt?: Date | null;
}

const AdminEmailSchema = new Schema<IAdminEmail>(
  {
    recipientEmail: { type: String, required: true, lowercase: true, index: true },
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    subject: { type: String, required: true, index: "text" },
    bodyPreview: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    bodyText: { type: String, required: true },
    tag: String,
    ctaLabel: String,
    ctaUrl: String,
    signature: {
      name: String,
      title: String,
      department: String,
    },
    status: { type: String, enum: ["queued", "sent", "failed", "bounced"], default: "queued", index: true },
    messageId: String,
    errorReason: String,
    sentBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sentByEmail: String,
    sentAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AdminEmailSchema.index({ subject: "text", recipientEmail: 1 });
AdminEmailSchema.index({ createdAt: -1 });

const AdminEmail: Model<IAdminEmail> =
  (mongoose.models.AdminEmail as Model<IAdminEmail>) ||
  mongoose.model<IAdminEmail>("AdminEmail", AdminEmailSchema);
export default AdminEmail;
