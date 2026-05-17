// src/components/WireTransferForm.tsx
//
// Shared multi-step wizard used by both /transfers/wire (4 steps, domestic
// only) and /transfers/international (5 steps, adds country selection).
// Navy/gold brand, gold progress bar, clickable step indicators,
// framer-motion transitions, dynamic per-country rail fields.

"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type WireMode = "domestic" | "international";

interface Country {
  code: string;
  name: string;
  currency: string;
  emoji?: string;
  region: string;
  sanctionsTier: "none" | "edd" | "restricted" | "embargo";
  extraFields: { id: string; label: string; placeholder?: string; helpText?: string; pattern?: string; patternError?: string; required?: boolean }[];
  rails: { rail: string; speed: string; feeMinor: string }[];
}

interface Props { mode: WireMode }

const STEPS_DOMESTIC = ["Account", "Recipient", "Bank details", "Review & confirm"] as const;
const STEPS_INTERNATIONAL = ["Account", "Destination", "Recipient", "Bank details", "Review & confirm"] as const;

const BRAND = { primary: "#0b1d3a", accent: "#c9a449" };

export default function WireTransferForm({ mode }: Props) {
  const steps = mode === "international" ? STEPS_INTERNATIONAL : STEPS_DOMESTIC;
  const [step, setStep] = useState(0);
  const [countries, setCountries] = useState<Country[]>([]);
  const [form, setForm] = useState({
    fromAccount: "checking",
    amount: "",
    currency: "USD",
    recipientName: "",
    recipientAddress: "",
    recipientCountry: "US",
    recipientBank: "",
    swiftCode: "",
    iban: "",
    routingNumber: "",
    accountNumber: "",
    purpose: "",
    extraBankFields: {} as Record<string, string>,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string } | null>(null);

  useEffect(() => {
    fetch("/api/banking/countries")
      .then((r) => r.json())
      .then((d) => setCountries(d.countries ?? []))
      .catch(() => {});
  }, []);

  const country = useMemo(
    () => countries.find((c) => c.code === form.recipientCountry),
    [countries, form.recipientCountry],
  );

  const fee = useMemo(() => {
    if (!country) return 0;
    const base = Number(country.rails[0]?.feeMinor ?? "0") / 100;
    return country.sanctionsTier === "edd" ? base + 25 : base;
  }, [country]);

  const total = useMemo(() => {
    const amt = parseFloat(form.amount || "0");
    return isNaN(amt) ? 0 : amt + fee;
  }, [form.amount, fee]);

  const setField = (k: keyof typeof form) => (v: any) => setForm((f) => ({ ...f, [k]: v }));
  const setExtra = (id: string, v: string) =>
    setForm((f) => ({ ...f, extraBankFields: { ...f.extraBankFields, [id]: v } }));

  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  async function submit() {
    setSubmitting(true); setError(null);
    try {
      const endpoint = mode === "international" ? "/api/transfers/international" : "/api/transfers/wire";
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          fromAccount: form.fromAccount,
          recipientName: form.recipientName,
          recipientAddress: form.recipientAddress,
          recipientCountry: form.recipientCountry,
          recipientBank: form.recipientBank,
          recipientRoutingNumber: form.routingNumber,
          recipientAccount: form.accountNumber,
          swiftCode: form.swiftCode,
          iban: form.iban,
          amount: parseFloat(form.amount || "0"),
          purposeOfTransfer: form.purpose,
          extraBankFields: form.extraBankFields,
          wireType: mode,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Transfer failed");
      setDone({ reference: d.reference ?? d.transactionId ?? "—" });
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  if (done) {
    return (
      <div style={{ maxWidth: 640, margin: "60px auto", padding: 32, background: "#fff", borderRadius: 12, boxShadow: "0 1px 8px rgba(0,0,0,.06)" }}>
        <div style={{ height: 6, background: BRAND.accent, borderRadius: 999, marginBottom: 16 }} />
        <h1 style={{ fontFamily: "Georgia, serif", color: BRAND.primary }}>Transfer submitted</h1>
        <p style={{ color: "#374151" }}>Reference: <code>{done.reference}</code></p>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          Your transfer has been queued for review. You'll receive an email once it clears.
        </p>
        <a href="/dashboard" style={{ display: "inline-block", marginTop: 18, background: BRAND.primary, color: "#fff", padding: "10px 20px", borderRadius: 6, textDecoration: "none", fontWeight: 600 }}>Back to dashboard</a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <ProgressBar steps={steps} current={step} onClick={setStep} />
      <div style={{ background: "#fff", borderRadius: 12, padding: 32, marginTop: 16, minHeight: 380, boxShadow: "0 1px 8px rgba(0,0,0,.06)" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {error && <div style={{ color: "#991b1b", fontSize: 13, marginTop: 12 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
          <button onClick={back} disabled={step === 0 || submitting} style={btnSecondary}>← Back</button>
          {step === steps.length - 1
            ? <button onClick={submit} disabled={submitting} style={btnPrimary}>{submitting ? "Submitting…" : "Confirm transfer"}</button>
            : <button onClick={next} style={btnPrimary}>Continue →</button>}
        </div>
      </div>
    </div>
  );

  function renderStep() {
    const titleStyle: React.CSSProperties = { fontFamily: "Georgia, serif", color: BRAND.primary, margin: "0 0 18px 0" };

    if (mode === "international" && step === 1) {
      const grouped = groupByRegion(countries);
      return (
        <>
          <h2 style={titleStyle}>Destination country</h2>
          <select value={form.recipientCountry} onChange={(e) => setField("recipientCountry")(e.target.value)} style={input}>
            {Object.entries(grouped).map(([region, list]) => (
              <optgroup key={region} label={region.replace(/_/g, " ")}>
                {list.map((c) => (
                  <option key={c.code} value={c.code} disabled={c.sanctionsTier === "embargo"}>
                    {c.emoji ?? ""} {c.name} ({c.currency}) {c.sanctionsTier !== "none" ? `· ${c.sanctionsTier.toUpperCase()}` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {country?.sanctionsTier === "edd" && (
            <div style={{ background: "#fef3c7", color: "#92400e", padding: 10, borderRadius: 6, marginTop: 10, fontSize: 13 }}>
              {country.name} requires enhanced due diligence. A surcharge of {form.currency} 25.00 applies.
            </div>
          )}
          {country?.sanctionsTier === "embargo" && (
            <div style={{ background: "#fee2e2", color: "#991b1b", padding: 10, borderRadius: 6, marginTop: 10, fontSize: 13 }}>
              {country.name} is embargoed and cannot receive transfers.
            </div>
          )}
        </>
      );
    }

    if (step === 0) {
      return (
        <>
          <h2 style={titleStyle}>From your account</h2>
          <Select label="Source account" v={form.fromAccount} on={setField("fromAccount")} opts={[["checking", "Checking"], ["savings", "Savings"], ["investment", "Investment"]]} />
          <Field label="Amount" v={form.amount} on={setField("amount")} placeholder="0.00" type="number" />
          <Field label="Purpose / memo" v={form.purpose} on={setField("purpose")} placeholder="What is this transfer for?" />
        </>
      );
    }

    const recipientStep = mode === "international" ? 2 : 1;
    const bankStep = mode === "international" ? 3 : 2;
    const reviewStep = steps.length - 1;

    if (step === recipientStep) {
      return (
        <>
          <h2 style={titleStyle}>Recipient</h2>
          <Field label="Recipient legal name" v={form.recipientName} on={setField("recipientName")} required />
          <Field label="Recipient address" v={form.recipientAddress} on={setField("recipientAddress")} required />
        </>
      );
    }

    if (step === bankStep) {
      return (
        <>
          <h2 style={titleStyle}>Recipient bank</h2>
          <Field label="Bank name" v={form.recipientBank} on={setField("recipientBank")} required />
          {mode === "international"
            ? <Field label="SWIFT / BIC" v={form.swiftCode} on={setField("swiftCode")} required />
            : <Field label="ABA routing number" v={form.routingNumber} on={setField("routingNumber")} required />}
          {country?.extraFields.some((f) => f.id === "iban") || country?.code === "GB"
            ? <Field label="IBAN" v={form.iban} on={setField("iban")} />
            : null}
          {country?.extraFields.map((ef) => (
            <Field
              key={ef.id}
              label={ef.label}
              v={form.extraBankFields[ef.id] ?? ""}
              on={(v) => setExtra(ef.id, v)}
              placeholder={ef.placeholder}
              required={ef.required}
            />
          ))}
          {(country?.rails?.length ?? 0) > 0 && (
            <div style={{ background: "#f9fafb", padding: 10, borderRadius: 6, marginTop: 12, fontSize: 13, color: "#374151" }}>
              Rail: <strong>{country?.rails[0].rail}</strong> · Speed: {country?.rails[0].speed.replace(/_/g, " ")}
            </div>
          )}
        </>
      );
    }

    if (step === reviewStep) {
      return (
        <>
          <h2 style={titleStyle}>Review &amp; confirm</h2>
          <Row k="From" v={form.fromAccount} />
          <Row k="To" v={`${form.recipientName} · ${form.recipientBank}`} />
          {mode === "international" && <Row k="Destination" v={country ? `${country.name} (${country.currency})` : form.recipientCountry} />}
          <Row k="Amount" v={`${form.currency} ${parseFloat(form.amount || "0").toFixed(2)}`} />
          <Row k="Fee" v={`${form.currency} ${fee.toFixed(2)}${country?.sanctionsTier === "edd" ? " (incl. EDD surcharge)" : ""}`} />
          <Row k="Total debited" v={`${form.currency} ${total.toFixed(2)}`} bold />
          <Row k="Purpose" v={form.purpose || "—"} />
        </>
      );
    }
    return null;
  }
}

function ProgressBar({ steps, current, onClick }: { steps: readonly string[]; current: number; onClick: (i: number) => void }) {
  const pct = ((current + 1) / steps.length) * 100;
  return (
    <div>
      <div style={{ height: 6, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: BRAND.accent, transition: "width .25s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        {steps.map((s, i) => (
          <button
            key={s}
            onClick={() => onClick(Math.min(i, current))}
            style={{
              background: "none", border: "none", cursor: i <= current ? "pointer" : "default",
              color: i === current ? BRAND.primary : "#6b7280",
              fontWeight: i === current ? 700 : 500, fontSize: 13,
              padding: 0,
            }}
          >
            <span style={{
              display: "inline-block", width: 22, height: 22, lineHeight: "22px",
              borderRadius: "50%", background: i <= current ? BRAND.primary : "#e5e7eb",
              color: "#fff", marginRight: 6, fontSize: 11,
            }}>
              {i + 1}
            </span>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field(props: { label: string; v: string; on: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label style={{ display: "grid", gap: 4, marginBottom: 14 }}>
      <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{props.label}{props.required ? " *" : ""}</span>
      <input
        type={props.type ?? "text"}
        value={props.v}
        onChange={(e) => props.on(e.target.value)}
        placeholder={props.placeholder}
        required={props.required}
        style={input}
      />
    </label>
  );
}

function Select({ label, v, on, opts }: { label: string; v: string; on: (v: string) => void; opts: [string, string][] }) {
  return (
    <label style={{ display: "grid", gap: 4, marginBottom: 14 }}>
      <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{label}</span>
      <select value={v} onChange={(e) => on(e.target.value)} style={input}>
        {opts.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
      </select>
    </label>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ color: "#6b7280", fontSize: 14 }}>{k}</span>
      <span style={{ color: "#111827", fontSize: 14, fontWeight: bold ? 700 : 500 }}>{v}</span>
    </div>
  );
}

function groupByRegion(countries: Country[]): Record<string, Country[]> {
  const out: Record<string, Country[]> = {};
  for (const c of countries) {
    (out[c.region] ??= []).push(c);
  }
  return out;
}

const input: React.CSSProperties = {
  padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14,
  fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = {
  background: BRAND.primary, color: "#fff", padding: "10px 24px",
  border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer",
};
const btnSecondary: React.CSSProperties = {
  background: "#fff", color: BRAND.primary, padding: "10px 18px",
  border: `1px solid ${BRAND.primary}`, borderRadius: 6, fontWeight: 600, cursor: "pointer",
};
