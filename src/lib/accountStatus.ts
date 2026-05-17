// src/lib/accountStatus.ts
//
// Wrapper around AccountRestriction. Exposes:
//   - getActiveRestriction(userId, scope?) — currently in-force row (if any)
//   - issueRestriction(args) — creates a new row and supersedes lesser ones
//   - liftRestriction(refOrId, by, reason) — marks the row lifted
//   - assertAccountActive(userId, scope?) — throws RestrictionError → 423

import mongoose from "mongoose";
import AccountRestriction, {
  type IAccountRestriction,
  type RestrictionKind,
  type RestrictionReason,
  type RestrictionScope,
} from "@/models/AccountRestriction";
import User from "@/models/User";
import { audit } from "@/lib/audit";

const SEVERITY: Record<RestrictionKind, number> = { freeze: 1, block: 2, close: 3 };

function makeReference(): string {
  const year = new Date().getUTCFullYear();
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0");
  return `RES-${year}-${rand}`;
}

export class RestrictionError extends Error {
  status = 423;
  constructor(public restriction: IAccountRestriction) {
    super(`account ${restriction.kind} active (ref ${restriction.reference})`);
  }
}

export async function getActiveRestriction(
  userId: string | mongoose.Types.ObjectId,
  scope: RestrictionScope = "all",
): Promise<IAccountRestriction | null> {
  const now = new Date();
  // Match either "all" or the explicit scope; whichever is broader wins.
  const rows = await AccountRestriction.find({
    userId,
    liftedAt: null,
    $or: [{ scope: "all" }, { scope }],
    $and: [{ $or: [{ effectiveUntil: null }, { effectiveUntil: { $gt: now } }] }],
  }).sort({ createdAt: -1 }).limit(10);
  if (rows.length === 0) return null;
  // Most severe wins (close > block > freeze).
  return rows.sort((a, b) => SEVERITY[b.kind] - SEVERITY[a.kind])[0];
}

export async function assertAccountActive(
  userId: string | mongoose.Types.ObjectId,
  scope: RestrictionScope = "all",
): Promise<void> {
  const r = await getActiveRestriction(userId, scope);
  if (r) throw new RestrictionError(r);
}

export interface IssueArgs {
  userId: string;
  kind: RestrictionKind;
  scope?: RestrictionScope;
  reason: RestrictionReason;
  reasonDetail?: string;
  effectiveUntil?: Date | null;
  issuedBy: string;
  ip?: string;
  userAgent?: string;
}

export async function issueRestriction(args: IssueArgs): Promise<IAccountRestriction> {
  const scope = args.scope ?? "all";

  // Auto-supersede any lesser restriction with the same scope.
  const existing = await AccountRestriction.find({
    userId: args.userId,
    scope,
    liftedAt: null,
  });
  const lesser = existing.filter((r) => SEVERITY[r.kind] < SEVERITY[args.kind]);

  const created = await AccountRestriction.create({
    userId: args.userId,
    kind: args.kind,
    scope,
    reason: args.reason,
    reasonDetail: args.reasonDetail,
    reference: makeReference(),
    effectiveAt: new Date(),
    effectiveUntil: args.effectiveUntil ?? null,
    issuedBy: args.issuedBy,
    supersedes: lesser[0]?._id ?? null,
  });

  if (lesser.length > 0) {
    await AccountRestriction.updateMany(
      { _id: { $in: lesser.map((r) => r._id) } },
      { $set: { liftedAt: new Date(), liftReason: "superseded", supersededBy: created._id, liftedBy: args.issuedBy } },
    );
  }

  // Mirror onto User as a denormalised hint.
  await User.updateOne(
    { _id: args.userId },
    { $set: { accountStatus: { kind: args.kind, scope, reference: created.reference, since: created.effectiveAt } } },
  );

  await audit({
    actor: { kind: "admin", id: args.issuedBy },
    action: `restriction.${args.kind}`,
    target: { kind: "user", id: args.userId, reference: created.reference },
    outcome: "success",
    reason: args.reason,
    ip: args.ip,
    userAgent: args.userAgent,
    metadata: { scope, effectiveUntil: args.effectiveUntil },
  });

  return created;
}

export interface LiftArgs {
  refOrId: string;
  liftedBy: string;
  reason: string;
  ip?: string;
  userAgent?: string;
}

export async function liftRestriction(args: LiftArgs): Promise<IAccountRestriction> {
  const filter = mongoose.isValidObjectId(args.refOrId)
    ? { _id: args.refOrId }
    : { reference: args.refOrId };
  const doc = await AccountRestriction.findOne(filter);
  if (!doc) throw new Error("restriction not found");
  if (doc.liftedAt) throw new Error("restriction already lifted");
  doc.liftedAt = new Date();
  doc.liftedBy = args.liftedBy as any;
  doc.liftReason = args.reason;
  await doc.save();

  // Recompute denormalised user.accountStatus.
  const next = await getActiveRestriction(doc.userId, doc.scope);
  await User.updateOne(
    { _id: doc.userId },
    next
      ? { $set: { accountStatus: { kind: next.kind, scope: next.scope, reference: next.reference, since: next.effectiveAt } } }
      : { $unset: { accountStatus: 1 } },
  );

  await audit({
    actor: { kind: "admin", id: args.liftedBy },
    action: "restriction.lift",
    target: { kind: "user", id: String(doc.userId), reference: doc.reference },
    outcome: "success",
    reason: args.reason,
    ip: args.ip,
    userAgent: args.userAgent,
  });

  return doc;
}
