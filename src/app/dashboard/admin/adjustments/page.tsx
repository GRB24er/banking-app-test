// src/app/dashboard/admin/adjustments/page.tsx — three-tab admin console

"use client";

import { useEffect, useState } from "react";
import CustomerPicker, { type CustomerLite } from "@/components/CustomerPicker";

type Tab = "adjust" | "reverse" | "history";

interface Tx { _id: string; reference: string; type: string; amount: number; currency: string; postedAt?: string; description?: string }

const ADJUST_REASONS = [
  "courtesy_credit", "promotional_credit", "interest_correction",
  "fee_refund", "fraud_reimbursement", "regulatory_settlement",
  "duplicate_charge", "service_recovery", "system_correction",
  "balance_reconciliation", "loyalty_reward", "manual_credit", "manual_debit",
];

export default function AdjustmentsPage() {
  const [tab, setTab] = useState<Tab>("adjust");

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0b1d3a", marginBottom: 6 }}>Adjustments &amp; Reversals</h1>
      <p style={{ color: "#6b7280", marginBottom: 20 }}>Post manual ledger adjustments or reverse a transaction with a contra-entry.</p>

      <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #e5e7eb", marginBottom: 24 }}>
        <Tab name="Adjust" active={tab === "adjust"} on={() => setTab("adjust")} />
        <Tab name="Reverse" active={tab === "reverse"} on={() => setTab("reverse")} />
        <Tab name="History" active={tab === "history"} on={() => setTab("history")} />
      </div>

      {tab === "adjust" && <AdjustPanel />}
      {tab === "reverse" && <ReversePanel />}
      {tab === "history" && <HistoryPanel />}
    </div>
  );
}

function Tab({ name, active, on }: { name: string; active: boolean; on: () => void }) {
  return (
    <button onClick={on} style={{
      padding: "10px 18px", border: "none", background: "transparent",
      cursor: "pointer", fontSize: 14, fontWeight: 600,
      color: active ? "#0b1d3a" : "#6b7280",
      borderBottom: active ? "3px solid #c9a449" : "3px solid transparent",
      marginBottom: -2,
    }}>{name}</button>
  );
}

function AdjustPanel() {
  const [target, setTarget] = useState<CustomerLite | null>(null);
  const [form, setForm] = useState({
    direction: "credit" as "credit" | "debit",
    amount: "",
    currency: "USD",
    accountType: "checking" as "checking" | "savings" | "investment",
    reason: "courtesy_credit",
    notes: "",
  });
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!target) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/admin/accounts/${target._id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      setResult(d);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (result) {
    return (
      <Card title="Adjustment posted">
        <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.8 }}>
          Reference <code>{result.reference}</code><br/>
          Balance before {result.balanceBefore?.toFixed(2)} → after <strong>{result.balanceAfter?.toFixed(2)}</strong>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <a href={result.documentUrl} style={primaryLink}>Download receipt</a>
          <button onClick={() => { setResult(null); setTarget(null); setForm({ ...form, amount: "", notes: "" }); }} style={secondaryBtn}>Post another</button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Post a manual adjustment">
      {!target ? (
        <>
          <p style={muted}>Step 1 — find the customer</p>
          <CustomerPicker onSelect={setTarget} autoFocus />
        </>
      ) : (
        <>
          <div style={{ background: "#f3f4f6", padding: 10, borderRadius: 6, marginBottom: 14 }}>
            <strong>{target.name}</strong> — {target.email}
            <button onClick={() => setTarget(null)} style={{ ...btnLink, marginLeft: 12 }}>change</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Sel label="Direction" v={form.direction} on={(v) => setForm({ ...form, direction: v as any })} opts={[["credit", "Credit (money in)"], ["debit", "Debit (money out)"]]} />
            <Sel label="Account" v={form.accountType} on={(v) => setForm({ ...form, accountType: v as any })} opts={[["checking", "Checking"], ["savings", "Savings"], ["investment", "Investment"]]} />
            <label style={{ display: "grid", gap: 4 }}>
              <span style={lbl}>Amount</span>
              <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" style={input} />
            </label>
            <Sel label="Currency" v={form.currency} on={(v) => setForm({ ...form, currency: v })} opts={[["USD", "USD"], ["EUR", "EUR"], ["GBP", "GBP"], ["CAD", "CAD"]]} />
            <Sel label="Reason" v={form.reason} on={(v) => setForm({ ...form, reason: v })} opts={ADJUST_REASONS.map((r) => [r, r.replace(/_/g, " ")])} />
            <label style={{ display: "grid", gap: 4, gridColumn: "1 / -1" }}>
              <span style={lbl}>Notes (shown on receipt)</span>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...input, fontFamily: "inherit" }} />
            </label>
          </div>
          {err && <div style={{ color: "#991b1b", marginTop: 10, fontSize: 13 }}>{err}</div>}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={submit} disabled={busy || !form.amount} style={primaryBtn}>{busy ? "Posting…" : "Post adjustment"}</button>
          </div>
        </>
      )}
    </Card>
  );
}

