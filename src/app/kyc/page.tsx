// src/app/kyc/page.tsx — customer KYC submission page

"use client";

import { useEffect, useState } from "react";

interface KycStatus {
  state: string;
  tier: string;
  countryCode?: string;
  submittedAt?: string;
  decision?: { outcome: string; reason?: string };
  sanctionsResult?: { tier: string; reasons: string[] };
}

const COUNTRIES = [
  "US", "GB", "CA", "AU", "DE", "FR", "ES", "IT", "NL", "IE", "JP", "SG", "AE",
  "IN", "BR", "MX", "ZA", "NG", "KE",
];

export default function KycPage() {
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    legalName: "",
    dateOfBirth: "",
    ssn: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postalCode: "",
    countryCode: "US",
    occupation: "",
    sourceOfFunds: "salary",
  });

  useEffect(() => {
    fetch("/api/kyc/submit")
      .then((r) => r.json())
      .then((d) => setStatus(d.kyc ?? null))
      .catch(() => {});
  }, []);

  const onChange = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Submission failed");
      setStatus({ state: d.state, tier: d.tier });
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#0b1d3a", color: "#fff", padding: "20px 24px", borderRadius: 8, marginBottom: 24 }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700 }}>Identity verification</div>
        <div style={{ opacity: 0.8, fontSize: 14, marginTop: 6 }}>
          Required to unlock transfers, cards, and international wires.
        </div>
      </div>

      {status && (
        <div style={{ background: "#f3f4f6", padding: 16, borderRadius: 8, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "#374151" }}>Current status</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
            {status.state} · {status.tier}
          </div>
          {status.decision?.reason ? (
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>{status.decision.reason}</div>
          ) : null}
        </div>
      )}

      {done && status?.state !== "rejected" && (
        <div style={{ background: "#d1fae5", color: "#065f46", padding: 16, borderRadius: 8, marginBottom: 16 }}>
          Thank you — your information has been received and is under review.
        </div>
      )}

      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <Field label="Legal name" v={form.legalName} on={onChange("legalName")} required />
        <Field label="Date of birth" type="date" v={form.dateOfBirth} on={onChange("dateOfBirth")} required />
        <Field label="SSN / Tax ID" v={form.ssn} on={onChange("ssn")} placeholder="Optional but speeds review" />
        <Field label="Address" v={form.addressLine1} on={onChange("addressLine1")} required />
        <Field label="Address line 2" v={form.addressLine2} on={onChange("addressLine2")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="City" v={form.city} on={onChange("city")} required />
          <Field label="Postal code" v={form.postalCode} on={onChange("postalCode")} required />
        </div>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#374151" }}>Country</span>
          <select value={form.countryCode} onChange={onChange("countryCode")} style={inputStyle}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <Field label="Occupation" v={form.occupation} on={onChange("occupation")} />
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#374151" }}>Source of funds</span>
          <select value={form.sourceOfFunds} onChange={onChange("sourceOfFunds")} style={inputStyle}>
            <option value="salary">Salary / employment</option>
            <option value="business">Business income</option>
            <option value="investments">Investment returns</option>
            <option value="inheritance">Inheritance / gift</option>
            <option value="savings">Personal savings</option>
            <option value="other">Other</option>
          </select>
        </label>

        {error ? <div style={{ color: "#991b1b", fontSize: 13 }}>{error}</div> : null}

        <button
          type="submit"
          disabled={submitting}
          style={{
            background: "#0b1d3a", color: "#fff", padding: "12px 18px",
            border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6,
  fontSize: 14, fontFamily: "inherit",
};

function Field(props: { label: string; v: string; on: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 13, color: "#374151" }}>
        {props.label}{props.required ? " *" : ""}
      </span>
      <input
        type={props.type ?? "text"}
        value={props.v}
        onChange={props.on}
        required={props.required}
        placeholder={props.placeholder}
        style={inputStyle}
      />
    </label>
  );
}
