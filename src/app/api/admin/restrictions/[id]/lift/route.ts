// src/app/api/admin/restrictions/[id]/lift/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import { liftRestriction } from "@/lib/accountStatus";
import { actorContext } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin" || !session.user.id) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }
  const { id } = await params;
  const ctx = actorContext(req);

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid JSON body" }, { status: 400 }); }
  if (!body?.reason) return NextResponse.json({ error: "reason required" }, { status: 400 });

  await connectDB();
  try {
    const doc = await liftRestriction({
      refOrId: id,
      liftedBy: session.user.id,
      reason: body.reason,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return NextResponse.json({ restriction: doc });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
