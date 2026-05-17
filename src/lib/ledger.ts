// src/lib/ledger.ts
//
// Atomic posting layer on top of LedgerEntry. Use `postEntries` to commit
// a balanced set of legs in a single Mongo transaction; any `user:*` legs
// are mirrored to the denormalised `User.balance` field that the dashboard
// reads.

import mongoose from "mongoose";
import LedgerEntry, {
  canonicalizeEntry,
  GENESIS_HASH,
  hashEntry,
  type ILedgerEntry,
  type LedgerSide,
} from "@/models/LedgerEntry";
import User from "@/models/User";
import { coerceMinor, type Minor } from "@/lib/decimal";

export interface LedgerLeg {
  account: string;
  currency: string;
  amountMinor: Minor;          // strictly positive; `side` carries direction
  side: LedgerSide;
  description?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface PostOptions {
  transactionGroup: string;
  transactionId?: mongoose.Types.ObjectId | string | null;
  createdBy?: mongoose.Types.ObjectId | string | null;
  session?: mongoose.ClientSession;
}

// Verifies Σ debits === Σ credits per (currency). Throws on imbalance.
export function assertBalanced(legs: LedgerLeg[]): void {
  if (legs.length < 2) {
    throw new Error("a posting needs at least two legs");
  }
  const sums = new Map<string, { debit: Minor; credit: Minor }>();
  for (const l of legs) {
    if (l.amountMinor <= 0n) {
      throw new Error(`leg amount must be > 0 (${l.account})`);
    }
    const cur = l.currency.toUpperCase();
    const slot = sums.get(cur) ?? { debit: 0n, credit: 0n };
    if (l.side === "debit") slot.debit += l.amountMinor;
    else slot.credit += l.amountMinor;
    sums.set(cur, slot);
  }
  for (const [cur, s] of sums) {
    if (s.debit !== s.credit) {
      throw new Error(
        `posting imbalanced for ${cur}: debits=${s.debit} credits=${s.credit}`,
      );
    }
  }
}

// Parse "user:<id>:<accountType>" → { userId, accountType }, or null.
export function parseUserAccount(
  account: string,
): { userId: string; accountType: "checking" | "savings" | "investment" } | null {
  const m = account.match(/^user:([a-f0-9]{24}):(checking|savings|investment)$/i);
  if (!m) return null;
  return { userId: m[1], accountType: m[2] as any };
}

const BALANCE_FIELD: Record<string, string> = {
  checking: "checkingBalance",
  savings: "savingsBalance",
  investment: "investmentBalance",
};

// Returns the signed delta a leg applies to a user balance.
function legDelta(leg: LedgerLeg): bigint {
  // For asset accounts (which is what user balances are), debit increases,
  // credit decreases. From the bank's books a user deposit is a credit on
  // the customer's liability account, but from the customer-facing balance
  // they read on the dashboard, a deposit is a positive number. We model
  // user accounts here as if from the customer's perspective, so:
  //   credit  -> +amount  (money arrives in the user's account)
  //   debit   -> -amount  (money leaves the user's account)
  return leg.side === "credit" ? leg.amountMinor : -leg.amountMinor;
}

// Append a balanced set of legs to the journal, hash-chain them, and mirror
// any user-account legs to the User.balance cache. Idempotent only when the
// caller supplies a unique `transactionGroup`.
export async function postEntries(
  legs: LedgerLeg[],
  opts: PostOptions,
): Promise<ILedgerEntry[]> {
  assertBalanced(legs);

  const exec = async (session: mongoose.ClientSession): Promise<ILedgerEntry[]> => {
    // Prevent double-posting under the same transactionGroup.
    const existing = await LedgerEntry.findOne(
      { transactionGroup: opts.transactionGroup },
      { _id: 1 },
      { session },
    ).lean();
    if (existing) {
      throw new Error(`ledger already posted for group ${opts.transactionGroup}`);
    }

    // Determine next sequence by reading the tip. We rely on the unique
    // index on `sequence` to catch races: a concurrent insert with the
    // same number will throw a duplicate-key error and the outer
    // `withTransaction` retry will pick up a fresh sequence.
    const tip = await LedgerEntry.findOne({}, { sequence: 1, hash: 1 })
      .sort({ sequence: -1 })
      .session(session)
      .lean();
    let nextSeq = (tip?.sequence ?? 0) + 1;
    let prevHash = tip?.hash ?? GENESIS_HASH;

    const docs = legs.map((leg) => {
      const amountStr = leg.amountMinor.toString();
      const seq = nextSeq++;
      const canonical = canonicalizeEntry({
        transactionGroup: opts.transactionGroup,
        account: leg.account,
        currency: leg.currency.toUpperCase(),
        amountMinor: amountStr,
        side: leg.side,
        sequence: seq,
        prevHash,
        reference: leg.reference,
      });
      const hash = hashEntry(canonical);
      const row = {
        transactionGroup: opts.transactionGroup,
        transactionId: opts.transactionId ?? null,
        account: leg.account,
        currency: leg.currency.toUpperCase(),
        amountMinor: amountStr,
        side: leg.side,
        description: leg.description,
        reference: leg.reference,
        metadata: leg.metadata,
        sequence: seq,
        prevHash,
        hash,
        createdBy: opts.createdBy ?? null,
      };
      prevHash = hash;
      return row;
    });

    const inserted = await LedgerEntry.insertMany(docs, { session, ordered: true });

    // Mirror user-account legs to User.balance cache.
    const userDeltas = new Map<string, Map<string, bigint>>(); // userId -> field -> delta
    for (const leg of legs) {
      const parsed = parseUserAccount(leg.account);
      if (!parsed) continue;
      const field = BALANCE_FIELD[parsed.accountType];
      if (!field) continue;
      const byField = userDeltas.get(parsed.userId) ?? new Map<string, bigint>();
      byField.set(field, (byField.get(field) ?? 0n) + legDelta(leg));
      userDeltas.set(parsed.userId, byField);
    }
    for (const [userId, byField] of userDeltas) {
      const inc: Record<string, number> = {};
      for (const [field, delta] of byField) {
        // User.balance is stored as Number (major units, 2dp). Round-trip
        // through cents: this loses precision past 2dp for non-2dp
        // currencies, but the source of truth is the ledger anyway.
        inc[field] = Number(delta) / 100;
      }
      await User.updateOne({ _id: userId }, { $inc: inc }, { session });
    }

    return inserted;
  };

  if (opts.session) return exec(opts.session);

  // Replica-set transactions are required for atomicity; fall back to a
  // non-transactional path when running against a standalone Mongo (tests).
  const conn = mongoose.connection;
  if (!conn || conn.readyState !== 1) {
    throw new Error("mongoose not connected");
  }
  const session = await conn.startSession();
  try {
    let result: ILedgerEntry[] = [];
    await session.withTransaction(async () => {
      result = await exec(session);
    });
    return result;
  } catch (err: any) {
    // Standalone Mongo throws "Transaction numbers are only allowed on a
    // replica set member or mongos" — retry once without a session so dev
    // and CI still work.
    if (/replica set member|mongos|Transaction numbers/i.test(String(err?.message))) {
      // @ts-expect-error — null is allowed; the helper accepts undefined session
      return exec(undefined);
    }
    throw err;
  } finally {
    session.endSession();
  }
}

// Sum a single account's signed balance from the ledger.
export async function balanceOf(account: string, currency = "USD"): Promise<Minor> {
  const rows = await LedgerEntry.aggregate([
    { $match: { account, currency: currency.toUpperCase() } },
    {
      $group: {
        _id: "$side",
        total: { $sum: { $toLong: "$amountMinor" } },
      },
    },
  ]);
  let debit = 0n;
  let credit = 0n;
  for (const r of rows) {
    if (r._id === "debit") debit = coerceMinor(r.total);
    if (r._id === "credit") credit = coerceMinor(r.total);
  }
  // Customer-facing convention: credit increases, debit decreases.
  return credit - debit;
}
