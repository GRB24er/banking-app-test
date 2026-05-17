// src/models/IdempotencyKey.ts
//
// Stores the response we returned the *first* time a given Idempotency-Key
// was used so we can replay it deterministically. Body hash of the original
// request is kept to detect collisions: re-using the same key with a
// different payload is a client bug and must be surfaced as 422.

import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IIdempotencyKey extends Document {
  key: string;
  scope: string;                 // e.g. "POST /api/transfers/internal"
  userId?: mongoose.Types.ObjectId | null;
  requestHash: string;           // sha256 of canonicalised request body
  status: "in_flight" | "completed" | "failed";
  responseStatus?: number;
  responseBody?: any;
  createdAt: Date;
  completedAt?: Date | null;
  expiresAt: Date;               // TTL drops it after 24h
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    key: { type: String, required: true },
    scope: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    requestHash: { type: String, required: true },
    status: {
      type: String,
      enum: ["in_flight", "completed", "failed"],
      default: "in_flight",
      required: true,
    },
    responseStatus: { type: Number },
    responseBody: { type: Schema.Types.Mixed },
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// One row per (scope, key). Allows the same key in different scopes without
// collision.
IdempotencyKeySchema.index({ scope: 1, key: 1 }, { unique: true });
// TTL — Mongo drops the row after expiresAt.
IdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const IdempotencyKey: Model<IIdempotencyKey> =
  (mongoose.models.IdempotencyKey as Model<IIdempotencyKey>) ||
  mongoose.model<IIdempotencyKey>("IdempotencyKey", IdempotencyKeySchema);

export default IdempotencyKey;
