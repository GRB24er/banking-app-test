// src/lib/kyc.ts
//
// KYC state machine + per-action tier gates.

import type { KycState, KycTier } from "@/models/KycCase";

const ALLOWED_TRANSITIONS: Record<KycState, KycState[]> = {
  not_started:       ["info_pending"],
  info_pending:      ["documents_pending"],
  documents_pending: ["in_review"],
  in_review:         ["approved", "rejected"],
  approved:          ["expired", "in_review"],
  rejected:          ["info_pending"],
  expired:           ["info_pending"],
};

export function canTransition(from: KycState, to: KycState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: KycState, to: KycState): void {
  if (!canTransition(from, to)) {
    throw new Error(`illegal KYC transition: ${from} → ${to}`);
  }
}

// Action → minimum tier required.
export type KycAction =
  | "transfer.internal"
  | "transfer.external.ach"
  | "transfer.external.same_day_ach"
  | "transfer.wire.domestic"
  | "transfer.wire.international"
  | "card.apply"
  | "loan.apply"
  | "crypto.send"
  | "crypto.convert";

const MIN_TIER_FOR_ACTION: Record<KycAction, KycTier> = {
  "transfer.internal":               "tier_1",
  "transfer.external.ach":           "tier_1",
  "transfer.external.same_day_ach":  "tier_2",
  "transfer.wire.domestic":          "tier_2",
  "transfer.wire.international":     "tier_3",
  "card.apply":                      "tier_1",
  "loan.apply":                      "tier_2",
  "crypto.send":                     "tier_2",
  "crypto.convert":                  "tier_1",
};

const TIER_RANK: Record<KycTier, number> = {
  tier_0: 0, tier_1: 1, tier_2: 2, tier_3: 3,
};

export function canPerformAction(tier: KycTier, action: KycAction): boolean {
  return TIER_RANK[tier] >= TIER_RANK[MIN_TIER_FOR_ACTION[action]];
}

export function requiredTierFor(action: KycAction): KycTier {
  return MIN_TIER_FOR_ACTION[action];
}

export function assertCanPerform(tier: KycTier, action: KycAction): void {
  if (!canPerformAction(tier, action)) {
    const need = requiredTierFor(action);
    const e = new Error(`KYC ${need} required for ${action}, current=${tier}`);
    (e as any).statusCode = 403;
    (e as any).needsTier = need;
    throw e;
  }
}
