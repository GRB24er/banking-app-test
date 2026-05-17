// src/models/AuditLog.ts
// Immutable audit trail. Append-only — never updateOne / deleteOne.

import mongoose, { Schema, type Document, type Model } from "mongoose";

export type AuditOutcome = "success" | "failure" | "blocked" | "warning";

export interface IAuditLog extends Document {
  actor: { kind: "user" | "admin" | "system"; id?: mongoose.Types.ObjectId | string; email?: string };
  action: string;                                  // e.g. "transfer.wire.initiate"
  target?: { kind: string; id?: string; reference?: string };
  ip?: string;
  userAgent?: string;
  requestId?: string;
  outcome: AuditOutcome;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actor: {
      kind: { type: String, enum: ["user", "admin", "system"], required: true },
      id: { type: Schema.Types.Mixed, index: true },
      email: { type: String },
    },
    action: { type: String, required: true, index: true },
    target: {
      kind: { type: String },
      id: { type: String, index: true },
      reference: { type: String, index: true },
    },
    ip: { type: String },
    userAgent: { type: String },
    requestId: { type: String, index: true },
    outcome: { type: String, enum: ["success", "failure", "blocked", "warning"], required: true, index: true },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AuditLogSchema.index({ "actor.id": 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog: Model<IAuditLog> =
  (mongoose.models.AuditLog as Model<IAuditLog>) ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
export default AuditLog;
