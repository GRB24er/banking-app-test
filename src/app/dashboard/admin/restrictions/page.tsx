// src/app/dashboard/admin/restrictions/page.tsx — admin restriction console

"use client";

import { useEffect, useState } from "react";

interface Restriction {
  _id: string;
  reference: string;
  userId: string;
  kind: "freeze" | "block" | "close";
  scope: string;
  reason: string;
  reasonDetail?: string;
  effectiveAt: string;
  effectiveUntil?: string | null;
  liftedAt?: string | null;
  liftReason?: string;
}

interface UserLite { _id: string; name: string; email: string; accountNumber?: string }

const REASONS = [
  "aml_review", "fraud_suspected", "court_order", "sanctions_hit",
  "kyc_lapsed", "deceased", "regulatory_request", "duplicate_account",
  "chargeback_dispute", "customer_request", "compliance_review", "other",
];

export default function AdminRestrictionsPage() {
  const [rows, setRows] = useState<Restriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssue, setShowIssue] = useState(false);
  const [showLift, setShowLift] = useState<Restriction | null>(null);

  const reload = () => {
    setLoading(true);
    fetch("/api/admin/restrictions")
      .then((r) => r.json())
      .then((d) => setRows(d.restrictions ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  return (
    <div style={{ padding: 32 }}>
      <Header onIssue={() => setShowIssue(true)} />
      {loading ? <p>Loading…</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 24, fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
              <Th>Reference</Th><Th>Kind</Th><Th>Scope</Th><Th>Reason</Th><Th>Effective</Th><Th>Status</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <Td><code>{r.reference}</code></Td>
                <Td><Pill kind={r.kind} /></Td>
                <Td>{r.scope}</Td>
                <Td>{r.reason.replace(/_/g, " ")}</Td>
                <Td>{new Date(r.effectiveAt).toLocaleDateString()}</Td>
                <Td>{r.liftedAt ? <span style={{ color: "#6b7280" }}>lifted</span> : <span style={{ color: "#dc2626", fontWeight: 600 }}>active</span>}</Td>
                <Td>
                  <a href={`/api/admin/restrictions/${r._id}/document`} style={linkStyle}>PDF</a>
                  {!r.liftedAt ? <> {" · "} <button onClick={() => setShowLift(r)} style={btnLink}>Lift</button></> : null}
                </Td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>No restrictions issued yet.</td></tr>}
          </tbody>
        </table>
      )}

      {showIssue && <IssueModal onClose={() => setShowIssue(false)} onCreated={reload} />}
      {showLift && <LiftModal restriction={showLift} onClose={() => setShowLift(null)} onDone={reload} />}
    </div>
  );
}

function Header({ onIssue }: { onIssue: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0b1d3a", margin: 0 }}>Account Restrictions</h1>
        <p style={{ color: "#6b7280", marginTop: 4 }}>Freeze, block, or close an account. All actions are audit-logged.</p>
      </div>
      <button onClick={onIssue} style={primaryBtn}>＋ Issue restriction</button>
    </div>
  );
}

