// app/transfers/wire/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import styles from "./wire.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import {
  COUNTRIES,
  ACCOUNT_EQUIVALENT_FIELDS,
  getCountry,
  getBankFieldsForCountry,
} from "@/lib/countries";

interface WireFormData {
  // Sender Info
  fromAccount: string;

  // Recipient Info
  recipientType: "individual" | "business";
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientState: string;
  recipientZip: string;
  recipientCountry: string;

  // Bank Info
  bankName: string;
  bankAddress: string;
  bankCity: string;
  routingNumber: string;
  accountNumber: string;
  iban: string;
  sortCode: string;
  accountType: "checking" | "savings";
  swiftCode?: string;

  // Transfer Details
  amount: string;
  currency: string;
  purpose: string;
  reference: string;

  // Additional
  urgency: "standard" | "expedited";
  notifications: boolean;

  // Country-specific identifiers (transit/institution, IFSC, CLABE, BSB, etc.)
  extraBankFields: Record<string, string>;
}

export default function WireTransferPage() {
  const router = useRouter();
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
    bankAddress: "",
    bankCity: "",
    routingNumber: "",
    accountNumber: "",
    iban: "",
    sortCode: "",
    accountType: "checking",
    swiftCode: "",
    amount: "",
    currency: "USD",
    purpose: "",
    reference: "",
    urgency: "standard",
    notifications: true,
    extraBankFields: {},
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof WireFormData, value: any) => {
    setFormData(prev => {
      const next: WireFormData = { ...prev, [field]: value } as WireFormData;
      // Reset country-specific bank fields when country changes — different country, different identifiers
      if (field === "recipientCountry") {
        next.extraBankFields = {};
      }
      return next;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleExtraBankFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      extraBankFields: { ...prev.extraBankFields, [fieldId]: value },
    }));
    const errKey = `extra:${fieldId}`;
    if (errors[errKey]) {
      setErrors(prev => ({ ...prev, [errKey]: "" }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    const country = getCountry(formData.recipientCountry);

    switch (step) {
      case 1:
        if (!formData.recipientName) newErrors.recipientName = "Required";
        if (!formData.recipientAddress) newErrors.recipientAddress = "Required";
        if (!formData.recipientCity) newErrors.recipientCity = "Required";
        if (!formData.recipientCountry) newErrors.recipientCountry = "Required";
        break;
      case 2:
        if (!formData.bankName) newErrors.bankName = "Required";

        // SWIFT/BIC required for everything except US domestic
        if (formData.recipientCountry !== "US" && !formData.swiftCode) {
          newErrors.swiftCode = "Required for international transfers";
        }

        // IBAN-required countries (Eurozone, UK, UAE, etc.)
        if (country?.requiresIBAN && !formData.iban) {
          newErrors.iban = "IBAN is required for this country";
        }

        // US: routing number required
        if (country?.requiresRoutingNumber && !formData.routingNumber) {
          newErrors.routingNumber = "Routing number is required";
        }

        // UK: sort code required
        if (country?.requiresSortCode && !formData.sortCode) {
          newErrors.sortCode = "Sort code is required";
        }

        // Account number required UNLESS the country has an account-substitute (CLABE, NUBAN, CBU, etc.)
        const hasAccountSubstitute = (country?.extraFields || []).some(
          f => ACCOUNT_EQUIVALENT_FIELDS.includes(f.id) &&
               (formData.extraBankFields[f.id] || "").trim().length > 0
        );
        if (!country?.requiresIBAN && !hasAccountSubstitute && !formData.accountNumber) {
          newErrors.accountNumber = "Account number is required";
        }

        // Validate country-specific extra bank fields
        (country?.extraFields || []).forEach(fdef => {
          const val = (formData.extraBankFields[fdef.id] || "").trim();
          const errKey = `extra:${fdef.id}`;
          if (fdef.required && !val) {
            newErrors[errKey] = `${fdef.label} is required`;
            return;
          }
          if (val && fdef.pattern) {
            try {
              const re = new RegExp(fdef.pattern);
              if (!re.test(val.replace(/\s/g, ""))) {
                newErrors[errKey] = fdef.patternError || `Invalid ${fdef.label}`;
              }
            } catch {
              // bad regex in config — skip
            }
          }
        });
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
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setLoading(true);
    setSubmitResponse(null);
    
    try {
      // Prepare data for the wire transfer API
      const wireTransferData = {
        fromAccount: formData.fromAccount,
        recipientName: formData.recipientName,
        recipientAccount: formData.accountNumber,
        recipientBank: formData.bankName,
        recipientRoutingNumber: formData.routingNumber,
        recipientBankAddress: formData.bankAddress?.trim() || `${formData.bankName} Main Branch`,
        recipientBankCity: formData.bankCity?.trim() || "",
        recipientAddress: `${formData.recipientAddress}, ${formData.recipientCity}${formData.recipientState ? ', ' + formData.recipientState : ''}${formData.recipientZip ? ' ' + formData.recipientZip : ''}, ${formData.recipientCountry}`,
        recipientCountry: formData.recipientCountry,
        recipientCity: formData.recipientCity,
        recipientState: formData.recipientState,
        recipientPostalCode: formData.recipientZip,
        amount: parseFloat(formData.amount),
        description: formData.reference || `Wire transfer to ${formData.recipientName}`,
        wireType: formData.recipientCountry === 'US' ? 'domestic' : 'international',
        purposeOfTransfer: formData.purpose,
        urgentTransfer: formData.urgency === 'expedited',
        // Country-aware bank identifiers
        swiftCode: formData.swiftCode?.toUpperCase().trim() || "",
        iban: formData.iban?.replace(/\s/g, '').trim() || "",
        sortCode: formData.sortCode?.trim() || "",
        accountType: formData.accountType,
        // Country-specific identifiers (transit/institution, IFSC, CLABE, BSB, etc.)
        extraBankFields: formData.extraBankFields,
      };

      console.log('🔄 Sending wire transfer request:', wireTransferData);

      const response = await fetch('/api/transfers/wire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wireTransferData)
      });

      const data = await response.json();
      console.log('📥 Wire transfer response:', data);

      setSubmitResponse(data);

      if (data.success) {
        setCurrentStep(5); // Success step
      } else {
        // Handle error - stay on current step and show error
        console.error('Wire transfer failed:', data.error);
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
    const amount = parseFloat(formData.amount) || 0;
    const isInternational = formData.recipientCountry !== "US";
    const isExpedited = formData.urgency === "expedited";
    
    let fee = 0;
    if (isInternational) {
      fee = 45; // International wire fee
    } else {
      fee = 30; // Domestic wire fee
    }
    
    if (isExpedited) {
      fee += 25; // Urgent processing fee
    }
    
    return fee;
  };

  const estimateArrival = () => {
    const isExpedited = formData.urgency === "expedited";
    return isExpedited ? "Same business day (urgent)" : "Same business day";
  };

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
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
          
          <div className={styles.steps}>
            {["Recipient", "Bank Details", "Transfer Info", "Review"].map((label, index) => (
              <div 
                key={index}
                className={`${styles.step} ${currentStep > index ? styles.completed : ''} ${currentStep === index + 1 ? styles.active : ''}`}
              >
                <div className={styles.stepNumber}>{index + 1}</div>
                <span className={styles.stepLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.container}>
          <div className={styles.formContainer}>
            {/* Step 1: Recipient Information */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
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
                        {COUNTRIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.emoji ? `${c.emoji} ` : ""}{c.name}
                          </option>
                        ))}
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
            {currentStep === 2 && (() => {
              const country = getCountry(formData.recipientCountry);
              const extraFields = getBankFieldsForCountry(formData.recipientCountry);
              const isUS = formData.recipientCountry === "US";
              return (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={styles.stepContent}
              >
                <h2 className={styles.stepTitle}>Bank Account Details</h2>

                {country?.bankInfoHint && (
                  <div className={styles.infoBox}>
                    <div className={styles.infoIcon}>ℹ️</div>
                    <div className={styles.infoContent}>
                      <strong>{country.emoji} {country.name}:</strong>
                      <p>{country.bankInfoHint}</p>
                    </div>
                  </div>
                )}

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
                        placeholder="e.g. RBC, HSBC, Bank of America"
                      />
                      {errors.bankName && (
                        <span className={styles.errorMessage}>{errors.bankName}</span>
                      )}
                    </div>

                    {/* IBAN-required countries (Eurozone, UK, UAE, Saudi, etc.) */}
                    {country?.requiresIBAN && (
                      <div className={`${styles.formField} ${styles.fullWidth}`}>
                        <label>
                          IBAN
                          <span className={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.iban}
                          onChange={(e) => handleInputChange("iban", e.target.value.toUpperCase())}
                          className={errors.iban ? styles.errorInput : ""}
                          placeholder="GB00 XXXX 0000 0000 0000 00"
                        />
                        {errors.iban && (
                          <span className={styles.errorMessage}>{errors.iban}</span>
                        )}
                      </div>
                    )}

                    {/* US: 9-digit ABA routing */}
                    {country?.requiresRoutingNumber && (
                      <div className={styles.formField}>
                        <label>
                          Routing Number (ABA)
                          <span className={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.routingNumber}
                          onChange={(e) => handleInputChange("routingNumber", e.target.value)}
                          className={errors.routingNumber ? styles.errorInput : ""}
                          placeholder="021000021"
                          maxLength={9}
                        />
                        {errors.routingNumber && (
                          <span className={styles.errorMessage}>{errors.routingNumber}</span>
                        )}
                      </div>
                    )}

                    {/* UK: sort code */}
                    {country?.requiresSortCode && (
                      <div className={styles.formField}>
                        <label>
                          Sort Code
                          <span className={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.sortCode}
                          onChange={(e) => handleInputChange("sortCode", e.target.value)}
                          className={errors.sortCode ? styles.errorInput : ""}
                          placeholder="00-00-00"
                          maxLength={8}
                        />
                        {errors.sortCode && (
                          <span className={styles.errorMessage}>{errors.sortCode}</span>
                        )}
                      </div>
                    )}

                    {/* Account number — hidden when country uses a substitute (CLABE, NUBAN, CBU, etc.) */}
                    {!country?.requiresIBAN && (
                      <div className={styles.formField}>
                        <label>
                          Account Number
                          {!extraFields.some(f => ACCOUNT_EQUIVALENT_FIELDS.includes(f.id)) && (
                            <span className={styles.required}>*</span>
                          )}
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
                    )}

                    {/* SWIFT/BIC — required for international (everything except US domestic) */}
                    {!isUS && (
                      <div className={styles.formField}>
                        <label>
                          SWIFT/BIC Code
                          <span className={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.swiftCode}
                          onChange={(e) => handleInputChange("swiftCode", e.target.value.toUpperCase())}
                          className={errors.swiftCode ? styles.errorInput : ""}
                          placeholder="BOFAUS3N"
                          maxLength={11}
                        />
                        {errors.swiftCode && (
                          <span className={styles.errorMessage}>{errors.swiftCode}</span>
                        )}
                      </div>
                    )}

                    {/* Country-specific identifiers (transit/institution for Canada,
                        IFSC for India, BSB for Australia, CLABE for Mexico, NUBAN for Nigeria, etc.) */}
                    {extraFields.map(fdef => {
                      const errKey = `extra:${fdef.id}`;
                      const value = formData.extraBankFields[fdef.id] || "";
                      return (
                        <div key={fdef.id} className={styles.formField}>
                          <label>
                            {fdef.label}
                            {fdef.required && <span className={styles.required}>*</span>}
                          </label>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handleExtraBankFieldChange(fdef.id, e.target.value)}
                            className={errors[errKey] ? styles.errorInput : ""}
                            placeholder={fdef.placeholder || ""}
                            maxLength={fdef.maxLength}
                          />
                          {fdef.helpText && (
                            <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 4 }}>
                              {fdef.helpText}
                            </span>
                          )}
                          {errors[errKey] && (
                            <span className={styles.errorMessage}>{errors[errKey]}</span>
                          )}
                        </div>
                      );
                    })}

                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                      <label>Bank Address (branch)</label>
                      <input
                        type="text"
                        value={formData.bankAddress}
                        onChange={(e) => handleInputChange("bankAddress", e.target.value)}
                        placeholder="Branch street address where the account is held"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label>Bank City</label>
                      <input
                        type="text"
                        value={formData.bankCity}
                        onChange={(e) => handleInputChange("bankCity", e.target.value)}
                        placeholder="City"
                      />
                    </div>

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
                      <p>Routing/account numbers, IBAN, sort code, transit/institution numbers, IFSC, BSB, CLABE,
                         and SWIFT/BIC are all available on the recipient's bank statements, online banking,
                         or by asking the recipient's bank directly.</p>
                    </div>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button
                    className={styles.btnSecondary}
                    onClick={handleBack}
                  >
                    Back
                  </button>
                  <button
                    className={styles.btnPrimary}
                    onClick={handleNext}
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
              );
            })()}

            {/* Step 3: Transfer Details */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
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
                        <option value="standard">Standard (${estimateFee() - 25})</option>
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
                  <button 
                    className={styles.btnSecondary}
                    onClick={handleBack}
                  >
                    Back
                  </button>
                  <button 
                    className={styles.btnPrimary}
                    onClick={handleNext}
                  >
                    Review Transfer
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
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
                     {formData.bankAddress && (
                       <div className={styles.reviewItem}>
                         <span className={styles.reviewLabel}>Bank Address:</span>
                         <span className={styles.reviewValue}>{formData.bankAddress}</span>
                       </div>
                     )}
                     {formData.bankCity && (
                       <div className={styles.reviewItem}>
                         <span className={styles.reviewLabel}>Bank City:</span>
                         <span className={styles.reviewValue}>{formData.bankCity}</span>
                       </div>
                     )}
                     {formData.iban && (
                       <div className={styles.reviewItem}>
                         <span className={styles.reviewLabel}>IBAN:</span>
                         <span className={styles.reviewValue}>{formData.iban}</span>
                       </div>
                     )}
                     {formData.routingNumber && (
                       <div className={styles.reviewItem}>
                         <span className={styles.reviewLabel}>Routing Number:</span>
                         <span className={styles.reviewValue}>{formData.routingNumber}</span>
                       </div>
                     )}
                     {formData.sortCode && (
                       <div className={styles.reviewItem}>
                         <span className={styles.reviewLabel}>Sort Code:</span>
                         <span className={styles.reviewValue}>{formData.sortCode}</span>
                       </div>
                     )}
                     {formData.accountNumber && (
                       <div className={styles.reviewItem}>
                         <span className={styles.reviewLabel}>Account Number:</span>
                         <span className={styles.reviewValue}>
                           ****{formData.accountNumber.slice(-4)}
                         </span>
                       </div>
                     )}
                     {formData.swiftCode && (
                       <div className={styles.reviewItem}>
                         <span className={styles.reviewLabel}>SWIFT Code:</span>
                         <span className={styles.reviewValue}>{formData.swiftCode}</span>
                       </div>
                     )}
                     {getBankFieldsForCountry(formData.recipientCountry).map(fdef => {
                       const v = formData.extraBankFields[fdef.id];
                       if (!v) return null;
                       return (
                         <div key={fdef.id} className={styles.reviewItem}>
                           <span className={styles.reviewLabel}>{fdef.label}:</span>
                           <span className={styles.reviewValue}>{v}</span>
                         </div>
                       );
                     })}
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

                 {/* Show API Response if there's an error */}
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
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className={styles.successContainer}
             >
               <div className={styles.successIcon}>✅</div>
               <h2 className={styles.successTitle}>
                 {submitResponse?.success ? 'Wire Transfer Completed!' : 'Wire Transfer Failed'}
               </h2>
               <p className={styles.successMessage}>
                 {submitResponse?.success ? (
                   <>
                     Your wire transfer of {formData.currency} {parseFloat(formData.amount || "0").toFixed(2)} 
                     to {formData.recipientName} has been successfully completed and the funds have been debited from your account.
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