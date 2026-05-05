"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./landing.module.css";

// ── SVG Icon Components ─────────────────────────────────────────────────────
const IconCard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);
const IconSavings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
    <path d="M12 6v6l4 2"/>
  </svg>
);
const IconHome = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IconStudent = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
  </svg>
);
const IconMobile = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
    <line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
);
const IconContact = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconFDIC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeNav, setActiveNav] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const products = [
    { icon: <IconCard />, title: "Checking Accounts", description: "Simple, secure checking with mobile banking and real-time fraud protection." },
    { icon: <IconSavings />, title: "Savings Accounts", description: "Earn up to 4.50% APY with flexible, fee-free access to your money." },
    { icon: <IconHome />, title: "Home Loans", description: "Competitive mortgage rates and home equity solutions for every stage of life." },
    { icon: <IconStudent />, title: "Student Banking", description: "Financial tools designed specifically for students — no fees, no minimums." },
  ];

  const features = [
    {
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop",
      title: "Simplified Checking and Payments",
      description: "Seamlessly manage direct deposit, streamline saved payment methods, and switch banks with zero friction.",
      cta: "Open a Checking Account",
      link: "/auth/signup",
    },
    {
      image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&h=400&fit=crop",
      title: "Bank-Grade Security, Always On",
      description: "Two-factor authentication, biometric login, 256-bit encryption, and 24/7 fraud monitoring protect every transaction.",
      cta: "Learn About Security",
      link: "/security",
    },
    {
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
      title: "Smart Financial Insights",
      description: "AI-powered analytics and personalized recommendations help you track spending and achieve your financial goals.",
      cta: "Explore Tools",
      link: "/auth/signup",
    },
  ];

  const services = [
    { icon: <IconMobile />, title: "Mobile & Online Banking", description: "Full banking access from any device, 24/7.", link: "/auth/signin" },
    { icon: <IconContact />, title: "Contact Us", description: "Reach our team by email or live chat — no hold times.", link: "/contact" },
    { icon: <IconPin />, title: "Find a Branch / ATM", description: "55,000+ fee-free ATMs and branches nationwide.", link: "/locations" },
    { icon: <IconCalendar />, title: "Meet with a Banker", description: "Schedule a one-on-one with a financial advisor.", link: "/contact" },
  ];

  const currentYear = new Date().getFullYear();

  return (
    <div className={styles.landingPage}>
      {/* Header */}
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
        <div className={styles.topBar}>
          <div className={styles.container}>
            <div className={styles.topBarContent}>
              <nav className={styles.utilityNav}>
                <Link href="/locations">Find a Branch / ATM</Link>
                <Link href="/rates">Rates</Link>
                <Link href="/contact">Customer Service</Link>
              </nav>
            </div>
          </div>
        </div>

        <div className={styles.mainHeader}>
          <div className={styles.container}>
            <div className={styles.headerContent}>
              <Link href="/" className={styles.logo}>
                <Image src="/images/Logo.png" alt="ZentriBank" width={240} height={65} className={styles.logoImage} priority />
              </Link>

              <nav className={styles.primaryNav}>
                {(["personal", "business", "wealth"] as const).map((key) => (
                  <div
                    key={key}
                    className={styles.navItem}
                    onMouseEnter={() => setActiveNav(key)}
                    onMouseLeave={() => setActiveNav(null)}
                  >
                    <button className={styles.navLink}>{key.charAt(0).toUpperCase() + key.slice(1)}</button>
                    {activeNav === key && (
                      <div className={styles.dropdown}>
                        {key === "personal" && (
                          <>
                            <Link href="/auth/signup">Checking Accounts</Link>
                            <Link href="/auth/signup">Savings Accounts</Link>
                            <Link href="/cards">Credit Cards</Link>
                            <Link href="/loans">Personal Loans</Link>
                            <Link href="/loans">Home Loans</Link>
                          </>
                        )}
                        {key === "business" && (
                          <>
                            <Link href="/business">Business Checking</Link>
                            <Link href="/business">Business Savings</Link>
                            <Link href="/business">Business Loans</Link>
                            <Link href="/business">Merchant Services</Link>
                          </>
                        )}
                        {key === "wealth" && (
                          <>
                            <Link href="/investments">Investment Advisory</Link>
                            <Link href="/investments">Retirement Planning</Link>
                            <Link href="/investments">Trust Services</Link>
                            <Link href="/investments">Private Banking</Link>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <Link href="/about" className={styles.navLink}>About</Link>
              </nav>

              <div className={styles.headerActions}>
                <Link href="/auth/signin" className={styles.btnLogin}>
                  <IconLock />
                  Sign In
                </Link>
                <Link href="/auth/signup" className={styles.btnSignup}>
                  Open Account
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* FDIC Bar */}
        <div className={styles.fdicBar}>
          <div className={styles.container}>
            <div className={styles.fdicBadge}>
              <IconFDIC />
              <span className={styles.fdicText}>
                FDIC-Insured — Backed by the full faith and credit of the U.S. Government. Deposits insured up to $250,000.
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <div className={styles.heroBadge}>Member FDIC · NMLS #2024001</div>
              <h1 className={styles.heroTitle}>
                Enterprise Banking.<br />Built for Everyone.
              </h1>
              <p className={styles.heroDescription}>
                ZentriBank delivers institutional-grade financial services — zero-fee accounts, 4.50% APY savings, real-time transfers, and 24/7 fraud protection — with the simplicity of a modern app.
              </p>
              <div className={styles.heroActions}>
                <Link href="/auth/signup" className={styles.btnPrimary}>Open a Free Account</Link>
                <Link href="/rates" className={styles.btnSecondary}>View Rates</Link>
              </div>
              <div className={styles.heroStats}>
                <div className={styles.heroStat}><strong>100K+</strong><span>Customers</span></div>
                <div className={styles.heroStatDivider} />
                <div className={styles.heroStat}><strong>$2.4B+</strong><span>Assets Managed</span></div>
                <div className={styles.heroStatDivider} />
                <div className={styles.heroStat}><strong>4.50%</strong><span>Savings APY</span></div>
              </div>
            </div>
            <div className={styles.heroImage}>
              <Image
                src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop"
                alt="ZentriBank mobile banking dashboard"
                width={600}
                height={450}
                className={styles.heroImg}
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className={styles.productsGrid}>
        <div className={styles.container}>
          <div className={styles.gridRow}>
            {products.map((product, i) => (
              <div key={i} className={styles.productCard}>
                <div className={styles.productIcon}>{product.icon}</div>
                <h3 className={styles.productTitle}>{product.title}</h3>
                <p className={styles.productDesc}>{product.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className={styles.featuredSection}>
        <div className={styles.container}>
          <div className={styles.featuresRow}>
            {features.map((feature, i) => (
              <div key={i} className={styles.featureCard}>
                <div className={styles.featureImage}>
                  <Image src={feature.image} alt={feature.title} width={400} height={260} className={styles.featImg} />
                </div>
                <div className={styles.featureContent}>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <Link href={feature.link} className={styles.featureLink}>{feature.cta} →</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className={styles.trustSection}>
        <div className={styles.container}>
          <div className={styles.trustGrid}>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}><IconFDIC /></span>
              <div><div className={styles.trustTitle}>FDIC</div><div className={styles.trustLabel}>Insured</div></div>
            </div>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}><IconLock /></span>
              <div><div className={styles.trustTitle}>256-bit SSL</div><div className={styles.trustLabel}>Encrypted</div></div>
            </div>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}><IconShield /></span>
              <div><div className={styles.trustTitle}>SOC 2</div><div className={styles.trustLabel}>Compliant</div></div>
            </div>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}><IconCheck /></span>
              <div><div className={styles.trustTitle}>PCI DSS</div><div className={styles.trustLabel}>Certified</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className={styles.servicesSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2>Banking at your fingertips, support when you need it</h2>
          </div>
          <div className={styles.servicesGrid}>
            {services.map((service, i) => (
              <div key={i} className={styles.serviceCard}>
                <div className={styles.serviceIcon}>{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <Link href={service.link} className={styles.serviceLink}>Learn More →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaContent}>
            <h2>Ready to Start Your Financial Journey?</h2>
            <p>Join over 100,000 customers who trust ZentriBank Capital with their financial future.</p>
            <div className={styles.ctaActions}>
              <Link href="/auth/signup" className={styles.btnCtaPrimary}>Open Your Free Account</Link>
              <Link href="/contact" className={styles.btnCtaSecondary}>Contact Us</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerMain}>
            <div className={styles.footerBrand}>
              <div className={styles.footerLogo}>
                <Image src="/images/Logo.png" alt="ZentriBank" width={220} height={60} className={styles.footerLogoImage} />
              </div>
              <p className={styles.footerTagline}>Your trusted partner in financial services.</p>
              <p className={styles.footerTagline} style={{ fontSize: "12px", marginTop: "8px", color: "#7a9bbf" }}>
                Member FDIC · NMLS #2024001 · Equal Housing Lender
              </p>
            </div>

            <div className={styles.footerColumn}>
              <h4>Company</h4>
              <Link href="/about">About Us</Link>
              <Link href="/careers">Careers</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/locations">Locations</Link>
            </div>

            <div className={styles.footerColumn}>
              <h4>Help</h4>
              <Link href="/contact">Customer Service</Link>
              <Link href="/support">Help Center</Link>
              <Link href="/security">Security Center</Link>
              <Link href="/accessibility">Accessibility</Link>
            </div>

            <div className={styles.footerColumn}>
              <h4>Resources</h4>
              <Link href="/rates">Rates & Fees</Link>
              <Link href="/disclosures">Disclosures</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div className={styles.footerLinks}>
              <Link href="/privacy">Privacy Rights</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/disclosures">Disclosures</Link>
              <Link href="/accessibility">Accessibility</Link>
            </div>
            <div className={styles.footerCopy}>
              <p>© {currentYear} ZentriBank Capital. All rights reserved. Member FDIC. Equal Housing Lender.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
