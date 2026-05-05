"use client";
import Link from "next/link";
import styles from "../legal.module.css";
import locStyles from "./locations.module.css";

const branches = [
  { name: "ZentriBank HQ — Wall Street", address: "100 Wall Street, New York, NY 10005", hours: "Mon–Fri: 9AM–5PM", type: "Branch & ATM" },
  { name: "ZentriBank Midtown", address: "350 Fifth Avenue, New York, NY 10118", hours: "Mon–Fri: 8AM–6PM, Sat: 9AM–2PM", type: "Branch & ATM" },
  { name: "ZentriBank Brooklyn", address: "1 MetroTech Center, Brooklyn, NY 11201", hours: "Mon–Fri: 9AM–5PM", type: "Branch & ATM" },
  { name: "ZentriBank Los Angeles", address: "633 West 5th Street, Los Angeles, CA 90071", hours: "Mon–Fri: 9AM–5PM", type: "Branch & ATM" },
  { name: "ZentriBank Chicago", address: "77 West Wacker Drive, Chicago, IL 60601", hours: "Mon–Fri: 9AM–5PM", type: "Branch & ATM" },
  { name: "ZentriBank Miami", address: "1221 Brickell Avenue, Miami, FL 33131", hours: "Mon–Fri: 9AM–5PM, Sat: 9AM–1PM", type: "Branch & ATM" },
];

export default function LocationsPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.topNav}>
        <Link href="/" className={styles.topNavLogo}>ZentriBank</Link>
        <div className={styles.topNavLinks}>
          <Link href="/auth/signin">Sign In</Link>
          <Link href="/auth/signup">Open Account</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </nav>

      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.badge}>Locations</div>
          <h1 className={styles.heroTitle}>Branch & ATM Locator</h1>
          <p className={styles.heroSub}>
            Find a ZentriBank branch or ATM near you. We have locations across major US cities, with 24/7 ATM access and fee-free withdrawals for all account holders.
          </p>
        </div>
      </div>

      <div className={styles.body}>
        <div className={locStyles.searchBar}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search by city, state, or ZIP code..." />
          <button>Search</button>
        </div>

        <div className={locStyles.branchGrid}>
          {branches.map((b, i) => (
            <div key={i} className={locStyles.branchCard}>
              <div className={locStyles.branchType}>{b.type}</div>
              <h3>{b.name}</h3>
              <div className={locStyles.branchDetail}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>{b.address}</span>
              </div>
              <div className={locStyles.branchDetail}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{b.hours}</span>
              </div>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(b.address)}`} target="_blank" rel="noopener noreferrer" className={locStyles.directionsLink}>
                Get Directions →
              </a>
            </div>
          ))}
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>★</span>ATM Network</h2>
          <div className={styles.sectionBody}>
            <p>ZentriBank account holders have access to over 55,000 fee-free ATMs nationwide through the Allpoint Network. Simply look for the Allpoint logo at any ATM to withdraw cash without fees.</p>
            <div className={styles.highlight}>
              ZentriBank never charges ATM fees. If a third-party ATM charges a fee, we will reimburse up to $15 per month for Premium account holders.
            </div>
          </div>
        </div>

        <div className={styles.contactBox}>
          <h3>Can't Find a Branch Near You?</h3>
          <p>Our online banking platform gives you full access to all services from anywhere. Contact us for assistance.</p>
          <a href="mailto:admin@zentribank.capital" className={styles.contactEmail}>
            admin@zentribank.capital
          </a>
        </div>
      </div>
    </div>
  );
}
