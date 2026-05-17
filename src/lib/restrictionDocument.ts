// src/lib/restrictionDocument.ts
//
// Generates an "Account Restriction Notice" PDF. Lazy-loads jsPDF / autotable
// (browser-only modules) at call time so this file can be imported safely
// from anywhere.

import type { IAccountRestriction } from "@/models/AccountRestriction";

const BRAND = { primary: "#0b1d3a", accent: "#c9a449" };

const KIND_TITLE: Record<string, string> = {
  freeze: "Account Freeze",
  block: "Account Block",
  close: "Account Closure",
};

const REASON_LABEL: Record<string, string> = {
  aml_review: "Anti-Money-Laundering review",
  fraud_suspected: "Suspected fraudulent activity",
  court_order: "Court order",
  sanctions_hit: "Sanctions screening match",
  kyc_lapsed: "KYC requirements not met",
  deceased: "Customer deceased",
  regulatory_request: "Regulatory request",
  duplicate_account: "Duplicate account",
  chargeback_dispute: "Chargeback dispute",
  customer_request: "Customer request",
  compliance_review: "Compliance review",
  other: "Other",
};

const SUSPENDED_BY_KIND: Record<string, string[]> = {
  freeze: ["Outgoing transfers", "Card spending", "Bill payments", "New loan applications"],
  block: ["All outbound and inbound activity", "Card spending", "Bill payments", "Wire transfers", "Account login may be restricted"],
  close: ["All future activity", "Card spending", "Online banking access (after the grace period)"],
};

const PERMITTED_BY_KIND: Record<string, string[]> = {
  freeze: ["Viewing balances and statements", "Receiving inbound deposits", "Contacting Compliance for review"],
  block: ["Viewing balances and statements", "Contacting Compliance to provide requested information"],
  close: ["Withdrawing remaining balance within the grace period", "Downloading historical statements"],
};

export interface RestrictionDocArgs {
  restriction: IAccountRestriction;
  customer: { name: string; email: string; accountNumber?: string };
  verifyUrl?: string;            // QR-back to /api/verify/<ref>
}

export async function buildRestrictionPdf(args: RestrictionDocArgs): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Gold band header
  doc.setFillColor(BRAND.accent);
  doc.rect(0, 0, w, 8, "F");

  // Wordmark
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(BRAND.primary);
  doc.text("ZentriBank", 40, 50);

  // Document title
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text("Official notice — please retain for your records", 40, 68);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20);
  doc.text(KIND_TITLE[args.restriction.kind] ?? "Account Notice", 40, 110);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Reference: ${args.restriction.reference}`, 40, 128);
  doc.text(`Issued: ${new Date(args.restriction.effectiveAt).toUTCString()}`, 40, 142);

  // Watermark
  doc.saveGraphicsState();
  // jsPDF GState typings vary by version; cast keeps us safe across them.
  (doc as any).setGState(new (doc as any).GState({ opacity: 0.07 }));
  doc.setFont("times", "bold");
  doc.setFontSize(80);
  doc.setTextColor(BRAND.primary);
  doc.text(args.restriction.kind.toUpperCase(), w / 2, h / 2, { align: "center", angle: -30 });
  doc.restoreGraphicsState();

  // Particulars table
  autoTable(doc, {
    startY: 170,
    head: [["Particulars", "Details"]],
    body: [
      ["Customer", args.customer.name],
      ["Email", args.customer.email],
      ["Account", args.customer.accountNumber ?? "—"],
      ["Notice type", KIND_TITLE[args.restriction.kind] ?? args.restriction.kind],
      ["Scope", args.restriction.scope === "all" ? "All accounts" : args.restriction.scope],
      ["Reason", REASON_LABEL[args.restriction.reason] ?? args.restriction.reason],
      ["Effective from", new Date(args.restriction.effectiveAt).toUTCString()],
      ["Effective until", args.restriction.effectiveUntil ? new Date(args.restriction.effectiveUntil).toUTCString() : "Until lifted"],
      ["Additional detail", args.restriction.reasonDetail ?? "—"],
    ],
    headStyles: { fillColor: [11, 29, 58], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 140 } },
  });

  let y = (doc as any).lastAutoTable.finalY + 24;

  // Suspended bullets
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(BRAND.primary);
  doc.text("What this means", 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text("The following activity is suspended:", 40, y);
  y += 14;
  for (const line of SUSPENDED_BY_KIND[args.restriction.kind] ?? []) {
    doc.text("•  " + line, 56, y);
    y += 14;
  }
  y += 8;
  doc.text("The following remains available:", 40, y);
  y += 14;
  for (const line of PERMITTED_BY_KIND[args.restriction.kind] ?? []) {
    doc.text("•  " + line, 56, y);
    y += 14;
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(
    "Issued by ZentriBank Capital plc · Authorised by the PRA, regulated by the FCA & PRA · Registered No. 04567892",
    40, h - 60,
  );

  // Signatory line
  doc.setDrawColor(180);
  doc.line(40, h - 90, 240, h - 90);
  doc.setFontSize(9);
  doc.text("Authorised Signatory · Compliance & Risk", 40, h - 78);

  // Verify URL (text — a real impl would embed a QR code)
  if (args.verifyUrl) {
    doc.setTextColor(BRAND.primary);
    doc.textWithLink("Verify this notice online", w - 180, h - 78, { url: args.verifyUrl });
  }

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
