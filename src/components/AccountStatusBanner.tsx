// src/components/AccountStatusBanner.tsx
// Shown on the customer dashboard whenever the user has an active
// restriction. Colour-codes by severity, surfaces the reference number,
// and lets the customer download the formal notice or contact Compliance.

"use client";

import { useEffect, useState } from "react";

interface ActiveRestriction {
  reference: string;
  kind: "freeze" | "block" | "close";
  scope: "all" | "checking" | "savings" | "investment";
  reason: string;
  effectiveAt: string;
  effectiveUntil?: string | null;
  reasonDetail?: string;
}

const TONE: Record<ActiveRestriction["kind"], { bg: string; border: string; text: string; pill: string; label: string }> = {
  freeze: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e", pill: "#f59e0b", label: "Account Freeze" },
  block:  { bg: "#fee2e2", border: "#dc2626", text: "#991b1b", pill: "#dc2626", label: "Account Block" },
  close:  { bg: "#e0e7ff", border: "#4338ca", text: "#3730a3", pill: "#4338ca", label: "Account Closure" },
};

const REASON_HUMAN: Record<string, string> = {
  aml_review: "Anti-money-laundering review",
  fraud_suspected: "Suspected fraudulent activity",
  court_order: "Court order",
  sanctions_hit: "Sanctions screening match",
  kyc_lapsed: "KYC verification expired",
  deceased: "Customer record",
  regulatory_request: "Regulatory request",
  duplicate_account: "Duplicate account",
  chargeback_dispute: "Chargeback dispute",
  customer_request: "Customer request",
  compliance_review: "Compliance review",
  other: "Other",
};

export default function AccountStatusBanner() {
  const [active, setActive] = useState<ActiveRestriction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/restrictions/me")
      .then((r) => r.json())
      .then((d) => setActive(d.active ?? null))
      .catch(() => setActive(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !active) return null;
  const tone = TONE[active.kind];

  return (
    <div
      role="alert"
      style={{
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        borderLeft: `5px solid ${tone.border}`,
        borderRadius: 8,
        padding: "16px 20px",
        margin: "0 0 20px 0",
        color: tone.text,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{
              background: tone.pill, color: "#fff",
              padding: "3px 10px", borderRadius: 999,
              fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
            }}>
              {tone.label}
            </span>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Ref: {active.reference}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
            {REASON_HUMAN[active.reason] ?? active.reason}
            {active.scope !== "all" ? ` · ${active.scope} account only` : ""}
          </div>
          {active.reasonDetail ? (
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>{active.reasonDetail}</div>
          ) : null}
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Effective from {new Date(active.effectiveAt).toLocaleString()}
            {active.effectiveUntil ? ` · until ${new Date(active.effectiveUntil).toLocaleString()}` : " · until lifted"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            href={`/api/restrictions/${active.reference}/document`}
            style={{
              background: "#fff", color: tone.text,
              padding: "8px 14px", borderRadius: 6,
              fontSize: 13, fontWeight: 600, textDecoration: "none",
              border: `1px solid ${tone.border}`,
            }}
          >
            Download notice (PDF)
          </a>
          <a
            href="mailto:compliance@zentribank.capital"
            style={{
              background: tone.border, color: "#fff",
              padding: "8px 14px", borderRadius: 6,
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}
          >
            Contact Compliance
          </a>
        </div>
      </div>
    </div>
  );
}
