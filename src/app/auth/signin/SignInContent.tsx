'use client';
import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './signin.module.css';

export default function SignInContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams?.get('registered') ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'warning' } | null>(
    registered ? { text: 'Account created successfully. Please sign in below.', type: 'success' } : null
  );
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  useEffect(() => {
    if (lockoutTime > 0) {
      const t = setTimeout(() => setLockoutTime(l => l - 1), 1000);
      return () => clearTimeout(t);
    } else if (isLocked && lockoutTime === 0) {
      setIsLocked(false);
      setAttempts(0);
    }
  }, [lockoutTime, isLocked]);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      const t = setTimeout(() => router.push('/dashboard'), 100);
      return () => clearTimeout(t);
    }
  }, [status, session, router]);

  if (status === 'authenticated') {
    return (
      <div className={styles.page}>
        <div className={styles.redirecting}>Redirecting to your dashboard…</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setMessage({ text: `Account temporarily locked. Try again in ${lockoutTime}s.`, type: 'error' });
      return;
    }
    setMessage(null);
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });
      setLoading(false);
      if (res?.error) {
        const next = attempts + 1;
        setAttempts(next);
        if (next >= 3) {
          setIsLocked(true);
          setLockoutTime(30);
          setMessage({ text: 'Too many failed attempts. Account locked for 30 seconds.', type: 'error' });
        } else {
          setMessage({ text: `Invalid email or password. ${3 - next} attempt${3 - next !== 1 ? 's' : ''} remaining.`, type: 'warning' });
        }
        return;
      }
      if (res?.ok) {
        setAttempts(0);
        window.location.href = '/dashboard';
      }
    } catch {
      setLoading(false);
      setMessage({ text: 'An unexpected error occurred. Please try again.', type: 'error' });
    }
  };

  return (
    <div className={styles.page}>
      {/* ── Left: Form Panel ── */}
      <div className={styles.formPanel}>
        <div className={styles.formInner}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <div className={styles.logoMark}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12h6v10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={styles.logoText}>ZentriBank Capital</span>
          </Link>

          <div className={styles.heading}>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>Sign in to access your secure banking dashboard</p>
          </div>

          {/* Alert banner */}
          {message && (
            <div className={`${styles.alert} ${styles[`alert--${message.type}`]}`} role="alert">
              <span className={styles.alertIcon}>
                {message.type === 'success' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                {message.type === 'error' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>}
                {message.type === 'warning' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>}
              </span>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {/* Email */}
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Email address</label>
              <div className={`${styles.inputWrap} ${emailFocused ? styles.focused : ''}`}>
                <span className={styles.inputIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className={styles.input}
                  disabled={loading || isLocked}
                />
              </div>
            </div>

            {/* Password */}
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <div className={`${styles.inputWrap} ${passFocused ? styles.focused : ''}`}>
                <span className={styles.inputIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  className={`${styles.input} ${styles.inputPassword}`}
                  disabled={loading || isLocked}
                />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(v => !v)} tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className={styles.row}>
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className={styles.checkbox} />
                <span className={styles.checkText}>Remember me for 30 days</span>
              </label>
              <button type="button" className={styles.forgotBtn} onClick={() => alert('A password reset link will be sent to your registered email address.')}>
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading || isLocked || !email || !password} className={`${styles.submitBtn} ${(loading || isLocked) ? styles.submitBtnDisabled : ''}`}>
              {loading ? (
                <><span className={styles.spinner} />Signing in…</>
              ) : isLocked ? (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Locked ({lockoutTime}s)</>
              ) : (
                <>Sign In Securely<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="12 5 19 12 12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></>
              )}
            </button>
          </form>

          <p className={styles.footerText}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className={styles.footerLink}>Open a free account</Link>
          </p>

          {/* Trust badges */}
          <div className={styles.badges}>
            <span className={styles.badge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              256-bit SSL
            </span>
            <span className={styles.badgeDivider} />
            <span className={styles.badge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke="currentColor" strokeWidth="2"/></svg>
              FDIC Insured
            </span>
            <span className={styles.badgeDivider} />
            <span className={styles.badge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              SOC 2 Type II
            </span>
          </div>
        </div>
      </div>

      {/* ── Right: Hero Panel ── */}
      <div className={styles.heroPanel}>
        <div className={styles.heroInner}>
          <div className={styles.heroTag}>Trusted by 100,000+ customers</div>
          <h2 className={styles.heroTitle}>Enterprise Banking.<br />Built for Everyone.</h2>
          <p className={styles.heroSubtitle}>
            Secure, fast, and reliable financial services with real-time access to your accounts, transfers, and investments.
          </p>

          {/* Stats */}
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <div className={styles.heroStatVal}>$2.4B+</div>
              <div className={styles.heroStatKey}>Assets Under Management</div>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <div className={styles.heroStatVal}>4.50%</div>
              <div className={styles.heroStatKey}>High-Yield APY</div>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <div className={styles.heroStatVal}>$0</div>
              <div className={styles.heroStatKey}>Monthly Fees</div>
            </div>
          </div>

          {/* Feature list */}
          <div className={styles.heroFeatures}>
            {[
              { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: 'Bank-grade 256-bit encryption & 2FA' },
              { icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z', label: 'Real-time transaction monitoring' },
              { icon: 'M5 12h14 M12 5l7 7-7 7', label: 'Instant domestic & international transfers' },
              { icon: 'M12 22V12 M2 17l10 5 10-5 M2 12l10 5 10-5 M2 7l10 5 10-5', label: 'Multi-currency accounts & crypto wallet' },
            ].map((f, i) => (
              <div key={i} className={styles.heroFeature}>
                <div className={styles.heroFeatureCheck}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span className={styles.heroFeatureText}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Account preview card */}
          <div className={styles.heroCard}>
            <div className={styles.heroCardTop}>
              <div className={styles.heroCardAvatar}>JD</div>
              <div className={styles.heroCardInfo}>
                <div className={styles.heroCardName}>James Davidson</div>
                <div className={styles.heroCardAcct}>Premium Checking ···· 4821</div>
              </div>
              <div className={styles.heroCardStatus}>
                <span className={styles.heroDot} />Active
              </div>
            </div>
            <div className={styles.heroCardBalance}>$48,250.00</div>
            <div className={styles.heroCardBalanceLabel}>Available Balance</div>
            <div className={styles.heroCardRow}>
              <div className={styles.heroCardCell}>
                <div className={styles.heroCardCellVal}>+$3,200</div>
                <div className={styles.heroCardCellKey}>This Month</div>
              </div>
              <div className={styles.heroCardCell}>
                <div className={styles.heroCardCellVal}>4.50%</div>
                <div className={styles.heroCardCellKey}>APY Rate</div>
              </div>
              <div className={styles.heroCardCell}>
                <div className={styles.heroCardCellVal}>$0</div>
                <div className={styles.heroCardCellKey}>Monthly Fee</div>
              </div>
            </div>
          </div>

          <div className={styles.heroTrust}>
            <span>Member FDIC</span>
            <span className={styles.heroTrustDot}>·</span>
            <span>Equal Housing Lender</span>
            <span className={styles.heroTrustDot}>·</span>
            <span>NMLS #2024001</span>
          </div>
        </div>
      </div>
    </div>
  );
}
