"use client";
import Link from "next/link";
import styles from "../legal.module.css";

export default function PrivacyPage() {
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
          <h1 className={styles.heroTitle}>Privacy Policy</h1>
          <p className={styles.heroSub}>
            ZentriBank Capital is committed to protecting your personal information and your right to privacy.
          </p>
          <div className={styles.heroMeta}>
            <span className={styles.metaItem}><strong>Effective Date:</strong> January 1, 2025</span>
            <span className={styles.metaItem}><strong>Last Updated:</strong> May 1, 2026</span>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>1</span>Information We Collect</h2>
          <div className={styles.sectionBody}>
            <p>ZentriBank Capital collects information you provide directly to us when you open an account, make transactions, or contact us for support. This includes:</p>
            <ul>
              <li>Personal identification information (name, date of birth, Social Security Number, government-issued ID)</li>
              <li>Contact information (email address, mailing address)</li>
              <li>Financial information (account numbers, transaction history, credit history)</li>
              <li>Device and usage data (IP address, browser type, pages visited)</li>
              <li>Communications you send to us via email or our support portal</li>
            </ul>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>2</span>How We Use Your Information</h2>
          <div className={styles.sectionBody}>
            <p>We use the information we collect to provide, maintain, and improve our banking services. Specifically, we use your information to:</p>
            <ul>
              <li>Process transactions and send related notices</li>
              <li>Verify your identity and prevent fraud</li>
              <li>Comply with legal and regulatory obligations</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Send you technical notices, security alerts, and support messages</li>
              <li>Monitor and analyze trends, usage, and activities in connection with our services</li>
            </ul>
            <div className={styles.highlight}>
              We do not sell, rent, or share your personal information with third parties for their marketing purposes without your explicit consent.
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>3</span>Information Sharing and Disclosure</h2>
          <div className={styles.sectionBody}>
            <p>We may share your information in the following circumstances:</p>
            <ul>
              <li><strong>Service Providers:</strong> With vendors and service providers who perform services on our behalf, such as payment processing, data analysis, and customer service.</li>
              <li><strong>Legal Requirements:</strong> When required by law, subpoena, or other legal process, or when we believe disclosure is necessary to protect our rights or the safety of others.</li>
              <li><strong>Business Transfers:</strong> In connection with any merger, sale of company assets, or acquisition.</li>
              <li><strong>With Your Consent:</strong> With your consent or at your direction.</li>
            </ul>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>4</span>Data Security</h2>
          <div className={styles.sectionBody}>
            <p>We take the security of your personal information seriously. We implement industry-standard security measures including:</p>
            <ul>
              <li>256-bit SSL/TLS encryption for all data in transit</li>
              <li>AES-256 encryption for data at rest</li>
              <li>Multi-factor authentication for account access</li>
              <li>Regular security audits and penetration testing</li>
              <li>SOC 2 Type II compliance</li>
              <li>PCI DSS certification for payment card data</li>
            </ul>
            <p>Despite these measures, no security system is impenetrable. In the event of a data breach, we will notify you as required by applicable law.</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>5</span>Your Rights and Choices</h2>
          <div className={styles.sectionBody}>
            <p>You have the following rights regarding your personal information:</p>
            <ul>
              <li><strong>Access:</strong> You may request access to the personal information we hold about you.</li>
              <li><strong>Correction:</strong> You may request that we correct inaccurate or incomplete information.</li>
              <li><strong>Deletion:</strong> You may request deletion of your personal information, subject to certain legal obligations.</li>
              <li><strong>Portability:</strong> You may request a copy of your data in a structured, machine-readable format.</li>
              <li><strong>Opt-Out:</strong> You may opt out of receiving promotional communications from us at any time.</li>
            </ul>
            <p>To exercise any of these rights, please contact us at <a href="mailto:admin@zentribank.capital">admin@zentribank.capital</a>.</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>6</span>Cookies and Tracking</h2>
          <div className={styles.sectionBody}>
            <p>We use cookies and similar tracking technologies to track activity on our platform and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier.</p>
            <p>You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>7</span>Changes to This Policy</h2>
          <div className={styles.sectionBody}>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.</p>
          </div>
        </div>

        <div className={styles.contactBox}>
          <h3>Questions About Your Privacy?</h3>
          <p>Our privacy team is available to answer any questions you may have about this policy or our data practices.</p>
          <a href="mailto:admin@zentribank.capital" className={styles.contactEmail}>
            admin@zentribank.capital
          </a>
        </div>
      </div>
    </div>
  );
}
