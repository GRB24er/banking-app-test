"use client";
import Link from "next/link";
import styles from "../legal.module.css";

export default function RatesPage() {
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
          <div className={styles.badge}>Rates & Fees</div>
          <h1 className={styles.heroTitle}>Transparent Rates & Fees</h1>
          <p className={styles.heroSub}>
            No hidden fees. No surprises. Every rate and fee we charge is listed here, clearly and completely.
          </p>
          <div className={styles.heroMeta}>
            <span className={styles.metaItem}><strong>Rates Effective:</strong> May 1, 2026</span>
            <span className={styles.metaItem}><strong>APYs are variable</strong> and subject to change</span>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>1</span>Deposit Account Rates</h2>
          <div className={styles.sectionBody}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Account Type</th>
                  <th>Annual Percentage Yield (APY)</th>
                  <th>Minimum Balance</th>
                  <th>Monthly Fee</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>ZentriBank Checking</td><td>0.01%</td><td>$0</td><td>$0</td></tr>
                <tr><td>ZentriBank Savings</td><td>4.50%</td><td>$0</td><td>$0</td></tr>
                <tr><td>Money Market Account</td><td>4.75%</td><td>$1,000</td><td>$0</td></tr>
                <tr><td>12-Month CD</td><td>5.00%</td><td>$500</td><td>N/A</td></tr>
                <tr><td>24-Month CD</td><td>4.85%</td><td>$500</td><td>N/A</td></tr>
              </tbody>
            </table>
            <div className={styles.highlight}>
              APY = Annual Percentage Yield. Rates are variable and may change at any time. Fees may reduce earnings. FDIC insured up to $250,000.
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>2</span>Loan & Credit Rates</h2>
          <div className={styles.sectionBody}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>APR Range</th>
                  <th>Term</th>
                  <th>Min. Credit Score</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Personal Loan</td><td>7.99% – 24.99%</td><td>12–60 months</td><td>640</td></tr>
                <tr><td>Home Equity Loan</td><td>6.50% – 14.99%</td><td>60–180 months</td><td>680</td></tr>
                <tr><td>Auto Loan</td><td>5.99% – 18.99%</td><td>24–72 months</td><td>620</td></tr>
                <tr><td>Business Loan</td><td>8.50% – 22.00%</td><td>12–84 months</td><td>660</td></tr>
              </tbody>
            </table>
            <p>Your actual rate will depend on your creditworthiness, loan amount, and term. All loans are subject to credit approval.</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>3</span>Credit Card Rates</h2>
          <div className={styles.sectionBody}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Card</th>
                  <th>Purchase APR</th>
                  <th>Annual Fee</th>
                  <th>Intro APR</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>ZentriBank Rewards Visa</td><td>18.99% – 28.99%</td><td>$0</td><td>0% for 15 months</td></tr>
                <tr><td>ZentriBank Platinum</td><td>16.99% – 26.99%</td><td>$95</td><td>0% for 18 months</td></tr>
                <tr><td>ZentriBank Business Card</td><td>19.99% – 29.99%</td><td>$0</td><td>0% for 12 months</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>4</span>Transfer & Transaction Fees</h2>
          <div className={styles.sectionBody}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Fee</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Internal Transfers (between ZentriBank accounts)</td><td>Free</td></tr>
                <tr><td>Outgoing Domestic Wire Transfer</td><td>$25.00</td></tr>
                <tr><td>Incoming Wire Transfer</td><td>Free</td></tr>
                <tr><td>International Wire Transfer</td><td>$45.00</td></tr>
                <tr><td>ACH Transfer</td><td>Free</td></tr>
                <tr><td>Expedited ACH (Same Day)</td><td>$5.00</td></tr>
                <tr><td>Stop Payment Request</td><td>$30.00</td></tr>
                <tr><td>Returned Item Fee</td><td>$35.00</td></tr>
                <tr><td>Overdraft Fee</td><td>$35.00 (max 3/day)</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.contactBox}>
          <h3>Questions About Rates?</h3>
          <p>Contact our team for personalized rate quotes or to discuss your financial needs.</p>
          <a href="mailto:admin@zentribank.capital" className={styles.contactEmail}>
            admin@zentribank.capital
          </a>
        </div>
      </div>
    </div>
  );
}
