// src/models/AccountRestriction.ts
// Freeze / block / closure rows are immutable once issued. A row gets
// `liftedAt` populated when an admin lifts it; we never delete history.

import mongoose, { Schema, type Document, type Model } from "mongoose";

export type RestrictionKind = "freeze" | "block" | "close";

export type RestrictionScope = "all" | "checking" | "savings" | "investment";

export type RestrictionReason =
  | "aml_review" | "fraud_suspected" | "court_order" | "sanctions_hit"
  | "kyc_lapsed" | "deceased" | "regulatory_request" | "duplicate_account"
  | "chargeback_dispute" | "customer_request" | "compliance_review" | "other";

export interface IAccountRestriction extends Document {
  userId: mongoose.Types.ObjectId;
  kind: RestrictionKind;
  scope: RestrictionScope;
  reason: RestrictionReason;
  reasonDetail?: string;
  reference: string;             // human-readable e.g. "RES-2026-000123"
  effectiveAt: Date;
  effectiveUntil?: Date | null;
  liftedAt?: Date | null;
  liftedBy?: mongoose.Types.ObjectId | null;
  liftReason?: string;
  supersededBy?: mongoose.Types.ObjectId | null;
  supersedes?: mongoose.Types.ObjectId | null;
  issuedBy: mongoose.Types.ObjectId;
  notifiedAt?: Date | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AccountRestrictionSchema = new Schema<IAccountRestriction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["freeze", "block", "close"], required: true, index: true },
    scope: { type: String, enum: ["all", "checking", "savings", "investment"], required: true, default: "all" },
    reason: {
      type: String,
      enum: [
        "aml_review", "fraud_suspected", "court_order", "sanctions_hit",
        "kyc_lapsed", "deceased", "regulatory_request", "duplicate_account",
        "chargeback_dispute", "customer_request", "compliance_review", "other",
      ],
      required: true,
    },
    reasonDetail: String,
    reference: { type: String, required: true, unique: true, index: true },
    effectiveAt: { type: Date, required: true, default: () => new Date() },
    effectiveUntil: { type: Date, default: null },
    liftedAt: { type: Date, default: null, index: true },
    liftedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    liftReason: String,
    supersededBy: { type: Schema.Types.ObjectId, ref: "AccountRestriction", default: null },
    supersedes: { type: Schema.Types.ObjectId, ref: "AccountRestriction", default: null },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notifiedAt: { type: Date, default: null },
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true },
);

AccountRestrictionSchema.index({ userId: 1, liftedAt: 1 });
AccountRestrictionSchema.index({ userId: 1, scope: 1, liftedAt: 1 });

const AccountRestriction: Model<IAccountRestriction> =
  (mongoose.models.AccountRestriction as Model<IAccountRestriction>) ||
  mongoose.model<IAccountRestriction>("AccountRestriction", AccountRestrictionSchema);
export default AccountRestriction;
