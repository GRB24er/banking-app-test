// src/lib/mail.ts - ZENTRIBANK - NAMECHEAP PRIVATE EMAIL SMTP
import nodemailer, { Transporter, SentMessageInfo } from "nodemailer";

/** ==============================
 * NAMECHEAP PRIVATE EMAIL SMTP CONFIGURATION
 * ============================== */
const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const SMTP_SECURE = true;
const SMTP_USER = "admin@zentribank.capital"
const SMTP_PASS = "Valmont15#Benjamin2010";

// Brand Configuration
const BRAND_NAME = "ZentriBank Capital";
const BRAND_SHORT = "ZentriBank";
const BRAND_DOMAIN = "zentribank.capital";
const BRAND_TAGLINE = "Secure Digital Banking";
const BRAND_YEAR_FOUNDED = "2020";

// Brand Colors
const BRAND_COLORS = {
  gold: "#c9a962",
  goldDark: "#a8935f",
  goldLight: "#d4b978",
  navy: "#1a1f2e",
  navyLight: "#252b3d",
  cream: "#faf9f7",
  white: "#ffffff",
  textPrimary: "#1a1f2e",
  textSecondary: "#5a6170",
  textMuted: "#8a8f9c",
  success: "#10b981",
  successDark: "#047857",
  warning: "#f59e0b",
  warningDark: "#92400e",
  error: "#ef4444",
  errorDark: "#dc2626",
};

// Email Configuration
const FROM_DISPLAY = `${BRAND_NAME} <${SMTP_USER}>`;
const ENVELOPE_FROM = SMTP_USER;
const REPLY_TO = SMTP_USER;
const SUPPORT_EMAIL = "admin@zentribank.capital";
const LIST_UNSUBSCRIBE = `<mailto:${SMTP_USER}?subject=Unsubscribe>`;

// Connection Pool Settings
const POOL_CONFIG = {
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 10,
};

// Timeout Settings
const TIMEOUT_CONFIG = {
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
};

let cachedTransporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    ...POOL_CONFIG,
    ...TIMEOUT_CONFIG,
    logger: false,
    debug: false,
    tls: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
  });

  try {
    if (cachedTransporter) {
      await cachedTransporter.verify();
      console.log("[mail] ✅ Namecheap SMTP connection verified successfully");
    }
  } catch (err) {
    console.error("[mail] ❌ Namecheap SMTP verification failed:", err);
  }

  return cachedTransporter as Transporter;
}

/** ==============================
 * EMAIL TEMPLATE HELPERS
 * ============================== */
function getEmailHeader(title: string, subtitle?: string): string {
  return `
    <div style="background: linear-gradient(135deg, ${BRAND_COLORS.navy} 0%, ${BRAND_COLORS.navyLight} 100%); padding: 40px 30px; text-align: center; border-bottom: 4px solid ${BRAND_COLORS.gold};">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: ${BRAND_COLORS.gold}; letter-spacing: 0.05em;">${BRAND_NAME.toUpperCase()}</h1>
      <p style="margin: 8px 0 0; font-size: 12px; color: rgba(255,255,255,0.7); letter-spacing: 0.15em; text-transform: uppercase;">${BRAND_TAGLINE}</p>
      ${subtitle ? `<p style="margin: 20px 0 0; font-size: 18px; color: ${BRAND_COLORS.white}; font-weight: 600;">${title}</p>` : ''}
      ${subtitle ? `<p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">${subtitle}</p>` : `<p style="margin: 20px 0 0; font-size: 20px; color: ${BRAND_COLORS.white}; font-weight: 600;">${title}</p>`}
    </div>
  `;
}

function getEmailFooter(): string {
  const year = new Date().getFullYear();
  return `
    <div style="background: ${BRAND_COLORS.navy}; padding: 30px; text-align: center; border-top: 1px solid rgba(201,169,98,0.3);">
      <p style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: ${BRAND_COLORS.gold};">${BRAND_NAME}</p>
      <p style="margin: 0 0 5px; font-size: 12px; color: rgba(255,255,255,0.6);">ZentriBank Capital · Member FDIC · NMLS #2024001</p>
      <p style="margin: 0 0 15px; font-size: 12px; color: rgba(255,255,255,0.5);">Deposits insured up to $250,000 per depositor per account category</p>
      <div style="margin: 15px 0; padding: 15px 0; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1);">
        <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.4);">
          This is an automated message from ${BRAND_NAME}. Please do not reply directly to this email.
        </p>
      </div>
      <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.4);">
        © ${year} ${BRAND_NAME}. All rights reserved.
      </p>
    </div>
  `;
}

function getEmailWrapper(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>${BRAND_NAME}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${BRAND_COLORS.cream}; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: ${BRAND_COLORS.textPrimary};">
      <div style="max-width: 600px; margin: 0 auto; background-color: ${BRAND_COLORS.white}; box-shadow: 0 4px 24px rgba(26,31,46,0.12);">
        ${content}
      </div>
    </body>
    </html>
  `;
}

/** ==============================
 * TRANSACTION HELPERS
 * ============================== */
type TxLike = {
  _id?: any;
  userId?: any;
  reference?: string;
  type?: string;
  currency?: string;
  amount?: number | string;
  description?: string;
  status?: string;
  date?: Date | string;
  accountType?: "checking" | "savings" | "investment" | string;
  posted?: boolean;
  postedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  channel?: string;
  origin?: string;
  editedDateByAdmin?: boolean;
  toObject?: () => any;
};

type NormalizedTx = {
  _id: string;
  userId: string;
  reference: string;
  type: string;
  currency: string;
  amount: number;
  description: string;
  status: string;
  date: Date;
  accountType: "checking" | "savings" | "investment" | string;
  posted: boolean;
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  channel?: string;
  origin?: string;
  editedDateByAdmin: boolean;
};

function toDate(val: any, fallback = new Date()): Date {
  const d = val instanceof Date ? val : new Date(val);
  return isNaN(d.getTime()) ? fallback : d;
}

function normalizeTx(input: TxLike): NormalizedTx {
  const raw = typeof input?.toObject === "function" ? (input.toObject() as TxLike) : input;

  return {
    _id: String(raw._id ?? ""),
    userId: String(raw.userId ?? ""),
    reference: String(raw.reference ?? ""),
    type: String(raw.type ?? "deposit"),
    currency: String(raw.currency ?? "USD"),
    amount:
      typeof raw.amount === "string"
        ? Number(raw.amount.replace(/[^\d.-]/g, "")) || 0
        : Number(raw.amount ?? 0),
    description: String(raw.description ?? "Bank transaction"),
    status: String(raw.status ?? "pending"),
    date: toDate(raw.date),
    accountType: (raw.accountType as any) ?? "checking",
    posted: Boolean(raw.posted ?? false),
    postedAt: raw.postedAt ? toDate(raw.postedAt) : null,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
    channel: raw.channel,
    origin: raw.origin,
    editedDateByAdmin: Boolean(raw.editedDateByAdmin ?? false),
  };
}

