// src/app/api/admin/restrictions/route.ts
// Admin: list + issue account restrictions.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import AccountRestriction from "@/models/AccountRestriction";
import User from "@/models/User";
import { issueRestriction } from "@/lib/accountStatus";
import { actorContext } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "admin only" }, { status: 403 });
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const active = url.searchParams.get("active") === "true";

  await connectDB();
  const filter: any = {};
  if (userId) filter.userId = userId;
  if (active) filter.liftedAt = null;
  const rows = await AccountRestriction.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return NextResponse.json({ restrictions: rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin" || !session.user.id) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }
  const ctx = actorContext(req);

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid JSON body" }, { status: 400 }); }

  if (!body.userId || !body.kind || !body.reason) {
    return NextResponse.json({ error: "userId, kind, reason required" }, { status: 400 });
  }
  if (!["freeze", "block", "close"].includes(body.kind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }

  await connectDB();
  const target = await User.findById(body.userId).select({ _id: 1, email: 1 }).lean();
  if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const created = await issueRestriction({
    userId: body.userId,
    kind: body.kind,
    scope: body.scope ?? "all",
    reason: body.reason,
    reasonDetail: body.reasonDetail,
    effectiveUntil: body.effectiveUntil ? new Date(body.effectiveUntil) : null,
    issuedBy: session.user.id,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return NextResponse.json({ restriction: created });
}