function ReversePanel() {
  const [ref, setRef] = useState("");
  const [tx, setTx] = useState<Tx | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function find() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/admin/transactions?reference=${encodeURIComponent(ref)}`);
      const d = await r.json();
      setTx((d.transactions ?? d ?? [])[0] ?? null);
      if (!d || (d.transactions ?? d).length === 0) setErr("No transaction with that reference.");
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!tx) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/admin/transactions/${tx._id}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ reason, notes }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      setResult(d);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (result) {
    return (
      <Card title="Reversal posted">
        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
          Original: <code>{result.originalReference}</code><br/>
          Reversal: <code>{result.reversalReference}</code>
        </div>
        <a href={result.documentUrl} style={primaryLink}>Download reversal notice</a>
      </Card>
    );
  }

  return (
    <Card title="Reverse a transaction">
      <p style={muted}>Find the transaction by reference. A contra-entry will be posted; the original record is preserved.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. WTH-123456-ABCDEF" style={input} />
        <button onClick={find} style={secondaryBtn} disabled={busy}>Find</button>
      </div>
      {tx && (
        <>
          <div style={{ background: "#f3f4f6", padding: 12, borderRadius: 6, marginBottom: 14 }}>
            <strong>{tx.type}</strong> — {tx.currency} {tx.amount.toFixed(2)}<br/>
            <span style={{ color: "#6b7280", fontSize: 13 }}>{tx.description}</span>
          </div>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={lbl}>Reason for reversal</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. duplicate posting" style={input} />
          </label>
          <label style={{ display: "grid", gap: 4, marginTop: 12 }}>
            <span style={lbl}>Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...input, fontFamily: "inherit" }} />
          </label>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={submit} disabled={busy || !reason.trim()} style={primaryBtn}>{busy ? "Reversing…" : "Reverse transaction"}</button>
          </div>
        </>
      )}
      {err && <div style={{ color: "#991b1b", marginTop: 10, fontSize: 13 }}>{err}</div>}
    </Card>
  );
}

function HistoryPanel() {
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/transactions?origin=manual_adjustment,manual_reversal&limit=100")
      .then((r) => r.json())
      .then((d) => setRows(d.transactions ?? d ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;
  return (
    <Card title="Recent adjustments &amp; reversals">
      <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
        <thead><tr style={{ background: "#f3f4f6", textAlign: "left" }}><Th>Ref</Th><Th>Type</Th><Th>Amount</Th><Th>When</Th><Th>Receipt</Th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <Td><code>{r.reference}</code></Td>
              <Td>{r.type}</Td>
              <Td>{r.currency} {r.amount.toFixed(2)}</Td>
              <Td>{r.postedAt ? new Date(r.postedAt).toLocaleString() : "—"}</Td>
              <Td><a href={`/api/admin/transactions/${r._id}/document`} style={linkStyle}>PDF</a></Td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>No history yet.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
      <h2 style={{ margin: "0 0 14px 0", color: "#0b1d3a", fontSize: 18 }}>{title}</h2>
      {children}
    </div>
  );
}

function Sel({ label, v, on, opts }: { label: string; v: string; on: (v: string) => void; opts: [string, string][] }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={lbl}>{label}</span>
      <select value={v} onChange={(e) => on(e.target.value)} style={input}>
        {opts.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
      </select>
    </label>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => <th style={{ padding: "10px 12px", fontWeight: 600, fontSize: 12, textTransform: "uppercase", color: "#374151" }}>{children}</th>;
const Td = ({ children }: { children: React.ReactNode }) => <td style={{ padding: "10px 12px" }}>{children}</td>;
const muted: React.CSSProperties = { color: "#6b7280", fontSize: 14, marginTop: 0 };
const lbl: React.CSSProperties = { fontSize: 13, color: "#374151", fontWeight: 600 };
const input: React.CSSProperties = { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, width: "100%" };
const primaryBtn: React.CSSProperties = { background: "#0b1d3a", color: "#fff", padding: "10px 18px", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" };
const secondaryBtn: React.CSSProperties = { background: "#e5e7eb", color: "#111827", padding: "10px 16px", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" };
const rowBtn: React.CSSProperties = { background: "#f3f4f6", border: "1px solid #d1d5db", padding: "8px 10px", borderRadius: 4, cursor: "pointer" };
const linkStyle: React.CSSProperties = { color: "#0b1d3a", textDecoration: "underline" };
const primaryLink: React.CSSProperties = { ...linkStyle, display: "inline-block", marginTop: 8, fontWeight: 600 };
const btnLink: React.CSSProperties = { background: "none", border: "none", color: "#0b1d3a", textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: 13 };
