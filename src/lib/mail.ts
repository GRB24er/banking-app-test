// src/lib/mail.ts - HARDCODED NAMECHEAP PRIVATEEMAIL
import nodemailer, { Transporter, SentMessageInfo } from "nodemailer";


/** ==============================
 * HARDCODED SMTP CONFIGURATION
 * ============================== */
const SMTP_HOST = "mail.privateemail.com";
const SMTP_PORT = 465;
const SMTP_SECURE = true;
const SMTP_USER = "admin@zentribank.online";
const SMTP_PASS = "Valmont15#";

// Email configuration
const FROM_DISPLAY = `ZentriBank Capital <${SMTP_USER}>`;
const ENVELOPE_FROM = SMTP_USER;
const REPLY_TO = SMTP_USER;
const LIST_UNSUBSCRIBE = `<mailto:${SMTP_USER}?subject=Unsubscribe>`;

// Connection pool settings
const POOL_CONFIG = {
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 5,
};

// Timeout settings
const TIMEOUT_CONFIG = {
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 40000,
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
      console.log("[mail] ✅ SMTP connection verified successfully");
    }
  } catch (err) {
    console.error("[mail] ❌ SMTP verification failed:", err);
  }
  
  return cachedTransporter as Transporter;
}

/** ==============================
 * Local transaction type + helpers
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

function statusLabel(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "approved" || s === "completed") return "Completed";
  if (s === "pending_verification") return "Pending - Verification";
  if (s === "rejected") return "Rejected";
  return "Pending";
}

function isCredit(type: string) {
  const t = (type || "").toLowerCase();
  return t.includes("deposit") || t.includes("transfer-in") || t.includes("interest") || t.includes("adjustment-credit");
}

function isDebit(type: string) {
  const t = (type || "").toLowerCase();
  return t.includes("withdraw") || t.includes("transfer-out") || t.includes("fee") || t.includes("adjustment-debit");
}

function fmtAmount(n: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { 
      style: "currency", 
      currency, 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(Number(n || 0));
  } catch {
    return new Intl.NumberFormat(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(Number(n || 0));
  }
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleString();
}

/** ==============================
 * CORE SENDER with RETRIES
 * ============================== */
const TRANSIENT_CODES = new Set([
  "ETIMEDOUT", 
  "ECONNRESET", 
  "ECONNREFUSED", 
  "ESOCKET", 
  "EPIPE",
  "ENOTFOUND",
  "EHOSTUNREACH"
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
      const transient = TRANSIENT_CODES.has(code) || 
                       /timed?out/i.test(message) || 
                       /connection.*closed/i.test(message);

      console.warn(`[mail] ⚠️ Send attempt ${attempt} failed:`, {
        code,
        message: message.substring(0, 200),
        transient
      });

      if (/EAUTH|ENVELOPE|EENVELOPE|EADDR/i.test(code) || 
          /auth/i.test(message) || 
          /invalid.*recipient/i.test(message) ||
          /user.*not.*found/i.test(message)) {
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

// 1) Transaction event email
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
      messageId: "SKIPPED-NO-RECIPIENT-" + Date.now() 
    };
  }

  const tx = normalizeTx(args.transaction);
  const label = statusLabel(tx.status);
  const signedAmount = (isCredit(tx.type) ? "+" : isDebit(tx.type) ? "-" : "") + 
                      fmtAmount(tx.amount, tx.currency);
  const subject = `Transaction ${label}: ${tx.description || tx.type} ${signedAmount}`;
  const greetingName = args.name || "Customer";

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0; padding:20px; background-color:#f8fafc;">
    <div style="max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:8px; padding:32px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; line-height:1.6; color:#0f172a">
        <h2 style="margin:0 0 8px 0; color:#0f172a;">Hi ${greetingName},</h2>
        <p style="margin:0 0 16px 0; color:#475569;">A recent transaction on your account is now <strong style="color:#0f172a;">${label}</strong>.</p>
        
        <table style="border-collapse:collapse; width:100%; max-width:560px; margin:24px 0;">
          <tr>
            <td style="padding:12px 0; color:#64748b; width:160px; border-bottom:1px solid #e2e8f0;">Reference</td>
            <td style="padding:12px 0; border-bottom:1px solid #e2e8f0; color:#0f172a;">${tx.reference || String(tx._id)}</td>
          </tr>
          <tr>
            <td style="padding:12px 0; color:#64748b; border-bottom:1px solid #e2e8f0;">Description</td>
            <td style="padding:12px 0; border-bottom:1px solid #e2e8f0; color:#0f172a;">${tx.description}</td>
          </tr>
          <tr>
            <td style="padding:12px 0; color:#64748b; border-bottom:1px solid #e2e8f0;">Type</td>
            <td style="padding:12px 0; border-bottom:1px solid #e2e8f0; text-transform:capitalize; color:#0f172a;">${tx.type}</td>
          </tr>
          <tr>
            <td style="padding:12px 0; color:#64748b; border-bottom:1px solid #e2e8f0;">Amount</td>
            <td style="padding:12px 0; border-bottom:1px solid #e2e8f0; font-weight:700; font-size:18px; color:${isCredit(tx.type) ? '#16a34a' : '#dc2626'};">${signedAmount}</td>
          </tr>
          <tr>
            <td style="padding:12px 0; color:#64748b; border-bottom:1px solid #e2e8f0;">Status</td>
            <td style="padding:12px 0; border-bottom:1px solid #e2e8f0; color:#0f172a;">
              <span style="display:inline-block; padding:4px 12px; background-color:${label === 'Completed' ? '#dcfce7' : label === 'Rejected' ? '#fee2e2' : '#fef3c7'}; color:${label === 'Completed' ? '#166534' : label === 'Rejected' ? '#991b1b' : '#92400e'}; border-radius:4px; font-size:14px; font-weight:500;">
                ${label}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0; color:#64748b; border-bottom:1px solid #e2e8f0;">Date</td>
            <td style="padding:12px 0; border-bottom:1px solid #e2e8f0; color:#0f172a;">${fmtDate(tx.date)}</td>
          </tr>
          <tr>
            <td style="padding:12px 0; color:#64748b;">Account</td>
            <td style="padding:12px 0; text-transform:capitalize; color:#0f172a;">${tx.accountType}</td>
          </tr>
        </table>
        
        <div style="margin-top:32px; padding-top:24px; border-top:1px solid #e2e8f0;">
          <p style="margin:0; color:#64748b; font-size:14px;">
            If you did not authorize this activity, please contact support immediately at ${REPLY_TO}.
          </p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  const text = [
    `${greetingName},`,
    ``,
    `A recent transaction on your account is now ${label}.`,
    ``,
    `Reference: ${tx.reference || String(tx._id)}`,
    `Description: ${tx.description}`,
    `Type: ${tx.type}`,
    `Amount: ${signedAmount}`,
    `Status: ${label}`,
    `Date: ${fmtDate(tx.date)}`,
    `Account: ${tx.accountType}`,
    ``,
    `If you did not authorize this activity, please contact support immediately.`,
  ].join("\n");

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
        "X-Transaction-Type": String(tx.type),
        "X-Transaction-Status": label,
        "X-Priority": "2",
      },
    },
    3
  );
}

