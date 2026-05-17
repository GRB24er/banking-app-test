// src/lib/transferEngine.ts
//
// Shared "do this transfer correctly" helper that all four money endpoints
// call. Pulls together:
//   - active-account check (account freeze/block → 423)
//   - sanctions screen (block on hit, warn on EDD)
//   - KYC tier gate
//   - per-user limits
//   - integer-cents amount parsing
//   - atomic ledger posting (mirrors to User.balance)
//   - audit on success + failure
//
// Callers wrap this in withIdempotency() at the route layer.

import mongoose from "mongoose";
import Transaction from "@/models/Transaction";
import KycCase, { type KycTier } from "@/models/KycCase";
import { assertAccountActive, RestrictionError } from "@/lib/accountStatus";
import { screenSanctions } from "@/lib/sanctions";
import { assertCanPerform, type KycAction } from "@/lib/kyc";
import { assertWithinLimits, recordUsage } from "@/lib/limits";
import { postEntries, type LedgerLeg } from "@/lib/ledger";
import { toMinor, fromMinor } from "@/lib/decimal";
import { audit } from "@/lib/audit";

export interface EngineActor {
  userId: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

export interface TransferRequest {
  kind: "internal" | "external" | "wire" | "international";
  kycAction: KycAction;
  fromAccount: "checking" | "savings" | "investment";
  toAccount?: "checking" | "savings" | "investment"; // internal only
  amount: string | number;
  currency: string;
  reference: string;
  description?: string;
  recipientName?: string;
  recipientCountry?: string;
  recipientBankCountry?: string;
  feeMinor?: bigint;             // optional explicit fee
  metadata?: Record<string, unknown>;
}

export interface TransferResult {
  ok: true;
  transactionId: string;
  reference: string;
  transactionGroup: string;
  amountFormatted: string;
}

export class TransferBlocked extends Error {
  constructor(public status: number, public code: string, message: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}

function userLeg(userId: string, account: TransferRequest["fromAccount"], currency: string, amountMinor: bigint, side: "debit" | "credit", reference: string, description?: string): LedgerLeg {
  return {
    account: `user:${userId}:${account}`,
    currency,
    amountMinor,
    side,
    reference,
    description,
  };
}

function bankCounterLeg(kind: string, currency: string, amountMinor: bigint, side: "debit" | "credit", reference: string): LedgerLeg {
  return {
    account: `bank:${kind}:${currency}`,
    currency,
    amountMinor,
    side,
    reference,
  };
}

// Run all pre-flight checks. Throws TransferBlocked on rejection.
export async function preflight(actor: EngineActor, req: TransferRequest): Promise<{ amountMinor: bigint; tier: KycTier }> {
  // 1. account active (freeze/block/close)
  try {
    await assertAccountActive(actor.userId, req.fromAccount);
    await assertAccountActive(actor.userId, "all");
  } catch (e) {
    if (e instanceof RestrictionError) {
      throw new TransferBlocked(423, "account_restricted", e.message, {
        restrictionReference: e.restriction.reference,
        kind: e.restriction.kind,
        documentUrl: `/api/restrictions/${e.restriction.reference}/document`,
      });
    }
    throw e;
  }

  // 2. KYC tier
  const kyc = await KycCase.findOne({ userId: actor.userId }).select({ tier: 1, state: 1 }).lean() as any;
  const tier: KycTier = (kyc?.tier as KycTier) ?? "tier_0";
  try { assertCanPerform(tier, req.kycAction); }
  catch (e: any) {
    throw new TransferBlocked(403, "kyc_required", e.message, { needsTier: e.needsTier, currentTier: tier });
  }

  // 3. amount + sanctions
  let amountMinor: bigint;
  try { amountMinor = toMinor(req.amount, req.currency); }
  catch (e: any) { throw new TransferBlocked(400, "invalid_amount", e.message); }
  if (amountMinor <= 0n) throw new TransferBlocked(400, "invalid_amount", "amount must be > 0");

  const screen = screenSanctions({
    name: req.recipientName,
    countryCode: req.recipientBankCountry ?? req.recipientCountry,
  });
  if (screen.tier === "hit") {
    await audit({
      actor: { kind: "user", id: actor.userId, email: actor.email },
      action: `transfer.${req.kind}.blocked`,
      outcome: "blocked",
      reason: `sanctions: ${screen.reasons.join("; ")}`,
      ip: actor.ip, userAgent: actor.userAgent, requestId: actor.requestId,
      metadata: { reference: req.reference, screen },
    });
    throw new TransferBlocked(403, "sanctions_hit", `Sanctions screening blocked this transfer: ${screen.reasons.join("; ")}`);
  }

  // 4. limits
  const lim = await assertWithinLimits({
    userId: actor.userId,
    amount: Number(amountMinor) / 100,
    kind: "transfer",
    actorContext: { ip: actor.ip, userAgent: actor.userAgent, requestId: actor.requestId },
  });
  if (!lim.ok) throw new TransferBlocked(403, "limit_exceeded", lim.reason ?? "transfer limit exceeded");

  return { amountMinor, tier };
}

// Post an *internal* (same-user, two-account) transfer with two user legs.
export async function postInternal(actor: EngineActor, req: TransferRequest): Promise<TransferResult> {
  if (!req.toAccount) throw new TransferBlocked(400, "missing_to_account", "internal transfer needs toAccount");
  if (req.fromAccount === req.toAccount) throw new TransferBlocked(400, "same_account", "cannot transfer to the same account");

  const { amountMinor } = await preflight(actor, req);
  const transactionGroup = `int:${req.reference}`;
  const fee = req.feeMinor ?? 0n;

  const legs: LedgerLeg[] = [
    userLeg(actor.userId, req.fromAccount, req.currency, amountMinor + fee, "debit", req.reference, req.description),
    userLeg(actor.userId, req.toAccount, req.currency, amountMinor, "credit", req.reference, req.description),
  ];
  if (fee > 0n) legs.push(bankCounterLeg("fees", req.currency, fee, "credit", req.reference));

  await postEntries(legs, { transactionGroup, createdBy: actor.userId });

  const tx = await Transaction.create({
    userId: actor.userId,
    type: "transfer-out",
    currency: req.currency,
    amount: Number(amountMinor) / 100,
    amountMinor: amountMinor.toString(),
    status: "completed",
    posted: true,
    postedAt: new Date(),
    ledgerPosted: true,
    ledgerPostedAt: new Date(),
    accountType: req.fromAccount,
    reference: req.reference,
    channel: "internal_transfer",
    origin: "transfer.internal",
    transactionGroup,
    description: req.description,
    metadata: req.metadata,
  });
  await Transaction.create({
    userId: actor.userId,
    type: "transfer-in",
    currency: req.currency,
    amount: Number(amountMinor) / 100,
    amountMinor: amountMinor.toString(),
    status: "completed",
    posted: true,
    postedAt: new Date(),
    ledgerPosted: true,
    ledgerPostedAt: new Date(),
    accountType: req.toAccount,
    reference: req.reference + "-IN",
    channel: "internal_transfer",
    origin: "transfer.internal",
    transactionGroup,
    description: req.description,
    metadata: req.metadata,
  });

  await recordUsage(actor.userId, Number(amountMinor) / 100, "transfer");

  await audit({
    actor: { kind: "user", id: actor.userId, email: actor.email },
    action: "transfer.internal",
    target: { kind: "transaction", id: String(tx._id), reference: req.reference },
    outcome: "success",
    metadata: { from: req.fromAccount, to: req.toAccount, amount: req.amount },
    ip: actor.ip, userAgent: actor.userAgent, requestId: actor.requestId,
  });

  return { ok: true, transactionId: String(tx._id), reference: req.reference, transactionGroup, amountFormatted: fromMinor(amountMinor, req.currency) };
}

// Post an outbound transfer that requires admin approval — leaves the
// transaction `pending` and does NOT post to the ledger yet. Admin approve
// will call postPendingTransfer to commit.
export async function recordPending(actor: EngineActor, req: TransferRequest): Promise<TransferResult> {
  const { amountMinor } = await preflight(actor, req);
  const transactionGroup = `${req.kind}:${req.reference}`;

  const tx = await Transaction.create({
    userId: actor.userId,
    type: "transfer-out",
    currency: req.currency,
    amount: Number(amountMinor) / 100,
    amountMinor: amountMinor.toString(),
    status: "pending",
    posted: false,
    ledgerPosted: false,
    accountType: req.fromAccount,
    reference: req.reference,
    channel: `${req.kind}_transfer`,
    origin: `transfer.${req.kind}`,
    transactionGroup,
    description: req.description,
    metadata: {
      ...req.metadata,
      recipientName: req.recipientName,
      recipientCountry: req.recipientCountry,
      recipientBankCountry: req.recipientBankCountry,
      feeMinor: req.feeMinor?.toString(),
    },
  });

  await audit({
    actor: { kind: "user", id: actor.userId, email: actor.email },
    action: `transfer.${req.kind}.initiate`,
    target: { kind: "transaction", id: String(tx._id), reference: req.reference },
    outcome: "success",
    metadata: { amount: req.amount, currency: req.currency, recipientCountry: req.recipientCountry },
    ip: actor.ip, userAgent: actor.userAgent, requestId: actor.requestId,
  });

  return { ok: true, transactionId: String(tx._id), reference: req.reference, transactionGroup, amountFormatted: fromMinor(amountMinor, req.currency) };
}

// Called by admin-approve. Commits an already-recorded pending transfer to
// the ledger. Idempotent on transactionGroup.
export async function postPendingTransfer(txId: string, approvedBy: string): Promise<void> {
  const tx = await Transaction.findById(txId);
  if (!tx) throw new Error("transaction not found");
  if (tx.ledgerPosted) return; // already done
  if (!tx.amountMinor || !tx.transactionGroup) {
    throw new Error("transaction is missing amountMinor or transactionGroup — likely a legacy row");
  }

  const amountMinor = BigInt(tx.amountMinor);
  const fee = (tx.metadata?.feeMinor ? BigInt(tx.metadata.feeMinor as string) : 0n);

  const legs: LedgerLeg[] = [
    userLeg(String(tx.userId), tx.accountType, tx.currency, amountMinor + fee, "debit", tx.reference ?? "", tx.description),
    bankCounterLeg("cash", tx.currency, amountMinor, "credit", tx.reference ?? ""),
  ];
  if (fee > 0n) legs.push(bankCounterLeg("fees", tx.currency, fee, "credit", tx.reference ?? ""));

  await postEntries(legs, { transactionGroup: tx.transactionGroup, transactionId: tx._id, createdBy: approvedBy });

  tx.status = "approved";
  tx.posted = true;
  tx.postedAt = new Date();
  tx.ledgerPosted = true;
  tx.ledgerPostedAt = new Date();
  tx.approvedBy = approvedBy;
  tx.approvedAt = new Date();
  await tx.save();
}
