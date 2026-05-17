// src/app/api/admin/email/route.ts
// Searchable sent items.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import AdminEmail from "@/models/AdminEmail";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "admin only" }, { status: 403 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));

  await connectDB();
  const filter: any = {};
  if (q) {
    filter.$or = [
      { subject: { $regex: q, $options: "i" } },
      { recipientEmail: { $regex: q, $options: "i" } },
    ];
  }
  const rows = await AdminEmail.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select({ recipientEmail: 1, subject: 1, bodyPreview: 1, status: 1, errorReason: 1, sentByEmail: 1, tag: 1, createdAt: 1, sentAt: 1, messageId: 1 })
    .lean();
  return NextResponse.json({ emails: rows });
}
