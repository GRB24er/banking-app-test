// src/app/crypto/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./crypto.module.css";

interface CryptoBalance {
  currency: string;
  symbol: string;
  balance: number;
  lockedBalance: number;
  availableBalance: number;
  usdValue: number;
  price: number;
  change24h: number;
}

interface CryptoWallet {
  id: string;
  balances: CryptoBalance[];
  totalUsdValue: number;
}

export default function CryptoWalletPage() {
  const { status } = useSession();
  const router = useRouter();
  const [wallet, setWallet] = useState<CryptoWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchWallet();
    }
  }, [status, router]);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/crypto/wallet");
      const data = await res.json();
      
      if (data.success) {
        setWallet(data.wallet);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatCrypto = (amount: number, symbol: string) => {
    if (amount === 0) return `0 ${symbol}`;
    if (amount < 0.00001) return `${amount.toExponential(4)} ${symbol}`;
    if (amount < 1) return `${amount.toFixed(8)} ${symbol}`;
    return `${amount.toFixed(6)} ${symbol}`;
  };

  const getCryptoIcon = (symbol: string) => {
    const icons: Record<string, string> = {
      BTC: "₿",
      ETH: "Ξ",
      USDT: "₮",
      USDC: "$",
      BNB: "B",
      XRP: "X",
      SOL: "◎",
      ADA: "₳",
    };
    return icons[symbol] || "●";
  };

  const getCryptoColor = (symbol: string) => {
    const colors: Record<string, string> = {
      BTC: "#f7931a",
      ETH: "#627eea",
      USDT: "#26a17b",
      USDC: "#2775ca",
      BNB: "#f3ba2f",
      XRP: "#23292f",
      SOL: "#9945ff",
      ADA: "#0033ad",
    };
    return colors[symbol] || "#888";
  };

  if (status === "loading" || loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingScreen}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading your crypto wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        <main className={styles.main}>
          {/* Hero Section */}
          <section className={styles.hero}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Crypto Wallet</h1>
              <p className={styles.heroSubtitle}>Manage your cryptocurrency portfolio</p>
            </div>
            <div className={styles.heroBalance}>
              <span className={styles.heroLabel}>Total Value</span>
              <span className={styles.heroValue}>
                {formatCurrency(wallet?.totalUsdValue || 0)}
              </span>
            </div>
          </section>

          {/* Quick Actions */}
          <section className={styles.quickActions}>
            <button className={styles.actionBtn} onClick={() => router.push('/crypto/convert')}>
              <span className={styles.actionIcon}>💱</span>
              <span className={styles.actionLabel}>Buy / Convert</span>
            </button>
            <button className={styles.actionBtn} onClick={() => router.push('/crypto/send')}>
              <span className={styles.actionIcon}>↗️</span>
              <span className={styles.actionLabel}>Send Crypto</span>
            </button>
            <button className={styles.actionBtn} onClick={() => router.push('/crypto/transactions')}>
              <span className={styles.actionIcon}>📜</span>
              <span className={styles.actionLabel}>History</span>
            </button>
          </section>

          {/* Crypto Balances */}
          <section className={styles.balancesSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Your Assets</h2>
              <button className={styles.refreshBtn} onClick={fetchWallet}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
                Refresh
              </button>
            </div>

            <div className={styles.balancesGrid}>
              {wallet?.balances.map((crypto) => (
                <div 
                  key={crypto.symbol} 
                  className={styles.cryptoCard}
                  style={{ '--crypto-color': getCryptoColor(crypto.symbol) } as React.CSSProperties}
                >
                  <div className={styles.cryptoHeader}>
                    <div className={styles.cryptoIconWrapper} style={{ background: getCryptoColor(crypto.symbol) }}>
                      <span className={styles.cryptoIcon}>{getCryptoIcon(crypto.symbol)}</span>
                    </div>
                    <div className={styles.cryptoInfo}>
                      <span className={styles.cryptoName}>{crypto.currency}</span>
                      <span className={styles.cryptoSymbol}>{crypto.symbol}</span>
                    </div>
                    <div className={styles.cryptoChange} data-positive={crypto.change24h >= 0}>
                      {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
                    </div>
                  </div>

                  <div className={styles.cryptoBalance}>
                    <div className={styles.balanceRow}>
                      <span className={styles.balanceLabel}>Balance</span>
                      <span className={styles.balanceValue}>{formatCrypto(crypto.balance, crypto.symbol)}</span>
                    </div>
                    <div className={styles.balanceRow}>
                      <span className={styles.balanceLabel}>USD Value</span>
                      <span className={styles.balanceValueUsd}>{formatCurrency(crypto.usdValue)}</span>
                    </div>
                    {crypto.lockedBalance > 0 && (
                      <div className={styles.balanceRow}>
                        <span className={styles.balanceLabel}>Pending</span>
                        <span className={styles.balanceLocked}>{formatCrypto(crypto.lockedBalance, crypto.symbol)}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.cryptoPrice}>
                    <span className={styles.priceLabel}>Current Price</span>
                    <span className={styles.priceValue}>{formatCurrency(crypto.price)}</span>
                  </div>

                  <div className={styles.cryptoActions}>
                    <button 
                      className={styles.cryptoActionBtn}
                      onClick={() => router.push(`/crypto/convert?to=${crypto.symbol}`)}
                    >
                      Buy
                    </button>
                    {crypto.balance > 0 && (
                      <button 
                        className={styles.cryptoActionBtn}
                        onClick={() => router.push(`/crypto/send?crypto=${crypto.symbol}`)}
                      >
                        Send
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Info Banner */}
          <section className={styles.infoBanner}>
            <div className={styles.infoIcon}>ℹ️</div>
            <div className={styles.infoContent}>
              <h3>How it works</h3>
              <p>Convert your USD to cryptocurrency instantly. When sending crypto to external wallets, transactions require admin approval for security. You'll receive email notifications at each step.</p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
