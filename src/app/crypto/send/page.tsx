// src/app/crypto/send/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "../crypto.module.css";
import sendStyles from "./send.module.css";

interface CryptoBalance {
  currency: string;
  symbol: string;
  balance: number;
  lockedBalance: number;
  availableBalance: number;
  usdValue: number;
  price: number;
}

interface NetworkOption {
  [key: string]: string[];
}

function SendCryptoContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [balances, setBalances] = useState<CryptoBalance[]>([]);
  const [networks, setNetworks] = useState<NetworkOption>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Form state
  const [selectedCrypto, setSelectedCrypto] = useState(searchParams.get('crypto') || '');
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [memo, setMemo] = useState('');
  
  // Processing modal
  const [showProcessing, setShowProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [sendResult, setSendResult] = useState<any>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch wallet
      const walletRes = await fetch("/api/crypto/wallet");
      const walletData = await walletRes.json();
      if (walletData.success) {
        setBalances(walletData.wallet.balances.filter((b: CryptoBalance) => b.balance > 0));
      }
      
      // Fetch networks
      const pricesRes = await fetch("/api/crypto/prices");
      const pricesData = await pricesRes.json();
      if (pricesData.success) {
        setNetworks(pricesData.networks);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Set default network when crypto changes
  useEffect(() => {
    if (selectedCrypto && networks[selectedCrypto]) {
      setSelectedNetwork(networks[selectedCrypto][0]);
    }
  }, [selectedCrypto, networks]);

  const getSelectedBalance = () => {
    return balances.find(b => b.symbol === selectedCrypto);
  };

  const getNetworkFee = () => {
    if (!selectedCrypto) return 0;
    const fees: Record<string, number> = {
      BTC: 0.0001,
      ETH: 0.002,
      USDT: 1,
      USDC: 1,
      BNB: 0.001,
      XRP: 0.1,
      SOL: 0.01,
      ADA: 0.5,
    };
    return fees[selectedCrypto] || 0.001;
  };

  const validateForm = () => {
    if (!selectedCrypto) {
      alert("Please select a cryptocurrency");
      return false;
    }
    
    const sendAmount = parseFloat(amount);
    if (!sendAmount || sendAmount <= 0) {
      alert("Please enter a valid amount");
      return false;
    }

    const balance = getSelectedBalance();
    const fee = getNetworkFee();
    const totalRequired = sendAmount + fee;

    if (!balance || totalRequired > balance.availableBalance) {
      alert(`Insufficient balance. Available: ${balance?.availableBalance.toFixed(8)} ${selectedCrypto}`);
      return false;
    }

    if (!walletAddress.trim()) {
      alert("Please enter the recipient wallet address");
      return false;
    }

    // Basic wallet address validation
    if (walletAddress.length < 20) {
      alert("Invalid wallet address");
      return false;
    }

    if (!selectedNetwork) {
      alert("Please select a network");
      return false;
    }

    return true;
  };

  const handleSend = async () => {
    if (!validateForm()) return;

    setShowProcessing(true);
    setProcessingStep(0);
    setSending(true);

    // Processing steps
    const steps = [
      "Validating wallet address...",
      "Checking available balance...",
      "Preparing transaction...",
      "Submitting for approval...",
      "Finalizing..."
    ];

    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(i);
      await new Promise(resolve => setTimeout(resolve, 700));
    }

    try {
      const res = await fetch("/api/crypto/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cryptoCurrency: selectedCrypto,
          amount: parseFloat(amount),
          walletAddress: walletAddress.trim(),
          network: selectedNetwork,
          memo: memo.trim() || undefined,
        })
      });

      const data = await res.json();

      if (data.success) {
        setSendResult(data);
        setProcessingStep(steps.length);
      } else {
        alert(data.error || "Transfer failed");
        setShowProcessing(false);
      }
    } catch (err) {
      alert("Transfer failed. Please try again.");
      setShowProcessing(false);
    } finally {
      setSending(false);
    }
  };

  const formatCrypto = (amount: number, symbol: string) => {
    if (amount === 0) return `0 ${symbol}`;
    if (amount < 0.00001) return `${amount.toExponential(4)} ${symbol}`;
    if (amount < 1) return `${amount.toFixed(8)} ${symbol}`;
    return `${amount.toFixed(6)} ${symbol}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCryptoIcon = (symbol: string) => {
    const icons: Record<string, string> = {
      BTC: "₿", ETH: "Ξ", USDT: "₮", USDC: "$", BNB: "B", XRP: "X", SOL: "◎", ADA: "₳"
    };
    return icons[symbol] || "●";
  };

  const getCryptoColor = (symbol: string) => {
    const colors: Record<string, string> = {
      BTC: "#f7931a", ETH: "#627eea", USDT: "#26a17b", USDC: "#2775ca",
      BNB: "#f3ba2f", XRP: "#23292f", SOL: "#9945ff", ADA: "#0033ad"
    };
    return colors[symbol] || "#888";
  };

  if (status === "loading" || loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingScreen}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const selectedBalance = getSelectedBalance();
  const networkFee = getNetworkFee();
  const sendAmount = parseFloat(amount) || 0;
  const totalAmount = sendAmount + networkFee;
  const usdValue = selectedBalance ? sendAmount * selectedBalance.price : 0;

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        <main className={styles.main}>
          {/* Header */}
          <div className={sendStyles.pageHeader}>
            <button className={sendStyles.backBtn} onClick={() => router.push('/crypto')}>
              ← Back to Wallet
            </button>
            <h1 className={sendStyles.pageTitle}>Send Crypto</h1>
            <p className={sendStyles.pageSubtitle}>Transfer cryptocurrency to external wallet</p>
          </div>

          {balances.length === 0 ? (
            <div className={sendStyles.emptyState}>
              <span className={sendStyles.emptyIcon}>💰</span>
              <h2>No Crypto Balance</h2>
              <p>You need to convert some USD to crypto first before you can send.</p>
              <button className={sendStyles.convertBtn} onClick={() => router.push('/crypto/convert')}>
                Buy Crypto
              </button>
            </div>
          ) : (
            <div className={sendStyles.sendContainer}>
              {/* Send Form */}
              <div className={sendStyles.formCard}>
                {/* Select Crypto */}
                <div className={sendStyles.formSection}>
                  <label className={sendStyles.formLabel}>Select Cryptocurrency</label>
                  <div className={sendStyles.cryptoSelector}>
                    {balances.map((crypto) => (
                      <button
                        key={crypto.symbol}
                        className={`${sendStyles.cryptoOption} ${selectedCrypto === crypto.symbol ? sendStyles.cryptoActive : ''}`}
                        onClick={() => setSelectedCrypto(crypto.symbol)}
                        style={{ '--crypto-color': getCryptoColor(crypto.symbol) } as React.CSSProperties}
                      >
                        <span className={sendStyles.cryptoIcon}>{getCryptoIcon(crypto.symbol)}</span>
                        <div className={sendStyles.cryptoInfo}>
                          <span className={sendStyles.cryptoSymbol}>{crypto.symbol}</span>
                          <span className={sendStyles.cryptoBalance}>
                            {formatCrypto(crypto.availableBalance, '')}
                          </span>
                        </div>
                        <span className={sendStyles.cryptoUsd}>{formatCurrency(crypto.usdValue)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div className={sendStyles.formSection}>
                  <label className={sendStyles.formLabel}>Amount</label>
                  <div className={sendStyles.amountWrapper}>
                    <input
                      type="number"
                      className={sendStyles.amountInput}
                      placeholder="0.00000000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      step="0.00000001"
                    />
                    <span className={sendStyles.amountSymbol}>{selectedCrypto || 'CRYPTO'}</span>
                  </div>
                  {selectedBalance && (
                    <div className={sendStyles.amountActions}>
                      <span className={sendStyles.availableBalance}>
                        Available: {formatCrypto(selectedBalance.availableBalance, selectedCrypto)}
                      </span>
                      <button 
                        className={sendStyles.maxBtn}
                        onClick={() => setAmount((selectedBalance.availableBalance - networkFee).toFixed(8))}
                      >
                        MAX
                      </button>
                    </div>
                  )}
                </div>

                {/* Wallet Address */}
                <div className={sendStyles.formSection}>
                  <label className={sendStyles.formLabel}>Recipient Wallet Address</label>
                  <input
                    type="text"
                    className={sendStyles.addressInput}
                    placeholder="Enter wallet address"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                  />
                </div>

                {/* Network */}
                {selectedCrypto && networks[selectedCrypto] && (
                  <div className={sendStyles.formSection}>
                    <label className={sendStyles.formLabel}>Network</label>
                    <div className={sendStyles.networkSelector}>
                      {networks[selectedCrypto].map((network) => (
                        <button
                          key={network}
                          className={`${sendStyles.networkOption} ${selectedNetwork === network ? sendStyles.networkActive : ''}`}
                          onClick={() => setSelectedNetwork(network)}
                        >
                          {network}
                        </button>
                      ))}
                    </div>
                    <p className={sendStyles.networkWarning}>
                      ⚠️ Make sure you select the correct network. Sending to wrong network may result in permanent loss.
                    </p>
                  </div>
                )}

                {/* Memo (Optional) */}
                <div className={sendStyles.formSection}>
                  <label className={sendStyles.formLabel}>Memo / Tag (Optional)</label>
                  <input
                    type="text"
                    className={sendStyles.memoInput}
                    placeholder="Add memo if required by recipient"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                  />
                </div>

                {/* Send Button */}
                <button 
                  className={sendStyles.sendBtn}
                  onClick={handleSend}
                  disabled={sending || !selectedCrypto || !amount || !walletAddress}
                >
                  {sending ? 'Processing...' : 'Send Crypto'}
                </button>
              </div>

              {/* Preview Card */}
              <div className={sendStyles.previewCard}>
                <h3 className={sendStyles.previewTitle}>Transfer Summary</h3>
                
                {selectedCrypto && sendAmount > 0 ? (
                  <>
                    <div className={sendStyles.previewMain}>
                      <span className={sendStyles.previewIcon} style={{ background: getCryptoColor(selectedCrypto) }}>
                        {getCryptoIcon(selectedCrypto)}
                      </span>
                      <span className={sendStyles.previewAmount}>
                        {formatCrypto(sendAmount, selectedCrypto)}
                      </span>
                      <span className={sendStyles.previewUsd}>≈ {formatCurrency(usdValue)}</span>
                    </div>

                    <div className={sendStyles.previewDetails}>
                      <div className={sendStyles.previewRow}>
                        <span>Amount</span>
                        <span>{formatCrypto(sendAmount, selectedCrypto)}</span>
                      </div>
                      <div className={sendStyles.previewRow}>
                        <span>Network Fee</span>
                        <span>{formatCrypto(networkFee, selectedCrypto)}</span>
                      </div>
                      <div className={sendStyles.previewRow}>
                        <span>Network</span>
                        <span>{selectedNetwork || '-'}</span>
                      </div>
                      <div className={`${sendStyles.previewRow} ${sendStyles.previewTotal}`}>
                        <span>Total Debit</span>
                        <span>{formatCrypto(totalAmount, selectedCrypto)}</span>
                      </div>
                    </div>

                    {walletAddress && (
                      <div className={sendStyles.recipientBox}>
                        <span className={sendStyles.recipientLabel}>Recipient</span>
                        <span className={sendStyles.recipientAddress}>
                          {walletAddress.slice(0, 12)}...{walletAddress.slice(-10)}
                        </span>
                      </div>
                    )}

                    <div className={sendStyles.approvalNotice}>
                      <span className={sendStyles.noticeIcon}>🔒</span>
                      <div>
                        <strong>This transaction is currently undergoing internal review in line with standard banking procedures. Processing will continue once the review is completed.</strong>
                        <p>For security, this transfer will be reviewed before processing. You'll receive an email once approved.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={sendStyles.previewEmpty}>
                    <span className={sendStyles.emptyIcon}>↗️</span>
                    <p>Select crypto and enter amount to see transfer details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>

      {/* Processing Modal */}
      {showProcessing && (
        <div className={sendStyles.modalOverlay}>
          <div className={sendStyles.modalCard}>
            {sendResult ? (
              // Success State
              <div className={sendStyles.successState}>
                <div className={sendStyles.successIcon}>✓</div>
                <h2>Transfer Submitted</h2>
                <p className={sendStyles.successSubtext}>
                  Your transfer is pending approval
                </p>
                
                <div className={sendStyles.successDetails}>
                  <div className={sendStyles.detailRow}>
                    <span>Reference</span>
                    <span className={sendStyles.refCode}>{sendResult.reference}</span>
                  </div>
                  <div className={sendStyles.detailRow}>
                    <span>Amount</span>
                    <span>{formatCrypto(sendResult.transfer.amount, sendResult.transfer.cryptoCurrency)}</span>
                  </div>
                  <div className={sendStyles.detailRow}>
                    <span>Network Fee</span>
                    <span>{formatCrypto(sendResult.transfer.networkFee, sendResult.transfer.cryptoCurrency)}</span>
                  </div>
                  <div className={sendStyles.detailRow}>
                    <span>Status</span>
                    <span className={sendStyles.statusPending}>Pending Approval</span>
                  </div>
                </div>

                <div className={sendStyles.nextSteps}>
                  <h4>What happens next?</h4>
                  <ol>
                    <li>Our team will review your transfer</li>
                    <li>You'll receive an email notification</li>
                    <li>Once approved, crypto will be sent to the recipient</li>
                  </ol>
                </div>

                <button 
                  className={sendStyles.doneBtn}
                  onClick={() => router.push('/crypto')}
                >
                  Back to Wallet
                </button>
              </div>
            ) : (
              // Processing State
              <div className={sendStyles.processingState}>
                <div className={sendStyles.processingSpinner}></div>
                <h2>Processing Transfer</h2>
                <div className={sendStyles.processingSteps}>
                  {[
                    "Validating wallet address",
                    "Checking available balance",
                    "Preparing transaction",
                    "Submitting for approval",
                    "Finalizing"
                  ].map((step, idx) => (
                    <div 
                      key={idx}
                      className={`${sendStyles.stepItem} ${idx <= processingStep ? sendStyles.stepComplete : ''} ${idx === processingStep ? sendStyles.stepActive : ''}`}
                    >
                      <span className={sendStyles.stepIcon}>
                        {idx < processingStep ? '✓' : idx === processingStep ? '●' : '○'}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SendCryptoPage() {
  return (
    <Suspense fallback={
      <div className={styles.wrapper}>
        <div className={styles.loadingScreen}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <SendCryptoContent />
    </Suspense>
  );
}