function statusLabel(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "approved" || s === "completed") return "Completed";
  if (s === "pending_verification") return "Pending Verification";
  if (s === "rejected") return "Rejected";
  if (s === "processing") return "Processing";
  return "Pending";
}

function getStatusColors(label: string): { bg: string; text: string } {
  switch (label) {
    case "Completed":
      return { bg: "#dcfce7", text: "#166534" };
    case "Rejected":
      return { bg: "#fee2e2", text: "#991b1b" };
    case "Processing":
      return { bg: "#dbeafe", text: "#1e40af" };
    default:
      return { bg: "#fef3c7", text: "#92400e" };
  }
}

function isCredit(type: string): boolean {
  const t = (type || "").toLowerCase();
  return t.includes("deposit") || t.includes("transfer-in") || t.includes("interest") || t.includes("adjustment-credit") || t.includes("credit");
}

function isDebit(type: string): boolean {
  const t = (type || "").toLowerCase();
  return t.includes("withdraw") || t.includes("transfer-out") || t.includes("fee") || t.includes("adjustment-debit") || t.includes("debit");
}

// ============================================
// FIX: Format amount WITHOUT currency symbols for subject lines
// Namecheap blocks emails with $, €, £, ¥ in subject
// ============================================
function fmtAmountPlain(n: number, currency = "USD"): string {
  // Returns: "500.00 USD" instead of "$500.00"
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));
  return `${formatted} ${currency}`;
}

// Format with currency symbol (for HTML body only, NOT subject)
function fmtAmount(n: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(n || 0));
  } catch {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(n || 0));
  }
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** ==============================
 * CORE SENDER WITH RETRIES
 * ============================== */
const TRANSIENT_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ESOCKET",
  "EPIPE",
  "ENOTFOUND",
  "EHOSTUNREACH",
]);

async function sendWithRetry(
  options: Parameters<Transporter["sendMail"]>[0],
  maxAttempts = 3
): Promise<SentMessageInfo & { failed?: boolean; error?: string; skipped?: boolean }> {
  const transporter = await getTransporter();
  let attempt = 0;
  let lastErr: any = null;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const info = await transporter.sendMail(options);
      console.log(`[mail] ✅ Email sent (attempt ${attempt}/${maxAttempts}): ${info.messageId}`);
      return info;
    } catch (err: any) {
      lastErr = err;
      const code = err?.code || err?.responseCode || "";
      const message = err?.message || String(err);
      const transient =
        TRANSIENT_CODES.has(code) ||
        /timed?out/i.test(message) ||
        /connection.*closed/i.test(message);

      console.warn(`[mail] ⚠️ Send attempt ${attempt} failed:`, {
        code,
        message: message.substring(0, 200),
        transient,
      });

      if (
        /EAUTH|ENVELOPE|EENVELOPE|EADDR/i.test(code) ||
        /auth/i.test(message) ||
        /invalid.*recipient/i.test(message) ||
        /user.*not.*found/i.test(message)
      ) {
        console.error("[mail] ❌ Permanent error, not retrying");
        break;
      }

      if (attempt < maxAttempts && transient) {
        const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`[mail] 🔄 Retrying in ${backoff}ms...`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      break;
    }
  }

  console.error("[mail] ❌ Final failure:", lastErr?.code || "", lastErr?.message || lastErr);

  return {
    accepted: [],
    rejected: [options.to].flat(),
    envelope: { from: ENVELOPE_FROM, to: options.to as any },
    messageId: "FAILED-" + Date.now(),
    failed: true,
    error: lastErr?.message || String(lastErr),
    response: lastErr?.response || undefined,
  } as any;
}

/** ==============================
 * PUBLIC APIs - ALL EXPORTS
 * ============================== */

// 1) Transaction Email - FIXED: No currency symbols in subject
export async function sendTransactionEmail(
  to: string | string[],
  args: { name?: string; transaction: TxLike }
) {
  const recipientList = Array.isArray(to) ? to : [to].filter(Boolean);
  if (recipientList.length === 0) {
    console.warn("[mail] No recipients provided");
    return {
      accepted: [],
      rejected: [],
      skipped: true as const,
      messageId: "SKIPPED-NO-RECIPIENT-" + Date.now(),
    };
  }

  const tx = normalizeTx(args.transaction);
  const label = statusLabel(tx.status);
  const statusColors = getStatusColors(label);
  
  // For HTML body - use currency symbols (looks nice)
  const signedAmount = (isCredit(tx.type) ? "+" : isDebit(tx.type) ? "-" : "") + fmtAmount(tx.amount, tx.currency);
  const amountColor = isCredit(tx.type) ? BRAND_COLORS.success : BRAND_COLORS.error;
  
  // ============================================
  // FIX: Subject line WITHOUT currency symbols
  // Old: "Transaction Completed: Deposit +$500.00"  ← BLOCKED
  // New: "Transaction Completed: Deposit 500.00 USD" ← WORKS
  // ============================================
  const subjectAmount = fmtAmountPlain(tx.amount, tx.currency);
  const subjectDirection = isCredit(tx.type) ? "Credit" : isDebit(tx.type) ? "Debit" : "";
  const subject = `Transaction ${label} - ${subjectDirection} ${subjectAmount}`.replace(/\s+/g, ' ').trim();
  
  const greetingName = args.name || "Valued Client";

  const content = `
    ${getEmailHeader("Transaction Notification", `Your transaction is now ${label.toLowerCase()}`)}
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.textPrimary};">Dear ${greetingName},</p>
      <p style="margin: 0 0 30px; font-size: 15px; color: ${BRAND_COLORS.textSecondary};">
        We are writing to confirm that a recent transaction on your account has been processed. Please find the details below.
      </p>
      
      <div style="background: ${BRAND_COLORS.cream}; border-radius: 12px; padding: 24px; margin-bottom: 30px; border: 1px solid rgba(201,169,98,0.2);">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(201,169,98,0.15);">Reference</td>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textPrimary}; font-weight: 600; text-align: right; border-bottom: 1px solid rgba(201,169,98,0.15);">${tx.reference || String(tx._id)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(201,169,98,0.15);">Description</td>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textPrimary}; font-weight: 500; text-align: right; border-bottom: 1px solid rgba(201,169,98,0.15);">${tx.description}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(201,169,98,0.15);">Type</td>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textPrimary}; font-weight: 500; text-align: right; text-transform: capitalize; border-bottom: 1px solid rgba(201,169,98,0.15);">${tx.type.replace(/-/g, " ")}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(201,169,98,0.15);">Amount</td>
            <td style="padding: 12px 0; font-weight: 700; font-size: 20px; text-align: right; color: ${amountColor}; border-bottom: 1px solid rgba(201,169,98,0.15);">${signedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(201,169,98,0.15);">Status</td>
            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid rgba(201,169,98,0.15);">
              <span style="display: inline-block; padding: 6px 16px; background: ${statusColors.bg}; color: ${statusColors.text}; border-radius: 20px; font-size: 13px; font-weight: 600;">${label}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(201,169,98,0.15);">Date & Time</td>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textPrimary}; font-weight: 500; text-align: right; border-bottom: 1px solid rgba(201,169,98,0.15);">${fmtDate(tx.date)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Account</td>
            <td style="padding: 12px 0; color: ${BRAND_COLORS.textPrimary}; font-weight: 500; text-align: right; text-transform: capitalize;">${tx.accountType} Account</td>
          </tr>
        </table>
      </div>
      
      <div style="background: linear-gradient(135deg, rgba(201,169,98,0.1) 0%, rgba(201,169,98,0.05) 100%); border-left: 4px solid ${BRAND_COLORS.gold}; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
        <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
          <strong style="color: ${BRAND_COLORS.textPrimary};">Security Notice:</strong> If you did not authorize this transaction, please contact our Customer Support immediately at <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_COLORS.gold}; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a>
        </p>
      </div>
      
      <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">
        Thank you for banking with ${BRAND_NAME}.
      </p>
    </div>
    ${getEmailFooter()}
  `;

  const text = `
Dear ${greetingName},

We are writing to confirm that a recent transaction on your account has been processed.

TRANSACTION DETAILS
-------------------
Reference: ${tx.reference || String(tx._id)}
Description: ${tx.description}
Type: ${tx.type}
Amount: ${signedAmount}
Status: ${label}
Date & Time: ${fmtDate(tx.date)}
Account: ${tx.accountType}

SECURITY NOTICE
If you did not authorize this transaction, please contact our Customer Support immediately at ${SUPPORT_EMAIL}.

Thank you for banking with ${BRAND_NAME}.

---
${BRAND_NAME}
ZentriBank Capital · Member FDIC · NMLS #2024001
© ${new Date().getFullYear()} All rights reserved.
  `.trim();

  return sendWithRetry(
    {
      from: FROM_DISPLAY,
      replyTo: REPLY_TO,
      envelope: { from: ENVELOPE_FROM, to: recipientList },
      to: recipientList,
      subject,
      text,
      html: getEmailWrapper(content),
      headers: {
        "List-Unsubscribe": LIST_UNSUBSCRIBE,
        "X-Transaction-Reference": tx.reference || String(tx._id),
        "X-Transaction-Type": String(tx.type),
        "X-Transaction-Status": label,
        "X-Priority": "2",
      },
    },
    3
  );
}

