"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [balances, setBalances] = useState({ checking: 0, savings: 0, investment: 0 });

  const isAdmin = session?.user?.email === "admin@horizonbank.com" || 
                  session?.user?.email === "admin@example.com" ||
                  (session?.user as any)?.role === "admin";

  useEffect(() => {
    if (session?.user) {
      setUserName(session.user.name || "User");
      setUserEmail(session.user.email || "");
      
      fetch("/api/user/dashboard")
        .then(res => res.json())
        .then(data => {
          if (data.balances) setBalances(data.balances);
          if (data.user?.name) setUserName(data.user.name);
        })
        .catch(() => {});
    }
  }, [session]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]
    );
  };

  const formatMoney = (amt: number) => {
    if (amt >= 1000000) return `$${(amt / 1000000).toFixed(2)}M`;
    if (amt >= 1000) return `$${(amt / 1000).toFixed(1)}K`;
    return `$${amt.toLocaleString()}`;
  };

  const cashBalance = balances.checking + balances.savings;

  return (
    <>
      {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} />}
      
      <button className={styles.mobileBtn} onClick={() => setMobileOpen(!mobileOpen)}>
        <span /><span /><span />
      </button>

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.open : ""}`}>
        <div className={styles.logoWrap}>
          <Image src="/images/Logo.png" alt="Logo" width={160} height={150} priority />
        </div>

        <div className={styles.balanceCard}>
          <div className={styles.balanceTop}>Cash Balance</div>
          <div className={styles.balanceAmt}>{formatMoney(cashBalance)}</div>
          <div className={styles.balanceRow}>
            <span className={styles.dot} style={{background:"#D4AF37"}} />
            <span>Checking</span>
            <span>{formatMoney(balances.checking)}</span>
          </div>
          <div className={styles.balanceRow}>
            <span className={styles.dot} style={{background:"#F4D03F"}} />
            <span>Savings</span>
            <span>{formatMoney(balances.savings)}</span>
          </div>
          <button className={styles.transferBtn} onClick={() => router.push("/transfers/internal")}>
            → Quick Transfer
          </button>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navTitle}>MAIN MENU</div>

          <Link href="/dashboard" className={`${styles.navLink} ${pathname === "/dashboard" ? styles.active : ""}`}>
            <span className={styles.navIcon}>⬡</span> Dashboard
          </Link>

          <div className={styles.navGroup}>
            <div className={styles.navLink} onClick={() => toggleExpand("Accounts")}>
              <span className={styles.navIcon}>☰</span> Accounts
              <span className={`${styles.arrow} ${expandedItems.includes("Accounts") ? styles.arrowOpen : ""}`}>›</span>
            </div>
            {expandedItems.includes("Accounts") && (
              <div className={styles.subMenu}>
                <Link href="/accounts/checking" className={`${styles.subLink} ${pathname === "/accounts/checking" ? styles.active : ""}`}>Checking</Link>
                <Link href="/accounts/savings" className={`${styles.subLink} ${pathname === "/accounts/savings" ? styles.active : ""}`}>Savings</Link>
                <Link href="/accounts/investment" className={`${styles.subLink} ${pathname === "/accounts/investment" ? styles.active : ""}`}>Investment</Link>
              </div>
            )}
          </div>

          <div className={styles.navGroup}>
            <div className={styles.navLink} onClick={() => toggleExpand("Transfers")}>
              <span className={styles.navIcon}>⇄</span> Transfers
              <span className={`${styles.arrow} ${expandedItems.includes("Transfers") ? styles.arrowOpen : ""}`}>›</span>
            </div>
            {expandedItems.includes("Transfers") && (
              <div className={styles.subMenu}>
                <Link href="/transfers/internal" className={`${styles.subLink} ${pathname === "/transfers/internal" ? styles.active : ""}`}>Internal Transfer</Link>
                <Link href="/transfers/wire" className={`${styles.subLink} ${pathname === "/transfers/wire" ? styles.active : ""}`}>Wire Transfer</Link>
                <Link href="/transfers/international" className={`${styles.subLink} ${pathname === "/transfers/international" ? styles.active : ""}`}>International</Link>
              </div>
            )}
          </div>

          <div className={styles.navGroup}>
            <div className={styles.navLink} onClick={() => toggleExpand("Crypto")}>
              <span className={styles.navIcon}>₿</span> Crypto
              <span className={`${styles.arrow} ${expandedItems.includes("Crypto") ? styles.arrowOpen : ""}`}>›</span>
            </div>
            {expandedItems.includes("Crypto") && (
              <div className={styles.subMenu}>
                <Link href="/crypto" className={`${styles.subLink} ${pathname === "/crypto" ? styles.active : ""}`}>Wallet</Link>
                <Link href="/crypto/convert" className={`${styles.subLink} ${pathname === "/crypto/convert" ? styles.active : ""}`}>Buy / Convert</Link>
                <Link href="/crypto/send" className={`${styles.subLink} ${pathname === "/crypto/send" ? styles.active : ""}`}>Send Crypto</Link>
                <Link href="/crypto/transactions" className={`${styles.subLink} ${pathname === "/crypto/transactions" ? styles.active : ""}`}>Transactions</Link>
              </div>
            )}
          </div>

          <Link href="/transactions" className={`${styles.navLink} ${pathname === "/transactions" ? styles.active : ""}`}>
            <span className={styles.navIcon}>↗</span> Transactions
          </Link>

          <div className={styles.navGroup}>
            <div className={styles.navLink} onClick={() => toggleExpand("Cards")}>
              <span className={styles.navIcon}>▭</span> Cards
              <span className={`${styles.arrow} ${expandedItems.includes("Cards") ? styles.arrowOpen : ""}`}>›</span>
            </div>
            {expandedItems.includes("Cards") && (
              <div className={styles.subMenu}>
                <Link href="/accounts/credit-cards" className={`${styles.subLink} ${pathname === "/accounts/credit-cards" ? styles.active : ""}`}>My Cards</Link>
                <Link href="/accounts/credit-cards/apply" className={`${styles.subLink} ${pathname === "/accounts/credit-cards/apply" ? styles.active : ""}`}>Apply for Card</Link>
              </div>
            )}
          </div>

          <div className={styles.navGroup}>
            <div className={styles.navLink} onClick={() => toggleExpand("Investments")}>
              <span className={styles.navIcon}>△</span> Investments
              <span className={`${styles.arrow} ${expandedItems.includes("Investments") ? styles.arrowOpen : ""}`}>›</span>
            </div>
            {expandedItems.includes("Investments") && (
              <div className={styles.subMenu}>
                <Link href="/investments/portfolio" className={`${styles.subLink} ${pathname === "/investments/portfolio" ? styles.active : ""}`}>Portfolio</Link>
                <Link href="/investments/trading" className={`${styles.subLink} ${pathname === "/investments/trading" ? styles.active : ""}`}>Trading</Link>
              </div>
            )}
          </div>

          <Link href="/bills" className={`${styles.navLink} ${pathname === "/bills" ? styles.active : ""}`}>
            <span className={styles.navIcon}>◑</span> Bills
          </Link>

          <Link href="/accounts/statements" className={`${styles.navLink} ${pathname === "/accounts/statements" ? styles.active : ""}`}>
            <span className={styles.navIcon}>▤</span> Statements
          </Link>

          {isAdmin && (
            <div className={styles.navGroup}>
              <div className={styles.navLink} onClick={() => toggleExpand("Admin")}>
                <span className={styles.navIcon}>⚙</span> Admin
                <span className={`${styles.arrow} ${expandedItems.includes("Admin") ? styles.arrowOpen : ""}`}>›</span>
              </div>
              {expandedItems.includes("Admin") && (
                <div className={styles.subMenu}>
                  <Link href="/dashboard/admin" className={`${styles.subLink} ${pathname === "/dashboard/admin" ? styles.active : ""}`}>Dashboard</Link>
                  <Link href="/admin/users" className={`${styles.subLink} ${pathname === "/admin/users" ? styles.active : ""}`}>Users</Link>
                  <Link href="/admin/transactions" className={`${styles.subLink} ${pathname === "/admin/transactions" ? styles.active : ""}`}>Approvals</Link>
                  <Link href="/admin/crypto" className={`${styles.subLink} ${pathname === "/admin/crypto" ? styles.active : ""}`}>Crypto Approvals</Link>
                </div>
              )}
            </div>
          )}
        </nav>

        <div className={styles.userSection}>
          <div className={styles.userCard}>
            <div className={styles.avatar}>{userName.charAt(0).toUpperCase()}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{userName}</div>
              <div className={styles.userEmail}>{userEmail}</div>
            </div>
            <button className={styles.settingsBtn} onClick={() => router.push("/settings")}>⚙</button>
          </div>
          <div className={styles.security}>● 256-bit Encrypted Session</div>
        </div>
      </aside>
    </>
  );
}