// src/models/KycCase.ts
//
// KYC review case. PII fields are encrypted at rest (encryptPII / decryptPII).
// State machine: not_started → info_pending → documents_pending → in_review
//                → approved | rejected | expired
// Tiers: tier_0 (default) → tier_1 (domestic ACH ≤$10k)
//         → tier_2 (domestic wire) → tier_3 (international wire)

import mongoose, { Schema, type Document, type Model } from "mongoose";

export type KycState =
  | "not_started"
  | "info_pending"
  | "documents_pending"
  | "in_review"
  | "approved"
  | "rejected"
  | "expired";

export type KycTier = "tier_0" | "tier_1" | "tier_2" | "tier_3";

export interface KycDocument {
  kind: "passport" | "national_id" | "drivers_license" | "utility_bill" | "bank_statement" | "selfie";
  storageKey?: string;            // s3 / blob key
  uploadedAt: Date;
  meta?: Record<string, unknown>;
}

export interface IKycCase extends Document {
  userId: mongoose.Types.ObjectId;
  state: KycState;
  tier: KycTier;
  // Encrypted PII (ciphertext strings — use lib/crypto.ts)
  legalNameEnc?: string;
  dobEnc?: string;
  ssnEnc?: string;
  ssnSearchHash?: string;
  addressLine1Enc?: string;
  addressLine2Enc?: string;
  cityEnc?: string;
  postalCodeEnc?: string;
  countryCode?: string;           // not encrypted — needed for sanctions screen
  occupation?: string;
  sourceOfFunds?: string;
  documents: KycDocument[];
  sanctionsResult?: { tier: "clear" | "warning" | "hit"; reasons: string[] };
  decision?: { by: mongoose.Types.ObjectId; at: Date; outcome: "approved" | "rejected"; reason?: string; awardedTier?: KycTier };
  submittedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const KycCaseSchema = new Schema<IKycCase>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    state: {
      type: String,
      enum: ["not_started", "info_pending", "documents_pending", "in_review", "approved", "rejected", "expired"],
      default: "not_started",
      index: true,
    },
    tier: { type: String, enum: ["tier_0", "tier_1", "tier_2", "tier_3"], default: "tier_0", index: true },

    legalNameEnc: String,
    dobEnc: String,
    ssnEnc: String,
    ssnSearchHash: { type: String, index: true, sparse: true },
    addressLine1Enc: String,
    addressLine2Enc: String,
    cityEnc: String,
    postalCodeEnc: String,
    countryCode: { type: String, uppercase: true, minlength: 2, maxlength: 2 },
    occupation: String,
    sourceOfFunds: String,

    documents: [{
      kind: { type: String, enum: ["passport", "national_id", "drivers_license", "utility_bill", "bank_statement", "selfie"], required: true },
      storageKey: String,
      uploadedAt: { type: Date, default: () => new Date() },
      meta: Schema.Types.Mixed,
    }],

    sanctionsResult: {
      tier: { type: String, enum: ["clear", "warning", "hit"] },
      reasons: [String],
    },
    decision: {
      by: { type: Schema.Types.ObjectId, ref: "User" },
      at: Date,
      outcome: { type: String, enum: ["approved", "rejected"] },
      reason: String,
      awardedTier: { type: String, enum: ["tier_0", "tier_1", "tier_2", "tier_3"] },
    },
    submittedAt: Date,
    expiresAt: Date,
  },
  { timestamps: true },
);

const KycCase: Model<IKycCase> =
  (mongoose.models.KycCase as Model<IKycCase>) ||
  mongoose.model<IKycCase>("KycCase", KycCaseSchema);
export default KycCase;