// 1b) Transaction Rejection Email - formal decline notice with compliance copy
export interface TransactionRejectionEmailArgs {
  name?: string;
  transaction: TxLike;
  declineCode?: string;
  declineReason?: string;
  caseId?: string;
  caseUrl?: string;
  beneficiary?: { name?: string; bank?: string; account?: string };
  sourceAccount?: string;
  requireDocuments?: boolean;
  deadlineDate?: string | Date;
  amlNotice?: boolean;
}

export async function sendTransactionRejectionEmail(
  to: string | string[],
  args: TransactionRejectionEmailArgs
) {
  const recipientList = Array.isArray(to) ? to : [to].filter(Boolean);
  if (recipientList.length === 0) {
    console.warn("[mail] No recipients provided for rejection email");
    return {
      accepted: [],
      rejected: [],
      skipped: true as const,
      messageId: "SKIPPED-NO-RECIPIENT-" + Date.now(),
    };
  }

  const tx = normalizeTx(args.transaction);
  const customerName = args.name || "Valued Client";
  const customerEmail = recipientList[0];
  const txType = (tx.type || "").toLowerCase();
  const isWire = txType.includes("wire") || tx.origin === "wire_transfer";
  const isInternational = txType.includes("international") || tx.origin === "international_transfer";
  const transferLabel = isWire ? "Wire transfer" : isInternational ? "International transfer" : "Transaction";

  const caseId = args.caseId || `RJ-${(tx.reference || tx._id).toString().slice(-10).toUpperCase()}`;
  const caseUrl = args.caseUrl || `https://${BRAND_DOMAIN}/dashboard/transactions`;
  const declineReason = args.declineReason || "Following review, this transaction did not satisfy our internal verification controls.";
  const declineCode = args.declineCode || (isWire || isInternational ? "AML-REVIEW-001" : "ADMIN-DECLINE");
  const amountFmt = fmtAmount(tx.amount, tx.currency);
  const dateFmt = fmtDate(tx.date);
  const deadlineFmt = args.deadlineDate ? fmtDate(args.deadlineDate) : "";
  const year = new Date().getFullYear();
  const showAmlNotice = args.amlNotice ?? (isWire || isInternational);

  const subjectAmount = fmtAmountPlain(tx.amount, tx.currency);
  const subject = `${transferLabel} Rejected - ${subjectAmount} - Case ${caseId}`;

  const beneficiaryRows = args.beneficiary
    ? `
              ${args.beneficiary.name ? `
              <tr>
                <td style="padding:6px 0; font-size:13px; color:#6b7280;" class="text-secondary">Beneficiary</td>
                <td style="padding:6px 0; font-size:13px; color:#0a1628;" class="text-primary">${escapeHtml(args.beneficiary.name)}</td>
              </tr>` : ""}
              ${args.beneficiary.bank ? `
              <tr>
                <td style="padding:6px 0; font-size:13px; color:#6b7280;" class="text-secondary">Beneficiary bank</td>
                <td style="padding:6px 0; font-size:13px; color:#0a1628;" class="text-primary">${escapeHtml(args.beneficiary.bank)}</td>
              </tr>` : ""}`
    : "";

  const nextStepsBlock = args.requireDocuments
    ? `
          <tr>
            <td class="px-mobile" style="padding: 0 40px 8px 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <h2 class="text-primary" style="margin:0 0 12px 0; font-size:16px; font-weight:600; color:#0a1628;">
                Required next steps
              </h2>
              <p class="text-primary" style="margin:0 0 12px 0; font-size:14px; line-height:22px; color:#2d3748;">
                To proceed with this or any future transfer to the same beneficiary, please provide the following documentation${deadlineFmt ? ` by <strong>${deadlineFmt}</strong>` : ""}:
              </p>
              <ul class="text-primary" style="margin:0 0 20px 0; padding-left:20px; font-size:14px; line-height:24px; color:#2d3748;">
                <li>Government-issued photo identification (passport or national ID)</li>
                <li>Proof of address dated within the last three months</li>
                <li>Source of funds documentation (recent payslip, bank statement, or signed declaration)</li>
                <li>Purpose of payment and supporting documentation (invoice, contract, or payment justification)</li>
                <li>Relationship to the beneficiary</li>
              </ul>
              <p class="text-primary" style="margin:0 0 24px 0; font-size:14px; line-height:22px; color:#2d3748;">
                Documents must be submitted through your secure ${BRAND_SHORT} portal, quoting case reference <strong>${caseId}</strong>.
              </p>
            </td>
          </tr>`
    : "";

  const amlBlock = showAmlNotice
    ? `${BRAND_SHORT} is required by law to conduct these checks and may be prohibited from disclosing further details regarding the specific reason for this rejection. We are not permitted to discuss this matter over the telephone.`
    : `For your security, our team is unable to discuss the specific decision criteria over the telephone. Please use the secure case portal for all correspondence regarding this case.`;

  const introParagraph = showAmlNotice
    ? `This decision was made in accordance with our regulatory obligations under applicable Anti-Money Laundering (AML), Counter-Terrorist Financing (CTF), and sanctions screening frameworks.`
    : `This decision was made after internal review of the transaction. No funds have been debited from your account.`;

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <meta name="x-apple-disable-message-reformatting">
  <title>${transferLabel} Notification - ${BRAND_SHORT}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; max-width: 100% !important; }
      .px-mobile { padding-left: 24px !important; padding-right: 24px !important; }
      .h1-mobile { font-size: 22px !important; line-height: 28px !important; }
    }
    @media (prefers-color-scheme: dark) {
      .bg-page { background-color: #0b0f17 !important; }
      .bg-card { background-color: #131826 !important; }
      .bg-detail { background-color: #1a2030 !important; }
      .bg-alert { background-color: #2a1f12 !important; border-color: #4a3a1f !important; }
      .text-primary { color: #e6e9ef !important; }
      .text-secondary { color: #9ba3b4 !important; }
      .text-muted { color: #6c7385 !important; }
      .border-soft { border-color: #2a3142 !important; }
    }
  </style>
</head>
<body class="bg-page" style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#f3f4f6;">
    Your ${transferLabel.toLowerCase()} ${escapeHtml(tx.reference || String(tx._id))} could not be processed. Case reference ${caseId}. Action required.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="bg-page" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container bg-card" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td class="px-mobile" style="padding: 28px 40px; background-color:#0a1628; border-bottom: 3px solid ${BRAND_COLORS.gold};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:20px; font-weight:600; color:#ffffff; letter-spacing:0.5px;">
                    ${BRAND_SHORT.toUpperCase()}
                  </td>
                  <td align="right" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:11px; color:${BRAND_COLORS.gold}; letter-spacing:1px; text-transform:uppercase;">
                    Secure Notification
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="px-mobile" style="padding: 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="bg-alert" style="margin-top:32px; background-color:#fef3e2; border:1px solid #f0c674; border-radius:6px;">
                <tr>
                  <td style="padding: 14px 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:13px; font-weight:600; color:#7a4e0f; letter-spacing:0.3px; text-transform:uppercase;">
                    Transaction Rejected${args.requireDocuments ? " - Action Required" : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="px-mobile" style="padding: 28px 40px 8px 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <h1 class="text-primary h1-mobile" style="margin:0 0 16px 0; font-size:24px; line-height:32px; font-weight:600; color:#0a1628;">
                ${transferLabel} could not be completed
              </h1>
              <p class="text-primary" style="margin:0 0 16px 0; font-size:15px; line-height:24px; color:#2d3748;">
                Dear ${escapeHtml(customerName)},
              </p>
              <p class="text-primary" style="margin:0 0 16px 0; font-size:15px; line-height:24px; color:#2d3748;">
                We are writing to inform you that the ${transferLabel.toLowerCase()} referenced below has been rejected following review. The transaction has not been processed, and no funds have been debited from your account.
              </p>
              <p class="text-primary" style="margin:0 0 24px 0; font-size:15px; line-height:24px; color:#2d3748;">
                ${introParagraph}
              </p>
            </td>
          </tr>
          <tr>
            <td class="px-mobile" style="padding: 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="bg-detail border-soft" style="background-color:#f8f9fb; border:1px solid #e5e7eb; border-radius:6px;">
                <tr>
                  <td style="padding: 20px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    <p class="text-muted" style="margin:0 0 16px 0; font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:#6b7280;">
                      Transaction Details
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding:6px 0; font-size:13px; color:#6b7280; width:45%;" class="text-secondary">Reference</td>
                        <td style="padding:6px 0; font-size:13px; color:#0a1628; font-family: 'SF Mono', Menlo, Consolas, monospace; font-weight:500;" class="text-primary">${escapeHtml(tx.reference || String(tx._id))}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13px; color:#6b7280;" class="text-secondary">Date initiated</td>
                        <td style="padding:6px 0; font-size:13px; color:#0a1628;" class="text-primary">${dateFmt}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13px; color:#6b7280;" class="text-secondary">Amount</td>
                        <td style="padding:6px 0; font-size:13px; color:#0a1628; font-weight:600;" class="text-primary">${amountFmt}</td>
                      </tr>${beneficiaryRows}
                      <tr>
                        <td style="padding:6px 0; font-size:13px; color:#6b7280;" class="text-secondary">From account</td>
                        <td style="padding:6px 0; font-size:13px; color:#0a1628; font-family: 'SF Mono', Menlo, Consolas, monospace;" class="text-primary">${escapeHtml(args.sourceAccount || `${tx.accountType} account`)}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13px; color:#6b7280;" class="text-secondary">Case reference</td>
                        <td style="padding:6px 0; font-size:13px; color:#0a1628; font-family: 'SF Mono', Menlo, Consolas, monospace; font-weight:500;" class="text-primary">${caseId}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="px-mobile" style="padding: 28px 40px 8px 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <h2 class="text-primary" style="margin:0 0 12px 0; font-size:16px; font-weight:600; color:#0a1628;">
                Reason for rejection
              </h2>
              <p class="text-primary" style="margin:0 0 8px 0; font-size:14px; line-height:22px; color:#2d3748;">
                <strong>Decline code:</strong> ${escapeHtml(declineCode)}
              </p>
              <p class="text-primary" style="margin:0 0 24px 0; font-size:14px; line-height:22px; color:#2d3748;">
                ${escapeHtml(declineReason)}
              </p>
            </td>
          </tr>
          ${nextStepsBlock}
          <tr>
            <td class="px-mobile" align="left" style="padding: 0 40px 32px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:6px; background-color:#0a1628;">
                    <a href="${caseUrl}" target="_blank" style="display:inline-block; padding:14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:6px; letter-spacing:0.3px;">
                      View transaction in portal
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="px-mobile" style="padding: 0 40px 28px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="bg-detail border-soft" style="background-color:#f8f9fb; border-left:3px solid ${BRAND_COLORS.gold}; border-radius:4px;">
                <tr>
                  <td style="padding: 16px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    <p class="text-primary" style="margin:0 0 8px 0; font-size:13px; font-weight:600; color:#0a1628;">
                      Important
                    </p>
                    <p class="text-secondary" style="margin:0; font-size:13px; line-height:20px; color:#4a5568;">
                      ${amlBlock}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="px-mobile" style="padding: 0 40px 32px 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <p class="text-secondary" style="margin:0; font-size:13px; line-height:22px; color:#4a5568;">
                For questions regarding this notification, contact our team at
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#0a1628; text-decoration:underline;">${SUPPORT_EMAIL}</a>,
                quoting case reference <strong>${caseId}</strong>. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
          <tr>
            <td class="px-mobile bg-detail border-soft" style="padding: 24px 40px; background-color:#f8f9fb; border-top:1px solid #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <p class="text-muted" style="margin:0 0 8px 0; font-size:11px; line-height:16px; color:#6b7280;">
                This is an automated notification sent to ${escapeHtml(customerEmail)}. The information contained in this email is confidential and intended solely for the addressee.
              </p>
              <p class="text-muted" style="margin:0; font-size:11px; line-height:16px; color:#6b7280;">
                &copy; ${year} ${BRAND_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${transferLabel.toUpperCase()} REJECTED

Dear ${customerName},

We are writing to inform you that the ${transferLabel.toLowerCase()} referenced below has been rejected following review. The transaction has not been processed, and no funds have been debited from your account.

${introParagraph}

TRANSACTION DETAILS
-------------------
Reference:       ${tx.reference || String(tx._id)}
Date initiated:  ${dateFmt}
Amount:          ${amountFmt}${args.beneficiary?.name ? `
Beneficiary:     ${args.beneficiary.name}` : ""}${args.beneficiary?.bank ? `
Beneficiary bank: ${args.beneficiary.bank}` : ""}
From account:    ${args.sourceAccount || `${tx.accountType} account`}
Case reference:  ${caseId}

REASON FOR REJECTION
--------------------
Decline code: ${declineCode}
${declineReason}
${args.requireDocuments ? `
REQUIRED NEXT STEPS
-------------------
Please provide the following documentation${deadlineFmt ? ` by ${deadlineFmt}` : ""}:
  - Government-issued photo identification
  - Proof of address (within the last 3 months)
  - Source of funds documentation
  - Purpose of payment and supporting documentation
  - Relationship to the beneficiary

Submit documents through your secure ${BRAND_SHORT} portal, quoting case reference ${caseId}.
` : ""}
IMPORTANT
${amlBlock}

For questions, contact ${SUPPORT_EMAIL} quoting case reference ${caseId}. Please do not reply directly to this email.

---
${BRAND_NAME}
© ${year} All rights reserved.`;

  return sendWithRetry(
    {
      from: FROM_DISPLAY,
      replyTo: REPLY_TO,
      envelope: { from: ENVELOPE_FROM, to: recipientList },
      to: recipientList,
      subject,
      text,
      html,
      headers: {
        "List-Unsubscribe": LIST_UNSUBSCRIBE,
        "X-Transaction-Reference": tx.reference || String(tx._id),
        "X-Transaction-Status": "Rejected",
        "X-Case-Reference": caseId,
        "X-Priority": "1",
      },
    },
    3
  );
}

// 2) Welcome Email
export async function sendWelcomeEmail(to: string, opts?: any) {
  try {
    const name = (opts?.name as string) || "Valued Client";
    const subject = `Welcome to ${BRAND_NAME}`;

    const content = `
      ${getEmailHeader("Welcome to Private Banking", "Your journey to financial excellence begins")}
      <div style="padding: 40px 30px;">
        <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.textPrimary};">Dear ${name},</p>
        <p style="margin: 0 0 20px; font-size: 15px; color: ${BRAND_COLORS.textSecondary};">
          On behalf of the entire team at ${BRAND_NAME}, I am delighted to welcome you to our distinguished family of private banking clients.
        </p>
        <p style="margin: 0 0 30px; font-size: 15px; color: ${BRAND_COLORS.textSecondary};">
          Since ${BRAND_YEAR_FOUNDED}, we have been privileged to serve discerning individuals and families who demand excellence in their financial affairs. Your trust in choosing us as your private banking partner is something we do not take lightly.
        </p>
        
        <div style="background: ${BRAND_COLORS.cream}; border-radius: 12px; padding: 30px; margin-bottom: 30px; border: 1px solid rgba(201,169,98,0.2);">
          <h3 style="margin: 0 0 20px; font-size: 18px; color: ${BRAND_COLORS.navy}; font-weight: 700;">Your Private Banking Benefits</h3>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 12px 0; vertical-align: top; width: 30px;">
                <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldDark}); border-radius: 50%; text-align: center; line-height: 24px; color: ${BRAND_COLORS.navy}; font-size: 12px;">✓</span>
              </td>
              <td style="padding: 12px 0; padding-left: 15px;">
                <strong style="color: ${BRAND_COLORS.textPrimary};">Dedicated Relationship Manager</strong>
                <p style="margin: 5px 0 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">Your personal point of contact for all banking matters</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; vertical-align: top;">
                <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldDark}); border-radius: 50%; text-align: center; line-height: 24px; color: ${BRAND_COLORS.navy}; font-size: 12px;">✓</span>
              </td>
              <td style="padding: 12px 0; padding-left: 15px;">
                <strong style="color: ${BRAND_COLORS.textPrimary};">24/7 Concierge Service</strong>
                <p style="margin: 5px 0 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">Round-the-clock assistance for urgent matters</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; vertical-align: top;">
                <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldDark}); border-radius: 50%; text-align: center; line-height: 24px; color: ${BRAND_COLORS.navy}; font-size: 12px;">✓</span>
              </td>
              <td style="padding: 12px 0; padding-left: 15px;">
                <strong style="color: ${BRAND_COLORS.textPrimary};">Preferential Rates & Terms</strong>
                <p style="margin: 5px 0 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">Exclusive pricing on all banking services</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; vertical-align: top;">
                <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldDark}); border-radius: 50%; text-align: center; line-height: 24px; color: ${BRAND_COLORS.navy}; font-size: 12px;">✓</span>
              </td>
              <td style="padding: 12px 0; padding-left: 15px;">
                <strong style="color: ${BRAND_COLORS.textPrimary};">Global Portfolio Access</strong>
                <p style="margin: 5px 0 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">Manage your wealth from anywhere in the world</p>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://${BRAND_DOMAIN}/dashboard" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldDark}); color: ${BRAND_COLORS.navy}; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 10px; box-shadow: 0 4px 15px rgba(201,169,98,0.3);">
            Access Your Portfolio
          </a>
        </div>
        
        <p style="margin: 30px 0 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
          Should you have any questions or require assistance, please do not hesitate to contact your dedicated relationship manager or reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_COLORS.gold}; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a>.
        </p>
        
        <p style="margin: 30px 0 0; font-size: 14px; color: ${BRAND_COLORS.textPrimary};">
          With warm regards,<br><br>
          <strong>The Private Banking Team</strong><br>
          <span style="color: ${BRAND_COLORS.gold};">${BRAND_NAME}</span>
        </p>
      </div>
      ${getEmailFooter()}
    `;

    const text = `
