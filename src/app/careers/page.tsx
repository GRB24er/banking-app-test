"use client";
import Link from "next/link";
import styles from "../legal.module.css";

const openings = [
  { title: "Senior Software Engineer — Platform", dept: "Engineering", location: "New York, NY (Hybrid)", type: "Full-time" },
  { title: "Product Manager — Payments", dept: "Product", location: "New York, NY (Hybrid)", type: "Full-time" },
  { title: "Compliance Officer", dept: "Legal & Compliance", location: "New York, NY", type: "Full-time" },
  { title: "UX Designer — Mobile Banking", dept: "Design", location: "Remote (US)", type: "Full-time" },
  { title: "Financial Analyst", dept: "Finance", location: "New York, NY", type: "Full-time" },
  { title: "Customer Success Specialist", dept: "Operations", location: "Remote (US)", type: "Full-time" },
];

export default function CareersPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.topNav}>
        <Link href="/" className={styles.topNavLogo}>ZentriBank</Link>
        <div className={styles.topNavLinks}>
          <Link href="/auth/signin">Sign In</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </nav>

      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.badge}>Careers</div>
          <h1 className={styles.heroTitle}>Build the Future of Banking</h1>
          <p className={styles.heroSub}>
            Join a team of passionate engineers, designers, and financial professionals who are reimagining what banking can be. We offer competitive compensation, equity, and a culture built on trust and transparency.
          </p>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>★</span>Open Positions</h2>
          <div className={styles.sectionBody}>
            {openings.map((job, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: i < openings.length - 1 ? "1px solid #f0f4f8" : "none" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#1a2e4a", fontSize: "15px" }}>{job.title}</div>
                  <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>{job.dept} · {job.location}</div>
                </div>
                <a href={`mailto:admin@zentribank.capital?subject=Application: ${job.title}`} style={{ background: "#1a2e4a", color: "#fff", padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
                  Apply Now
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>★</span>Benefits</h2>
          <div className={styles.sectionBody}>
            <ul>
              <li>Competitive base salary and equity compensation</li>
              <li>Comprehensive health, dental, and vision insurance</li>
              <li>401(k) with 4% company match</li>
              <li>Flexible remote and hybrid work options</li>
              <li>Annual learning & development budget of $2,000</li>
              <li>Generous parental leave policy (16 weeks paid)</li>
            </ul>
          </div>
        </div>

        <div className={styles.contactBox}>
          <h3>Don't See a Fit?</h3>
          <p>Send us your resume and we'll keep you in mind for future opportunities.</p>
          <a href="mailto:admin@zentribank.capital" className={styles.contactEmail}>
            admin@zentribank.capital
          </a>
        </div>
      </div>
    </div>
  );
}
