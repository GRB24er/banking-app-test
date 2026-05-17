// src/app/api/admin/email/send/route.ts
// Admin sends a branded email to a registered customer or ad-hoc address.
// Every send is logged to AdminEmail for audit + searchable Sent Items.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import AdminEmail from "@/models/AdminEmail";
import { renderEmail } from "@/lib/emailTemplate";
import { sendSimpleEmail } from "@/lib/mail";
import { audit, actorContext } from "@/lib/audit";

interface Payload {
  to?: string;                   // ad-hoc email
  toUserId?: string;             // or a registered user
  subject: string;
  tag?: string;
  headingText?: string;
  paragraphs?: string[];
  rawHtml?: string;
  cta?: { label: string; url: string };
  signature?: { name: string; title?: string; department?: string };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin" || !session.user.id) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }
  const ctx = actorContext(req);
  let body: Payload;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid JSON body" }, { status: 400 }); }
  if (!body.subject) return NextResponse.json({ error: "subject required" }, { status: 400 });
  if (!body.to && !body.toUserId) return NextResponse.json({ error: "to or toUserId required" }, { status: 400 });

  await connectDB();

  let recipientEmail = body.to ?? "";
  let recipientUserId: string | undefined;
  if (body.toUserId) {
    const u = await User.findById(body.toUserId).select({ email: 1 }).lean() as any;
    if (!u) return NextResponse.json({ error: "user not found" }, { status: 404 });
    recipientEmail = u.email;
    recipientUserId = body.toUserId;
  }

  const { html, text } = renderEmail({
    subject: body.subject,
    tag: body.tag,
    headingText: body.headingText,
    paragraphs: body.paragraphs,
    rawHtml: body.rawHtml,
    cta: body.cta,
    signature: body.signature,
  });

  const log = await AdminEmail.create({
    recipientEmail,
    recipientUserId,
    subject: body.subject,
    bodyPreview: text.slice(0, 200),
    bodyHtml: html,
    bodyText: text,
    tag: body.tag,
    ctaLabel: body.cta?.label,
    ctaUrl: body.cta?.url,
    signature: body.signature,
    status: "queued",
    sentBy: session.user.id,
    sentByEmail: session.user.email ?? undefined,
  });

  try {
    const result = await sendSimpleEmail(recipientEmail, body.subject, text, html);
    log.status = "sent";
    log.sentAt = new Date();
    log.messageId = (result as any)?.messageId;
    await log.save();
  } catch (err: any) {
    log.status = "failed";
    log.errorReason = err?.message;
    await log.save();
    await audit({
      actor: { kind: "admin", id: session.user.id },
      action: "admin.email.send",
      target: { kind: "email", id: String(log._id) },
      outcome: "failure",
      reason: err?.message,
      ...ctx,
    });
    return NextResponse.json({ error: "send failed", reason: err?.message }, { status: 502 });
  }

  await audit({
    actor: { kind: "admin", id: session.user.id, email: session.user.email ?? undefined },
    action: "admin.email.send",
    target: { kind: "email", id: String(log._id) },
    outcome: "success",
    metadata: { recipientEmail, subject: body.subject },
    ...ctx,
  });

  return NextResponse.json({ id: log._id, status: log.status, messageId: log.messageId });
}
