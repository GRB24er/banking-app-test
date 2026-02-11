// src/app/transfers/internal/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./sendMoney.module.css";

interface UserBalances {
  checking: number;
  savings: number;
  investment: number;
}

export default function TransferPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingBalance, setFetchingBalance] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState(1);
  
  const [userBalances, setUserBalances] = useState<UserBalances>({
    checking: 0,
    savings: 0,
    investment: 0
  });

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [formData, setFormData] = useState({
    fromAccount: "checking",
    toAccount: "",
    recipientName: "",
    recipientAccount: "",
    recipientBank: "",
    recipientRoutingNumber: "",
    amount: "",
    description: "",
    transferType: "external",
    transferSpeed: "standard"
  });

  // Fix hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Wait for session to be ready before fetching
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.email) {
      fetchUserData();
    } else if (sessionStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [sessionStatus, session?.user?.email]);

  const fetchUserData = async () => {
    setFetchingBalance(true);
    try {
      const response = await fetch('/api/user/dashboard');
      if (response.ok) {
        const data = await response.json();
        setUserBalances({
          checking: data.balances?.checking || 0,
          savings: data.balances?.savings || 0,
          investment: data.balances?.investment || 0
        });
        setUserName(data.user?.name || session?.user?.name || "User");
        setUserEmail(session?.user?.email || "");
      } else {
        setError("Failed to load account balances");
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError("Failed to load account information");
    } finally {
      setFetchingBalance(false);
    }
  };

  const getAvailableBalance = () => {
    const account = formData.fromAccount as keyof UserBalances;
    return userBalances[account] || 0;
  };

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const validateAmount = () => {
    const amount = parseFloat(formData.amount);
    const available = getAvailableBalance();
    
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return false;
    }
    if (amount > available) {
      setError(`Insufficient funds. Available balance: ${formatBalance(available)}`);
      return false;
    }
    return true;
  };

  const handleInternalTransfer = async () => {
    if (!validateAmount()) return;
    
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/transfers/internal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccount: formData.fromAccount,
          toAccount: formData.toAccount,
          amount: parseFloat(formData.amount),
          description: formData.description || "Internal Transfer"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transfer failed");
      }

      setSuccess("✅ Transfer completed successfully!");
      await fetchUserData();
      
      setTimeout(() => {
        router.push("/transactions");
      }, 2000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExternalTransfer = async () => {
    if (!validateAmount()) return;
    
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/transfers/external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccount: formData.fromAccount,
          recipientName: formData.recipientName,
          recipientAccount: formData.recipientAccount,
          recipientBank: formData.recipientBank,
          recipientRoutingNumber: formData.recipientRoutingNumber,
          amount: parseFloat(formData.amount),
          description: formData.description || `Transfer to ${formData.recipientName}`,
          transferSpeed: formData.transferSpeed
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transfer failed");
      }

      setSuccess("✅ Transfer initiated! Pending approval. You will receive a confirmation email.");
      await fetchUserData();
      
      setTimeout(() => {
        router.push("/transactions");
      }, 3000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.transferType === "internal") {
      await handleInternalTransfer();
    } else {
      await handleExternalTransfer();
    }
  };

  const nextStep = () => {
    setError("");
    
    if (step === 1) {
      if (!formData.fromAccount) {
        setError("Please select a source account");
        return;
      }
    } else if (step === 2) {
      if (formData.transferType === "internal") {
        if (!formData.toAccount || formData.toAccount === formData.fromAccount) {
          setError("Please select a different destination account");
          return;
        }
      } else {
        if (!formData.recipientName || !formData.recipientAccount || !formData.recipientBank) {
          setError("Please fill in all recipient details");
          return;
        }
      }
    } else if (step === 3) {
      if (!validateAmount()) return;
    }
    
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setError("");
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show loading while session is loading or balances are fetching
  if (!mounted || sessionStatus === "loading" || fetchingBalance) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.main}>
          <Header />
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading account information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <aside className={styles.sidebar}>
        <Sidebar />
      </aside>
      
      <div className={styles.main}>
        <header className={styles.header}>
          <Header />
        </header>
        
        <div className={styles.content}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div>
              <h1>Transfer Money</h1>
              <p>Send money between your accounts or to other banks</p>
            </div>
            <div className={styles.balanceSummary}>
              <span>Total Available: {formatBalance(userBalances.checking + userBalances.savings)}</span>
            </div>
          </div>

          {/* Transfer Type Selection */}
          <div className={styles.transferTypeSelector}>
            <button
              className={formData.transferType === "internal" ? styles.active : ""}
              onClick={() => {
                setFormData({...formData, transferType: "internal"});
                setStep(1);
                setError("");
                setSuccess("");
              }}
            >
              🔄 Between My Accounts
            </button>
            <button
              className={formData.transferType === "external" ? styles.active : ""}
              onClick={() => {
                setFormData({...formData, transferType: "external"});
                setStep(1);
                setError("");
                setSuccess("");
              }}
            >
              🏦 To Another Bank
            </button>
          </div>

          {/* Progress Steps */}
          <div className={styles.progressSteps}>
            <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`}>
              <div className={styles.stepNumber}>{step > 1 ? '✓' : '1'}</div>
              <div className={styles.stepLabel}>From Account</div>
            </div>
            <div className={styles.stepLine}></div>
            <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`}>
              <div className={styles.stepNumber}>{step > 2 ? '✓' : '2'}</div>
              <div className={styles.stepLabel}>
                {formData.transferType === "internal" ? "To Account" : "Recipient"}
              </div>
            </div>
            <div className={styles.stepLine}></div>
            <div className={`${styles.step} ${step >= 3 ? styles.active : ''}`}>
              <div className={styles.stepNumber}>{step > 3 ? '✓' : '3'}</div>
              <div className={styles.stepLabel}>Amount</div>
            </div>
            <div className={styles.stepLine}></div>
            <div className={`${styles.step} ${step >= 4 ? styles.active : ''}`}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepLabel}>Review</div>
            </div>
          </div>

          {/* Form Card */}
          <div className={styles.formCard}>
            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                {/* Step 1: Select Source Account */}
                {step === 1 && (
                  <motion.div
                    key="internal-step-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className={styles.stepContent}
                  >
                    <h3>Select Source Account</h3>
                    <p className={styles.stepDescription}>Choose which account to transfer from</p>
                    
                    <div className={styles.accountOptions}>
                      <div 
                        className={`${styles.accountOption} ${formData.fromAccount === "checking" ? styles.selected : ''}`}
                        onClick={() => setFormData({...formData, fromAccount: "checking"})}
                      >
                        <div className={styles.accountIcon}>💳</div>
                        <div className={styles.accountInfo}>
                          <div className={styles.accountName}>Checking Account</div>
                          <div className={styles.accountNumber}>****1234</div>
                        </div>
                        <div className={styles.accountBalance}>
                          <div className={styles.balanceLabel}>Available</div>
                          <div className={styles.balanceAmount}>{formatBalance(userBalances.checking)}</div>
                        </div>
                      </div>

                      <div 
                        className={`${styles.accountOption} ${formData.fromAccount === "savings" ? styles.selected : ''}`}
                        onClick={() => setFormData({...formData, fromAccount: "savings"})}
                      >
                        <div className={styles.accountIcon}>🏦</div>
                        <div className={styles.accountInfo}>
                          <div className={styles.accountName}>Savings Account</div>
                          <div className={styles.accountNumber}>****5678</div>
                        </div>
                        <div className={styles.accountBalance}>
                          <div className={styles.balanceLabel}>Available</div>
                          <div className={styles.balanceAmount}>{formatBalance(userBalances.savings)}</div>
                        </div>
                      </div>

                      {userBalances.investment > 0 && (
                        <div 
                          className={`${styles.accountOption} ${formData.fromAccount === "investment" ? styles.selected : ''}`}
                          onClick={() => setFormData({...formData, fromAccount: "investment"})}
                        >
                          <div className={styles.accountIcon}>📈</div>
                          <div className={styles.accountInfo}>
                            <div className={styles.accountName}>Investment Account</div>
                            <div className={styles.accountNumber}>****9012</div>
                          </div>
                          <div className={styles.accountBalance}>
                            <div className={styles.balanceLabel}>Available</div>
                            <div className={styles.balanceAmount}>{formatBalance(userBalances.investment)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Destination */}
                {step === 2 && (
                  <motion.div
                    key="internal-step-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className={styles.stepContent}
                  >
                    {formData.transferType === "internal" ? (
                      <>
                        <h3>Select Destination Account</h3>
                        <p className={styles.stepDescription}>Choose which account to transfer to</p>
                        
                        <div className={styles.accountOptions}>
                          {formData.fromAccount !== "checking" && (
                            <div 
                              className={`${styles.accountOption} ${formData.toAccount === "checking" ? styles.selected : ''}`}
                              onClick={() => setFormData({...formData, toAccount: "checking"})}
                            >
                              <div className={styles.accountIcon}>💳</div>
                              <div className={styles.accountInfo}>
                                <div className={styles.accountName}>Checking Account</div>
                                <div className={styles.accountNumber}>****1234</div>
                              </div>
                              <div className={styles.accountBalance}>
                                <div className={styles.balanceLabel}>Current Balance</div>
                                <div className={styles.balanceAmount}>{formatBalance(userBalances.checking)}</div>
                              </div>
                            </div>
                          )}

                          {formData.fromAccount !== "savings" && (
                            <div 
                              className={`${styles.accountOption} ${formData.toAccount === "savings" ? styles.selected : ''}`}
                              onClick={() => setFormData({...formData, toAccount: "savings"})}
                            >
                              <div className={styles.accountIcon}>🏦</div>
                              <div className={styles.accountInfo}>
                                <div className={styles.accountName}>Savings Account</div>
                                <div className={styles.accountNumber}>****5678</div>
                              </div>
                              <div className={styles.accountBalance}>
                                <div className={styles.balanceLabel}>Current Balance</div>
                                <div className={styles.balanceAmount}>{formatBalance(userBalances.savings)}</div>
                              </div>
                            </div>
                          )}

                          {formData.fromAccount !== "investment" && (
                            <div 
                              className={`${styles.accountOption} ${formData.toAccount === "investment" ? styles.selected : ''}`}
                              onClick={() => setFormData({...formData, toAccount: "investment"})}
                            >
                              <div className={styles.accountIcon}>📈</div>
                              <div className={styles.accountInfo}>
                                <div className={styles.accountName}>Investment Account</div>
                                <div className={styles.accountNumber}>****9012</div>
                              </div>
                              <div className={styles.accountBalance}>
                                <div className={styles.balanceLabel}>Current Balance</div>
                                <div className={styles.balanceAmount}>{formatBalance(userBalances.investment)}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <h3>Recipient Information</h3>
                        <p className={styles.stepDescription}>Enter the recipient&apos;s banking details</p>
                        
                        <div className={styles.inputGrid}>
                          <div className={styles.inputGroup}>
                            <label>Recipient Name</label>
                            <input
                              type="text"
                              placeholder="John Doe"
                              value={formData.recipientName}
                              onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
                              required
                              className={styles.input}
                            />
                          </div>
                          <div className={styles.inputGroup}>
                            <label>Account Number</label>
                            <input
                              type="text"
                              placeholder="1234567890"
                              value={formData.recipientAccount}
                              onChange={(e) => setFormData({...formData, recipientAccount: e.target.value})}
                              required
                              className={styles.input}
                            />
                          </div>
                          <div className={styles.inputGroup}>
                            <label>Bank Name</label>
                            <input
                              type="text"
                              placeholder="Chase Bank"
                              value={formData.recipientBank}
                              onChange={(e) => setFormData({...formData, recipientBank: e.target.value})}
                              required
                              className={styles.input}
                            />
                          </div>
                          <div className={styles.inputGroup}>
                            <label>Routing Number</label>
                            <input
                              type="text"
                              placeholder="021000021"
                              value={formData.recipientRoutingNumber}
                              onChange={(e) => setFormData({...formData, recipientRoutingNumber: e.target.value})}
                              required
                              className={styles.input}
                            />
                          </div>
                        </div>

                        <div className={styles.transferSpeed}>
                          <label>Transfer Speed</label>
                          <div className={styles.speedOptions}>
                            <div 
                              className={`${styles.speedOption} ${formData.transferSpeed === "standard" ? styles.selected : ''}`}
                              onClick={() => setFormData({...formData, transferSpeed: "standard"})}
                            >
                              <span className={styles.speedIcon}>🐢</span>
                              <span className={styles.speedName}>Standard</span>
                              <span className={styles.speedTime}>3-5 days • Free</span>
                            </div>
                            <div 
                              className={`${styles.speedOption} ${formData.transferSpeed === "express" ? styles.selected : ''}`}
                              onClick={() => setFormData({...formData, transferSpeed: "express"})}
                            >
                              <span className={styles.speedIcon}>🚀</span>
                              <span className={styles.speedName}>Express</span>
                              <span className={styles.speedTime}>1-2 days • $15</span>
                            </div>
                            <div 
                              className={`${styles.speedOption} ${formData.transferSpeed === "wire" ? styles.selected : ''}`}
                              onClick={() => setFormData({...formData, transferSpeed: "wire"})}
                            >
                              <span className={styles.speedIcon}>⚡</span>
                              <span className={styles.speedName}>Wire</span>
                              <span className={styles.speedTime}>Same day • $30</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {/* Step 3: Amount */}
                {step === 3 && (
                  <motion.div
                    key="internal-step-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className={styles.stepContent}
                  >
                    <h3>Transfer Amount</h3>
                    <p className={styles.stepDescription}>How much would you like to transfer?</p>
                    
                    <div className={styles.amountSection}>
                      <div className={styles.availableBalance}>
                        <span>Available Balance:</span>
                        <strong>{formatBalance(getAvailableBalance())}</strong>
                      </div>

                      <div className={styles.inputGroup}>
                        <label>Amount</label>
                        <div className={styles.amountInput}>
                          <span className={styles.currencySymbol}>$</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            required
                            min="0.01"
                            step="0.01"
                            max={getAvailableBalance()}
                            className={styles.amountField}
                          />
                        </div>
                        
                        <div className={styles.quickAmounts}>
                          {[50, 100, 500, 1000].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              className={styles.quickAmountBtn}
                              onClick={() => {
                                if (amt <= getAvailableBalance()) {
                                  setFormData({...formData, amount: amt.toString()});
                                }
                              }}
                              disabled={amt > getAvailableBalance()}
                            >
                              ${amt}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className={styles.inputGroup}>
                        <label>Description (Optional)</label>
                        <textarea
                          placeholder="What is this transfer for?"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          className={styles.textarea}
                          rows={3}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Review */}
                {step === 4 && (
                  <motion.div
                    key="internal-step-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className={styles.stepContent}
                  >
                    <h3>Review Transfer</h3>
                    <p className={styles.stepDescription}>Please confirm your transfer details</p>
                    
                    <div className={styles.reviewCard}>
                      <div className={styles.reviewSection}>
                        <h4>From</h4>
                        <div className={styles.reviewItem}>
                          <span>Account</span>
                          <strong>{formData.fromAccount.charAt(0).toUpperCase() + formData.fromAccount.slice(1)}</strong>
                        </div>
                        <div className={styles.reviewItem}>
                          <span>Current Balance</span>
                          <strong>{formatBalance(getAvailableBalance())}</strong>
                        </div>
                      </div>
                      
                      <div className={styles.reviewSection}>
                        <h4>To</h4>
                        {formData.transferType === "internal" ? (
                          <div className={styles.reviewItem}>
                            <span>Account</span>
                            <strong>{formData.toAccount.charAt(0).toUpperCase() + formData.toAccount.slice(1)}</strong>
                          </div>
                        ) : (
                          <>
                            <div className={styles.reviewItem}>
                              <span>Recipient</span>
                              <strong>{formData.recipientName}</strong>
                            </div>
                            <div className={styles.reviewItem}>
                              <span>Account</span>
                              <strong>****{formData.recipientAccount.slice(-4)}</strong>
                            </div>
                            <div className={styles.reviewItem}>
                              <span>Bank</span>
                              <strong>{formData.recipientBank}</strong>
                            </div>
                            <div className={styles.reviewItem}>
                              <span>Speed</span>
                              <strong>{formData.transferSpeed.charAt(0).toUpperCase() + formData.transferSpeed.slice(1)}</strong>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className={styles.reviewSection}>
                        <h4>Transfer Details</h4>
                        <div className={styles.reviewAmount}>
                          {formatBalance(parseFloat(formData.amount || "0"))}
                        </div>
                        {formData.description && (
                          <div className={styles.reviewDescription}>
                            &quot;{formData.description}&quot;
                          </div>
                        )}
                        <div className={styles.reviewItem}>
                          <span>New Balance ({formData.fromAccount})</span>
                          <strong>{formatBalance(getAvailableBalance() - parseFloat(formData.amount || "0"))}</strong>
                        </div>
                      </div>
                      
                      {formData.transferType === "external" && (
                        <div className={styles.warningBox}>
                          <span className={styles.warningIcon}>⚠️</span>
                          <p>External transfers require Bank approval and may take {
                            formData.transferSpeed === "wire" ? "same day" :
                            formData.transferSpeed === "express" ? "1-2 business days" :
                            "3-5 business days"
                          } to complete.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error and Success Messages */}
              {error && <div className={styles.error}>{error}</div>}
              {success && <div className={styles.success}>{success}</div>}

              {/* Navigation Buttons */}
              <div className={styles.navigationButtons}>
                {step > 1 && (
                  <button 
                    type="button"
                    onClick={prevStep}
                    className={styles.backButton}
                    disabled={loading}
                  >
                    ← Back
                  </button>
                )}
                
                {step < 4 ? (
                  <button 
                    type="button"
                    onClick={nextStep}
                    className={styles.continueButton}
                  >
                    Continue →
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className={styles.spinner}></span>
                        Processing...
                      </>
                    ) : (
                      <>🔒 Confirm Transfer</>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <footer className={styles.footer}>
          <Footer />
        </footer>
      </div>
    </div>
  );
}