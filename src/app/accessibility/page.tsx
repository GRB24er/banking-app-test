"use client";
import Link from "next/link";
import styles from "../legal.module.css";

export default function AccessibilityPage() {
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
          <div className={styles.badge}>Accessibility</div>
          <h1 className={styles.heroTitle}>Accessibility Statement</h1>
          <p className={styles.heroSub}>
            ZentriBank Capital is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone.
          </p>
          <div className={styles.heroMeta}>
            <span className={styles.metaItem}><strong>Last Updated:</strong> May 1, 2026</span>
            <span className={styles.metaItem}><strong>Conformance:</strong> WCAG 2.1 Level AA</span>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>1</span>Our Commitment</h2>
          <div className={styles.sectionBody}>
            <p>ZentriBank Capital is committed to ensuring that its website and online banking platform are accessible to people with disabilities. We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards.</p>
            <div className={styles.highlight}>
              We believe that banking should be accessible to everyone, regardless of ability. If you experience any barriers, please contact us immediately.
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>2</span>Accessibility Features</h2>
          <div className={styles.sectionBody}>
            <p>Our platform includes the following accessibility features:</p>
            <ul>
              <li>Full keyboard navigation support throughout the application</li>
              <li>Screen reader compatibility with ARIA labels and landmarks</li>
              <li>Sufficient color contrast ratios meeting WCAG 2.1 AA standards</li>
              <li>Resizable text without loss of content or functionality</li>
              <li>Alternative text for all meaningful images</li>
              <li>Clear focus indicators for keyboard navigation</li>
              <li>Consistent navigation and page structure</li>
              <li>Error identification and suggestions in forms</li>
            </ul>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>3</span>Known Limitations</h2>
          <div className={styles.sectionBody}>
            <p>While we strive for full accessibility, some content may not yet fully conform to WCAG 2.1 Level AA. We are actively working to address these areas:</p>
            <ul>
              <li>Some interactive charts and data visualizations may have limited screen reader support</li>
              <li>Certain PDF documents may not be fully accessible — we are working to remediate these</li>
            </ul>
            <p>We are committed to resolving these issues and welcome feedback to help us prioritize improvements.</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>4</span>Feedback and Contact</h2>
          <div className={styles.sectionBody}>
            <p>We welcome your feedback on the accessibility of our platform. If you experience accessibility barriers or have suggestions for improvement, please contact us:</p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:admin@zentribank.capital">admin@zentribank.capital</a></li>
              <li><strong>Response Time:</strong> We aim to respond to accessibility feedback within 2 business days.</li>
            </ul>
          </div>
        </div>

        <div className={styles.contactBox}>
          <h3>Experiencing Accessibility Issues?</h3>
          <p>Contact our accessibility team directly and we will work to resolve your issue promptly.</p>
          <a href="mailto:admin@zentribank.capital" className={styles.contactEmail}>
            admin@zentribank.capital
          </a>
        </div>
      </div>
    </div>
  );
}
