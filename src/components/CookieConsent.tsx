// src/components/CookieConsent.tsx
//
// GDPR / UK-PECR style cookie banner with three categories:
//   - Strictly necessary (always on, can't be disabled)
//   - Performance & analytics (off by default)
//   - Marketing & personalisation (off by default)
//
// The user's choice is persisted in localStorage so the banner only ever
// appears once. A floating "Cookie settings" button lets them reopen it
// later — required for compliance.
//
// To consume the choice elsewhere:
//   const { hasConsent } = useCookieConsent();
//   if (hasConsent("analytics")) initGA();

"use client";

import { useEffect, useState } from "react";

type Category = "necessary" | "analytics" | "marketing";

interface Preferences {
  necessary: true;                  // always on
  analytics: boolean;
  marketing: boolean;
  version: 1;
  savedAt: string;
}

const STORAGE_KEY = "zentribank.cookie.consent.v1";

function load(): Preferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Preferences;
    return p && p.version === 1 ? p : null;
  } catch { return null; }
}

function save(p: Omit<Preferences, "necessary" | "version" | "savedAt">): Preferences {
  const out: Preferences = { necessary: true, ...p, version: 1, savedAt: new Date().toISOString() };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(out)); } catch {}
  return out;
}

export function useCookieConsent() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  useEffect(() => { setPrefs(load()); }, []);
  return {
    prefs,
    hasConsent: (c: Category) => c === "necessary" || (!!prefs && (prefs as any)[c] === true),
  };
}

const BRAND = { primary: "#0b1d3a", accent: "#c9a449" };

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [hasSaved, setHasSaved] = useState<boolean>(false);

  useEffect(() => {
    const existing = load();
    if (!existing) {
      // First visit — show banner.
      setOpen(true);
      setHasSaved(false);
    } else {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
      setHasSaved(true);
    }
  }, []);

  function acceptAll() {
    save({ analytics: true, marketing: true });
    setAnalytics(true); setMarketing(true);
    setHasSaved(true); setOpen(false);
  }
  function rejectOptional() {
    save({ analytics: false, marketing: false });
    setAnalytics(false); setMarketing(false);
    setHasSaved(true); setOpen(false);
  }
  function saveCustom() {
    save({ analytics, marketing });
    setHasSaved(true); setOpen(false);
  }

  // Floating "Cookie settings" reopener — required for ongoing consent.
  if (!open) {
    if (!hasSaved) return null; // not yet mounted on first paint
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setShowDetails(true); }}
        aria-label="Open cookie settings"
        style={floatingButton}
      >
        🍪 Cookie settings
      </button>
    );
  }

  return (
    <>
      {/* Soft overlay so it reads as a deliberate consent step */}
      <div style={overlay} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-title"
        style={panel}
      >
        <div style={{ height: 4, background: BRAND.accent, borderRadius: "8px 8px 0 0" }} />

        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ fontSize: 32 }} aria-hidden>🍪</div>
            <div style={{ flex: 1 }}>
              <h2 id="cookie-title" style={title}>We use cookies to make ZentriBank work properly</h2>
              <p style={body}>
                Cookies that are strictly necessary for sign-in, fraud prevention and security
                are always on — without them the site cannot function. We&apos;d like your
                permission to also use cookies that help us understand how you use the site
                so we can improve it, and to personalise the experience.
                You can change your choice at any time from the &quot;Cookie settings&quot; button.
              </p>

              {showDetails && (
                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  <Category
                    title="Strictly necessary"
                    description="Authentication, session integrity, security, fraud prevention, balance and transaction display. These cookies cannot be turned off."
                    checked
                    locked
                  />
                  <Category
                    title="Performance & analytics"
                    description="Anonymous usage data so we can measure page load times, find broken flows, and improve the product."
                    checked={analytics}
                    onChange={setAnalytics}
                  />
                  <Category
                    title="Marketing & personalisation"
                    description="Lets us tailor product suggestions and remember the offers you've seen. We never sell this data."
                    checked={marketing}
                    onChange={setMarketing}
                  />
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18, alignItems: "center" }}>
                <button onClick={acceptAll} style={btnPrimary}>Accept all</button>
                <button onClick={rejectOptional} style={btnSecondary}>Reject optional</button>
                {showDetails ? (
                  <button onClick={saveCustom} style={btnSecondary}>Save my choices</button>
                ) : (
                  <button onClick={() => setShowDetails(true)} style={btnLink}>Manage individually →</button>
                )}
                <div style={{ flex: 1 }} />
                <a href="/privacy" style={btnLink}>Privacy Policy</a>
                <span aria-hidden style={{ color: "#9ca3af" }}>·</span>
                <a href="/terms" style={btnLink}>Terms</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Category({
  title, description, checked, onChange, locked,
}: { title: string; description: string; checked: boolean; onChange?: (v: boolean) => void; locked?: boolean }) {
  return (
    <div style={categoryBox}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <strong style={{ color: BRAND.primary, fontSize: 14 }}>{title}</strong>
        <label style={{ position: "relative", display: "inline-block", width: 40, height: 22 }}>
          <input
            type="checkbox"
            checked={checked}
            disabled={locked}
            onChange={(e) => onChange?.(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span style={{
            position: "absolute", inset: 0, cursor: locked ? "not-allowed" : "pointer",
            background: checked ? BRAND.primary : "#d1d5db",
            borderRadius: 999, transition: "background .15s",
            opacity: locked ? 0.6 : 1,
          }} />
          <span style={{
            position: "absolute", top: 3, left: checked ? 21 : 3,
            width: 16, height: 16, background: "#fff", borderRadius: "50%",
            transition: "left .15s",
          }} />
        </label>
      </div>
      <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{description}</div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(15, 23, 42, .35)",
  zIndex: 100,
};

const panel: React.CSSProperties = {
  position: "fixed",
  bottom: 20, left: "50%", transform: "translateX(-50%)",
  width: "min(720px, calc(100vw - 32px))",
  background: "#fff",
  borderRadius: 10,
  boxShadow: "0 20px 50px rgba(0,0,0,.25)",
  zIndex: 101,
  fontFamily: "system-ui, -apple-system, sans-serif",
};

const title: React.CSSProperties = {
  margin: 0,
  fontFamily: "Georgia, serif",
  fontSize: 20,
  color: BRAND.primary,
  lineHeight: 1.3,
};

const body: React.CSSProperties = {
  margin: "8px 0 0 0",
  color: "#374151",
  fontSize: 14,
  lineHeight: 1.6,
};

const categoryBox: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "12px 14px",
};

const btnPrimary: React.CSSProperties = {
  background: BRAND.primary, color: "#fff",
  padding: "10px 18px", border: "none", borderRadius: 6,
  fontWeight: 600, fontSize: 14, cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  background: "#fff", color: BRAND.primary,
  padding: "10px 18px", border: `1px solid ${BRAND.primary}`, borderRadius: 6,
  fontWeight: 600, fontSize: 14, cursor: "pointer",
};

const btnLink: React.CSSProperties = {
  background: "none", border: "none",
  color: BRAND.primary, fontSize: 13, fontWeight: 600,
  cursor: "pointer", textDecoration: "underline",
  padding: 0,
};

const floatingButton: React.CSSProperties = {
  position: "fixed", bottom: 18, left: 18,
  background: "#fff", color: BRAND.primary,
  border: "1px solid #e5e7eb",
  borderRadius: 999,
  padding: "8px 14px",
  fontSize: 12, fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,.08)",
  zIndex: 90,
};
