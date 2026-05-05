"use client";
import Link from "next/link";
import styles from "../legal.module.css";

export default function DisclosuresPage() {
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
          <div className={styles.badge}>Legal</div>
          <h1 className={styles.heroTitle}>Regulatory Disclosures</h1>
          <p className={styles.heroSub}>
            Important regulatory and financial disclosures required by federal and state banking authorities.
          </p>
          <div className={styles.heroMeta}>
            <span className={styles.metaItem}><strong>Last Updated:</strong> May 1, 2026</span>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>1</span>FDIC Insurance Disclosure</h2>
          <div className={styles.sectionBody}>
            <div className={styles.highlight}>
              ZentriBank Capital is a Member of the Federal Deposit Insurance Corporation (FDIC). Deposits are insured up to $250,000 per depositor, per insured bank, for each account ownership category.
            </div>
            <p>The standard insurance amount is $250,000 per depositor, per insured bank, for each account ownership category. This includes checking accounts, savings accounts, money market deposit accounts, and certificates of deposit (CDs).</p>
            <p>Investment products, including stocks, bonds, mutual funds, and annuities, are NOT deposits, are NOT insured by the FDIC, are NOT guaranteed by the bank, and MAY lose value.</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>2</span>Equal Housing Lender</h2>
          <div className={styles.sectionBody}>
            <p>ZentriBank Capital is an Equal Housing Lender. We make loans without regard to race, color, religion, national origin, sex, handicap, or familial status, as required by the Fair Housing Act and the Equal Credit Opportunity Act.</p>
            <p>NMLS #2024001. For more information about our lending practices, please contact us at <a href="mailto:admin@zentribank.capital">admin@zentribank.capital</a>.</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>3</span>Electronic Fund Transfer Disclosure</h2>
          <div className={styles.sectionBody}>
            <p>Your rights and responsibilities regarding electronic fund transfers are governed by the Electronic Fund Transfer Act (EFTA) and Regulation E. Key points include:</p>
            <ul>
              <li>You have the right to receive documentation of transfers</li>
              <li>You have the right to stop payment on pre-authorized transfers</li>
              <li>You have the right to receive notice of varying amounts</li>
              <li>You have the right to error resolution procedures</li>
            </ul>
            <p>To report an error or unauthorized transaction, contact us within 60 days of the statement date at <a href="mailto:admin@zentribank.capital">admin@zentribank.capital</a>.</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>4</span>Fee Schedule</h2>
          <div className={styles.sectionBody}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Fee</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Monthly Maintenance</td><td>$0</td><td>No monthly fee</td></tr>
                <tr><td>Internal Transfers</td><td>$0</td><td>Between ZentriBank accounts</td></tr>
                <tr><td>Domestic Wire Transfer</td><td>$25.00</td><td>Per outgoing wire</td></tr>
                <tr><td>International Wire Transfer</td><td>$45.00</td><td>Per outgoing wire</td></tr>
                <tr><td>Incoming Wire Transfer</td><td>$0</td><td>No fee for incoming wires</td></tr>
                <tr><td>Overdraft Fee</td><td>$35.00</td><td>Per occurrence</td></tr>
                <tr><td>Stop Payment</td><td>$30.00</td><td>Per request</td></tr>
                <tr><td>Paper Statement</td><td>$3.00/month</td><td>E-statements are free</td></tr>
              </tbody>
            </table>
            <p>Fees are subject to change with 30 days' notice. Current fee schedule is always available at <a href="mailto:admin@zentribank.capital">admin@zentribank.capital</a>.</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>5</span>Interest Rate Disclosure</h2>
          <div className={styles.sectionBody}>
            <p>Interest rates on deposit accounts are variable and subject to change at any time without prior notice. Annual Percentage Yields (APYs) are accurate as of the date of this disclosure. Fees may reduce earnings.</p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Account Type</th>
                  <th>APY</th>
                  <th>Minimum Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Checking Account</td><td>0.01%</td><td>$0</td></tr>
                <tr><td>Savings Account</td><td>4.50%</td><td>$0</td></tr>
                <tr><td>Money Market</td><td>4.75%</td><td>$1,000</td></tr>
                <tr><td>12-Month CD</td><td>5.00%</td><td>$500</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.contactBox}>
          <h3>Questions About Our Disclosures?</h3>
          <p>For questions about any of our regulatory disclosures or compliance matters, contact us directly.</p>
          <a href="mailto:admin@zentribank.capital" className={styles.contactEmail}>
            admin@zentribank.capital
          </a>
        </div>
      </div>
    </div>
  );
}
