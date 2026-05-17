// src/models/Otp.ts
// One-time codes stored hashed-at-rest; cleartext only ever leaves via email.
// TTL drops expired rows automatically.

import mongoose, { Schema, type Document, type Model } from "mongoose";
import { createHash } from "crypto";

export type OtpPurpose =
  | "auth_login"
  | "auth_signup"
  | "password_reset"
  | "transfer_confirm"
  | "high_value_step_up";

export interface IOtp extends Document {
  identifier: string;             // email or user id
  purpose: OtpPurpose;
  codeHash: string;               // sha256(code)
  attempts: number;
  consumedAt?: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    identifier: { type: String, required: true, index: true },
    purpose: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

OtpSchema.index({ identifier: 1, purpose: 1, createdAt: -1 });
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export function hashOtp(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

const Otp: Model<IOtp> =
  (mongoose.models.Otp as Model<IOtp>) || mongoose.model<IOtp>("Otp", OtpSchema);
export default Otp;