Dear ${name},

Welcome to ${BRAND_NAME}

On behalf of the entire team, I am delighted to welcome you to our distinguished family of private banking clients.

Since ${BRAND_YEAR_FOUNDED}, we have been privileged to serve discerning individuals and families who demand excellence in their financial affairs.

YOUR PRIVATE BANKING BENEFITS
- Dedicated Relationship Manager
- 24/7 Concierge Service
- Preferential Rates & Terms
- Global Portfolio Access

Should you have any questions, please contact us at ${SUPPORT_EMAIL}.

With warm regards,
The Private Banking Team
${BRAND_NAME}

---
${BRAND_NAME}
ZentriBank Capital · Member FDIC · NMLS #2024001
© ${new Date().getFullYear()} All rights reserved.
    `.trim();

    return sendWithRetry(
      {
        from: FROM_DISPLAY,
        replyTo: REPLY_TO,
        envelope: { from: ENVELOPE_FROM, to: [to] },
        to,
        subject,
        text,
        html: getEmailWrapper(content),
        headers: {
          "List-Unsubscribe": LIST_UNSUBSCRIBE,
          "X-Priority": "3",
        },
      },
      3
    );
  } catch (error) {
    console.error("[mail] sendWelcomeEmail error:", error);
    return {
      accepted: [],
      rejected: [to],
      messageId: "FAILED-" + Date.now(),
      failed: true,
      error: String(error),
    } as any;
  }
}

// 3) OTP Email - FIXED: No currency symbols, code is just numbers
export async function sendOTPEmail(
  to: string,
  code: string,
  type: string,
  expiryMinutes: number = 10
) {
  const typeLabels: Record<string, string> = {
    login: "Login Verification",
    transfer: "Transfer Authorization",
    profile_update: "Profile Update Verification",
    card_application: "Card Application",
    password_reset: "Password Reset",
    transaction_approval: "Transaction Approval",
    wire_transfer: "Wire Transfer Authorization",
    beneficiary_add: "Beneficiary Authorization",
  };

  const typeLabel = typeLabels[type] || "Verification";
  // FIXED: Just include the code without any special characters
  const subject = `${BRAND_SHORT} - ${typeLabel} Code - ${code}`;
  const expiryTime = new Date(Date.now() + expiryMinutes * 60000);

  const content = `
    ${getEmailHeader("Verification Code", typeLabel)}
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.textPrimary};">Dear Valued Client,</p>
      <p style="margin: 0 0 30px; font-size: 15px; color: ${BRAND_COLORS.textSecondary};">
        You have requested a verification code for <strong>${typeLabel.toLowerCase()}</strong>. Please use the code below to proceed with your request.
      </p>
      
      <div style="background: linear-gradient(135deg, ${BRAND_COLORS.navy} 0%, ${BRAND_COLORS.navyLight} 100%); border-radius: 16px; padding: 40px; margin: 30px 0; text-align: center; border: 2px solid ${BRAND_COLORS.gold};">
        <p style="margin: 0 0 15px; font-size: 12px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.15em;">Your Verification Code</p>
        <p style="margin: 0; font-size: 48px; font-weight: 800; color: ${BRAND_COLORS.gold}; letter-spacing: 12px; font-family: 'Courier New', monospace;">${code}</p>
        <p style="margin: 20px 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">
          Valid until <strong style="color: ${BRAND_COLORS.gold};">${expiryTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</strong>
        </p>
      </div>
      
      <div style="background: linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.05) 100%); border-left: 4px solid ${BRAND_COLORS.error}; padding: 20px; border-radius: 0 8px 8px 0; margin: 30px 0;">
        <p style="margin: 0 0 15px; font-size: 15px; font-weight: 700; color: ${BRAND_COLORS.errorDark};">Security Warning</p>
        <ul style="margin: 0; padding-left: 20px; color: ${BRAND_COLORS.textSecondary}; font-size: 14px;">
          <li style="margin-bottom: 8px;"><strong>Never share</strong> this code with anyone, including bank staff</li>
          <li style="margin-bottom: 8px;">${BRAND_NAME} will <strong>never</strong> ask for this code via phone, SMS, or email</li>
          <li style="margin-bottom: 8px;">This code expires in <strong>${expiryMinutes} minutes</strong></li>
          <li>If you did not request this code, please <strong>ignore this email</strong> and contact us immediately</li>
        </ul>
      </div>
      
      <div style="background: ${BRAND_COLORS.cream}; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid rgba(201,169,98,0.2);">
        <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
          <strong style="color: ${BRAND_COLORS.textPrimary};">Need assistance?</strong> Contact our Customer Support at <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_COLORS.gold}; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a>
        </p>
      </div>
    </div>
    ${getEmailFooter()}
  `;

  const text = `
