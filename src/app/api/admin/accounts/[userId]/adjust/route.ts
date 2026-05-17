// src/app/api/admin/accounts/[userId]/adjust/route.ts
// Admin posts a manual credit or debit, ledger-backed.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { postEntries } from "@/lib/ledger";
import { toMinor } from "@/lib/decimal";
import { audit, actorContext } from "@/lib/audit";
import { withIdempotency, IdempotencyError } from "@/lib/idempotency";
import { randomUUID } from "crypto";

export const ADJUSTMENT_REASONS = [
  "courtesy_credit", "promotional_credit", "interest_correction",
  "fee_refund", "fraud_reimbursement", "regulatory_settlement",
  "duplicate_charge", "service_recovery", "system_correction",
  "balance_reconciliation", "loyalty_reward", "manual_credit", "manual_debit",
] as const;

function makeReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ADJ-${ts}-${rand}`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin" || !session.user.id) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }
  const { userId } = await params;
  const ctx = actorContext(req);
  const idemKey = req.headers.get("idempotency-key") || randomUUID();

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid JSON body" }, { status: 400 }); }

  const direction = String(body.direction ?? "").toLowerCase();
  if (!["credit", "debit"].includes(direction)) {
    return NextResponse.json({ error: "direction must be 'credit' or 'debit'" }, { status: 400 });
  }
  if (!ADJUSTMENT_REASONS.includes(body.reason)) {
    return NextResponse.json({ error: "invalid reason" }, { status: 400 });
  }
  const accountType = body.accountType ?? "checking";
  if (!["checking", "savings", "investment"].includes(accountType)) {
    return NextResponse.json({ error: "invalid accountType" }, { status: 400 });
  }
  const currency = String(body.currency ?? "USD").toUpperCase();

  let amountMinor: bigint;
  try { amountMinor = toMinor(body.amount, currency); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
  if (amountMinor <= 0n) return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });

  await connectDB();
  const target = await User.findById(userId);
  if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });

  try {
    const replay = await withIdempotency(
      { key: idemKey, scope: `POST /api/admin/accounts/${userId}/adjust`, userId: session.user.id, body },
      async () => {
        const reference = makeReference();
        const transactionGroup = `adj:${reference}`;
        const balanceBefore = Number((target as any)[`${accountType}Balance`] ?? 0);

        const userLeg = {
          account: `user:${userId}:${accountType}`,
          currency,
          amountMinor,
          side: (direction === "credit" ? "credit" : "debit") as "credit" | "debit",
          description: `Manual ${direction}: ${body.reason}`,
          reference,
        };
        const bankLeg = {
          // Adjustment counter-account; in real life this would be a
          // "manual adjustment suspense" account in the bank's books.
          account: `bank:adjustments:${currency}`,
          currency,
          amountMinor,
          side: (direction === "credit" ? "debit" : "credit") as "credit" | "debit",
          description: `Adjustment counter-entry`,
          reference,
        };

        await postEntries([userLeg, bankLeg], {
          transactionGroup,
          createdBy: session.user.id,
        });

        const tx = await Transaction.create({
          userId,
          type: direction === "credit" ? "adjustment-credit" : "adjustment-debit",
          currency,
          amount: Number(amountMinor) / 100,
          amountMinor: amountMinor.toString(),
          status: "approved",
          posted: true,
          postedAt: new Date(),
          ledgerPosted: true,
          ledgerPostedAt: new Date(),
          accountType,
          reference,
          channel: "admin_adjustment",
          origin: "manual_adjustment",
          transactionGroup,
          description: body.notes ?? body.reason,
          metadata: { reason: body.reason, notes: body.notes },
          approvedBy: session.user.id,
          approvedAt: new Date(),
          idempotencyKey: idemKey,
        });

        const refreshed = await User.findById(userId).select({ checkingBalance: 1, savingsBalance: 1, investmentBalance: 1 }).lean() as any;
        const balanceAfter = Number(refreshed?.[`${accountType}Balance`] ?? 0);

        await audit({
          actor: { kind: "admin", id: session.user.id },
          action: `adjustment.${direction}`,
          target: { kind: "user", id: userId, reference },
          outcome: "success",
          reason: body.reason,
          metadata: { amount: body.amount, currency, accountType, balanceBefore, balanceAfter },
          ...ctx,
        });

        return {
          status: 201,
          body: {
            reference,
            transactionId: tx._id,
            balanceBefore,
            balanceAfter,
            documentUrl: `/api/admin/transactions/${tx._id}/document`,
          },
        };
      },
    );
    return NextResponse.json(replay.body, { status: replay.status });
  } catch (e) {
    if (e instanceof IdempotencyError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
