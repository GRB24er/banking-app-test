// app/transfers/wire/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import styles from "./wire.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

interface WireFormData {
  fromAccount: string;
  recipientType: "individual" | "business";
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientState: string;
  recipientZip: string;
  recipientCountry: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: "checking" | "savings";
  swiftCode?: string;
  amount: string;
  currency: string;
  purpose: string;
  reference: string;
  urgency: "standard" | "expedited";
  notifications: boolean;
}

export default function WireTransferPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitResponse, setSubmitResponse] = useState<any>(null);
  const [formData, setFormData] = useState<WireFormData>({
    fromAccount: "checking",
    recipientType: "individual",
    recipientName: "",
    recipientAddress: "",
    recipientCity: "",
    recipientState: "",
    recipientZip: "",
    recipientCountry: "US",
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    accountType: "checking",
    swiftCode: "",
    amount: "",
    currency: "USD",
    purpose: "",
    reference: "",
    urgency: "standard",
    notifications: true
  });

  const [errors, setErrors] = useState<Partial<WireFormData>>({});

  // Fix hydration mismatch - wait for client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInputChange = (field: keyof WireFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<WireFormData> = {};
    
    switch(step) {
      case 1:
        if (!formData.recipientName) newErrors.recipientName = "Required";
        if (!formData.recipientAddress) newErrors.recipientAddress = "Required";
        if (!formData.recipientCity) newErrors.recipientCity = "Required";
        if (!formData.recipientCountry) newErrors.recipientCountry = "Required";
        break;
      case 2:
        if (!formData.bankName) newErrors.bankName = "Required";
        if (!formData.routingNumber) newErrors.routingNumber = "Required";
        if (!formData.accountNumber) newErrors.accountNumber = "Required";
        if (formData.recipientCountry !== "US" && !formData.swiftCode) {
          newErrors.swiftCode = "Required for international transfers";
        }
        break;
      case 3:
        if (!formData.amount) newErrors.amount = "Required";
        if (parseFloat(formData.amount) <= 0) newErrors.amount = "Invalid amount";
        if (!formData.purpose) newErrors.purpose = "Required";
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setLoading(true);
    setSubmitResponse(null);
    
    try {
      const wireTransferData = {
        fromAccount: formData.fromAccount,
        recipientName: formData.recipientName,
        recipientAccount: formData.accountNumber,
        recipientBank: formData.bankName,
        recipientRoutingNumber: formData.routingNumber,
        recipientBankAddress: `${formData.bankName} Main Branch`,
        recipientAddress: `${formData.recipientAddress}, ${formData.recipientCity}${formData.recipientState ? ', ' + formData.recipientState : ''}${formData.recipientZip ? ' ' + formData.recipientZip : ''}, ${formData.recipientCountry}`,
        amount: parseFloat(formData.amount),
        description: formData.reference || `Wire transfer to ${formData.recipientName}`,
        wireType: formData.recipientCountry === 'US' ? 'domestic' : 'international',
        purposeOfTransfer: formData.purpose,
        urgentTransfer: formData.urgency === 'expedited'
      };

      const response = await fetch('/api/transfers/wire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wireTransferData)
      });

      const data = await response.json();
      setSubmitResponse(data);

      if (data.success) {
        setCurrentStep(5);
      }
    } catch (error) {
      console.error('Wire transfer request failed:', error);
      setSubmitResponse({
        success: false,
        error: 'Network error occurred. Please try again.'
      });
    }
    
    setLoading(false);
  };

  const estimateFee = () => {
    const isInternational = formData.recipientCountry !== "US";
    const isExpedited = formData.urgency === "expedited";
    let fee = isInternational ? 45 : 30;
    if (isExpedited) fee += 25;
    return fee;
  };

  const estimateArrival = () => {
    return formData.urgency === "expedited" ? "Same business day (urgent)" : "Same business day";
  };

  // Prevent hydration mismatch - show nothing until mounted
  if (!mounted) {
    return (
      <div className={styles.wrapper}>
        <Sidebar />
        <div className={styles.mainContent}>
          <Header />
          <div className={styles.hero}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Wire Transfer</h1>
              <p className={styles.heroSubtitle}>Send money domestically or internationally with guaranteed delivery</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        
        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Wire Transfer</h1>
            <p className={styles.heroSubtitle}>
              Send money domestically or internationally with guaranteed delivery
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${(Math.min(currentStep, 4) / 4) * 100}%` }}
            />
          </div>
          
          <div className={styles.steps}>
            {["Recipient", "Bank Details", "Transfer Info", "Review"].map((label, index) => (
              <div 
                key={label}
                className={`${styles.step} ${currentStep > index + 1 ? styles.completed : ''} ${currentStep === index + 1 ? styles.active : ''}`}
              >
                <div className={styles.stepNumber}>
                  {currentStep > index + 1 ? '✓' : index + 1}
                </div>
                <span className={styles.stepLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.container}>
          <div className={styles.formContainer}>
            <AnimatePresence mode="wait">
              {/* Step 1: Recipient Information */}
              {currentStep === 1 && (
                <motion.div
                  key="wire-step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className={styles.stepContent}
                >
                  <h2 className={styles.stepTitle}>Recipient Information</h2>
                  
                  <div className={styles.formSection}>
                    <div className={styles.radioGroup}>
                      <label className={styles.radioOption}>
                        <input
                          type="radio"
                          name="recipientType"
                          value="individual"
                          checked={formData.recipientType === "individual"}
                          onChange={(e) => handleInputChange("recipientType", e.target.value)}
                        />
                        <span>Individual</span>
                      </label>
                      <label className={styles.radioOption}>
                        <input
                          type="radio"
                          name="recipientType"
                          value="business"
                          checked={formData.recipientType === "business"}
                          onChange={(e) => handleInputChange("recipientType", e.target.value)}
                        />
                        <span>Business</span>
                      </label>
                    </div>

                    <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label>
                          {formData.recipientType === "individual" ? "Full Name" : "Business Name"}
                          <span className={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.recipientName}
                          onChange={(e) => handleInputChange("recipientName", e.target.value)}
                          className={errors.recipientName ? styles.errorInput : ""}
                          placeholder={formData.recipientType === "individual" ? "John Doe" : "ABC Corporation"}
                        />
                        {errors.recipientName && (
                          <span className={styles.errorMessage}>{errors.recipientName}</span>
                        )}
                      </div>

                      <div className={styles.formField}>
                        <label>
                          Country
                          <span className={styles.required}>*</span>
                        </label>
                        <select
                          value={formData.recipientCountry}
                          onChange={(e) => handleInputChange("recipientCountry", e.target.value)}
                        >
                          <option value="US">United States</option>
                          <option value="CA">Canada</option>
                          <option value="UK">United Kingdom</option>
                          <option value="EU">European Union</option>
                          <option value="AU">Australia</option>
                          <option value="JP">Japan</option>
                          <option value="CN">China</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>

                      <div className={`${styles.formField} ${styles.fullWidth}`}>
                        <label>
                          Street Address
                          <span className={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.recipientAddress}
                          onChange={(e) => handleInputChange("recipientAddress", e.target.value)}
                          className={errors.recipientAddress ? styles.errorInput : ""}
                          placeholder="123 Main Street"
                        />
                        {errors.recipientAddress && (
                          <span className={styles.errorMessage}>{errors.recipientAddress}</span>
                        )}
                      </div>

                      <div className={styles.formField}>
                        <label>
                          City
                          <span className={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.recipientCity}
                          onChange={(e) => handleInputChange("recipientCity", e.target.value)}
                          className={errors.recipientCity ? styles.errorInput : ""}
                          placeholder="New York"
                        />
                        {errors.recipientCity && (
                          <span className={styles.errorMessage}>{errors.recipientCity}</span>
                        )}
                      </div>

                      {formData.recipientCountry === "US" && (
                        <>
                          <div className={styles.formField}>
                            <label>State</label>
                            <input
                              type="text"
                              value={formData.recipientState}
                              onChange={(e) => handleInputChange("recipientState", e.target.value)}
                              placeholder="NY"
                              maxLength={2}
                            />
                          </div>
                          <div className={styles.formField}>
                            <label>ZIP Code</label>
                            <input
                              type="text"
                              value={formData.recipientZip}
                              onChange={(e) => handleInputChange("recipientZip", e.target.value)}
                              placeholder="10001"
                              maxLength={10}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button 
                      className={styles.btnSecondary}
                      onClick={() => router.push('/dashboard')}
                    >
                      Cancel
                    </button>
                    <button 
                      className={styles.btnPrimary}
                      onClick={handleNext}
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Bank Details */}
              {currentStep === 2 && (
                <motion.div
                  key="wire-step-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className={styles.stepContent}
                >
                  <h2 className={styles.stepTitle}>Bank Account Details</h2>
                  
                  <div className={styles.formSection}>
                    <div className={styles.formGrid}>
                      <div className={`${styles.formField} ${styles.fullWidth}`}>
                        <label>
                          Bank Name
                          <span className={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.bankName}
                          onChange={(e) => handleInputChange("bankName", e.target.value)}
                          className={errors.bankName ? styles.errorInput : ""}
                          placeholder="Bank of America"
                        />
                        {errors.bankName && (
                          <span className={styles.errorMessage}>{errors.bankName}</span>
                        )}
                      </div>

                      <div className={styles.formField}>
                        <label>
                          {formData.recipientCountry === "US" ? "Routing Number (ABA)" : "Bank Code"}
                          <span className={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.routingNumber}
                          onChange={(e) => handleInputChange("routingNumber", e.target.value)}
                          className={errors.routingNumber ? styles.errorInput : ""}
                          placeholder={formData.recipientCountry === "US" ? "021000021" : "BOFAUS3N"}
                          maxLength={9}
                        />
                        {errors.routingNumber && (
                          <span className={styles.errorMessage}>{errors.routingNumber}</span>
                        )}
                      </div>

                      <div className={styles.formField}>
                        <label>
                          Account Number
                          <span className={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.accountNumber}
                          onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                          className={errors.accountNumber ? styles.errorInput : ""}
                          placeholder="1234567890"
                        />
                        {errors.accountNumber && (
                          <span className={styles.errorMessage}>{errors.accountNumber}</span>
                        )}
                      </div>

                      {formData.recipientCountry !== "US" && (
                        <div className={styles.formField}>
                          <label>
                            SWIFT/BIC Code
                            <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.swiftCode}
                            onChange={(e) => handleInputChange("swiftCode", e.target.value)}
                            className={errors.swiftCode ? styles.errorInput : ""}
                            placeholder="BOFAUS3N"
                            maxLength={11}
                          />
                          {errors.swiftCode && (
                            <span className={styles.errorMessage}>{errors.swiftCode}</span>
                          )}
                        </div>
                      )}

                      <div className={styles.formField}>
                        <label>Account Type</label>
                        <select
                          value={formData.accountType}
                          onChange={(e) => handleInputChange("accountType", e.target.value as "checking" | "savings")}
                        >
                          <option value="checking">Checking</option>
                          <option value="savings">Savings</option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.infoBox}>
                      <div className={styles.infoIcon}>ℹ️</div>
                      <div className={styles.infoContent}>
                        <strong>Where to find these details?</strong>
                        <p>You can find routing and account numbers on checks or bank statements. 
                           SWIFT codes are available on your bank&apos;s website or by contacting them directly.</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button className={styles.btnSecondary} onClick={handleBack}>
                      Back
                    </button>
                    <button className={styles.btnPrimary} onClick={handleNext}>
                      Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Transfer Details */}
              {currentStep === 3 && (
                <motion.div
                  key="wire-step-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className={styles.stepContent}
                >
                  <h2 className={styles.stepTitle}>Transfer Details</h2>
                  
                  <div className={styles.formSection}>
                    <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label>
                          From Account
                          <span className={styles.required}>*</span>
                        </label>
                        <select
                          value={formData.fromAccount}
                          onChange={(e) => handleInputChange("fromAccount", e.target.value)}
                        >
                          <option value="checking">Checking Account</option>
                          <option value="savings">Savings Account</option>
                          <option value="investment">Investment Account</option>
                        </select>
                      </div>

                      <div className={styles.formField}>
                        <label>
                          Amount
                          <span className={styles.required}>*</span>
                        </label>
                        <div className={styles.amountInput}>
                          <select
                            value={formData.currency}
                            onChange={(e) => handleInputChange("currency", e.target.value)}
                            className={styles.currencySelect}
                          >
                            <option value="USD">USD</option>
                          </select>
                          <input
                            type="number"
                            value={formData.amount}
                            onChange={(e) => handleInputChange("amount", e.target.value)}
                            className={errors.amount ? styles.errorInput : ""}
                            placeholder="100.00"
                            step="0.01"
                            min="100"
                          />
                        </div>
                        {errors.amount && (
                          <span className={styles.errorMessage}>{errors.amount}</span>
                        )}
                      </div>

                      <div className={styles.formField}>
                        <label>Transfer Speed</label>
                        <select
                          value={formData.urgency}
                          onChange={(e) => handleInputChange("urgency", e.target.value)}
                        >
                          <option value="standard">Standard (${estimateFee() - (formData.urgency === 'expedited' ? 25 : 0)})</option>
                          <option value="expedited">Urgent (+$25 fee)</option>
                        </select>
                      </div>

                      <div className={`${styles.formField} ${styles.fullWidth}`}>
                        <label>
                          Purpose of Transfer
                          <span className={styles.required}>*</span>
                        </label>
                        <select
                          value={formData.purpose}
                          onChange={(e) => handleInputChange("purpose", e.target.value)}
                          className={errors.purpose ? styles.errorInput : ""}
                        >
                          <option value="">Select purpose</option>
                          <option value="personal_transfer">Personal/Family Support</option>
                          <option value="business_payment">Business Payment</option>
                          <option value="real_estate">Purchase/Investment</option>
                          <option value="other">Other</option>
                        </select>
                        {errors.purpose && (
                          <span className={styles.errorMessage}>{errors.purpose}</span>
                        )}
                      </div>

                      <div className={`${styles.formField} ${styles.fullWidth}`}>
                        <label>Reference/Message (Optional)</label>
                        <textarea
                          value={formData.reference}
                          onChange={(e) => handleInputChange("reference", e.target.value)}
                          placeholder="Invoice #12345 or personal message"
                          rows={3}
                          maxLength={140}
                        />
                        <span className={styles.charCount}>
                          {formData.reference.length}/140 characters
                        </span>
                      </div>
                    </div>

                    <div className={styles.feeEstimate}>
                      <h3>Transfer Summary</h3>
                      <div className={styles.feeRow}>
                        <span>Transfer Amount:</span>
                        <strong>{formData.currency} {parseFloat(formData.amount || "0").toFixed(2)}</strong>
                      </div>
                      <div className={styles.feeRow}>
                        <span>Wire Fee:</span>
                        <strong>${estimateFee()}.00</strong>
                      </div>
                      <div className={styles.feeRow}>
                        <span>Estimated Arrival:</span>
                        <strong>{estimateArrival()}</strong>
                      </div>
                      <div className={`${styles.feeRow} ${styles.total}`}>
                        <span>Total Debit:</span>
                        <strong>
                          {formData.currency} {(parseFloat(formData.amount || "0") + estimateFee()).toFixed(2)}
                        </strong>
                      </div>
                    </div>

                    <div className={styles.checkboxField}>
                      <input
                        type="checkbox"
                        id="notifications"
                        checked={formData.notifications}
                        onChange={(e) => handleInputChange("notifications", e.target.checked)}
                      />
                      <label htmlFor="notifications">
                        Send me email notifications about this transfer
                      </label>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button className={styles.btnSecondary} onClick={handleBack}>
                      Back
                    </button>
                    <button className={styles.btnPrimary} onClick={handleNext}>
                      Review Transfer
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Review */}
              {currentStep === 4 && (
                <motion.div
                  key="wire-step-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className={styles.stepContent}
                >
                  <h2 className={styles.stepTitle}>Review Wire Transfer</h2>
                  
                  <div className={styles.reviewContainer}>
                    <div className={styles.reviewSection}>
                      <h3>Recipient Information</h3>
                      <div className={styles.reviewGrid}>
                        <div className={styles.reviewItem}>
                          <span className={styles.reviewLabel}>Name:</span>
                          <span className={styles.reviewValue}>{formData.recipientName}</span>
                        </div>
                        <div className={styles.reviewItem}>
                          <span className={styles.reviewLabel}>Address:</span>
                          <span className={styles.reviewValue}>
                            {formData.recipientAddress}, {formData.recipientCity}
                            {formData.recipientState && `, ${formData.recipientState}`}
                            {formData.recipientZip && ` ${formData.recipientZip}`}
                            , {formData.recipientCountry}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.reviewSection}>
                      <h3>Bank Information</h3>
                      <div className={styles.reviewGrid}>
                        <div className={styles.reviewItem}>
                          <span className={styles.reviewLabel}>Bank Name:</span>
                          <span className={styles.reviewValue}>{formData.bankName}</span>
                        </div>
                        <div className={styles.reviewItem}>
                          <span className={styles.reviewLabel}>Routing Number:</span>
                          <span className={styles.reviewValue}>{formData.routingNumber}</span>
                        </div>
                        <div className={styles.reviewItem}>
                          <span className={styles.reviewLabel}>Account Number:</span>
                          <span className={styles.reviewValue}>
                            ****{formData.accountNumber.slice(-4)}
                          </span>
                        </div>
                        {formData.swiftCode && (
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>SWIFT Code:</span>
                            <span className={styles.reviewValue}>{formData.swiftCode}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.reviewSection}>
                      <h3>Transfer Details</h3>
                      <div className={styles.reviewGrid}>
                        <div className={styles.reviewItem}>
                          <span className={styles.reviewLabel}>From:</span>
                          <span className={styles.reviewValue}>{formData.fromAccount} Account</span>
                        </div>
                        <div className={styles.reviewItem}>
                          <span className={styles.reviewLabel}>Amount:</span>
                          <span className={styles.reviewValue}>
                            {formData.currency} {parseFloat(formData.amount || "0").toFixed(2)}
                          </span>
                        </div>
                        <div className={styles.reviewItem}>
                          <span className={styles.reviewLabel}>Wire Fee:</span>
                          <span className={styles.reviewValue}>${estimateFee()}.00</span>
                        </div>
                        <div className={styles.reviewItem}>
                          <span className={styles.reviewLabel}>Purpose:</span>
                          <span className={styles.reviewValue}>{formData.purpose}</span>
                        </div>
                        <div className={styles.reviewItem}>
                          <span className={styles.reviewLabel}>Delivery:</span>
                          <span className={styles.reviewValue}>{estimateArrival()}</span>
                        </div>
                      </div>
                    </div>

                    {submitResponse && !submitResponse.success && (
                      <div className={styles.warningBox}>
                        <div className={styles.warningIcon}>⚠️</div>
                        <div className={styles.warningContent}>
                          <strong>Error</strong>
                          <p>{submitResponse.error}</p>
                        </div>
                      </div>
                    )}

                    <div className={styles.warningBox}>
                      <div className={styles.warningIcon}>⚠️</div>
                      <div className={styles.warningContent}>
                        <strong>Important Notice</strong>
                        <p>Wire transfers cannot be cancelled once submitted. Please verify all information is correct before confirming.</p>
                      </div>
                    </div>

                    <div className={styles.agreementBox}>
                      <input type="checkbox" id="agreement" required />
                      <label htmlFor="agreement">
                        I confirm that all information is correct and authorize this wire transfer. I understand that wire transfers are irreversible.
                      </label>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button 
                      className={styles.btnSecondary}
                      onClick={handleBack}
                      disabled={loading}
                    >
                      Back
                    </button>
                    <button 
                      className={styles.btnPrimary}
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? "Processing..." : "Confirm & Send Wire"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Success */}
              {currentStep === 5 && (
                <motion.div
                  key="wire-step-5"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={styles.successContainer}
                >
                  <div className={styles.successIcon}>
                    {submitResponse?.success ? '✅' : '❌'}
                  </div>
                  <h2 className={styles.successTitle}>
                    {submitResponse?.success ? 'Wire Transfer Completed!' : 'Wire Transfer Failed'}
                  </h2>
                  <p className={styles.successMessage}>
                    {submitResponse?.success ? (
                      <>
                        Your wire transfer of {formData.currency} {parseFloat(formData.amount || "0").toFixed(2)} 
                        {' '}to {formData.recipientName} has been successfully completed and the funds have been debited from your account.
                      </>
                    ) : (
                      <>
                        There was an error processing your wire transfer. Please try again or contact support.
                        <br />
                        Error: {submitResponse?.error}
                      </>
                    )}
                  </p>
                  
                  {submitResponse?.success && (
                    <div className={styles.confirmationBox}>
                      <h3>Confirmation Details</h3>
                      <div className={styles.confirmationItem}>
                        <span>Reference Number:</span>
                        <strong>{submitResponse.wireReference}</strong>
                      </div>
                      <div className={styles.confirmationItem}>
                        <span>Status:</span>
                        <strong>Completed</strong>
                      </div>
                      <div className={styles.confirmationItem}>
                        <span>Amount Debited:</span>
                        <strong>${submitResponse.transfer?.total?.toFixed(2) || '0.00'}</strong>
                      </div>
                      <div className={styles.confirmationItem}>
                        <span>New Balance:</span>
                        <strong>${submitResponse.newBalance?.toFixed(2) || '0.00'}</strong>
                      </div>
                      <div className={styles.confirmationItem}>
                        <span>Expected Delivery:</span>
                        <strong>{estimateArrival()}</strong>
                      </div>
                    </div>
                  )}

                  <div className={styles.successActions}>
                    <button 
                      className={styles.btnSecondary}
                      onClick={() => window.print()}
                    >
                      Print Confirmation
                    </button>
                    <button 
                      className={styles.btnPrimary}
                      onClick={() => router.push('/dashboard')}
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Side Panel */}
          {currentStep < 5 && (
            <div className={styles.sidePanel}>
              <div className={styles.helpSection}>
                <h3>Need Help?</h3>
                <div className={styles.helpItems}>
                  <div className={styles.helpItem}>
                    <span className={styles.helpIcon}>📞</span>
                    <div>
                      <strong>Call Us</strong>
                      <p>1-800-WIRE-NOW</p>
                    </div>
                  </div>
                  <div className={styles.helpItem}>
                    <span className={styles.helpIcon}>💬</span>
                    <div>
                      <strong>Live Chat</strong>
                      <p>Available 24/7</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.limitsSection}>
                <h3>Wire Transfer Limits</h3>
                <div className={styles.limitItem}>
                  <span>Domestic:</span>
                  <strong>$100,000/day</strong>
                </div>
                <div className={styles.limitItem}>
                  <span>International:</span>
                  <strong>$50,000/day</strong>
                </div>
                <p className={styles.limitNote}>
                  Need higher limits? Contact your relationship manager.
                </p>
              </div>

              <div className={styles.securitySection}>
                <h3>Security Tips</h3>
                <ul>
                  <li>Always verify recipient details</li>
                  <li>Never wire to unknown parties</li>
                  <li>Be aware of wire fraud schemes</li>
                  <li>Contact us if anything seems suspicious</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
}