Dear Valued Client,

${typeLabel.toUpperCase()}

You have requested a verification code for ${typeLabel.toLowerCase()}.

Your verification code is: ${code}

This code expires at ${expiryTime.toLocaleTimeString()}.

SECURITY WARNING
- Never share this code with anyone, including bank staff
- ${BRAND_NAME} will never ask for this code via phone, SMS, or email
- This code expires in ${expiryMinutes} minutes
- If you did not request this code, please ignore this email and contact us immediately

Need assistance? Contact us at ${SUPPORT_EMAIL}

---
${BRAND_NAME}
ZentriBank Capital · Member FDIC · NMLS #2024001
© ${new Date().getFullYear()} All rights reserved.
  `.trim();

  return sendWithRetry(
    {
      from: FROM_DISPLAY,
      replyTo: REPLY_TO,
      envelope: { from: ENVELOPE_FROM, to: [to] },
      to,
      subject,
      text,
      html: getEmailWrapper(content),
      headers: {
        "List-Unsubscribe": LIST_UNSUBSCRIBE,
        "X-Priority": "1",
        "X-OTP-Type": type,
        "X-OTP-Expiry": expiryTime.toISOString(),
      },
    },
    3
  );
}

// 4) Bank Statement Email
export async function sendBankStatementEmail(
  to: string,
  optsOrBuffer?: any,
  filename?: string,
  name?: string,
  periodStart?: any,
  periodEnd?: any
) {
  let attachment: { filename: string; content: any } | undefined;
  let periodText = "";
  let displayName = name || "Valued Client";

  if (optsOrBuffer && (optsOrBuffer instanceof Buffer || typeof (optsOrBuffer as any)?.byteLength === "number")) {
    attachment = { filename: filename || "statement.pdf", content: optsOrBuffer };
    if (periodStart && periodEnd) {
      periodText = `${new Date(periodStart).toLocaleDateString("en-GB")} - ${new Date(periodEnd).toLocaleDateString("en-GB")}`;
    }
  } else if (optsOrBuffer && typeof optsOrBuffer === "object") {
    displayName = optsOrBuffer.name || displayName;
    periodText = optsOrBuffer.periodText || periodText;
    if (optsOrBuffer.attachmentBuffer) {
      attachment = {
        filename: optsOrBuffer.attachmentFilename || "statement.pdf",
        content: optsOrBuffer.attachmentBuffer,
      };
    }
  }

  // FIXED: No currency symbols in subject
  const subject = `${BRAND_SHORT} - Account Statement${periodText ? ` - ${periodText}` : ""}`;

  const content = `
    ${getEmailHeader("Account Statement", periodText || "Your latest statement is ready")}
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.textPrimary};">Dear ${displayName},</p>
      <p style="margin: 0 0 30px; font-size: 15px; color: ${BRAND_COLORS.textSecondary};">
        Please find attached your account statement${periodText ? ` for the period ${periodText}` : ""}. This document provides a comprehensive summary of all transactions and account activity.
      </p>
      
      <div style="background: ${BRAND_COLORS.cream}; border-radius: 12px; padding: 24px; margin-bottom: 30px; border: 1px solid rgba(201,169,98,0.2); text-align: center;">
        <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldDark}); border-radius: 12px; line-height: 60px; margin-bottom: 15px;">
          <span style="font-size: 28px;">📄</span>
        </div>
        <p style="margin: 0 0 5px; font-size: 16px; font-weight: 700; color: ${BRAND_COLORS.textPrimary};">Statement Attached</p>
        <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">${attachment?.filename || "statement.pdf"}</p>
      </div>
      
      <div style="background: linear-gradient(135deg, rgba(201,169,98,0.1) 0%, rgba(201,169,98,0.05) 100%); border-left: 4px solid ${BRAND_COLORS.gold}; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
        <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
          <strong style="color: ${BRAND_COLORS.textPrimary};">Important:</strong> Please review your statement carefully. If you notice any discrepancies or have questions, contact your dedicated relationship manager or reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_COLORS.gold}; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a>.
        </p>
      </div>
      
      <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">
        Thank you for banking with ${BRAND_NAME}.
      </p>
    </div>
    ${getEmailFooter()}
  `;

  const text = `
