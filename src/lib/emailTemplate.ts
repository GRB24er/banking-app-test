// src/lib/emailTemplate.ts
//
// Outlook-safe, table-based branded HTML email. Produces both HTML and a
// plain-text fallback. Used by:
//   - lib/mail.ts customer notifications
//   - /api/admin/email/send admin-composed messages
//   - account restriction / adjustment / reversal customer notices

export interface EmailTemplateArgs {
  subject: string;
  preheader?: string;
  tag?: string;                  // optional small chip e.g. "Wire confirmation"
  headingText?: string;          // big heading shown under the gold band
  paragraphs?: string[];         // plain-text paragraphs auto-linkified
  rawHtml?: string;              // sanitized HTML body (replaces paragraphs)
  cta?: { label: string; url: string };
  signature?: { name: string; title?: string; department?: string };
}

const BRAND = {
  name: "ZentriBank",
  primary: "#0b1d3a", // navy
  accent: "#c9a449",  // gold
  support: "support@zentribank.capital",
  footerLine: "ZentriBank Capital plc · Authorised by the PRA, regulated by the FCA & PRA · Registered No. 04567892",
};

const escapeHtml = (s: string) =>
  String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function linkify(text: string): string {
  return escapeHtml(text).replace(
    /https?:\/\/[^\s<]+/g,
    (m) => `<a href="${m}" style="color:${BRAND.primary};text-decoration:underline;">${m}</a>`,
  );
}

function paragraphsHtml(paras: string[] | undefined): string {
  if (!paras || paras.length === 0) return "";
  return paras
    .map(
      (p) =>
        `<p style="margin:0 0 16px 0;font-family:Arial,sans-serif;color:#1f2937;font-size:15px;line-height:1.55;">${linkify(p)}</p>`,
    )
    .join("");
}

function ctaHtml(cta: { label: string; url: string } | undefined): string {
  if (!cta) return "";
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr><td style="background:${BRAND.primary};border-radius:6px;">
      <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;font-size:15px;">${escapeHtml(cta.label)}</a>
    </td></tr>
  </table>`;
}

function signatureHtml(sig: EmailTemplateArgs["signature"]): string {
  if (!sig) return "";
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;width:100%;">
    <tr><td style="font-family:Arial,sans-serif;color:#1f2937;font-size:14px;line-height:1.4;">
      <strong>${escapeHtml(sig.name)}</strong><br/>
      ${sig.title ? `${escapeHtml(sig.title)}<br/>` : ""}
      ${sig.department ? `${escapeHtml(sig.department)}<br/>` : ""}
      <span style="color:#6b7280;">${BRAND.name}</span>
    </td></tr>
  </table>`;
}

export function renderEmail(args: EmailTemplateArgs): { html: string; text: string } {
  const body = args.rawHtml ?? paragraphsHtml(args.paragraphs);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(args.subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
${args.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(args.preheader)}</div>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">
      <!-- gold band -->
      <tr><td style="height:6px;background:${BRAND.accent};"></td></tr>
      <!-- wordmark -->
      <tr><td style="padding:24px 32px 0 32px;font-family:Georgia,serif;font-size:22px;color:${BRAND.primary};font-weight:bold;letter-spacing:.5px;">
        ${BRAND.name}
      </td></tr>
      <!-- tag chip -->
      ${args.tag ? `<tr><td style="padding:12px 32px 0 32px;"><span style="display:inline-block;padding:4px 10px;background:#eef2ff;color:${BRAND.primary};font-family:Arial,sans-serif;font-size:12px;font-weight:bold;border-radius:999px;text-transform:uppercase;letter-spacing:.5px;">${escapeHtml(args.tag)}</span></td></tr>` : ""}
      <!-- heading -->
      ${args.headingText ? `<tr><td style="padding:8px 32px 0 32px;"><h1 style="margin:8px 0 16px 0;font-family:Georgia,serif;color:${BRAND.primary};font-size:24px;line-height:1.3;">${escapeHtml(args.headingText)}</h1></td></tr>` : ""}
      <!-- body -->
      <tr><td style="padding:8px 32px 24px 32px;">
        ${body}
        ${ctaHtml(args.cta)}
        ${signatureHtml(args.signature)}
      </td></tr>
      <!-- footer -->
      <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;color:#6b7280;font-size:11px;line-height:1.5;">
        ${BRAND.footerLine}<br/>
        Need help? Email <a href="mailto:${BRAND.support}" style="color:${BRAND.primary};">${BRAND.support}</a>.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const textParts: string[] = [];
  if (args.headingText) textParts.push(args.headingText, "");
  if (args.paragraphs) textParts.push(...args.paragraphs);
  if (args.cta) textParts.push("", `${args.cta.label}: ${args.cta.url}`);
  if (args.signature) {
    textParts.push("", "—", args.signature.name);
    if (args.signature.title) textParts.push(args.signature.title);
    if (args.signature.department) textParts.push(args.signature.department);
    textParts.push(BRAND.name);
  }
  textParts.push("", BRAND.footerLine);

  return { html, text: textParts.join("\n") };
}
