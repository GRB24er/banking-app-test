// src/models/LedgerEntry.ts
//
// Immutable double-entry journal. Every money movement is represented as
// ≥2 entries that sum to zero (Σ debits === Σ credits) within a single
// `transactionGroup`.  Entries are hash-chained: each row carries the hash
// of the previous row plus its own canonical content, so any tampering or
// deletion is detectable by replaying the chain.
//
// Account ids follow the convention:
//   user:<userId>:<accountType>            customer-held balance
//   bank:cash:<currency>                   bank's settlement cash
//   bank:fees:<currency>                   bank's fee income
//   bank:suspense:<currency>               unallocated funds (sanctions hold)
//   external:<rail>:<reference>            counterparty leg for outbound wires
//   ofac:hold:<currency>                   sanctions hold account
// Anything starting with `user:` mirrors to `User.balance` on commit.

import mongoose, { Schema, type Model, type Document } from "mongoose";
import { createHash } from "crypto";

export type LedgerSide = "debit" | "credit";

export interface ILedgerEntry extends Document {
  transactionGroup: string;      // groups all legs of a single business transaction
  transactionId?: mongoose.Types.ObjectId | null;
  account: string;               // "user:<id>:checking" etc.
  currency: string;              // ISO 4217 (uppercase)
  amountMinor: string;           // stored as decimal string (bigint-safe)
  side: LedgerSide;
  description?: string;
  reference?: string;
  sequence: number;              // monotonic, gap-free
  prevHash: string;              // sha256 of previous row, hex
  hash: string;                  // sha256 of canonical(this), hex
  metadata?: Record<string, unknown>;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId | null;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    transactionGroup: { type: String, required: true, index: true },
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction", default: null, index: true },
    account: { type: String, required: true, index: true },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 8 },
    amountMinor: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^\d+$/.test(v) && v !== "0",
        message: "amountMinor must be a positive integer string",
      },
    },
    side: { type: String, enum: ["debit", "credit"], required: true },
    description: { type: String },
    reference: { type: String, index: true },
    sequence: { type: Number, required: true, unique: true, index: true },
    prevHash: { type: String, required: true },
    hash: { type: String, required: true, unique: true },
    metadata: { type: Schema.Types.Mixed },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    // Once written, never modified. Mongoose can't actually enforce this
    // (Mongo allows updateOne regardless) so reconcile verifies the chain.
    minimize: false,
  },
);

LedgerEntrySchema.index({ transactionGroup: 1, side: 1 });
LedgerEntrySchema.index({ account: 1, createdAt: -1 });

// Canonicalise a row for hashing. Order matters: any change to this layout
// invalidates the entire chain, so do not reorder lightly.
export function canonicalizeEntry(e: {
  transactionGroup: string;
  account: string;
  currency: string;
  amountMinor: string;
  side: LedgerSide;
  sequence: number;
  prevHash: string;
  reference?: string;
}): string {
  return [
    e.sequence,
    e.transactionGroup,
    e.account,
    e.currency,
    e.amountMinor,
    e.side,
    e.reference ?? "",
    e.prevHash,
  ].join("|");
}

export function hashEntry(canonical: string): string {
  return createHash("sha256").update(canonical).digest("hex");
}

export const GENESIS_HASH = "0".repeat(64);

const LedgerEntry: Model<ILedgerEntry> =
  (mongoose.models.LedgerEntry as Model<ILedgerEntry>) ||
  mongoose.model<ILedgerEntry>("LedgerEntry", LedgerEntrySchema);

export default LedgerEntry;
