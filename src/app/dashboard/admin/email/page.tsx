// src/app/dashboard/admin/email/page.tsx — admin email center

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CustomerPicker, { type CustomerLite } from "@/components/CustomerPicker";
interface Sent { _id: string; recipientEmail: string; subject: string; bodyPreview: string; status: string; errorReason?: string; tag?: string; sentByEmail?: string; createdAt: string; sentAt?: string; messageId?: string }

export default function EmailCenterPage() {
  const [tab, setTab] = useState<"compose" | "sent">("compose");

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0b1d3a", marginBottom: 6 }}>Email Center</h1>
      <p style={{ color: "#6b7280", marginBottom: 20 }}>Send a branded email to a registered customer or any address.</p>

      <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #e5e7eb", marginBottom: 24 }}>
        <TabBtn name="Compose" active={tab === "compose"} on={() => setTab("compose")} />
        <TabBtn name="Sent Items" active={tab === "sent"} on={() => setTab("sent")} />
      </div>

      {tab === "compose" ? <Compose /> : <SentItems />}
    </div>
  );
}

function TabBtn({ name, active, on }: { name: string; active: boolean; on: () => void }) {
  return (
    <button onClick={on} style={{
      padding: "10px 18px", border: "none", background: "transparent", cursor: "pointer",
      fontSize: 14, fontWeight: 600, color: active ? "#0b1d3a" : "#6b7280",
      borderBottom: active ? "3px solid #c9a449" : "3px solid transparent", marginBottom: -2,
    }}>{name}</button>
  );
}

function Compose() {
  const [recipientMode, setRecipientMode] = useState<"customer" | "adhoc">("customer");
  const [picked, setPicked] = useState<CustomerLite | null>(null);
  const [adhoc, setAdhoc] = useState("");
  const [subject, setSubject] = useState("");
  const [tag, setTag] = useState("");
  const [heading, setHeading] = useState("");
  const [paragraphs, setParagraphs] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [sigName, setSigName] = useState("");
  const [sigTitle, setSigTitle] = useState("");
  const [sigDept, setSigDept] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const payload = useMemo(() => ({
    toUserId: recipientMode === "customer" ? picked?._id : undefined,
    to: recipientMode === "adhoc" ? adhoc : undefined,
    subject,
    tag: tag || undefined,
    headingText: heading || undefined,
    paragraphs: paragraphs.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
    cta: ctaLabel && ctaUrl ? { label: ctaLabel, url: ctaUrl } : undefined,
    signature: sigName ? { name: sigName, title: sigTitle || undefined, department: sigDept || undefined } : undefined,
  }), [recipientMode, picked, adhoc, subject, tag, heading, paragraphs, ctaLabel, ctaUrl, sigName, sigTitle, sigDept]);

  // Refresh live preview when any field changes (~250ms debounce).
  useEffect(() => {
    const id = setTimeout(async () => {
      // We render preview client-side using the same template via dynamic
      // import — keeps server round-trips out of the picture.
      try {
        const mod = await import("@/lib/emailTemplate");
        setPreview(mod.renderEmail(payload as any).html);
      } catch { /* swallow */ }
    }, 250);
    return () => clearTimeout(id);
  }, [payload]);

  async function send() {
    setBusy(true); setErr(null); setOk(null);
    try {
      const r = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      setOk(`Sent (${d.messageId ?? d.id}).`);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(360px, 1fr) minmax(360px, 1fr)", gap: 24 }}>
      <div style={card}>
        <h2 style={cardTitle}>Compose</h2>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <Toggle name="Customer" active={recipientMode === "customer"} on={() => setRecipientMode("customer")} />
          <Toggle name="Ad-hoc email" active={recipientMode === "adhoc"} on={() => setRecipientMode("adhoc")} />
        </div>

        {recipientMode === "customer" ? (
          picked ? (
            <div style={{ background: "#f3f4f6", padding: 10, borderRadius: 6, marginBottom: 12 }}>
              <strong>{picked.name}</strong> — {picked.email}
              <button onClick={() => setPicked(null)} style={btnLink}> change</button>
            </div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <CustomerPicker onSelect={setPicked} />
            </div>
          )
        ) : (
          <input value={adhoc} onChange={(e) => setAdhoc(e.target.value)} placeholder="recipient@example.com" style={{ ...input, marginBottom: 12 }} />
        )}

        <Row label="Subject"><input value={subject} onChange={(e) => setSubject(e.target.value)} style={input} /></Row>
        <Row label="Tag (optional chip)"><input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. Wire confirmation" style={input} /></Row>
        <Row label="Heading"><input value={heading} onChange={(e) => setHeading(e.target.value)} style={input} /></Row>
        <Row label="Paragraphs (blank line between)"><textarea value={paragraphs} onChange={(e) => setParagraphs(e.target.value)} rows={6} style={{ ...input, fontFamily: "inherit" }} /></Row>

        <h3 style={subTitle}>Call-to-action (optional)</h3>
        <Row label="Button label"><input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} style={input} /></Row>
        <Row label="Button URL"><input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} style={input} /></Row>

        <h3 style={subTitle}>Signature</h3>
        <Row label="Name"><input value={sigName} onChange={(e) => setSigName(e.target.value)} style={input} /></Row>
        <Row label="Title"><input value={sigTitle} onChange={(e) => setSigTitle(e.target.value)} style={input} /></Row>
        <Row label="Department"><input value={sigDept} onChange={(e) => setSigDept(e.target.value)} style={input} /></Row>

        {err && <div style={{ color: "#991b1b", fontSize: 13, marginTop: 10 }}>{err}</div>}
        {ok && <div style={{ color: "#065f46", fontSize: 13, marginTop: 10 }}>{ok}</div>}

        <button onClick={send} disabled={busy || !subject || (recipientMode === "customer" ? !picked : !adhoc)} style={{ ...primaryBtn, marginTop: 14 }}>
          {busy ? "Sending…" : "Send"}
        </button>
      </div>

      <div style={card}>
        <h2 style={cardTitle}>Live preview</h2>
        <iframe
          ref={iframeRef}
          srcDoc={preview ?? "<p style=\"color:#9ca3af;font-family:system-ui;padding:24px\">Fill in the form to preview the email…</p>"}
          style={{ width: "100%", height: 640, border: "1px solid #e5e7eb", borderRadius: 6, background: "#f3f4f6" }}
        />
      </div>
    </div>
  );
}

