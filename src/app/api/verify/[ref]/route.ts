// src/app/api/verify/[ref]/route.ts
// Public document verifier — anyone scanning a QR on a notice / receipt
// can confirm it was actually issued by the bank.
//
// Supports references:
//   RES-...   account restriction
//   ADJ-...   manual adjustment
//   REV-...   transaction reversal
//   LON-...   loan reference (existing)
//   any other transaction.reference

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AccountRestriction from "@/models/AccountRestriction";
import Transaction from "@/models/Transaction";

export async function GET(_req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  if (!ref || ref.length < 6) {
    return NextResponse.json({ verified: false, error: "invalid reference" }, { status: 400 });
  }

  await connectDB();

  if (ref.startsWith("RES-")) {
    const r = await AccountRestriction.findOne({ reference: ref })
      .select({ reference: 1, kind: 1, scope: 1, reason: 1, effectiveAt: 1, effectiveUntil: 1, liftedAt: 1, createdAt: 1 })
      .lean() as any;
    if (!r) return NextResponse.json({ verified: false }, { status: 404 });
    return NextResponse.json({
      verified: true,
      kind: "restriction",
      reference: r.reference,
      status: r.liftedAt ? "lifted" : "active",
      restrictionKind: r.kind,
      scope: r.scope,
      reason: r.reason,
      effectiveAt: r.effectiveAt,
      effectiveUntil: r.effectiveUntil,
      issuedAt: r.createdAt,
    });
  }

  if (ref.startsWith("ADJ-") || ref.startsWith("REV-")) {
    const t = await Transaction.findOne({ reference: ref })
      .select({ reference: 1, type: 1, amount: 1, currency: 1, postedAt: 1, accountType: 1, reversalOf: 1 })
      .lean() as any;
    if (!t) return NextResponse.json({ verified: false }, { status: 404 });
    return NextResponse.json({
      verified: true,
      kind: ref.startsWith("REV-") ? "reversal" : "adjustment",
      reference: t.reference,
      transactionType: t.type,
      amount: t.amount,
      currency: t.currency,
      accountType: t.accountType,
      postedAt: t.postedAt,
      reversalOf: t.reversalOf ?? undefined,
    });
  }

  const t = await Transaction.findOne({ reference: ref })
    .select({ reference: 1, type: 1, amount: 1, currency: 1, postedAt: 1, status: 1 })
    .lean() as any;
  if (!t) return NextResponse.json({ verified: false }, { status: 404 });
  return NextResponse.json({
    verified: true,
    kind: "transaction",
    reference: t.reference,
    transactionType: t.type,
    amount: t.amount,
    currency: t.currency,
    postedAt: t.postedAt,
    status: t.status,
  });
}
