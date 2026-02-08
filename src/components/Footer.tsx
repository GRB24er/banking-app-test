// components/Footer.tsx
"use client";

import { useState } from "react";
import styles from "./Footer.module.css";
import Link from "next/link";
import Image from "next/image";

const Footer = () => {
  const [emailSubscribe, setEmailSubscribe] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailSubscribe) {
      setSubscribeStatus("success");
      setTimeout(() => {
        setSubscribeStatus("idle");
        setEmailSubscribe("");
      }, 3000);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerMain}>
        <div className={styles.container}>
          {/* Brand Section */}
          <div className={styles.brandSection}>
            <div className={styles.brand}>
              <Image 
                src="/images/Logo.png" 
                alt="Logo" 
                width={160} 
                height={150} 
                priority 
              />
            </div>
            
            <p className={styles.brandDescription}>
              Leading the future of wealth management with secure, innovative solutions 
              that empower your financial journey. Member FDIC • Equal Housing Lender
            </p>

            {/* Newsletter */}
            <form className={styles.newsletter} onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="Subscribe to financial insights"
                value={emailSubscribe}
                onChange={(e) => setEmailSubscribe(e.target.value)}
                className={styles.newsletterInput}
              />
              <button type="submit" className={styles.newsletterButton}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </form>
            {subscribeStatus === "success" && (
              <p className={styles.successMessage}>✓ Successfully subscribed</p>
            )}

            {/* Social Links */}
            <div className={styles.socialLinks}>
              <a href="#" className={styles.socialLink} aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a href="#" className={styles.socialLink} aria-label="Twitter">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="#" className={styles.socialLink} aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" className={styles.socialLink} aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links Grid */}
          <div className={styles.linksGrid}>
            <div className={styles.linkSection}>
              <h4 className={styles.linkTitle}>Banking</h4>
              <ul className={styles.linkList}>
                <li><Link href="/accounts/checking">Checking</Link></li>
                <li><Link href="/accounts/savings">Savings</Link></li>
                <li><Link href="/cards/credit">Credit Cards</Link></li>
                <li><Link href="/loans/personal">Personal Loans</Link></li>
                <li><Link href="/loans/mortgage">Mortgages</Link></li>
              </ul>
            </div>

            <div className={styles.linkSection}>
              <h4 className={styles.linkTitle}>Wealth</h4>
              <ul className={styles.linkList}>
                <li><Link href="/wealth/investment">Investments</Link></li>
                <li><Link href="/wealth/retirement">Retirement</Link></li>
                <li><Link href="/wealth/trust">Trust Services</Link></li>
                <li><Link href="/wealth/private">Private Banking</Link></li>
                <li><Link href="/wealth/advisory">Advisory</Link></li>
              </ul>
            </div>

            <div className={styles.linkSection}>
              <h4 className={styles.linkTitle}>Business</h4>
              <ul className={styles.linkList}>
                <li><Link href="/business/accounts">Business Accounts</Link></li>
                <li><Link href="/business/loans">Business Loans</Link></li>
                <li><Link href="/business/merchant">Merchant Services</Link></li>
                <li><Link href="/business/treasury">Treasury</Link></li>
              </ul>
            </div>

            <div className={styles.linkSection}>
              <h4 className={styles.linkTitle}>Support</h4>
              <ul className={styles.linkList}>
                <li><Link href="/help">Help Center</Link></li>
                <li><Link href="/security">Security</Link></li>
                <li><Link href="/contact">Contact Us</Link></li>
                <li><Link href="/locations">Locations</Link></li>
                <li><Link href="/careers">Careers</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className={styles.trustSection}>
        <div className={styles.trustGrid}>
          <div className={styles.trustBadge}>
            <svg className={styles.trustIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 7v6c0 4.52 3.13 8.75 8 9.88 4.87-1.13 8-5.36 8-9.88V7l-8-5z"/>
            </svg>
            <span>FDIC Insured</span>
          </div>
          <div className={styles.trustBadge}>
            <svg className={styles.trustIcon} viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>256-bit Encryption</span>
          </div>
          <div className={styles.trustBadge}>
            <svg className={styles.trustIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Equal Housing</span>
          </div>
          <div className={styles.trustBadge}>
            <svg className={styles.trustIcon} viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span>4.9/5 Rated</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomContent}>
          <div className={styles.copyright}>
            <p>© {currentYear} Horizon Global Bank. All rights reserved.</p>
            <p className={styles.legalText}>
              Member FDIC • NMLS #123456
            </p>
          </div>
          
          <div className={styles.legalLinks}>
            <Link href="/privacy">Privacy</Link>
            <span className={styles.separator}>•</span>
            <Link href="/terms">Terms</Link>
            <span className={styles.separator}>•</span>
            <Link href="/accessibility">Accessibility</Link>
            <span className={styles.separator}>•</span>
            <Link href="/disclosures">Disclosures</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;