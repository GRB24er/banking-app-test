// src/lib/limits.ts
// Server-side enforcement of per-user transaction limits with audit on block.

import TransactionLimit from "@/models/TransactionLimit";
import { audit } from "@/lib/audit";

export interface LimitCheck {
  ok: boolean;
  reason?: string;
  remaining?: { transfer: number; withdrawal: number };
}

const startOfDay = (d = new Date()): Date => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

async function loadAndReset(userId: string) {
  let doc = await TransactionLimit.findOne({ userId });
  if (!doc) {
    doc = await TransactionLimit.create({ userId });
  }
  const today = startOfDay();
  if (!doc.lastResetDate || doc.lastResetDate < today) {
    doc.todayTransferred = 0;
    doc.todayWithdrawn = 0;
    doc.lastResetDate = today;
    await doc.save();
  }
  return doc;
}

export interface AssertArgs {
  userId: string;
  amount: number;             // major units
  kind: "transfer" | "withdrawal";
  actorContext?: { ip?: string; userAgent?: string; requestId?: string };
}

export async function assertWithinLimits(args: AssertArgs): Promise<LimitCheck> {
  const doc = await loadAndReset(args.userId);
  if (!doc.limitsEnabled) {
    return { ok: true, remaining: { transfer: Infinity, withdrawal: Infinity } };
  }

  if (args.amount > doc.maxTransactionAmount) {
    const reason = `amount ${args.amount} exceeds per-transaction max ${doc.maxTransactionAmount}`;
    await audit({
      actor: { kind: "user", id: args.userId },
      action: "limits.block",
      outcome: "blocked",
      reason,
      ...args.actorContext,
      metadata: { amount: args.amount, kind: args.kind },
    });
    return { ok: false, reason };
  }

  const dailyCap = args.kind === "transfer" ? doc.dailyTransferLimit : doc.dailyWithdrawalLimit;
  const today = args.kind === "transfer" ? doc.todayTransferred : doc.todayWithdrawn;
  if (today + args.amount > dailyCap) {
    const reason = `daily ${args.kind} limit exceeded (${today} + ${args.amount} > ${dailyCap})`;
    await audit({
      actor: { kind: "user", id: args.userId },
      action: "limits.block",
      outcome: "blocked",
      reason,
      ...args.actorContext,
      metadata: { amount: args.amount, kind: args.kind },
    });
    return { ok: false, reason };
  }

  return {
    ok: true,
    remaining: {
      transfer: doc.dailyTransferLimit - doc.todayTransferred,
      withdrawal: doc.dailyWithdrawalLimit - doc.todayWithdrawn,
    },
  };
}

// Recorded after the money has actually moved.
export async function recordUsage(
  userId: string,
  amount: number,
  kind: "transfer" | "withdrawal",
): Promise<void> {
  await loadAndReset(userId);
  const inc = kind === "transfer"
    ? { todayTransferred: amount }
    : { todayWithdrawn: amount };
  await TransactionLimit.updateOne({ userId }, { $inc: inc });
}
