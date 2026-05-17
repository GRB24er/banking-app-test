// src/app/api/kyc/submit/route.ts
// Customer KYC submission. Encrypts PII at rest, runs sanctions screen,
// moves the case to in_review.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import KycCase from "@/models/KycCase";
import User from "@/models/User";
import { encryptPII, searchHash } from "@/lib/crypto";
import { screenSanctions } from "@/lib/sanctions";
import { canTransition } from "@/lib/kyc";
import { audit, actorContext } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rateLimit";

interface KycPayload {
  legalName: string;
  dateOfBirth: string;
  ssn?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  countryCode: string;
  occupation?: string;
  sourceOfFunds?: string;
  documents?: { kind: string; storageKey?: string }[];
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ctx = actorContext(req);

  const rl = await checkRateLimit("kyc_submit", session.user.id);
  if (!rl.ok) {
    await audit({ actor: { kind: "user", id: session.user.id }, action: "kyc.submit", outcome: "blocked", reason: "rate_limited", ...ctx });
    return NextResponse.json({ error: "too many KYC submissions, please try again later" }, { status: 429 });
  }

  let body: KycPayload;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid JSON body" }, { status: 400 }); }

  if (!body.legalName || !body.dateOfBirth || !body.addressLine1 || !body.city || !body.postalCode || !body.countryCode) {
    return NextResponse.json({ error: "missing required KYC fields" }, { status: 400 });
  }

  await connectDB();

  const sanctions = screenSanctions({ name: body.legalName, countryCode: body.countryCode });

  let kyc = await KycCase.findOne({ userId: session.user.id });
  if (!kyc) {
    kyc = await KycCase.create({ userId: session.user.id, state: "not_started", tier: "tier_0" });
  }

  // Walk through the state machine: not_started → info_pending → documents_pending → in_review
  const path = ["info_pending", "documents_pending", "in_review"] as const;
  for (const next of path) {
    if (canTransition(kyc.state, next)) {
      kyc.state = next;
    }
  }

  kyc.legalNameEnc = encryptPII(body.legalName);
  kyc.dobEnc = encryptPII(body.dateOfBirth);
  if (body.ssn) {
    kyc.ssnEnc = encryptPII(body.ssn);
    kyc.ssnSearchHash = searchHash(body.ssn);
  }
  kyc.addressLine1Enc = encryptPII(body.addressLine1);
  if (body.addressLine2) kyc.addressLine2Enc = encryptPII(body.addressLine2);
  kyc.cityEnc = encryptPII(body.city);
  kyc.postalCodeEnc = encryptPII(body.postalCode);
  kyc.countryCode = body.countryCode.toUpperCase();
  kyc.occupation = body.occupation;
  kyc.sourceOfFunds = body.sourceOfFunds;
  if (body.documents?.length) {
    kyc.documents.push(...body.documents.map((d) => ({
      kind: d.kind as any,
      storageKey: d.storageKey,
      uploadedAt: new Date(),
    })));
  }
  kyc.sanctionsResult = { tier: sanctions.tier === "warning" ? "warning" : sanctions.tier === "hit" ? "hit" : "clear", reasons: sanctions.reasons };
  kyc.submittedAt = new Date();

  if (sanctions.tier === "hit") {
    kyc.state = "rejected";
    kyc.decision = {
      by: session.user.id as any,
      at: new Date(),
      outcome: "rejected",
      reason: `auto-rejected: ${sanctions.reasons.join("; ")}`,
    };
  }

  await kyc.save();

  await audit({
    actor: { kind: "user", id: session.user.id, email: session.user.email ?? undefined },
    action: "kyc.submit",
    outcome: sanctions.tier === "hit" ? "blocked" : "success",
    target: { kind: "kyc", id: String(kyc._id) },
    metadata: { state: kyc.state, sanctionsTier: sanctions.tier },
    ...ctx,
  });

  return NextResponse.json({
    state: kyc.state,
    tier: kyc.tier,
    sanctionsTier: sanctions.tier,
    reasons: sanctions.reasons,
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await connectDB();
  const kyc = await KycCase.findOne({ userId: session.user.id })
    .select({ state: 1, tier: 1, sanctionsResult: 1, submittedAt: 1, decision: 1, countryCode: 1 })
    .lean();
  return NextResponse.json({ kyc });
}
