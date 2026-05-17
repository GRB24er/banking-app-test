// src/app/api/admin/transactions/[id]/reverse/route.ts
// Reverse a previously-posted transaction with a contra-entry. Original is
// preserved; a new transaction with type adjustment-* and reversalOf set
// is created.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import Transaction, { isCreditType } from "@/models/Transaction";
import LedgerEntry from "@/models/LedgerEntry";
import { postEntries } from "@/lib/ledger";
import { coerceMinor, toMinor } from "@/lib/decimal";
import { audit, actorContext } from "@/lib/audit";
import { withIdempotency, IdempotencyError } from "@/lib/idempotency";
import { randomUUID } from "crypto";

function makeReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `REV-${ts}-${rand}`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin" || !session.user.id) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }
  const { id } = await params;
  const ctx = actorContext(req);
  const idemKey = req.headers.get("idempotency-key") || randomUUID();

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid JSON body" }, { status: 400 }); }
  if (!body?.reason) return NextResponse.json({ error: "reason required" }, { status: 400 });

  await connectDB();
  const original = await Transaction.findById(id);
  if (!original) return NextResponse.json({ error: "transaction not found" }, { status: 404 });
  if (original.reversedAt) return NextResponse.json({ error: "already reversed" }, { status: 409 });
  if (!original.posted) return NextResponse.json({ error: "transaction not yet posted" }, { status: 409 });

  try {
    const replay = await withIdempotency(
      { key: idemKey, scope: `POST /api/admin/transactions/${id}/reverse`, userId: session.user.id, body },
      async () => {
        const reference = makeReference();
        const transactionGroup = `rev:${reference}`;

        // Mirror the original ledger legs with side flipped.
        const origLegs = await LedgerEntry.find({ transactionGroup: original.transactionGroup });
        if (origLegs.length < 2) {
          // Fallback: synthesise a two-leg reversal from Transaction fields.
          const currency = original.currency || "USD";
          const amt = original.amountMinor ? coerceMinor(original.amountMinor) : toMinor(original.amount, currency);
          const userSide = isCreditType(original.type) ? "debit" : "credit";
          await postEntries(
            [
              { account: `user:${original.userId}:${original.accountType}`, currency, amountMinor: amt, side: userSide, reference, description: `Reversal of ${original.reference}` },
              { account: `bank:adjustments:${currency}`, currency, amountMinor: amt, side: userSide === "credit" ? "debit" : "credit", reference, description: `Reversal counter-entry` },
            ],
            { transactionGroup, createdBy: session.user.id },
          );
        } else {
          await postEntries(
            origLegs.map((leg) => ({
              account: leg.account,
              currency: leg.currency,
              amountMinor: coerceMinor(leg.amountMinor),
              side: (leg.side === "credit" ? "debit" : "credit") as "credit" | "debit",
              description: `Reversal of ${leg.description ?? leg.reference ?? "transaction"}`,
              reference,
            })),
            { transactionGroup, createdBy: session.user.id },
          );
        }

        const revTx = await Transaction.create({
          userId: original.userId,
          type: isCreditType(original.type) ? "adjustment-debit" : "adjustment-credit",
          currency: original.currency,
          amount: original.amount,
          amountMinor: original.amountMinor,
          status: "approved",
          posted: true,
          postedAt: new Date(),
          ledgerPosted: true,
          ledgerPostedAt: new Date(),
          accountType: original.accountType,
          reference,
          channel: "admin_reversal",
          origin: "manual_reversal",
          transactionGroup,
          description: `Reversal: ${body.reason}`,
          metadata: { reason: body.reason, notes: body.notes },
          approvedBy: session.user.id,
          approvedAt: new Date(),
          idempotencyKey: idemKey,
          reversalOf: original._id,
        });

        original.reversedAt = new Date();
        original.reversedBy = session.user.id as any;
        original.reversedByReference = reference;
        original.reversalReason = body.reason;
        await original.save();

        await audit({
          actor: { kind: "admin", id: session.user.id },
          action: "transaction.reverse",
          target: { kind: "transaction", id: String(original._id), reference: original.reference },
          outcome: "success",
          reason: body.reason,
          metadata: { reversalReference: reference },
          ...ctx,
        });

        return {
          status: 201,
          body: {
            reversalReference: reference,
            reversalTransactionId: revTx._id,
            originalReference: original.reference,
            documentUrl: `/api/admin/transactions/${revTx._id}/document`,
          },
        };
      },
    );
    return NextResponse.json(replay.body, { status: replay.status });
  } catch (e) {
    if (e instanceof IdempotencyError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
