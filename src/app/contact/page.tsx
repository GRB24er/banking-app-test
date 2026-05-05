"use client";
import Link from "next/link";
import { useState } from "react";
import styles from "../legal.module.css";
import contactStyles from "./contact.module.css";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const channels = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
      title: "Email Support",
      value: "admin@zentribank.capital",
      href: "mailto:admin@zentribank.capital",
      availability: "Response within 24 hours",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
      title: "Live Chat",
      value: "Available in your dashboard",
      href: "/auth/signin",
      availability: "24/7 for account holders",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      title: "Headquarters",
      value: "100 Wall Street, New York, NY 10005",
      href: "#",
      availability: "Mon–Fri, 9AM–5PM EST",
    },
  ];

  return (
    <div className={styles.page}>
      <nav className={styles.topNav}>
        <Link href="/" className={styles.topNavLogo}>ZentriBank</Link>
        <div className={styles.topNavLinks}>
          <Link href="/auth/signin">Sign In</Link>
          <Link href="/auth/signup">Open Account</Link>
        </div>
      </nav>

      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.badge}>Contact Us</div>
          <h1 className={styles.heroTitle}>We're Here to Help</h1>
          <p className={styles.heroSub}>
            Reach out to our team for support, inquiries, or feedback. We are committed to responding promptly and professionally.
          </p>
        </div>
      </div>

      <div className={styles.body}>
        {/* Contact channels */}
        <div className={contactStyles.channelsGrid}>
          {channels.map((c, i) => (
            <a key={i} href={c.href} className={contactStyles.channelCard}>
              <div className={contactStyles.channelIcon}>{c.icon}</div>
              <h3>{c.title}</h3>
              <p className={contactStyles.channelValue}>{c.value}</p>
              <span className={contactStyles.channelAvail}>{c.availability}</span>
            </a>
          ))}
        </div>

        {/* Contact form */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span>✉</span>Send Us a Message</h2>
          {submitted ? (
            <div className={contactStyles.successMessage}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="40" height="40">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <h3>Message Received</h3>
              <p>Thank you for reaching out. Our team will respond to <strong>{form.email}</strong> within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={contactStyles.form}>
              <div className={contactStyles.formRow}>
                <div className={contactStyles.formGroup}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Smith"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className={contactStyles.formGroup}>
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className={contactStyles.formGroup}>
                <label>Subject</label>
                <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required>
                  <option value="">Select a topic</option>
                  <option>Account Inquiry</option>
                  <option>Transaction Dispute</option>
                  <option>Technical Support</option>
                  <option>Security Concern</option>
                  <option>General Feedback</option>
                  <option>Press & Media</option>
                  <option>Partnership Inquiry</option>
                </select>
              </div>
              <div className={contactStyles.formGroup}>
                <label>Message</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Please describe your inquiry in detail..."
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                />
              </div>
              <button type="submit" className={contactStyles.submitBtn}>
                Send Message
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>
          )}
        </div>

        <div className={styles.contactBox}>
          <h3>Urgent Security Issue?</h3>
          <p>If you believe your account has been compromised, contact us immediately and we will prioritize your case.</p>
          <a href="mailto:admin@zentribank.capital" className={styles.contactEmail}>
            admin@zentribank.capital
          </a>
        </div>
      </div>
    </div>
  );
}