Dear ${displayName},

ACCOUNT STATEMENT${periodText ? ` - ${periodText}` : ""}

Please find attached your account statement${periodText ? ` for the period ${periodText}` : ""}. This document provides a comprehensive summary of all transactions and account activity.

Please review your statement carefully. If you notice any discrepancies or have questions, contact us at ${SUPPORT_EMAIL}.

Thank you for banking with ${BRAND_NAME}.

---
${BRAND_NAME}
ZentriBank Capital · Member FDIC · NMLS #2024001
© ${new Date().getFullYear()} All rights reserved.
  `.trim();

  return sendWithRetry(
    {
      from: FROM_DISPLAY,
      replyTo: REPLY_TO,
      envelope: { from: ENVELOPE_FROM, to: [to] },
      to,
      subject,
      text,
      html: getEmailWrapper(content),
      attachments: attachment ? [attachment] : undefined,
      headers: {
        "List-Unsubscribe": LIST_UNSUBSCRIBE,
        "X-Priority": "3",
      },
    },
    3
  );
}

// 5) Password Reset Email
export async function sendPasswordResetEmail(to: string, resetLink: string, name?: string) {
  const displayName = name || "Valued Client";
  const subject = `${BRAND_SHORT} - Password Reset Request`;

  const content = `
    ${getEmailHeader("Password Reset", "Secure your account")}
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.textPrimary};">Dear ${displayName},</p>
      <p style="margin: 0 0 30px; font-size: 15px; color: ${BRAND_COLORS.textSecondary};">
        We received a request to reset the password for your ${BRAND_NAME} account. Click the button below to create a new password.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldDark}); color: ${BRAND_COLORS.navy}; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 10px; box-shadow: 0 4px 15px rgba(201,169,98,0.3);">
          Reset Password
        </a>
      </div>
      
      <p style="margin: 20px 0; font-size: 13px; color: ${BRAND_COLORS.textMuted}; text-align: center;">
        This link will expire in 1 hour for security reasons.
      </p>
      
      <div style="background: linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.05) 100%); border-left: 4px solid ${BRAND_COLORS.error}; padding: 20px; border-radius: 0 8px 8px 0; margin: 30px 0;">
        <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
          <strong style="color: ${BRAND_COLORS.errorDark};">Did not request this?</strong><br>
          If you did not request a password reset, please ignore this email or contact our security team immediately at <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_COLORS.gold}; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a>. Your account remains secure.
        </p>
      </div>
    </div>
    ${getEmailFooter()}
  `;

  const text = `
