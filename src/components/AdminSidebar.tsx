// src/components/AdminSidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "./Sidebar.module.css";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { 
    label: "Admin Dashboard", 
    href: "/dashboard/admin", 
    icon: "📊"
  },
  { 
    label: "Credit Cards", 
    href: "/dashboard/admin/credit-cards", 
    icon: "💳"
  },
  { 
    label: "Email Statements", 
    href: "/dashboard/admin/statements", 
    icon: "📧"
  },
  { 
    label: "Support Chats", 
    href: "/dashboard/admin/chats", 
    icon: "💬"
  },
  { 
    label: "User Management", 
    href: "/dashboard/admin/users", 
    icon: "👥"
  },
  { 
    label: "Transactions", 
    href: "/dashboard/admin/transactions", 
    icon: "💸"
  },
  { 
    label: "KYC Verification", 
    href: "/dashboard/admin/kyc", 
    icon: "✅"
  },
  {
    label: "Reports",
    href: "/dashboard/admin/reports",
    icon: "📈"
  },
  {
    label: "Account Restrictions",
    href: "/dashboard/admin/restrictions",
    icon: "🚫"
  },
  {
    label: "Adjustments & Reversals",
    href: "/dashboard/admin/adjustments",
    icon: "↔️"
  },
  {
    label: "Email Center",
    href: "/dashboard/admin/email",
    icon: "✉️"
  },
  {
    label: "System Settings",
    href: "/dashboard/admin/settings",
    icon: "⚙️"
  },
  { 
    label: "Back to User Dashboard", 
    href: "/dashboard", 
    icon: "🔙"
  }
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className={styles.mobileOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <button
        className={styles.mobileToggle}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <span className={styles.hamburger}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      <motion.nav
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}
        initial={false}
        animate={{
          width: collapsed ? 80 : 280,
          transition: { duration: 0.3, ease: "easeInOut" }
        }}
      >
        {/* Logo Section */}
        <div className={styles.logoSection}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🦁</span>
            {!collapsed && (
              <div className={styles.logoText}>
                <span className={styles.bankName}>ZentriBank</span>
                <span className={styles.bankTagline}>Admin Panel</span>
              </div>
            )}
          </div>
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {/* Admin Info Card */}
        {!collapsed && (
          <div className={styles.quickBalanceCard}>
            <div className={styles.balanceHeader}>
              <span className={styles.balanceTitle}>Administrator</span>
              <span style={{ fontSize: '1.25rem' }}>⚡</span>
            </div>
            <div style={{
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              fontSize: '0.875rem',
              color: '#cbd5e1'
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: '#fff' }}>{session?.user?.name || 'Admin'}</strong>
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                {session?.user?.email}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className={styles.navSection}>
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;

            return (
              <div key={item.label} className={styles.navItemWrapper}>
                <div
                  className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                  onClick={() => router.push(item.href)}
                >
                  <div className={styles.navItemContent}>
                    <span className={styles.navIcon}>{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className={styles.navLabel}>{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <span className={styles.navBadge}>{item.badge}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Section */}
        {!collapsed && (
          <div className={styles.bottomSection}>
            <div className={styles.securityStatus} style={{ 
              background: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)'
            }}>
              <span className={styles.securityIcon}>🛡️</span>
              <div className={styles.securityText}>
                <span className={styles.securityLabel} style={{ color: '#fca5a5' }}>
                  Admin Mode
                </span>
                <span className={styles.securityDetail} style={{ color: '#fecaca' }}>
                  Full Access
                </span>
              </div>
            </div>
            
            <div className={styles.lastLogin}>
              <span className={styles.lastLoginLabel}>Current Time</span>
              <span className={styles.lastLoginTime}>
                {new Date().toLocaleString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        )}
      </motion.nav>
    </>
  );
}