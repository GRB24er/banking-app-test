"use client";
import Link from "next/link";
import styles from "../legal.module.css";
import aboutStyles from "./about.module.css";

export default function AboutPage() {
  const stats = [
    { value: "100K+", label: "Customers Served" },
    { value: "$2.4B+", label: "Assets Under Management" },
    { value: "99.99%", label: "Platform Uptime" },
    { value: "2019", label: "Year Founded" },
  ];

  const values = [
    {
      title: "Transparency",
      desc: "No hidden fees, no fine print surprises. We believe banking should be straightforward and honest.",
    },
    {
      title: "Security",
      desc: "Bank-grade 256-bit encryption, SOC 2 compliance, and 24/7 fraud monitoring protect every account.",
    },
    {
      title: "Innovation",
      desc: "We continuously invest in technology to deliver a seamless, modern banking experience.",
    },
    {
      title: "Accessibility",
      desc: "Banking should be available to everyone. We offer zero-fee accounts with no minimum balance requirements.",
    },
  ];

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
          <div className={styles.badge}>About Us</div>
          <h1 className={styles.heroTitle}>Built for the Modern Saver</h1>
          <p className={styles.heroSub}>
            ZentriBank Capital was founded with a single mission: to make enterprise-grade banking accessible to everyone — without the complexity, hidden fees, or outdated infrastructure of traditional banks.
          </p>
        </div>
      </div>

      <div className={styles.body}>
        {/* Stats */}
        <div className={aboutStyles.statsGrid}>
          {stats.map((s, i) => (
            <div key={i} className={aboutStyles.statCard}>
              <div className={aboutStyles.statValue}>{s.value}</div>
              <div className={aboutStyles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>★</span>Our Story</h2>
          <div className={styles.sectionBody}>
            <p>ZentriBank Capital was established in 2019 by a team of fintech veterans and former Wall Street professionals who believed the banking industry was overdue for a fundamental rethink. Traditional banks were burdened by legacy infrastructure, opaque fee structures, and a customer experience that had not meaningfully evolved in decades.</p>
            <p>We built ZentriBank from the ground up on modern cloud infrastructure, with security and user experience at the core of every decision. Today, we serve over 100,000 customers across the United States, managing over $2.4 billion in assets.</p>
            <p>Our platform offers checking and savings accounts, investment portfolios, wire transfers, international payments, and business banking — all accessible through a single, intuitive interface.</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>★</span>Our Values</h2>
          <div className={aboutStyles.valuesGrid}>
            {values.map((v, i) => (
              <div key={i} className={aboutStyles.valueCard}>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>★</span>Regulatory Standing</h2>
          <div className={styles.sectionBody}>
            <p>ZentriBank Capital operates under the supervision of the Federal Deposit Insurance Corporation (FDIC) and the Office of the Comptroller of the Currency (OCC). All deposits are FDIC-insured up to $250,000 per depositor.</p>
            <p>We are registered with the Financial Crimes Enforcement Network (FinCEN) and maintain a robust Anti-Money Laundering (AML) and Know Your Customer (KYC) program in compliance with the Bank Secrecy Act.</p>
            <div className={styles.highlight}>
              ZentriBank Capital is a Member FDIC institution. NMLS #2024001. Equal Housing Lender.
            </div>
          </div>
        </div>

        <div className={styles.contactBox}>
          <h3>Want to Learn More?</h3>
          <p>Reach out to our team for press inquiries, partnership opportunities, or general questions.</p>
          <a href="mailto:admin@zentribank.capital" className={styles.contactEmail}>
            admin@zentribank.capital
          </a>
        </div>
      </div>
    </div>
  );
}