Dear ${displayName},

PASSWORD RESET REQUEST

We received a request to reset the password for your ${BRAND_NAME} account.

Click the link below to create a new password:
${resetLink}

This link will expire in 1 hour for security reasons.

If you did not request a password reset, please ignore this email or contact our security team at ${SUPPORT_EMAIL}.

---
${BRAND_NAME}
ZentriBank Capital · Member FDIC · NMLS #2024001
© ${new Date().getFullYear()} All rights reserved.
  `.trim();

  return sendWithRetry(
    {
      from: FROM_DISPLAY,
      replyTo: REPLY_TO,
      envelope: { from: ENVELOPE_FROM, to: [to] },
      to,
      subject,
      text,
      html: getEmailWrapper(content),
      headers: {
        "List-Unsubscribe": LIST_UNSUBSCRIBE,
        "X-Priority": "1",
      },
    },
    3
  );
}

// 6) Simple Email Utility
export async function sendSimpleEmail(
  to: string | string[],
  subject: string,
  text: string,
  html?: string
) {
  const recipientList = Array.isArray(to) ? to : [to].filter(Boolean);
  if (recipientList.length === 0) {
    return {
      accepted: [],
      rejected: [],
      skipped: true as const,
      messageId: "SKIPPED-NO-RECIPIENT-" + Date.now(),
    };
  }

  const content = `
    ${getEmailHeader("Message from " + BRAND_SHORT)}
    <div style="padding: 40px 30px;">
      <div style="font-size: 15px; color: ${BRAND_COLORS.textSecondary}; line-height: 1.8;">
        ${html || text.replace(/\n/g, "<br>")}
      </div>
    </div>
    ${getEmailFooter()}
  `;

  // FIXED: Clean subject line
  const cleanSubject = `${BRAND_SHORT} - ${subject}`;

  return sendWithRetry(
    {
      from: FROM_DISPLAY,
      replyTo: REPLY_TO,
      envelope: { from: ENVELOPE_FROM, to: recipientList },
      to: recipientList,
      subject: cleanSubject,
      text,
      html: getEmailWrapper(content),
      headers: {
        "List-Unsubscribe": LIST_UNSUBSCRIBE,
        "X-Priority": "3",
      },
    },
    3
  );
}

// 7) Admin Transfer Notification - sends FULL transfer details to bank admin
// Used so the bank operator can manually execute the transfer via a third party
const ADMIN_NOTIFICATION_EMAILS: string[] = [
  SMTP_USER, // admin@zentribank.capital - primary inbox
];

export type AdminTransferKind =
  | "wire"
  | "international"
  | "internal"
  | "external"
  | "crypto";

export interface AdminTransferPayload {
  kind: AdminTransferKind;
  reference: string;
  submittedAt?: Date | string;
  customer: {
    name?: string;
    email?: string;
    userId?: string;
  };
  amount: {
    value: number | string;
    currency?: string;
    fee?: number | string;
    total?: number | string;
  };
  fromAccount?: string;
  status?: string;
  // All transfer-specific fields go here (recipient name, account, routing,
  // SWIFT, IBAN, wallet address, network, country, address, purpose, etc.)
  details: Record<string, any>;
  notes?: string;
}

function escapeHtml(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function renderDetailRows(obj: Record<string, any>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => {
      const label = escapeHtml(humanizeKey(k));
      const value =
        typeof v === "object"
          ? `<pre style="margin:0;font-family:'Courier New',monospace;font-size:13px;white-space:pre-wrap;color:${BRAND_COLORS.textPrimary};">${escapeHtml(JSON.stringify(v, null, 2))}</pre>`
          : escapeHtml(v);
      return `
        <tr>
          <td style="padding:10px 12px;color:${BRAND_COLORS.textMuted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid rgba(201,169,98,0.15);width:40%;vertical-align:top;">${label}</td>
          <td style="padding:10px 12px;color:${BRAND_COLORS.textPrimary};font-weight:600;border-bottom:1px solid rgba(201,169,98,0.15);font-family:'Courier New',monospace;font-size:13px;word-break:break-all;">${value}</td>
        </tr>`;
    })
    .join("");
}

export async function sendAdminTransferNotification(
  payload: AdminTransferPayload,
  recipients: string | string[] = ADMIN_NOTIFICATION_EMAILS
) {
  const recipientList = Array.isArray(recipients) ? recipients : [recipients];
  const cleanRecipients = recipientList.filter(Boolean);
  if (cleanRecipients.length === 0) {
    console.warn("[mail] No admin recipients configured");
    return {
      accepted: [],
      rejected: [],
      skipped: true as const,
      messageId: "SKIPPED-NO-ADMIN-" + Date.now(),
    };
  }

  const kindLabels: Record<AdminTransferKind, string> = {
    wire: "Wire Transfer",
    international: "International Transfer",
    internal: "Internal Transfer",
    external: "External / ACH Transfer",
    crypto: "Crypto Transfer",
  };

  const kindLabel = kindLabels[payload.kind] || "Transfer";
  const submittedAt = toDate(payload.submittedAt || new Date());
  const currency = payload.amount.currency || "USD";
  const amountNum = Number(payload.amount.value || 0);
  const subjectAmount = `${amountNum} ${currency}`;
  const subject = `[ACTION REQUIRED] ${kindLabel} - ${payload.reference} - ${subjectAmount}`;

  const customerBlock: Record<string, any> = {
    name: payload.customer.name,
    email: payload.customer.email,
    userId: payload.customer.userId,
  };

  const amountBlock: Record<string, any> = {
    amount: `${amountNum} ${currency}`,
  };
  if (payload.amount.fee !== undefined && payload.amount.fee !== null) {
    amountBlock.fee = `${payload.amount.fee} ${currency}`;
  }
  if (payload.amount.total !== undefined && payload.amount.total !== null) {
    amountBlock.totalDebit = `${payload.amount.total} ${currency}`;
  }
  if (payload.fromAccount) amountBlock.fromAccount = payload.fromAccount;
  if (payload.status) amountBlock.status = payload.status;

  const sectionTable = (title: string, rowsHtml: string) => `
    <div style="margin-bottom:24px;">
      <h3 style="margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:${BRAND_COLORS.gold};font-weight:700;">${escapeHtml(title)}</h3>
      <table style="width:100%;border-collapse:collapse;background:${BRAND_COLORS.cream};border-radius:8px;overflow:hidden;border:1px solid rgba(201,169,98,0.2);">
        ${rowsHtml}
      </table>
    </div>
  `;

  const content = `
    ${getEmailHeader(`New ${kindLabel}`, `Reference ${payload.reference}`)}
    <div style="padding:32px 28px;">
      <div style="background:linear-gradient(135deg,rgba(245,158,11,0.12) 0%,rgba(245,158,11,0.04) 100%);border-left:4px solid ${BRAND_COLORS.warning};padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:28px;">
        <p style="margin:0;font-size:14px;color:${BRAND_COLORS.warningDark};font-weight:600;">
          A customer has submitted a ${kindLabel.toLowerCase()}. All details required to execute the transfer via the third-party provider are listed below.
        </p>
        <p style="margin:8px 0 0;font-size:12px;color:${BRAND_COLORS.textMuted};">
          Submitted: ${fmtDate(submittedAt)}
        </p>
      </div>

      ${sectionTable("Customer", renderDetailRows(customerBlock))}
      ${sectionTable("Amount & Source", renderDetailRows(amountBlock))}
      ${sectionTable("Transfer Details", renderDetailRows(payload.details || {}))}

      ${
        payload.notes
          ? `<div style="background:${BRAND_COLORS.cream};border:1px dashed rgba(201,169,98,0.4);padding:16px;border-radius:8px;margin-top:8px;">
              <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:${BRAND_COLORS.textMuted};">Notes</p>
              <p style="margin:0;font-size:14px;color:${BRAND_COLORS.textPrimary};white-space:pre-wrap;">${escapeHtml(payload.notes)}</p>
            </div>`
          : ""
      }

      <p style="margin:24px 0 0;font-size:12px;color:${BRAND_COLORS.textMuted};">
        Approve or reject this transfer in the admin dashboard. Customer balance will only be debited upon approval.
      </p>
    </div>
    ${getEmailFooter()}
  `;

  const textLines: string[] = [
    `${kindLabel.toUpperCase()} - ACTION REQUIRED`,
    `Reference: ${payload.reference}`,
    `Submitted: ${fmtDate(submittedAt)}`,
    "",
    "CUSTOMER",
    ...Object.entries(customerBlock)
      .filter(([, v]) => v)
      .map(([k, v]) => `  ${humanizeKey(k)}: ${v}`),
    "",
    "AMOUNT & SOURCE",
    ...Object.entries(amountBlock).map(([k, v]) => `  ${humanizeKey(k)}: ${v}`),
    "",
    "TRANSFER DETAILS",
    ...Object.entries(payload.details || {})
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(
        ([k, v]) =>
          `  ${humanizeKey(k)}: ${
            typeof v === "object" ? JSON.stringify(v) : v
          }`
      ),
  ];
  if (payload.notes) {
    textLines.push("", "NOTES", payload.notes);
  }
  const text = textLines.join("\n");

  return sendWithRetry(
    {
      from: FROM_DISPLAY,
      replyTo: REPLY_TO,
      envelope: { from: ENVELOPE_FROM, to: cleanRecipients },
      to: cleanRecipients,
      subject,
      text,
      html: getEmailWrapper(content),
      headers: {
        "X-Transfer-Reference": payload.reference,
        "X-Transfer-Kind": payload.kind,
        "X-Priority": "1",
        Importance: "high",
      },
    },
    3
  );
}

// 8) Export Transporter Proxy
export const transporter = {
  async sendMail(options: Parameters<Transporter["sendMail"]>[0]) {
    try {
      const t = await getTransporter();
      return await t.sendMail(options);
    } catch (error) {
      console.error("[mail] transporter.sendMail error:", error);
      return {
        accepted: [],
        rejected: [options.to].flat(),
        messageId: "FAILED-" + Date.now(),
        failed: true,
        error: String(error),
      } as any;
    }
  },
};

// 9) Test SMTP Connection
export async function testSMTPConnection(): Promise<boolean> {
  try {
    const transporter = await getTransporter();
    await transporter.verify();
    console.log("[mail] ✅ Namecheap SMTP test successful");
    return true;
  } catch (error) {
    console.error("[mail] ❌ Namecheap SMTP test failed:", error);
    return false;
  }
}

// Default Export
export default {
  sendTransactionEmail,
  sendWelcomeEmail,
  sendOTPEmail,
  sendBankStatementEmail,
  sendPasswordResetEmail,
  sendSimpleEmail,
  sendAdminTransferNotification,
  testSMTPConnection,
  transporter,
};