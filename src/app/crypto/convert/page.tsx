// src/app/crypto/convert/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "../crypto.module.css";
import convertStyles from "./convert.module.css";

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

interface UserBalances {
  checking: number;
  savings: number;
  investment: number;
}

function ConvertContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [balances, setBalances] = useState<UserBalances>({ checking: 0, savings: 0, investment: 0 });
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  
  // Form state
  const [fromAccount, setFromAccount] = useState<'checking' | 'savings' | 'investment'>('checking');
  const [toCrypto, setToCrypto] = useState(searchParams.get('to') || 'BTC');
  const [usdAmount, setUsdAmount] = useState('');
  
  // Conversion preview
  const [cryptoAmount, setCryptoAmount] = useState(0);
  const [fee, setFee] = useState(0);
  
  // Processing modal
  const [showProcessing, setShowProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [conversionResult, setConversionResult] = useState<any>(null);

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
      
      // Fetch prices
      const pricesRes = await fetch("/api/crypto/prices");
      const pricesData = await pricesRes.json();
      if (pricesData.success) {
        setPrices(pricesData.prices);
      }
      
      // Fetch user balances
      const dashRes = await fetch("/api/user/dashboard");
      const dashData = await dashRes.json();
      if (dashData.balances) {
        setBalances(dashData.balances);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate conversion when amount or crypto changes
  useEffect(() => {
    const amount = parseFloat(usdAmount) || 0;
    const selectedPrice = prices.find(p => p.symbol === toCrypto)?.price || 0;
    
    if (amount > 0 && selectedPrice > 0) {
      const feeAmount = amount * 0.01; // 1% fee
      const netAmount = amount - feeAmount;
      const crypto = netAmount / selectedPrice;
      
      setFee(feeAmount);
      setCryptoAmount(crypto);
    } else {
      setFee(0);
      setCryptoAmount(0);
    }
  }, [usdAmount, toCrypto, prices]);

  const handleConvert = async () => {
    const amount = parseFloat(usdAmount);
    
    if (!amount || amount < 10) {
      alert("Minimum conversion amount is $10");
      return;
    }

    const selectedBalance = balances[fromAccount];
    const totalRequired = amount + fee;
    
    if (totalRequired > selectedBalance) {
      alert(`Insufficient funds. Available: $${selectedBalance.toFixed(2)}`);
      return;
    }

    setShowProcessing(true);
    setProcessingStep(0);
    setConverting(true);

    // Simulate processing steps
    const steps = [
      "Verifying account balance...",
      "Fetching live market rates...",
      "Processing conversion...",
      "Updating your wallet...",
      "Finalizing transaction..."
    ];

    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
      const res = await fetch("/api/crypto/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccount,
          toCrypto,
          usdAmount: amount
        })
      });

      const data = await res.json();

      if (data.success) {
        setConversionResult(data);
        setProcessingStep(steps.length); // Complete
      } else {
        alert(data.error || "Conversion failed");
        setShowProcessing(false);
      }
    } catch (err) {
      alert("Conversion failed. Please try again.");
      setShowProcessing(false);
    } finally {
      setConverting(false);
    }
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

  const selectedPrice = prices.find(p => p.symbol === toCrypto);

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        <main className={styles.main}>
          {/* Header */}
          <div className={convertStyles.pageHeader}>
            <button className={convertStyles.backBtn} onClick={() => router.push('/crypto')}>
              ← Back to Wallet
            </button>
            <h1 className={convertStyles.pageTitle}>Buy / Convert Crypto</h1>
            <p className={convertStyles.pageSubtitle}>Convert your USD to cryptocurrency instantly</p>
          </div>

          <div className={convertStyles.convertContainer}>
            {/* Conversion Form */}
            <div className={convertStyles.formCard}>
              {/* From Section */}
              <div className={convertStyles.formSection}>
                <label className={convertStyles.formLabel}>From Account</label>
                <div className={convertStyles.accountSelector}>
                  {(['checking', 'savings', 'investment'] as const).map((acc) => (
                    <button
                      key={acc}
                      className={`${convertStyles.accountOption} ${fromAccount === acc ? convertStyles.accountActive : ''}`}
                      onClick={() => setFromAccount(acc)}
                    >
                      <span className={convertStyles.accountName}>{acc.charAt(0).toUpperCase() + acc.slice(1)}</span>
                      <span className={convertStyles.accountBalance}>{formatCurrency(balances[acc])}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className={convertStyles.formSection}>
                <label className={convertStyles.formLabel}>Amount (USD)</label>
                <div className={convertStyles.amountInputWrapper}>
                  <span className={convertStyles.currencySign}>$</span>
                  <input
                    type="number"
                    className={convertStyles.amountInput}
                    placeholder="0.00"
                    value={usdAmount}
                    onChange={(e) => setUsdAmount(e.target.value)}
                    min="10"
                  />
                </div>
                <div className={convertStyles.quickAmounts}>
                  {[100, 250, 500, 1000, 2500].map((amt) => (
                    <button
                      key={amt}
                      className={convertStyles.quickAmountBtn}
                      onClick={() => setUsdAmount(amt.toString())}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* To Crypto */}
              <div className={convertStyles.formSection}>
                <label className={convertStyles.formLabel}>Convert To</label>
                <div className={convertStyles.cryptoGrid}>
                  {prices.map((crypto) => (
                    <button
                      key={crypto.symbol}
                      className={`${convertStyles.cryptoOption} ${toCrypto === crypto.symbol ? convertStyles.cryptoActive : ''}`}
                      onClick={() => setToCrypto(crypto.symbol)}
                    >
                      <span className={convertStyles.cryptoIcon}>{getCryptoIcon(crypto.symbol)}</span>
                      <span className={convertStyles.cryptoSymbol}>{crypto.symbol}</span>
                      <span className={convertStyles.cryptoPrice}>{formatCurrency(crypto.price)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Convert Button */}
              <button 
                className={convertStyles.convertBtn}
                onClick={handleConvert}
                disabled={converting || !usdAmount || parseFloat(usdAmount) < 10}
              >
                {converting ? 'Converting...' : 'Convert Now'}
              </button>
            </div>

            {/* Preview Card */}
            <div className={convertStyles.previewCard}>
              <h3 className={convertStyles.previewTitle}>Conversion Preview</h3>
              
              {parseFloat(usdAmount) > 0 ? (
                <>
                  <div className={convertStyles.previewMain}>
                    <div className={convertStyles.previewCrypto}>
                      <span className={convertStyles.previewIcon}>{getCryptoIcon(toCrypto)}</span>
                      <span className={convertStyles.previewAmount}>
                        {cryptoAmount.toFixed(8)} {toCrypto}
                      </span>
                    </div>
                  </div>

                  <div className={convertStyles.previewDetails}>
                    <div className={convertStyles.previewRow}>
                      <span>Amount</span>
                      <span>{formatCurrency(parseFloat(usdAmount) || 0)}</span>
                    </div>
                    <div className={convertStyles.previewRow}>
                      <span>Fee (1%)</span>
                      <span>-{formatCurrency(fee)}</span>
                    </div>
                    <div className={convertStyles.previewRow}>
                      <span>Rate</span>
                      <span>1 {toCrypto} = {formatCurrency(selectedPrice?.price || 0)}</span>
                    </div>
                    <div className={`${convertStyles.previewRow} ${convertStyles.previewTotal}`}>
                      <span>You Receive</span>
                      <span>{cryptoAmount.toFixed(8)} {toCrypto}</span>
                    </div>
                  </div>

                  <div className={convertStyles.previewNote}>
                    <span className={convertStyles.noteIcon}>⚡</span>
                    <span>Conversion is instant. Crypto will be available immediately in your wallet.</span>
                  </div>
                </>
              ) : (
                <div className={convertStyles.previewEmpty}>
                  <span className={convertStyles.emptyIcon}>💱</span>
                  <p>Enter an amount to see conversion preview</p>
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>

      {/* Processing Modal */}
      {showProcessing && (
        <div className={convertStyles.modalOverlay}>
          <div className={convertStyles.modalCard}>
            {conversionResult ? (
              // Success State
              <div className={convertStyles.successState}>
                <div className={convertStyles.successIcon}>✓</div>
                <h2>Conversion Complete!</h2>
                <p className={convertStyles.successAmount}>
                  {conversionResult.conversion.toAmount.toFixed(8)} {conversionResult.conversion.toCurrency}
                </p>
                <p className={convertStyles.successSubtext}>
                  has been added to your wallet
                </p>
                <div className={convertStyles.successDetails}>
                  <div className={convertStyles.detailRow}>
                    <span>Reference</span>
                    <span>{conversionResult.reference}</span>
                  </div>
                  <div className={convertStyles.detailRow}>
                    <span>Amount Converted</span>
                    <span>{formatCurrency(conversionResult.conversion.fromAmount)}</span>
                  </div>
                  <div className={convertStyles.detailRow}>
                    <span>Fee</span>
                    <span>{formatCurrency(conversionResult.conversion.fee)}</span>
                  </div>
                </div>
                <button 
                  className={convertStyles.doneBtn}
                  onClick={() => router.push('/crypto')}
                >
                  View Wallet
                </button>
              </div>
            ) : (
              // Processing State
              <div className={convertStyles.processingState}>
                <div className={convertStyles.processingSpinner}></div>
                <h2>Converting...</h2>
                <div className={convertStyles.processingSteps}>
                  {[
                    "Verifying account balance",
                    "Fetching live market rates",
                    "Processing conversion",
                    "Updating your wallet",
                    "Finalizing transaction"
                  ].map((step, idx) => (
                    <div 
                      key={idx}
                      className={`${convertStyles.stepItem} ${idx <= processingStep ? convertStyles.stepComplete : ''} ${idx === processingStep ? convertStyles.stepActive : ''}`}
                    >
                      <span className={convertStyles.stepIcon}>
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

export default function ConvertPage() {
  return (
    <Suspense fallback={
      <div className={styles.wrapper}>
        <div className={styles.loadingScreen}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <ConvertContent />
    </Suspense>
  );
}
