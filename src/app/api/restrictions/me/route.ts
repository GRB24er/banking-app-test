// src/app/api/restrictions/me/route.ts
// Customer view of their own current and historical restrictions.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import AccountRestriction from "@/models/AccountRestriction";
import { getActiveRestriction } from "@/lib/accountStatus";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await connectDB();
  const active = await getActiveRestriction(session.user.id);
  const history = await AccountRestriction.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(20)
    .select({ reference: 1, kind: 1, scope: 1, reason: 1, reasonDetail: 1, effectiveAt: 1, effectiveUntil: 1, liftedAt: 1, liftReason: 1 })
    .lean();
  return NextResponse.json({ active, history });
}
