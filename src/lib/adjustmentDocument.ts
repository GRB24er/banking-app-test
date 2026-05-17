// src/lib/adjustmentDocument.ts
//
// PDF receipts for manual adjustments and reversals. Three variants share
// most of the layout — colour and labelling change per kind.

const BRAND = { primary: "#0b1d3a", accent: "#c9a449" };

export type AdjustmentVariant = "credit" | "debit" | "reversal";

export interface AdjustmentDocArgs {
  variant: AdjustmentVariant;
  reference: string;             // ADJ-... or REV-...
  customer: { name: string; email: string; accountNumber?: string };
  amountMajor: string;           // formatted amount, e.g. "1,234.56"
  currency: string;
  balanceBefore?: string;
  balanceAfter?: string;
  reason: string;
  notes?: string;
  originalReference?: string;    // for reversals
  postedAt: Date;
  signatory: { name: string; title?: string };
  verifyUrl?: string;
}

const VARIANT = {
  credit:   { title: "Credit Adjustment Receipt",  hero: "#15803d", sign: "+" },
  debit:    { title: "Debit Adjustment Receipt",   hero: "#b91c1c", sign: "−" },
  reversal: { title: "Transaction Reversal Notice", hero: "#1d4ed8", sign: "↺" },
} as const;

export async function buildAdjustmentPdf(args: AdjustmentDocArgs): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const v = VARIANT[args.variant];

  doc.setFillColor(BRAND.accent);
  doc.rect(0, 0, w, 8, "F");

  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(BRAND.primary);
  doc.text("ZentriBank", 40, 50);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20);
  doc.text(v.title, 40, 100);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Reference: ${args.reference}`, 40, 118);
  doc.text(`Posted: ${args.postedAt.toUTCString()}`, 40, 132);

  // Hero amount
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(v.hero);
  doc.text(`${v.sign} ${args.currency} ${args.amountMajor}`, w - 40, 100, { align: "right" });

  // Particulars
  const rows: [string, string][] = [
    ["Customer", args.customer.name],
    ["Email", args.customer.email],
    ["Account", args.customer.accountNumber ?? "—"],
    ["Reason", args.reason],
  ];
  if (args.notes) rows.push(["Notes", args.notes]);
  if (args.originalReference) rows.push(["Original transaction", args.originalReference]);
  if (args.balanceBefore != null) rows.push(["Balance before", `${args.currency} ${args.balanceBefore}`]);
  if (args.balanceAfter != null) rows.push(["Balance after", `${args.currency} ${args.balanceAfter}`]);

  autoTable(doc, {
    startY: 170,
    head: [["Particulars", "Details"]],
    body: rows,
    headStyles: { fillColor: [11, 29, 58], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 140 } },
  });

  // Signatory
  doc.setDrawColor(180);
  doc.line(40, h - 110, 240, h - 110);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text(args.signatory.name, 40, h - 96);
  if (args.signatory.title) {
    doc.setTextColor(110);
    doc.setFontSize(9);
    doc.text(args.signatory.title, 40, h - 84);
  }

  if (args.verifyUrl) {
    doc.setTextColor(BRAND.primary);
    doc.textWithLink("Verify this document online", w - 180, h - 96, { url: args.verifyUrl });
  }

  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(
    "ZentriBank Capital plc · Authorised by the PRA, regulated by the FCA & PRA",
    40, h - 50,
  );

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
