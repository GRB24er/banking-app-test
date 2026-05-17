// src/app/api/kyc/admin/decision/route.ts
// Admin approves or rejects a KYC case and awards a tier.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import KycCase, { type KycTier } from "@/models/KycCase";
import { canTransition } from "@/lib/kyc";
import { audit, actorContext } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }
  const ctx = actorContext(req);
  let body: { userId: string; outcome: "approved" | "rejected"; reason?: string; awardedTier?: KycTier };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid JSON body" }, { status: 400 }); }

  if (!body.userId || !["approved", "rejected"].includes(body.outcome)) {
    return NextResponse.json({ error: "userId and outcome required" }, { status: 400 });
  }

  await connectDB();
  const kyc = await KycCase.findOne({ userId: body.userId });
  if (!kyc) return NextResponse.json({ error: "no KYC case" }, { status: 404 });
  if (!canTransition(kyc.state, body.outcome)) {
    return NextResponse.json({ error: `cannot transition from ${kyc.state}` }, { status: 409 });
  }

  kyc.state = body.outcome;
  if (body.outcome === "approved") {
    kyc.tier = body.awardedTier ?? "tier_1";
    // Approved KYC expires after one year.
    kyc.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  }
  kyc.decision = {
    by: session.user.id as any,
    at: new Date(),
    outcome: body.outcome,
    reason: body.reason,
    awardedTier: body.outcome === "approved" ? kyc.tier : undefined,
  };
  await kyc.save();

  await audit({
    actor: { kind: "admin", id: session.user.id, email: session.user.email ?? undefined },
    action: `kyc.${body.outcome}`,
    target: { kind: "user", id: body.userId },
    outcome: "success",
    reason: body.reason,
    metadata: { tier: kyc.tier },
    ...ctx,
  });

  return NextResponse.json({ state: kyc.state, tier: kyc.tier });
}
