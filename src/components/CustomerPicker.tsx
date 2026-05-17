// src/components/CustomerPicker.tsx
//
// Reusable customer search with live debounced query, scrollable results,
// total-count badge, and pagination. Used by /dashboard/admin/restrictions,
// /dashboard/admin/adjustments and /dashboard/admin/email.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface CustomerLite {
  _id: string;
  name: string;
  email: string;
  accountNumber?: string | null;
  verified?: boolean;
  accountStatus?: { kind: string; reference: string } | null;
}

interface Props {
  onSelect: (user: CustomerLite) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function CustomerPicker({ onSelect, placeholder = "Search by name, email, or account number…", autoFocus }: Props) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<CustomerLite[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqSeqRef = useRef(0);

  // Debounce the query so we don't fire a request on every keystroke.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      void fetchPage(q, 1, /*append*/ false);
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function fetchPage(query: string, p: number, append: boolean) {
    const seq = ++reqSeqRef.current;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}&page=${p}&limit=50`);
      const d = await r.json();
      // A stale response (user typed more chars while in flight) — drop it.
      if (seq !== reqSeqRef.current) return;
      if (!r.ok || !d.success) throw new Error(d.error || "Lookup failed");
      setUsers((prev) => (append ? [...prev, ...(d.users ?? [])] : (d.users ?? [])));
      setTotal(Number(d.total ?? 0));
      setHasMore(Boolean(d.hasMore));
      setPage(p);
    } catch (e: any) {
      if (seq !== reqSeqRef.current) return;
      setError(e.message);
    } finally {
      if (seq === reqSeqRef.current) setLoading(false);
    }
  }

  const summary = useMemo(() => {
    if (loading && users.length === 0) return "Searching…";
    if (error) return error;
    if (!q && total === 0) return "Start typing to search customers";
    if (total === 0) return "No customers match.";
    return `Showing ${users.length} of ${total.toLocaleString()} ${total === 1 ? "match" : "matches"}`;
  }, [loading, error, q, total, users.length]);

  return (
    <div>
      <input
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        style={input}
      />

      <div style={{ fontSize: 12, color: error ? "#991b1b" : "#6b7280", margin: "8px 2px" }}>
        {summary}
      </div>

      <ul style={listBox}>
        {users.map((u) => (
          <li key={u._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
            <button
              type="button"
              onClick={() => onSelect(u)}
              style={rowBtn}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.email}{u.accountNumber ? ` · ${u.accountNumber}` : ""}
                  </div>
                </div>
                {u.accountStatus?.kind ? (
                  <span style={{ ...statusPill, background: u.accountStatus.kind === "freeze" ? "#fef3c7" : u.accountStatus.kind === "block" ? "#fee2e2" : "#e0e7ff", color: u.accountStatus.kind === "freeze" ? "#92400e" : u.accountStatus.kind === "block" ? "#991b1b" : "#3730a3" }}>
                    {u.accountStatus.kind}
                  </span>
                ) : u.verified === false ? (
                  <span style={{ ...statusPill, background: "#f3f4f6", color: "#6b7280" }}>unverified</span>
                ) : null}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button
            type="button"
            onClick={() => fetchPage(q, page + 1, /*append*/ true)}
            disabled={loading}
            style={loadMoreBtn}
          >
            {loading ? "Loading…" : `Load more (${total - users.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}

const input: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const listBox: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  maxHeight: 320,
  overflowY: "auto",
  background: "#fff",
};

const rowBtn: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 14,
};

const statusPill: React.CSSProperties = {
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  flexShrink: 0,
};

const loadMoreBtn: React.CSSProperties = {
  background: "#fff",
  color: "#0b1d3a",
  padding: "8px 16px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
