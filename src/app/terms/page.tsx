"use client";
import Link from "next/link";
import styles from "../legal.module.css";

export default function TermsPage() {
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
          <h1 className={styles.heroTitle}>Terms of Service</h1>
          <p className={styles.heroSub}>
            Please read these terms carefully before using ZentriBank's services. By accessing or using our platform, you agree to be bound by these terms.
          </p>
          <div className={styles.heroMeta}>
            <span className={styles.metaItem}><strong>Effective Date:</strong> January 1, 2025</span>
            <span className={styles.metaItem}><strong>Last Updated:</strong> May 1, 2026</span>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>1</span>Acceptance of Terms</h2>
          <div className={styles.sectionBody}>
            <p>By accessing and using ZentriBank Capital's online banking platform ("Service"), you accept and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not access or use our Service.</p>
            <div className={styles.highlight}>
              These Terms constitute a legally binding agreement between you and ZentriBank Capital. Please read them carefully.
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>2</span>Eligibility</h2>
          <div className={styles.sectionBody}>
            <p>To use our Service, you must:</p>
            <ul>
              <li>Be at least 18 years of age</li>
              <li>Be a legal resident or citizen of the United States</li>
              <li>Have a valid Social Security Number or Individual Taxpayer Identification Number</li>
              <li>Not be prohibited from receiving our services under applicable law</li>
              <li>Provide accurate, current, and complete information during registration</li>
            </ul>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>3</span>Account Responsibilities</h2>
          <div className={styles.sectionBody}>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:</p>
            <ul>
              <li>Immediately notify us of any unauthorized use of your account</li>
              <li>Never share your password or authentication credentials with any third party</li>
              <li>Use strong, unique passwords and enable two-factor authentication</li>
              <li>Keep your contact information current and accurate</li>
              <li>Log out from your account at the end of each session</li>
            </ul>
            <p>ZentriBank Capital will not be liable for any loss or damage arising from your failure to comply with these security obligations.</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>4</span>Permitted Use</h2>
          <div className={styles.sectionBody}>
            <p>You may use our Service only for lawful purposes and in accordance with these Terms. You agree not to use our Service:</p>
            <ul>
              <li>In any way that violates any applicable federal, state, local, or international law or regulation</li>
              <li>To transmit any unsolicited or unauthorized advertising or promotional material</li>
              <li>To impersonate or attempt to impersonate ZentriBank, a ZentriBank employee, or any other person</li>
              <li>To engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Service</li>
              <li>For money laundering, fraud, or any other financial crime</li>
            </ul>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>5</span>Transaction Terms</h2>
          <div className={styles.sectionBody}>
            <p>All transactions conducted through our platform are subject to the following conditions:</p>
            <ul>
              <li>Transactions are processed in accordance with applicable banking regulations and our internal policies</li>
              <li>Transfer limits apply as specified in your account agreement and may be updated from time to time</li>
              <li>We reserve the right to delay, hold, or refuse any transaction that we reasonably believe may be fraudulent or violate applicable law</li>
              <li>Fees for services are disclosed at the time of the transaction and in our Fee Schedule</li>
            </ul>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>6</span>Limitation of Liability</h2>
          <div className={styles.sectionBody}>
            <p>To the fullest extent permitted by applicable law, ZentriBank Capital shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, or goodwill, arising out of or in connection with your use of the Service.</p>
            <p>Our total liability to you for any claims arising from these Terms or your use of the Service shall not exceed the amount of fees paid by you to us in the twelve (12) months preceding the claim.</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>7</span>Governing Law</h2>
          <div className={styles.sectionBody}>
            <p>These Terms shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in New York County, New York.</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>8</span>Changes to Terms</h2>
          <div className={styles.sectionBody}>
            <p>We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on our website and notifying you via email. Your continued use of the Service after such changes constitutes your acceptance of the new Terms.</p>
          </div>
        </div>

        <div className={styles.contactBox}>
          <h3>Questions About Our Terms?</h3>
          <p>If you have any questions about these Terms of Service, please contact our legal team.</p>
          <a href="mailto:admin@zentribank.capital" className={styles.contactEmail}>
            admin@zentribank.capital
          </a>
        </div>
      </div>
    </div>
  );
}