// 2) Welcome email
export async function sendWelcomeEmail(to: string, opts?: any) {
  try {
    const name = (opts?.name as string) || "Customer";
    const subject = "Welcome to ZentriBank Capital";
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:20px; background-color:#f8fafc;">
      <div style="max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:8px; padding:32px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; line-height:1.6; color:#0f172a">
          <h1 style="margin:0 0 24px 0; color:#0f172a; font-size:28px;">Welcome to ZentriBank Capital!</h1>
          <p style="font-size:16px; color:#475569;">Hi ${name},</p>
          <p style="font-size:16px; color:#475569;">Your online banking profile has been created successfully.</p>
          <div style="margin-top:32px; padding-top:24px; border-top:1px solid #e2e8f0;">
            <p style="margin:0; color:#64748b; font-size:14px;">
              Best regards,<br>
              The ZentriBank Capital Team
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
    
    const text = `Hi ${name},\n\nWelcome to ZentriBank Capital!\n\nYour online banking profile has been created successfully.\n\nBest regards,\nThe ZentriBank Capital Team`;
    
    return sendWithRetry(
      {
        from: FROM_DISPLAY,
        replyTo: REPLY_TO,
        envelope: { from: ENVELOPE_FROM, to: [to] },
        to,
        subject,
        text,
        html,
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

// 3) Bank statement email
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
  let displayName = name || "Customer";

  if (optsOrBuffer && (optsOrBuffer instanceof Buffer || typeof (optsOrBuffer as any)?.byteLength === "number")) {
    attachment = { filename: filename || "statement.pdf", content: optsOrBuffer };
    if (periodStart && periodEnd) {
      periodText = `for ${new Date(periodStart).toLocaleDateString()} - ${new Date(periodEnd).toLocaleDateString()}`;
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

  const subject = `Your account statement ${periodText || ""}`.trim();
  const html = `<h2>Account Statement</h2><p>Hi ${displayName},</p><p>Your account statement ${periodText || ""} is attached.</p>`;
  const text = `Hi ${displayName},\n\nYour account statement ${periodText || ""} is attached.\n\nBest regards,\nThe ZentriBank Capital Team`;

  return sendWithRetry(
    {
      from: FROM_DISPLAY,
      replyTo: REPLY_TO,
      envelope: { from: ENVELOPE_FROM, to: [to] },
      to,
      subject,
      text,
      html,
      attachments: attachment ? [attachment] : undefined,
      headers: { 
        "List-Unsubscribe": LIST_UNSUBSCRIBE,
        "X-Priority": "3",
      },
    },
    3
  );
}

// 4) OTP EMAIL - NEW
export async function sendOTPEmail(
  to: string,
  code: string,
  type: string,
  expiryMinutes: number = 10
) {
  const typeLabels: Record<string, string> = {
    login: 'Login Verification',
    transfer: 'Transfer Authorization',
    profile_update: 'Profile Update Verification',
    card_application: 'Credit Card Application',
    password_reset: 'Password Reset',
    transaction_approval: 'Transaction Approval'
  };

  const typeLabel = typeLabels[type] || 'Verification';
  const subject = `${typeLabel} - Code: ${code}`;
  const expiryTime = new Date(Date.now() + expiryMinutes * 60000);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
          line-height: 1.6; 
          color: #0f172a;
          margin: 0;
          padding: 0;
          background: #f8fafc;
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white; 
          padding: 40px 30px; 
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .header p {
          margin: 10px 0 0;
          opacity: 0.9;
          font-size: 16px;
        }
        .content { 
          padding: 40px 30px;
        }
        .otp-box { 
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border: 2px solid #10b981;
          border-radius: 16px; 
          padding: 30px; 
          margin: 30px 0; 
          text-align: center;
        }
        .otp-code { 
          font-size: 48px;
          font-weight: 800;
          color: #059669;
          letter-spacing: 10px;
          margin: 0;
          font-family: 'Courier New', monospace;
        }
        .otp-label {
          margin: 15px 0 0;
          color: #047857;
          font-size: 14px;
          font-weight: 600;
        }
        .warning { 
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 20px;
          margin: 25px 0;
          border-radius: 8px;
        }
        .warning strong {
          color: #92400e;
          display: block;
          margin-bottom: 10px;
          font-size: 16px;
        }
        .warning ul {
          margin: 0;
          padding-left: 20px;
          color: #92400e;
        }
        .warning li {
          margin: 5px 0;
        }
        .info {
          background: #f0fdf4;
          padding: 20px;
          border-radius: 8px;
          margin: 25px 0;
          border: 1px solid #bbf7d0;
        }
        .footer { 
          text-align: center; 
          padding: 30px; 
          color: #64748b;
          font-size: 14px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }
        .footer p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Verification Code</h1>
          <p>${typeLabel}</p>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You requested a verification code for <strong>${typeLabel.toLowerCase()}</strong>. Use the code below to proceed:</p>
          
          <div class="otp-box">
            <div class="otp-code">${code}</div>
            <div class="otp-label">
              Valid until ${expiryTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </div>
          </div>
          
          <div class="warning">
            <strong>⚠️ Security Notice</strong>
            <ul>
              <li>Never share this code with anyone</li>
              <li>Our staff will NEVER ask for this code</li>
              <li>This code expires in ${expiryMinutes} minutes</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>
          
          <div class="info">
            <p style="margin: 0; color: #047857;">
              <strong>Need help?</strong> Contact our support team at ${REPLY_TO} if you didn't request this code or have any concerns.
            </p>
          </div>
        </div>
        <div class="footer">
          <p><strong>ZentriBank Capital</strong></p>
          <p>This is an automated message. Please do not reply.</p>
          <p>© ${new Date().getFullYear()} All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hello,

You requested a verification code for ${typeLabel.toLowerCase()}.

Your verification code is: ${code}

This code expires at ${expiryTime.toLocaleTimeString()}.

SECURITY NOTICE:
- Never share this code with anyone
- Our staff will NEVER ask for this code
- This code expires in ${expiryMinutes} minutes
- If you didn't request this, please ignore this email

Need help? Contact us at ${REPLY_TO}

ZentriBank Capital
This is an automated message. Please do not reply.
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
      html,
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

// 5) Simple utility for ad-hoc messages
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
      messageId: "SKIPPED-NO-RECIPIENT-" + Date.now() 
    };
  }
  
  return sendWithRetry(
    {
      from: FROM_DISPLAY,
      replyTo: REPLY_TO,
      envelope: { from: ENVELOPE_FROM, to: recipientList },
      to: recipientList,
      subject,
      text,
      html: html || `<div style="font-family: Arial, sans-serif; padding: 20px;">${text.replace(/\n/g, '<br>')}</div>`,
      headers: { 
        "List-Unsubscribe": LIST_UNSUBSCRIBE,
        "X-Priority": "3",
      },
    },
    3
  );
}

// 6) Export transporter proxy
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

// 7) Test SMTP
export async function testSMTPConnection(): Promise<boolean> {
  try {
    const transporter = await getTransporter();
    await transporter.verify();
    console.log("[mail] ✅ SMTP test successful");
    return true;
  } catch (error) {
    console.error("[mail] ❌ SMTP test failed:", error);
    return false;
  }
}

export default {
  sendTransactionEmail,
  sendWelcomeEmail,
  sendBankStatementEmail,
  sendOTPEmail,
  sendSimpleEmail,
  testSMTPConnection,
  transporter
};