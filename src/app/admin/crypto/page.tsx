// src/app/admin/crypto/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./admin-crypto.module.css";

interface PendingTransaction {
  id: string;
  user: {
    name: string;
    email: string;
  };
  type: string;
  cryptoCurrency: string;
  amount: number;
  usdValue: number;
  walletAddress: string;
  network: string;
  fee: number;
  reference: string;
  date: string;
}

export default function AdminCryptoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<PendingTransaction | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve');
  const [txHash, setTxHash] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      // Check if admin
      if (session?.user?.email !== "admin@horizonbank.com" && 
          session?.user?.email !== "admin@example.com" && 
          (session?.user as any)?.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      fetchPendingTransactions();
    }
  }, [status, session, router]);

  const fetchPendingTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/crypto/pending");
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

  const openModal = (tx: PendingTransaction, action: 'approve' | 'reject') => {
    setSelectedTx(tx);
    setModalAction(action);
    setTxHash('');
    setRejectionReason('');
    setShowModal(true);
  };

  const handleAction = async () => {
    if (!selectedTx) return;
    
    if (modalAction === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setProcessing(selectedTx.id);

    try {
      const res = await fetch("/api/admin/crypto/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: selectedTx.id,
          action: modalAction,
          txHash: txHash.trim() || undefined,
          rejectionReason: rejectionReason.trim() || undefined,
        })
      });

      const data = await res.json();

      if (data.success) {
        setShowModal(false);
        fetchPendingTransactions();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      alert('Action failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCryptoIcon = (symbol: string) => {
    const icons: Record<string, string> = {
      BTC: "₿", ETH: "Ξ", USDT: "₮", USDC: "$", BNB: "B", XRP: "X", SOL: "◎", ADA: "₳"
    };
    return icons[symbol] || "●";
  };

  if (status === "loading" || loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingScreen}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading pending approvals...</p>
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
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Crypto Transfer Approvals</h1>
              <p className={styles.pageSubtitle}>Review and approve pending cryptocurrency transfers</p>
            </div>
            <button className={styles.refreshBtn} onClick={fetchPendingTransactions}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 4v6h6M23 20v-6h-6"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              Refresh
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>✓</span>
              <h2>No Pending Approvals</h2>
              <p>All crypto transfers have been reviewed</p>
            </div>
          ) : (
            <div className={styles.transactionsList}>
              {transactions.map((tx) => (
                <div key={tx.id} className={styles.transactionCard}>
                  <div className={styles.txHeader}>
                    <div className={styles.txCrypto}>
                      <span className={styles.cryptoIcon}>{getCryptoIcon(tx.cryptoCurrency)}</span>
                      <div>
                        <span className={styles.cryptoAmount}>{tx.amount} {tx.cryptoCurrency}</span>
                        <span className={styles.cryptoUsd}>{formatCurrency(tx.usdValue)}</span>
                      </div>
                    </div>
                    <div className={styles.txStatus}>
                      <span className={styles.statusBadge}>Pending</span>
                    </div>
                  </div>

                  <div className={styles.txDetails}>
                    <div className={styles.txRow}>
                      <span className={styles.txLabel}>User</span>
                      <div className={styles.txValue}>
                        <strong>{tx.user.name}</strong>
                        <span className={styles.userEmail}>{tx.user.email}</span>
                      </div>
                    </div>
                    <div className={styles.txRow}>
                      <span className={styles.txLabel}>Reference</span>
                      <span className={styles.txRef}>{tx.reference}</span>
                    </div>
                    <div className={styles.txRow}>
                      <span className={styles.txLabel}>Wallet Address</span>
                      <span className={styles.txAddress}>{tx.walletAddress}</span>
                    </div>
                    <div className={styles.txRow}>
                      <span className={styles.txLabel}>Network</span>
                      <span className={styles.txNetwork}>{tx.network}</span>
                    </div>
                    <div className={styles.txRow}>
                      <span className={styles.txLabel}>Network Fee</span>
                      <span>{tx.fee} {tx.cryptoCurrency}</span>
                    </div>
                    <div className={styles.txRow}>
                      <span className={styles.txLabel}>Date</span>
                      <span>{formatDate(tx.date)}</span>
                    </div>
                  </div>

                  <div className={styles.txActions}>
                    <button 
                      className={styles.approveBtn}
                      onClick={() => openModal(tx, 'approve')}
                      disabled={processing === tx.id}
                    >
                      {processing === tx.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button 
                      className={styles.rejectBtn}
                      onClick={() => openModal(tx, 'reject')}
                      disabled={processing === tx.id}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
        <Footer />
      </div>

      {/* Approval/Rejection Modal */}
      {showModal && selectedTx && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>
              {modalAction === 'approve' ? 'Approve Transfer' : 'Reject Transfer'}
            </h2>
            
            <div className={styles.modalSummary}>
              <div className={styles.summaryRow}>
                <span>Amount</span>
                <span>{selectedTx.amount} {selectedTx.cryptoCurrency}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>USD Value</span>
                <span>{formatCurrency(selectedTx.usdValue)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Recipient</span>
                <span className={styles.addressSmall}>
                  {selectedTx.walletAddress.slice(0, 10)}...{selectedTx.walletAddress.slice(-8)}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span>User</span>
                <span>{selectedTx.user.email}</span>
              </div>
            </div>

            {modalAction === 'approve' ? (
              <div className={styles.modalField}>
                <label>Transaction Hash (Optional)</label>
                <input
                  type="text"
                  placeholder="Enter blockchain tx hash if already sent"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                />
                <p className={styles.fieldHint}>
                  If you've already sent the crypto, paste the transaction hash here.
                  Otherwise, leave blank and send manually after approving.
                </p>
              </div>
            ) : (
              <div className={styles.modalField}>
                <label>Rejection Reason *</label>
                <textarea
                  placeholder="Explain why this transfer is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div className={styles.modalActions}>
              <button 
                className={styles.cancelBtn}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button 
                className={modalAction === 'approve' ? styles.confirmApprove : styles.confirmReject}
                onClick={handleAction}
                disabled={processing !== null}
              >
                {processing ? 'Processing...' : modalAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
