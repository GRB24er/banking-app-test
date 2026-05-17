// src/scripts/reconcile.ts
// Run with: npm run reconcile
//
// Verifies:
//   1. Every transaction marked `ledgerPosted` has a balanced set of entries
//      (Σ debits === Σ credits per currency) in LedgerEntry.
//   2. The hash chain is intact (each row's prevHash matches the previous
//      row's hash; canonicalised contents hash matches `hash`).
//   3. Each user's denormalised `User.balance` matches the sum of their
//      ledger legs.
//
// Exits non-zero if any check fails so this can run in cron / CI.

import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import LedgerEntry, {
  canonicalizeEntry,
  GENESIS_HASH,
  hashEntry,
} from "@/models/LedgerEntry";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { coerceMinor } from "@/lib/decimal";

type Issue = { kind: string; detail: string };

async function checkChain(issues: Issue[]): Promise<void> {
  const cursor = LedgerEntry.find({}).sort({ sequence: 1 }).cursor();
  let expectedSeq = 1;
  let prevHash = GENESIS_HASH;
  for await (const row of cursor) {
    if (row.sequence !== expectedSeq) {
      issues.push({
        kind: "chain.gap",
        detail: `expected sequence ${expectedSeq}, got ${row.sequence}`,
      });
    }
    if (row.prevHash !== prevHash) {
      issues.push({
        kind: "chain.break",
        detail: `sequence ${row.sequence}: prevHash mismatch`,
      });
    }
    const canon = canonicalizeEntry({
      transactionGroup: row.transactionGroup,
      account: row.account,
      currency: row.currency,
      amountMinor: row.amountMinor,
      side: row.side,
      sequence: row.sequence,
      prevHash: row.prevHash,
      reference: row.reference,
    });
    const recomputed = hashEntry(canon);
    if (recomputed !== row.hash) {
      issues.push({
        kind: "chain.tamper",
        detail: `sequence ${row.sequence}: hash mismatch — row was modified after write`,
      });
    }
    prevHash = row.hash;
    expectedSeq = row.sequence + 1;
  }
}

async function checkTransactionBalance(issues: Issue[]): Promise<void> {
  const txs = await Transaction.find({ ledgerPosted: true }, { _id: 1, transactionGroup: 1, reference: 1 }).lean();
  for (const tx of txs) {
    const group = (tx as any).transactionGroup;
    if (!group) {
      issues.push({
        kind: "tx.noGroup",
        detail: `tx ${tx._id} (${(tx as any).reference}) marked ledgerPosted but has no transactionGroup`,
      });
      continue;
    }
    const sums = await LedgerEntry.aggregate([
      { $match: { transactionGroup: group } },
      {
        $group: {
          _id: { currency: "$currency", side: "$side" },
          total: { $sum: { $toLong: "$amountMinor" } },
        },
      },
    ]);
    const perCur = new Map<string, { debit: bigint; credit: bigint }>();
    for (const r of sums) {
      const cur = r._id.currency;
      const slot = perCur.get(cur) ?? { debit: 0n, credit: 0n };
      if (r._id.side === "debit") slot.debit = coerceMinor(r.total);
      else slot.credit = coerceMinor(r.total);
      perCur.set(cur, slot);
    }
    if (perCur.size === 0) {
      issues.push({
        kind: "tx.noLegs",
        detail: `tx ${tx._id} (${(tx as any).reference}) has no ledger entries`,
      });
      continue;
    }
    for (const [cur, s] of perCur) {
      if (s.debit !== s.credit) {
        issues.push({
          kind: "tx.imbalanced",
          detail: `tx ${tx._id} (${(tx as any).reference}) ${cur}: debit=${s.debit} credit=${s.credit}`,
        });
      }
    }
  }
}

async function checkUserBalances(issues: Issue[]): Promise<void> {
  // Aggregate ledger sums per user/account.
  const sums = await LedgerEntry.aggregate([
    { $match: { account: { $regex: /^user:/ }, currency: "USD" } },
    {
      $group: {
        _id: { account: "$account", side: "$side" },
        total: { $sum: { $toLong: "$amountMinor" } },
      },
    },
  ]);

  // Build a map: userId -> field -> minor balance.
  const expected = new Map<string, Record<string, bigint>>();
  for (const row of sums) {
    const m = String(row._id.account).match(/^user:([a-f0-9]{24}):(checking|savings|investment)$/i);
    if (!m) continue;
    const [, userId, accountType] = m;
    const field =
      accountType === "savings" ? "savingsBalance"
      : accountType === "investment" ? "investmentBalance"
      : "checkingBalance";
    const slot = expected.get(userId) ?? {};
    slot[field] = (slot[field] ?? 0n) + (row._id.side === "credit" ? coerceMinor(row.total) : -coerceMinor(row.total));
    expected.set(userId, slot);
  }

  for (const [userId, fields] of expected) {
    const user = await User.findById(userId).lean();
    if (!user) {
      issues.push({ kind: "user.missing", detail: `user ${userId} has ledger entries but no user record` });
      continue;
    }
    for (const [field, minor] of Object.entries(fields)) {
      const major = Number(minor) / 100;
      const stored = Number((user as any)[field] ?? 0);
      if (Math.abs(stored - major) > 0.005) {
        issues.push({
          kind: "user.drift",
          detail: `user ${userId} ${field}: stored=${stored} ledger=${major}`,
        });
      }
    }
  }
}

async function main(): Promise<number> {
  await connectDB();
  const issues: Issue[] = [];

  console.log("• checking hash chain…");
  await checkChain(issues);

  console.log("• checking per-transaction balance…");
  await checkTransactionBalance(issues);

  console.log("• checking user balance vs ledger…");
  await checkUserBalances(issues);

  if (issues.length === 0) {
    console.log("✅ reconcile clean — ledger, transactions, and user balances all agree");
    return 0;
  }

  console.error(`❌ reconcile found ${issues.length} issue(s):`);
  for (const i of issues) console.error(`   [${i.kind}] ${i.detail}`);
  return 1;
}

main()
  .then((code) => {
    mongoose.connection.close().finally(() => process.exit(code));
  })
  .catch((err) => {
    console.error("reconcile crashed:", err);
    mongoose.connection.close().finally(() => process.exit(2));
  });
