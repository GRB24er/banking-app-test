// src/models/RateLimit.ts
// Sliding-window counter rows keyed by (policy, identifier). TTL drops
// expired buckets so the collection stays small.

import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IRateLimit extends Document {
  policy: string;
  identifier: string;
  windowStart: Date;
  count: number;
  expiresAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>(
  {
    policy: { type: String, required: true },
    identifier: { type: String, required: true },
    windowStart: { type: Date, required: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false },
);

RateLimitSchema.index({ policy: 1, identifier: 1, windowStart: 1 }, { unique: true });
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimit: Model<IRateLimit> =
  (mongoose.models.RateLimit as Model<IRateLimit>) ||
  mongoose.model<IRateLimit>("RateLimit", RateLimitSchema);
export default RateLimit;
