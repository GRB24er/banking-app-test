// src/app/api/admin/restrictions/[id]/document/route.ts
// Returns the PDF notice for any restriction (admin scope).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import AccountRestriction from "@/models/AccountRestriction";
import User from "@/models/User";
import { buildRestrictionPdf } from "@/lib/restrictionDocument";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "admin only" }, { status: 403 });

  const { id } = await params;
  await connectDB();

  const filter = id.startsWith("RES-") ? { reference: id } : { _id: id };
  const r = await AccountRestriction.findOne(filter);
  if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });

  const u = await User.findById(r.userId).select({ name: 1, email: 1, accountNumber: 1 }).lean() as any;
  if (!u) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const baseUrl = req.headers.get("x-forwarded-host")
    ? `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("x-forwarded-host")}`
    : new URL(req.url).origin;

  const pdf = await buildRestrictionPdf({
    restriction: r,
    customer: { name: u.name, email: u.email, accountNumber: u.accountNumber },
    verifyUrl: `${baseUrl}/api/verify/${r.reference}`,
  });

  return new Response(pdf as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${r.reference}.pdf"`,
    },
  });
}
