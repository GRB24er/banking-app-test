// src/app/crypto/transactions/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "../crypto.module.css";
import txStyles from "./transactions.module.css";

interface CryptoTransaction {
  id: string;
  type: 'conversion' | 'send' | 'receive';
  status: string;
  reference: string;
  description: string;
  fromCurrency?: string;
  toCurrency?: string;
  fromAmount?: number;
  toAmount?: number;
  cryptoCurrency?: string;
  cryptoAmount?: number;
  walletAddress?: string;
  network?: string;
  fee: number;
  usdValue?: number;
  date: string;
}

export default function CryptoTransactionsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<CryptoTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'conversion' | 'send'>('all');

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchTransactions();
    }
  }, [status, router]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/crypto/transactions");
      const data = await res.json();
      
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'pending_approval': return '#f59e0b';
      case 'processing': return '#3b82f6';
      case 'rejected': return '#ef4444';
      case 'failed': return '#ef4444';
      default: return '#888';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'pending_approval': return 'Pending Approval';
      case 'processing': return 'Processing';
      case 'rejected': return 'Rejected';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  const getCryptoIcon = (symbol: string) => {
    const icons: Record<string, string> = {
      BTC: "₿", ETH: "Ξ", USDT: "₮", USDC: "$", BNB: "B", XRP: "X", SOL: "◎", ADA: "₳", USD: "$"
    };
    return icons[symbol] || "●";
  };

  if (status === "loading" || loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingScreen}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading transactions...</p>
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
          <div className={txStyles.pageHeader}>
            <div>
              <button className={txStyles.backBtn} onClick={() => router.push('/crypto')}>
                ← Back to Wallet
              </button>
              <h1 className={txStyles.pageTitle}>Crypto Transactions</h1>
            </div>
            <div className={txStyles.filters}>
              {(['all', 'conversion', 'send'] as const).map((f) => (
                <button
                  key={f}
                  className={`${txStyles.filterBtn} ${filter === f ? txStyles.filterActive : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'conversion' ? 'Conversions' : 'Transfers'}
                </button>
              ))}
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className={txStyles.emptyState}>
              <span className={txStyles.emptyIcon}>📜</span>
              <h2>No Transactions</h2>
              <p>Your crypto transaction history will appear here</p>
            </div>
          ) : (
            <div className={txStyles.transactionsList}>
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className={txStyles.txCard}>
                  <div className={txStyles.txIcon} data-type={tx.type}>
                    {tx.type === 'conversion' ? '💱' : tx.type === 'send' ? '↗️' : '↙️'}
                  </div>
                  
                  <div className={txStyles.txMain}>
                    <div className={txStyles.txTitle}>
                      {tx.type === 'conversion' 
                        ? `Converted ${tx.fromCurrency} to ${tx.toCurrency}`
                        : `Sent ${tx.cryptoCurrency}`
                      }
                    </div>
                    <div className={txStyles.txMeta}>
                      <span>{formatDate(tx.date)}</span>
                      <span className={txStyles.txRef}>{tx.reference}</span>
                    </div>
                  </div>

                  <div className={txStyles.txAmounts}>
                    {tx.type === 'conversion' ? (
                      <>
                        <div className={txStyles.txAmountFrom}>-{formatCurrency(tx.fromAmount || 0)}</div>
                        <div className={txStyles.txAmountTo}>+{tx.toAmount?.toFixed(8)} {tx.toCurrency}</div>
                      </>
                    ) : (
                      <>
                        <div className={txStyles.txAmountFrom}>-{tx.cryptoAmount} {tx.cryptoCurrency}</div>
                        <div className={txStyles.txUsd}>{formatCurrency(tx.usdValue || 0)}</div>
                      </>
                    )}
                  </div>

                  <div 
                    className={txStyles.txStatus}
                    style={{ '--status-color': getStatusColor(tx.status) } as React.CSSProperties}
                  >
                    {getStatusLabel(tx.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}