function SentItems() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Sent[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async (query?: string) => {
    setLoading(true);
    const r = await fetch(`/api/admin/email${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    const d = await r.json();
    setRows(d.emails ?? []);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ ...cardTitle, margin: 0 }}>Sent items</h2>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject or recipient…" style={{ ...input, width: 280 }} onKeyDown={(e) => e.key === "Enter" && reload(q)} />
          <button onClick={() => reload(q)} style={secondaryBtn}>Search</button>
        </div>
      </div>
      {loading ? <p>Loading…</p> : (
        <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f3f4f6", textAlign: "left" }}><Th>When</Th><Th>To</Th><Th>Subject</Th><Th>Status</Th><Th>Sender</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <Td>{new Date(r.createdAt).toLocaleString()}</Td>
                <Td>{r.recipientEmail}</Td>
                <Td>{r.subject}<br/><span style={{ fontSize: 11, color: "#6b7280" }}>{r.bodyPreview.slice(0, 80)}…</span></Td>
                <Td>
                  <span style={{
                    background: r.status === "sent" ? "#d1fae5" : r.status === "failed" ? "#fee2e2" : "#fef3c7",
                    color: r.status === "sent" ? "#065f46" : r.status === "failed" ? "#991b1b" : "#92400e",
                    padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                  }}>{r.status}</span>
                  {r.errorReason && <div style={{ fontSize: 11, color: "#991b1b", marginTop: 4 }}>{r.errorReason}</div>}
                </Td>
                <Td>{r.sentByEmail ?? "—"}</Td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No emails sent.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 4, marginBottom: 10 }}><span style={lbl}>{label}</span>{children}</label>;
}
function Toggle({ name, active, on }: { name: string; active: boolean; on: () => void }) {
  return <button onClick={on} style={{ padding: "6px 12px", border: "1px solid #d1d5db", background: active ? "#0b1d3a" : "#fff", color: active ? "#fff" : "#374151", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{name}</button>;
}

const Th = ({ children }: { children: React.ReactNode }) => <th style={{ padding: "10px 12px", fontWeight: 600, fontSize: 12, textTransform: "uppercase", color: "#374151" }}>{children}</th>;
const Td = ({ children }: { children: React.ReactNode }) => <td style={{ padding: "10px 12px", verticalAlign: "top" }}>{children}</td>;
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 };
const cardTitle: React.CSSProperties = { margin: "0 0 14px 0", color: "#0b1d3a", fontSize: 18 };
const subTitle: React.CSSProperties = { margin: "16px 0 8px 0", color: "#0b1d3a", fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 };
const lbl: React.CSSProperties = { fontSize: 13, color: "#374151", fontWeight: 600 };
const input: React.CSSProperties = { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, width: "100%" };
const primaryBtn: React.CSSProperties = { background: "#0b1d3a", color: "#fff", padding: "10px 18px", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" };
const secondaryBtn: React.CSSProperties = { background: "#e5e7eb", color: "#111827", padding: "10px 16px", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" };
const rowBtn: React.CSSProperties = { background: "#f3f4f6", border: "1px solid #d1d5db", padding: "8px 10px", borderRadius: 4, cursor: "pointer" };
const btnLink: React.CSSProperties = { background: "none", border: "none", color: "#0b1d3a", textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: 13 };
