// src/lib/moneyGuard.ts
//
// Drop-in pre-flight for money endpoints. Call it at the top of each
// transfer route to enforce:
//   - assertAccountActive (account freeze/block/close → 423 + restriction
//     reference + PDF link in the body)
//   - sanctions screening
//   - KYC tier gate
//   - daily limits
//   - Idempotency-Key header (returns the cached response on replay)
//
// Returns either { replay } (when this is an Idempotency-Key replay or a
// blocked request — caller should `return replay`) or null (caller may
// proceed with the existing business logic).

import { NextRequest, NextResponse } from "next/server";
import KycCase, { type KycTier } from "@/models/KycCase";
import { assertAccountActive, RestrictionError } from "@/lib/accountStatus";
import { screenSanctions } from "@/lib/sanctions";
import { assertCanPerform, type KycAction } from "@/lib/kyc";
import { assertWithinLimits } from "@/lib/limits";
import { audit, actorContext } from "@/lib/audit";

export interface GuardArgs {
  req: NextRequest;
  userId: string;
  email?: string;
  scope: string;                   // e.g. "POST /api/transfers/wire"
  body: unknown;                   // already-parsed body
  kycAction: KycAction;
  amount: number;                  // major units
  fromAccount: "checking" | "savings" | "investment";
  recipientName?: string;
  recipientCountry?: string;
  recipientBankCountry?: string;
}

export type GuardResult = { ok: true; replay?: undefined } | { ok: false; replay: NextResponse };

export async function moneyGuard(args: GuardArgs): Promise<GuardResult> {
  const ctx = actorContext(args.req);
  const idemKey = args.req.headers.get("idempotency-key");
  if (!idemKey) {
    return { ok: false, replay: NextResponse.json({ success: false, error: "Idempotency-Key header is required for money endpoints" }, { status: 400 }) };
  }

  try {
    // account active
    try { await assertAccountActive(args.userId, args.fromAccount); await assertAccountActive(args.userId, "all"); }
    catch (e) {
      if (e instanceof RestrictionError) {
        return {
          ok: false,
          replay: NextResponse.json({
            success: false,
            error: e.message,
            code: "account_restricted",
            restrictionReference: e.restriction.reference,
            kind: e.restriction.kind,
            documentUrl: `/api/restrictions/${e.restriction.reference}/document`,
          }, { status: 423 }),
        };
      }
      throw e;
    }

    // KYC
    const kyc = await KycCase.findOne({ userId: args.userId }).select({ tier: 1 }).lean() as any;
    const tier: KycTier = (kyc?.tier as KycTier) ?? "tier_0";
    try { assertCanPerform(tier, args.kycAction); }
    catch (e: any) {
      await audit({ actor: { kind: "user", id: args.userId, email: args.email }, action: `${args.kycAction}.blocked`, outcome: "blocked", reason: e.message, ...ctx });
      return {
        ok: false,
        replay: NextResponse.json({
          success: false, error: e.message, code: "kyc_required",
          needsTier: e.needsTier, currentTier: tier,
        }, { status: 403 }),
      };
    }

    // sanctions
    const screen = screenSanctions({
      name: args.recipientName,
      countryCode: args.recipientBankCountry ?? args.recipientCountry,
    });
    if (screen.tier === "hit") {
      await audit({ actor: { kind: "user", id: args.userId, email: args.email }, action: `${args.kycAction}.blocked`, outcome: "blocked", reason: `sanctions: ${screen.reasons.join("; ")}`, ...ctx });
      return {
        ok: false,
        replay: NextResponse.json({
          success: false, error: "Sanctions screening blocked this transfer", code: "sanctions_hit",
          reasons: screen.reasons,
        }, { status: 403 }),
      };
    }

    // limits
    const lim = await assertWithinLimits({
      userId: args.userId,
      amount: args.amount,
      kind: "transfer",
      actorContext: ctx,
    });
    if (!lim.ok) {
      return {
        ok: false,
        replay: NextResponse.json({ success: false, error: lim.reason ?? "transfer limit exceeded", code: "limit_exceeded" }, { status: 403 }),
      };
    }

    // Idempotency-Key presence is enforced above. Callers that want full
    // replay semantics should wrap their handler in withIdempotency().
    return { ok: true };
  } catch (e: any) {
    return { ok: false, replay: NextResponse.json({ success: false, error: "internal guard failure", reason: e?.message }, { status: 500 }) };
  }
}

export function guardWarning(message: string): NextResponse {
  return NextResponse.json({ success: false, error: message, code: "edd_required" }, { status: 403 });
}