function Pill({ kind }: { kind: string }) {
  const colors: Record<string, string> = { freeze: "#f59e0b", block: "#dc2626", close: "#4338ca" };
  return <span style={{ background: colors[kind] ?? "#6b7280", color: "#fff", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{kind}</span>;
}

function IssueModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<"lookup" | "form">("lookup");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserLite[]>([]);
  const [target, setTarget] = useState<UserLite | null>(null);
  const [form, setForm] = useState({
    kind: "freeze" as "freeze" | "block" | "close",
    scope: "all" as "all" | "checking" | "savings" | "investment",
    reason: "compliance_review",
    reasonDetail: "",
    effectiveUntil: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function lookup() {
    if (!q.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      setResults((d.users ?? d ?? []).slice(0, 8));
    } catch { setResults([]); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!target) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/admin/restrictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: target._id, kind: form.kind, scope: form.scope,
          reason: form.reason, reasonDetail: form.reasonDetail,
          effectiveUntil: form.effectiveUntil || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      onCreated(); onClose();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal title="Issue restriction" onClose={onClose}>
      {step === "lookup" ? (
        <>
          <p style={{ color: "#6b7280", fontSize: 14 }}>Find the customer:</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email or name…" style={input} onKeyDown={(e) => e.key === "Enter" && lookup()} />
            <button onClick={lookup} style={secondaryBtn} disabled={busy}>Search</button>
          </div>
          <ul style={{ marginTop: 12, listStyle: "none", padding: 0 }}>
            {results.map((u) => (
              <li key={u._id}>
                <button onClick={() => { setTarget(u); setStep("form"); }} style={{ ...rowBtn, width: "100%", textAlign: "left" }}>
                  <strong>{u.name}</strong> — {u.email}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <div style={{ background: "#f3f4f6", padding: 10, borderRadius: 6, marginBottom: 14, fontSize: 14 }}>
            <strong>{target?.name}</strong> — {target?.email}
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <Sel label="Kind" v={form.kind} on={(v) => setForm({ ...form, kind: v as any })} opts={[["freeze", "Freeze"], ["block", "Block"], ["close", "Close"]]} />
            <Sel label="Scope" v={form.scope} on={(v) => setForm({ ...form, scope: v as any })} opts={[["all", "All accounts"], ["checking", "Checking"], ["savings", "Savings"], ["investment", "Investment"]]} />
            <Sel label="Reason" v={form.reason} on={(v) => setForm({ ...form, reason: v })} opts={REASONS.map((r) => [r, r.replace(/_/g, " ")])} />
            <label style={{ display: "grid", gap: 4 }}>
              <span style={lbl}>Additional detail (shown on notice)</span>
              <textarea value={form.reasonDetail} onChange={(e) => setForm({ ...form, reasonDetail: e.target.value })} rows={3} style={{ ...input, fontFamily: "inherit" }} />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={lbl}>Effective until (optional)</span>
              <input type="datetime-local" value={form.effectiveUntil} onChange={(e) => setForm({ ...form, effectiveUntil: e.target.value })} style={input} />
            </label>
          </div>
          {err && <div style={{ color: "#991b1b", marginTop: 12, fontSize: 13 }}>{err}</div>}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setStep("lookup")} style={secondaryBtn}>Back</button>
            <button onClick={submit} disabled={busy} style={primaryBtn}>Issue restriction</button>
          </div>
        </>
      )}
    </Modal>
  );
}

function LiftModal({ restriction, onClose, onDone }: { restriction: Restriction; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/admin/restrictions/${restriction._id}/lift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      onDone(); onClose();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal title={`Lift ${restriction.reference}`} onClose={onClose}>
      <p style={{ color: "#6b7280", fontSize: 14 }}>
        Lifting will reinstate normal account activity. The original restriction record is preserved.
      </p>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={lbl}>Reason for lifting</span>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} style={{ ...input, fontFamily: "inherit" }} />
      </label>
      {err && <div style={{ color: "#991b1b", marginTop: 8, fontSize: 13 }}>{err}</div>}
      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={secondaryBtn}>Cancel</button>
        <button onClick={submit} disabled={busy || !reason.trim()} style={primaryBtn}>Lift restriction</button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 8, padding: 24, width: 520, maxWidth: "92vw", maxHeight: "92vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: "#0b1d3a" }}>{title}</h2>
          <button onClick={onClose} style={{ ...rowBtn, padding: "4px 10px" }}>✕</button>
        </div>
        {children}
      </div>
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

const Th = ({ children }: { children: React.ReactNode }) => <th style={{ padding: "10px 12px", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "#374151" }}>{children}</th>;
const Td = ({ children }: { children: React.ReactNode }) => <td style={{ padding: "10px 12px" }}>{children}</td>;
const lbl: React.CSSProperties = { fontSize: 13, color: "#374151", fontWeight: 600 };
const input: React.CSSProperties = { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, width: "100%" };
const primaryBtn: React.CSSProperties = { background: "#0b1d3a", color: "#fff", padding: "10px 18px", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" };
const secondaryBtn: React.CSSProperties = { background: "#e5e7eb", color: "#111827", padding: "10px 16px", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" };
const rowBtn: React.CSSProperties = { background: "#f3f4f6", border: "1px solid #d1d5db", padding: "8px 10px", borderRadius: 4, cursor: "pointer" };
const linkStyle: React.CSSProperties = { color: "#0b1d3a", textDecoration: "underline", fontSize: 13 };
const btnLink: React.CSSProperties = { background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: 0, fontSize: 13, textDecoration: "underline" };
