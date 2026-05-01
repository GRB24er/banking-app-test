// src/app/transfers/international/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "./international.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  COUNTRIES,
  type Country,
  type BankFieldDef,
  getBankFieldsForCountry,
} from "@/lib/countries";
import Sidebar from "@/components/Sidebar";

// Type Definitions
interface TransferSpeed {
  id: "standard" | "express" | "instant";
  name: string;
  time: string;
  fee: number;
  description: string;
  availability?: string[];
}

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  lastUpdated: Date;
  trend?: "up" | "down" | "stable";
}

interface ValidationError {
  field: string;
  message: string;
}

interface TransferLimits {
  minimum: number;
  daily: number;
  monthly: number;
  perTransaction: number;
}

interface InternationalTransferData {
  // Transfer Details
  fromAccount: string;
  amount: string;
  sourceCurrency: string;
  targetCurrency: string;
  
  // Recipient Information
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  recipientCountry: string;
  recipientPostalCode: string;
  recipientState?: string;
  
  // Bank Details
  bankName: string;
  iban: string;
  swiftBic: string;
  sortCode?: string;
  routingNumber?: string;
  accountNumber?: string;
  bankAddress: string;
  bankCity?: string;
  bankCountry?: string;
  
  // Transfer Metadata
  purpose: string;
  reference: string;
  transferSpeed: "standard" | "express" | "instant";
  
  // Compliance
  sourceOfFunds: string;
  relationship: string;
  complianceAccepted?: boolean;
  
  // Additional Fields
  intermediaryBank?: string;
  intermediarySwift?: string;
  saveAsTemplate?: boolean;
  templateName?: string;

  // Country-specific bank fields (transitNumber, ifscCode, clabe, bsbCode, etc.)
  extraBankFields: Record<string, string>;
}

interface TransferResponse {
  success: boolean;
  transferReference?: string;
  transfer?: {
    id?: string;
    status: "pending" | "processing" | "completed" | "failed";
    amount: number;
    fee: number;
    total: number;
    targetCurrency: string;
    estimatedCompletion: string;
    processedImmediately?: boolean;
  };
  exchangeInfo?: {
    exchangeRate: number;
    convertedAmount: number;
    rateValidUntil?: string;
  };
  newBalance?: number;
  error?: string;
  details?: string;
  missingFields?: string[];
}


const TRANSFER_SPEEDS: TransferSpeed[] = [
  { 
    id: "standard", 
    name: "Standard", 
    time: "3-5 business days", 
    fee: 25,
    description: "Low cost option for non-urgent transfers",
    availability: ["all"]
  },
  { 
    id: "express", 
    name: "Express", 
    time: "1-2 business days", 
    fee: 45,
    description: "Faster delivery with tracking",
    availability: ["GB", "EU", "US", "CA", "AU"]
  },
  { 
    id: "instant", 
    name: "Instant", 
    time: "Within minutes", 
    fee: 75,
    description: "Immediate transfer for urgent needs",
    availability: ["GB", "EU", "US"]
  }
];

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "$", name: "Australian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "SGD", symbol: "$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "$", name: "Hong Kong Dollar" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
];

const TRANSFER_PURPOSES = [
  { value: "family_support", label: "Family Support" },
  { value: "education", label: "Education/Tuition" },
  { value: "personal_transfer", label: "Personal Transfer" },
  { value: "business_payment", label: "Business Payment" },
  { value: "invoice_payment", label: "Invoice Payment" },
  { value: "investment", label: "Investment" },
  { value: "property_purchase", label: "Property Purchase" },
  { value: "medical", label: "Medical Expenses" },
  { value: "charity", label: "Charitable Donation" },
  { value: "other", label: "Other" },
];

const RELATIONSHIPS = [
  { value: "family", label: "Family Member" },
  { value: "friend", label: "Friend" },
  { value: "business_partner", label: "Business Partner" },
  { value: "employee", label: "Employee" },
  { value: "employer", label: "Employer" },
  { value: "supplier", label: "Supplier/Vendor" },
  { value: "customer", label: "Customer" },
  { value: "self", label: "Own Account" },
  { value: "other", label: "Other" },
];

const SOURCE_OF_FUNDS = [
  { value: "salary", label: "Salary/Income" },
  { value: "savings", label: "Personal Savings" },
  { value: "business", label: "Business Revenue" },
  { value: "investment", label: "Investment Returns" },
  { value: "property", label: "Property Sale" },
  { value: "inheritance", label: "Inheritance" },
  { value: "gift", label: "Gift" },
  { value: "loan", label: "Loan" },
  { value: "other", label: "Other" },
];

export default function InternationalTransferPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // State Management
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitResponse, setSubmitResponse] = useState<TransferResponse | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [isRateLoading, setIsRateLoading] = useState<boolean>(false);
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  // Form Data State
  const [formData, setFormData] = useState<InternationalTransferData>({
    fromAccount: "checking",
    amount: "",
    sourceCurrency: "USD",
    targetCurrency: "EUR",
    recipientName: "",
    recipientEmail: "",
    recipientPhone: "",
    recipientAddress: "",
    recipientCity: "",
    recipientCountry: "",
    recipientPostalCode: "",
    recipientState: "",
    bankName: "",
    iban: "",
    swiftBic: "",
    sortCode: "",
    routingNumber: "",
    accountNumber: "",
    bankAddress: "",
    bankCity: "",
    bankCountry: "",
    purpose: "",
    reference: "",
    transferSpeed: "standard",
    sourceOfFunds: "",
    relationship: "",
    complianceAccepted: false,
    intermediaryBank: "",
    intermediarySwift: "",
    saveAsTemplate: false,
    templateName: "",
    extraBankFields: {}
  });

  // Transfer Limits
  const [limits] = useState<TransferLimits>({
    minimum: 50,
    daily: 50000,
    monthly: 500000,
    perTransaction: 25000
  });

  // Fetch exchange rates on mount and update periodically
  useEffect(() => {
    fetchExchangeRates();
    const interval = setInterval(fetchExchangeRates, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Load saved templates
  useEffect(() => {
    loadSavedTemplates();
  }, []);

  // Auto-save draft
  useEffect(() => {
    const draft = JSON.stringify(formData);
    localStorage.setItem('internationalTransferDraft', draft);
  }, [formData]);

  // Fetch current exchange rates
  const fetchExchangeRates = async () => {
    setIsRateLoading(true);
    try {
      // In production, this would call a real API
      const mockRates: ExchangeRate[] = [
        { from: "USD", to: "EUR", rate: 0.85, lastUpdated: new Date(), trend: "up" },
        { from: "USD", to: "GBP", rate: 0.73, lastUpdated: new Date(), trend: "down" },
        { from: "USD", to: "CAD", rate: 1.35, lastUpdated: new Date(), trend: "stable" },
        { from: "USD", to: "AUD", rate: 1.45, lastUpdated: new Date(), trend: "up" },
        { from: "USD", to: "JPY", rate: 110.0, lastUpdated: new Date(), trend: "down" },
        { from: "USD", to: "CHF", rate: 0.92, lastUpdated: new Date(), trend: "stable" },
        { from: "USD", to: "CNY", rate: 6.45, lastUpdated: new Date(), trend: "up" },
        { from: "USD", to: "INR", rate: 74.5, lastUpdated: new Date(), trend: "down" },
        { from: "USD", to: "SGD", rate: 1.35, lastUpdated: new Date(), trend: "stable" },
        { from: "USD", to: "HKD", rate: 7.78, lastUpdated: new Date(), trend: "stable" },
        { from: "USD", to: "BRL", rate: 5.25, lastUpdated: new Date(), trend: "up" },
        { from: "USD", to: "MXN", rate: 20.5, lastUpdated: new Date(), trend: "down" },
      ];
      setExchangeRates(mockRates);
    } catch (error) {
      console.error("Failed to fetch exchange rates:", error);
    } finally {
      setIsRateLoading(false);
    }
  };

  // Load saved transfer templates
  const loadSavedTemplates = () => {
    const templates = localStorage.getItem('transferTemplates');
    if (templates) {
      setSavedTemplates(JSON.parse(templates));
    }
  };

  // Get current exchange rate
  const getCurrentExchangeRate = useCallback((): number => {
    const rate = exchangeRates.find(
      r => r.from === formData.sourceCurrency && r.to === formData.targetCurrency
    );
    return rate?.rate || 1;
  }, [exchangeRates, formData.sourceCurrency, formData.targetCurrency]);

  // Calculate transfer totals
  const calculateTotal = useMemo(() => {
    const amount = parseFloat(formData.amount) || 0;
    const selectedSpeed = TRANSFER_SPEEDS.find(s => s.id === formData.transferSpeed);
    const fee = selectedSpeed?.fee || 0;
    const exchangeRate = getCurrentExchangeRate();
    const convertedAmount = amount * exchangeRate;
    
    return {
      sourceAmount: amount,
      fee: fee,
      totalDebit: amount + fee,
      convertedAmount: convertedAmount,
      exchangeRate: exchangeRate,
      estimatedReceive: convertedAmount - (convertedAmount * 0.002) // 0.2% FX margin
    };
  }, [formData.amount, formData.transferSpeed, getCurrentExchangeRate]);

  // Handle input changes with validation
  const handleInputChange = useCallback((field: keyof InternationalTransferData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear validation error for this field
    setValidationErrors(prev => prev.filter(e => e.field !== field));

    // Auto-update bank country and clear country-specific bank fields when recipient country changes
    if (field === 'recipientCountry') {
      setFormData(prev => ({
        ...prev,
        bankCountry: prev.bankCountry || value,
        extraBankFields: {}, // reset — different country needs different identifiers
      }));
    }

    // Auto-format IBAN
    if (field === 'iban') {
      const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').match(/.{1,4}/g)?.join(' ') || value;
      setFormData(prev => ({ ...prev, iban: formatted }));
    }

    // Auto-format SWIFT/BIC
    if (field === 'swiftBic') {
      setFormData(prev => ({ ...prev, swiftBic: value.toUpperCase().replace(/[^A-Z0-9]/g, '') }));
    }
  }, []);

  // Handle country-specific extra bank field changes (transitNumber, ifsc, clabe, bsb, etc.)
  const handleExtraBankFieldChange = useCallback((fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      extraBankFields: { ...prev.extraBankFields, [fieldId]: value },
    }));
    setValidationErrors(prev => prev.filter(e => e.field !== `extra:${fieldId}`));
  }, []);

  // Validate current step
  const validateStep = (step: number): boolean => {
    const errors: ValidationError[] = [];
    
    switch (step) {
      case 1:
        // Only check if amount exists and is positive for step navigation
        // We'll show the minimum amount error but still allow navigation
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
          errors.push({ field: 'amount', message: 'Please enter an amount' });
        }
        break;
        
      case 2:
        if (!formData.recipientName) {
          errors.push({ field: 'recipientName', message: 'Recipient name is required' });
        }
        if (!formData.recipientCountry) {
          errors.push({ field: 'recipientCountry', message: 'Country is required' });
        }
        if (!formData.recipientAddress) {
          errors.push({ field: 'recipientAddress', message: 'Address is required' });
        }
        if (!formData.recipientCity) {
          errors.push({ field: 'recipientCity', message: 'City is required' });
        }
        if (!formData.relationship) {
          errors.push({ field: 'relationship', message: 'Relationship is required' });
        }
        if (!formData.sourceOfFunds) {
          errors.push({ field: 'sourceOfFunds', message: 'Source of funds is required' });
        }
        // Email validation
        if (formData.recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.recipientEmail)) {
          errors.push({ field: 'recipientEmail', message: 'Invalid email format' });
        }
        break;
        
      case 3:
        if (!formData.bankName) {
          errors.push({ field: 'bankName', message: 'Bank name is required' });
        }
        
        const selectedCountry = COUNTRIES.find(c => c.code === formData.recipientCountry);
        
        if (selectedCountry?.requiresIBAN && !formData.iban) {
          errors.push({ field: 'iban', message: 'IBAN is required for this country' });
        }
        
        if (!formData.swiftBic) {
          errors.push({ field: 'swiftBic', message: 'SWIFT/BIC code is required' });
        }
        
        if (selectedCountry?.requiresSortCode && !formData.sortCode) {
          errors.push({ field: 'sortCode', message: 'Sort code is required for UK transfers' });
        }
        
        if (selectedCountry?.requiresRoutingNumber && !formData.routingNumber) {
          errors.push({ field: 'routingNumber', message: 'Routing number is required' });
        }
        
        if (!selectedCountry?.requiresIBAN && !formData.accountNumber) {
          // Some countries replace account number entirely (e.g. Nigeria NUBAN, Mexico CLABE).
          // Only require it if no equivalent extra field is provided.
          const hasReplacement = (selectedCountry?.extraFields || []).some(
            f => ["nuban", "clabe", "cbu", "cci", "rib", "nzAccountFormatted"].includes(f.id) &&
                 (formData.extraBankFields[f.id] || "").trim().length > 0
          );
          if (!hasReplacement) {
            errors.push({ field: 'accountNumber', message: 'Account number is required' });
          }
        }

        // Validate country-specific extra bank fields
        (selectedCountry?.extraFields || []).forEach(fdef => {
          const val = (formData.extraBankFields[fdef.id] || "").trim();
          if (fdef.required && !val) {
            errors.push({ field: `extra:${fdef.id}`, message: `${fdef.label} is required` });
            return;
          }
          if (val && fdef.pattern) {
            try {
              const re = new RegExp(fdef.pattern);
              if (!re.test(val.replace(/\s/g, ''))) {
                errors.push({ field: `extra:${fdef.id}`, message: fdef.patternError || `Invalid ${fdef.label}` });
              }
            } catch {
              // Bad regex in config — skip silently rather than blocking the user
            }
          }
        });

        if (!formData.purpose) {
          errors.push({ field: 'purpose', message: 'Transfer purpose is required' });
        }
        
        // IBAN validation (basic)
        if (formData.iban && !/^[A-Z]{2}[0-9]{2}[A-Z0-9\s]+$/.test(formData.iban.replace(/\s/g, ''))) {
          errors.push({ field: 'iban', message: 'Invalid IBAN format' });
        }
        
        // SWIFT validation
        if (formData.swiftBic && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(formData.swiftBic)) {
          errors.push({ field: 'swiftBic', message: 'Invalid SWIFT/BIC format' });
        }
        break;
        
      case 4:
        if (!formData.complianceAccepted) {
          errors.push({ field: 'compliance', message: 'You must accept the compliance terms' });
        }
        break;
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Move to next step
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Move to previous step
  const handlePreviousStep = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Apply saved template - FIXED
  const applyTemplate = (templateId: string) => {
    const template = savedTemplates.find(t => t.id === templateId);
    if (template && template.data) {
      // Build new form data without conflicts
      const newFormData: InternationalTransferData = {
        // Start with current form data
        ...formData,
        // Apply only the safe fields from template
        recipientName: template.data.recipientName || formData.recipientName,
        recipientEmail: template.data.recipientEmail || formData.recipientEmail,
        recipientPhone: template.data.recipientPhone || formData.recipientPhone,
        recipientAddress: template.data.recipientAddress || formData.recipientAddress,
        recipientCity: template.data.recipientCity || formData.recipientCity,
        recipientCountry: template.data.recipientCountry || formData.recipientCountry,
        recipientPostalCode: template.data.recipientPostalCode || formData.recipientPostalCode,
        recipientState: template.data.recipientState || formData.recipientState,
        bankName: template.data.bankName || formData.bankName,
        iban: template.data.iban || formData.iban,
        swiftBic: template.data.swiftBic || formData.swiftBic,
        sortCode: template.data.sortCode || formData.sortCode,
        routingNumber: template.data.routingNumber || formData.routingNumber,
        accountNumber: template.data.accountNumber || formData.accountNumber,
        bankAddress: template.data.bankAddress || formData.bankAddress,
        bankCity: template.data.bankCity || formData.bankCity,
        bankCountry: template.data.bankCountry || formData.bankCountry,
        purpose: template.data.purpose || formData.purpose,
        transferSpeed: template.data.transferSpeed || formData.transferSpeed,
        sourceOfFunds: template.data.sourceOfFunds || formData.sourceOfFunds,
        relationship: template.data.relationship || formData.relationship,
        intermediaryBank: template.data.intermediaryBank || formData.intermediaryBank,
        intermediarySwift: template.data.intermediarySwift || formData.intermediarySwift,
        extraBankFields: template.data.extraBankFields || formData.extraBankFields,
        // Always reset compliance
        complianceAccepted: false
      };
      
      setFormData(newFormData);
    }
  };

  // Save as template
  const saveAsTemplate = () => {
    if (formData.saveAsTemplate && formData.templateName) {
      const template = {
        id: Date.now().toString(),
        name: formData.templateName,
        data: {
          recipientName: formData.recipientName,
          recipientEmail: formData.recipientEmail,
          recipientPhone: formData.recipientPhone,
          recipientAddress: formData.recipientAddress,
          recipientCity: formData.recipientCity,
          recipientCountry: formData.recipientCountry,
          recipientPostalCode: formData.recipientPostalCode,
          recipientState: formData.recipientState,
          bankName: formData.bankName,
          iban: formData.iban,
          swiftBic: formData.swiftBic,
          sortCode: formData.sortCode,
          routingNumber: formData.routingNumber,
          accountNumber: formData.accountNumber,
          bankAddress: formData.bankAddress,
          bankCity: formData.bankCity,
          bankCountry: formData.bankCountry,
          purpose: formData.purpose,
          transferSpeed: formData.transferSpeed,
          sourceOfFunds: formData.sourceOfFunds,
          relationship: formData.relationship,
          intermediaryBank: formData.intermediaryBank,
          intermediarySwift: formData.intermediarySwift,
          extraBankFields: formData.extraBankFields,
          // Do NOT save: reference, amount, complianceAccepted
        },
        createdAt: new Date().toISOString()
      };
      
      const templates = [...savedTemplates, template];
      setSavedTemplates(templates);
      localStorage.setItem('transferTemplates', JSON.stringify(templates));
    }
  };

  // Submit transfer - FIXED to match API route
  const handleSubmit = async () => {
    if (!validateStep(4)) {
      return;
    }
    
    setLoading(true);
    setSubmitResponse(null);
    
    try {
      // Save as template if requested
      saveAsTemplate();
      
      // Prepare data matching API route structure exactly
      const internationalTransferData = {
        // Account
        fromAccount: formData.fromAccount,
        
        // Recipient Information
        recipientName: formData.recipientName.trim(),
        recipientAccount: formData.accountNumber?.trim() || '',
        recipientIBAN: formData.iban?.replace(/\s/g, '').trim() || undefined,
        recipientSWIFT: formData.swiftBic.toUpperCase().trim(),
        recipientBank: formData.bankName.trim(),
        recipientBankAddress: formData.bankAddress?.trim() || `${formData.bankName.trim()} Main Branch`,
        recipientAddress: formData.recipientAddress.trim(),
        recipientCity: formData.recipientCity.trim(),
        recipientCountry: formData.recipientCountry,
        recipientPostalCode: formData.recipientPostalCode.trim(),
        
        // Transfer details
        amount: parseFloat(formData.amount),
        currency: formData.targetCurrency,
        description: formData.reference?.trim() || `International transfer to ${formData.recipientName.trim()}`,
        purposeOfTransfer: formData.purpose,
        transferSpeed: formData.transferSpeed === 'instant' ? 'express' : formData.transferSpeed,
        
        // Optional fields
        correspondentBank: formData.intermediaryBank?.trim() || undefined,
        correspondentBankSWIFT: formData.intermediarySwift?.toUpperCase().trim() || undefined,

        // Country-specific bank identifiers (transit/institution, IFSC, CLABE, BSB, etc.)
        extraBankFields: formData.extraBankFields,
      };

      console.log('Sending international transfer request:', internationalTransferData);

      const response = await fetch('/api/transfers/international', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(internationalTransferData)
      });

      const data = await response.json();
      console.log('International transfer response:', data);

      setSubmitResponse(data);

      if (data.success) {
        // Clear draft
        localStorage.removeItem('internationalTransferDraft');
        setCurrentStep(5); // Success step
      } else {
        // Show error
        console.error('International transfer failed:', data.error);
        if (data.missingFields && data.missingFields.length > 0) {
          console.error('Missing fields:', data.missingFields);
        }
      }
    } catch (error) {
      console.error('International transfer request failed:', error);
      setSubmitResponse({
        success: false,
        error: 'Network error occurred. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get field error
  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find(e => e.field === field)?.message;
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string): string => {
    const currencyInfo = CURRENCIES.find(c => c.code === currency);
    return `${currencyInfo?.symbol || '$'}${amount.toFixed(2)}`;
  };

  // Step titles for progress bar
  const stepTitles = [
    "Amount & Currency",
    "Recipient Details", 
    "Bank Information",
    "Review & Confirm"
  ];

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <h1 className={styles.pageTitle}>International Money Transfer</h1>
            <p className={styles.pageSubtitle}>
              Send money worldwide with competitive exchange rates
            </p>
          </div>

          {/* Progress Steps */}
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
            <div className={styles.progressSteps}>
              {stepTitles.map((title, index) => (
                <div 
                  key={index}
                  className={`${styles.progressStep} ${
                    currentStep > index ? styles.completed : ''
                  } ${currentStep === index + 1 ? styles.active : ''}`}
                >
                  <div className={styles.stepCircle}>
                    {currentStep > index + 1 ? '✓' : index + 1}
                  </div>
                  <span className={styles.stepTitle}>{title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.container}>
          <div className={styles.formCard}>
            <AnimatePresence mode="wait">
              {/* Step 1: Amount & Currency */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={styles.stepContent}
                >
                  <h2 className={styles.sectionTitle}>Transfer Amount & Currency</h2>
                  
                  {/* Saved Templates */}
                  {savedTemplates.length > 0 && (
                    <div className={styles.templatesSection}>
                      <label>Use Saved Recipient</label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => {
                          setSelectedTemplate(e.target.value);
                          if (e.target.value) {
                            applyTemplate(e.target.value);
                          }
                        }}
                        className={styles.templateSelect}
                      >
                        <option value="">Select a saved recipient...</option>
                        {savedTemplates.map(template => (
                          <option key={template.id} value={template.id}>
                            {template.name} - {template.data.recipientName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className={styles.currencyConverter}>
                    <div className={styles.converterRow}>
                      <div className={styles.currencyInput}>
                        <label>You Send</label>
                        <div className={styles.inputGroup}>
                          <select
                            value={formData.sourceCurrency}
                            onChange={(e) => handleInputChange("sourceCurrency", e.target.value)}
                            className={styles.currencySelect}
                          >
                            {CURRENCIES.map(currency => (
                              <option key={currency.code} value={currency.code}>
                                {currency.code}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={formData.amount}
                            onChange={(e) => handleInputChange("amount", e.target.value)}
                            placeholder="Enter amount"
                            min="0.01"
                            step="0.01"
                            className={styles.amountInput}
                            style={{ 
                              display: 'block',
                              width: '100%',
                              padding: '12px',
                              fontSize: '16px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </div>
                        {formData.amount && parseFloat(formData.amount) > 0 && parseFloat(formData.amount) < limits.minimum && (
                          <span className={styles.warningMessage} style={{ color: '#f59e0b', fontSize: '12px' }}>
                            Note: Minimum transfer amount is ${limits.minimum}
                          </span>
                        )}
                      </div>

                      <div className={styles.exchangeRate}>
                        <div className={styles.rateInfo}>
                          <span className={styles.rateLabel}>Exchange Rate</span>
                          <span className={styles.rateValue}>
                            1 {formData.sourceCurrency} = {getCurrentExchangeRate().toFixed(4)} {formData.targetCurrency}
                          </span>
                          {exchangeRates.find(r => r.from === formData.sourceCurrency && r.to === formData.targetCurrency)?.trend && (
                            <span className={styles.rateTrend}>
                              {exchangeRates.find(r => r.from === formData.sourceCurrency && r.to === formData.targetCurrency)?.trend === 'up' ? '↑' : 
                               exchangeRates.find(r => r.from === formData.sourceCurrency && r.to === formData.targetCurrency)?.trend === 'down' ? '↓' : '→'}
                            </span>
                          )}
                        </div>
                        <div className={styles.rateArrow}>→</div>
                      </div>

                      <div className={styles.currencyInput}>
                        <label>Recipient Gets (estimated)</label>
                        <div className={styles.inputGroup}>
                          <select
                            value={formData.targetCurrency}
                            onChange={(e) => handleInputChange("targetCurrency", e.target.value)}
                            className={styles.currencySelect}
                          >
                            {CURRENCIES.map(currency => (
                              <option key={currency.code} value={currency.code}>
                                {currency.code}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={calculateTotal.estimatedReceive.toFixed(2)}
                            readOnly
                            className={styles.amountInput}
                            style={{ backgroundColor: '#f8fafc' }}
                          />
                        </div>
                        <span className={styles.fxNote}>*After FX margin of 0.2%</span>
                      </div>
                    </div>

                    <div className={styles.feeBreakdown}>
                      <div className={styles.feeItem}>
                        <span>Transfer Amount:</span>
                        <strong>{formatCurrency(calculateTotal.sourceAmount, formData.sourceCurrency)}</strong>
                      </div>
                      <div className={styles.feeItem}>
                        <span>Our Fee:</span>
                        <strong>{formatCurrency(calculateTotal.fee, formData.sourceCurrency)}</strong>
                      </div>
                      <div className={styles.feeItem}>
                        <span>Total to be Debited:</span>
                        <strong className={styles.totalAmount}>
                          {formatCurrency(calculateTotal.totalDebit, formData.sourceCurrency)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className={styles.transferSpeedSection}>
                    <h3>Select Transfer Speed</h3>
                    <div className={styles.speedOptions}>
                      {TRANSFER_SPEEDS.map((speed) => {
                        const isAvailable = speed.availability?.includes('all') || 
                          speed.availability?.includes(formData.recipientCountry);
                        
                        return (
                          <div
                            key={speed.id}
                            className={`${styles.speedOption} ${
                              formData.transferSpeed === speed.id ? styles.selected : ''
                            } ${!isAvailable ? styles.disabled : ''}`}
                            onClick={() => isAvailable && handleInputChange("transferSpeed", speed.id)}
                          >
                            <div className={styles.speedHeader}>
                              <span className={styles.speedName}>{speed.name}</span>
                              <span className={styles.speedFee}>{formatCurrency(speed.fee, formData.sourceCurrency)}</span>
                            </div>
                            <div className={styles.speedTime}>{speed.time}</div>
                            <div className={styles.speedDesc}>{speed.description}</div>
                            {!isAvailable && (
                              <div className={styles.unavailable}>Not available for selected country</div>
                            )}
                          </div>
                        );
                      })}
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
                      onClick={handleNextStep}
                      disabled={!formData.amount || parseFloat(formData.amount) <= 0}
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Recipient Details */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={styles.stepContent}
                >
                  <h2 className={styles.sectionTitle}>Recipient Information</h2>
                  
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label>Full Name <span className={styles.required}>*</span></label>
                      <input
                        type="text"
                        value={formData.recipientName}
                        onChange={(e) => handleInputChange("recipientName", e.target.value)}
                        placeholder="As it appears on bank account"
                        className={getFieldError('recipientName') ? styles.error : ''}
                      />
                      {getFieldError('recipientName') && (
                        <span className={styles.errorMessage}>{getFieldError('recipientName')}</span>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>Country <span className={styles.required}>*</span></label>
                      <select
                        value={formData.recipientCountry}
                        onChange={(e) => handleInputChange("recipientCountry", e.target.value)}
                        className={getFieldError('recipientCountry') ? styles.error : ''}
                      >
                        <option value="">Select Country</option>
                        {COUNTRIES.map(country => (
                          <option key={country.code} value={country.code}>
                            {country.emoji} {country.name}
                          </option>
                        ))}
                      </select>
                      {getFieldError('recipientCountry') && (
                        <span className={styles.errorMessage}>{getFieldError('recipientCountry')}</span>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>Email Address</label>
                      <input
                        type="email"
                        value={formData.recipientEmail}
                        onChange={(e) => handleInputChange("recipientEmail", e.target.value)}
                        placeholder="recipient@email.com"
                        className={getFieldError('recipientEmail') ? styles.error : ''}
                      />
                      {getFieldError('recipientEmail') && (
                        <span className={styles.errorMessage}>{getFieldError('recipientEmail')}</span>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>Phone Number</label>
                      <div className={styles.phoneInput}>
                        <span className={styles.phoneCode}>
                          {COUNTRIES.find(c => c.code === formData.recipientCountry)?.phoneCode || '+1'}
                        </span>
                        <input
                          type="tel"
                          value={formData.recipientPhone}
                          onChange={(e) => handleInputChange("recipientPhone", e.target.value)}
                          placeholder="234 567 8900"
                        />
                      </div>
                    </div>

                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                      <label>Street Address <span className={styles.required}>*</span></label>
                      <input
                        type="text"
                        value={formData.recipientAddress}
                        onChange={(e) => handleInputChange("recipientAddress", e.target.value)}
                        placeholder="123 Main Street, Apartment 4B"
                        className={getFieldError('recipientAddress') ? styles.error : ''}
                      />
                      {getFieldError('recipientAddress') && (
                        <span className={styles.errorMessage}>{getFieldError('recipientAddress')}</span>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>City <span className={styles.required}>*</span></label>
                      <input
                        type="text"
                        value={formData.recipientCity}
                        onChange={(e) => handleInputChange("recipientCity", e.target.value)}
                        placeholder="London"
                        className={getFieldError('recipientCity') ? styles.error : ''}
                      />
                      {getFieldError('recipientCity') && (
                        <span className={styles.errorMessage}>{getFieldError('recipientCity')}</span>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>State/Province {formData.recipientCountry === 'US' || formData.recipientCountry === 'CA' ? <span className={styles.required}>*</span> : ''}</label>
                      <input
                        type="text"
                        value={formData.recipientState}
                        onChange={(e) => handleInputChange("recipientState", e.target.value)}
                        placeholder="State or Province"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label>Postal Code</label>
                      <input
                        type="text"
                        value={formData.recipientPostalCode}
                        onChange={(e) => handleInputChange("recipientPostalCode", e.target.value)}
                        placeholder="SW1A 1AA"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label>Your Relationship <span className={styles.required}>*</span></label>
                      <select
                        value={formData.relationship}
                        onChange={(e) => handleInputChange("relationship", e.target.value)}
                        className={getFieldError('relationship') ? styles.error : ''}
                      >
                        <option value="">Select Relationship</option>
                        {RELATIONSHIPS.map(rel => (
                          <option key={rel.value} value={rel.value}>
                            {rel.label}
                          </option>
                        ))}
                      </select>
                      {getFieldError('relationship') && (
                        <span className={styles.errorMessage}>{getFieldError('relationship')}</span>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>Source of Funds <span className={styles.required}>*</span></label>
                      <select
                        value={formData.sourceOfFunds}
                        onChange={(e) => handleInputChange("sourceOfFunds", e.target.value)}
                        className={getFieldError('sourceOfFunds') ? styles.error : ''}
                      >
                        <option value="">Select Source</option>
                        {SOURCE_OF_FUNDS.map(source => (
                          <option key={source.value} value={source.value}>
                            {source.label}
                          </option>
                        ))}
                      </select>
                      {getFieldError('sourceOfFunds') && (
                        <span className={styles.errorMessage}>{getFieldError('sourceOfFunds')}</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button 
                      className={styles.btnSecondary}
                      onClick={handlePreviousStep}
                    >
                      Back
                    </button>
                    <button 
                      className={styles.btnPrimary}
                      onClick={handleNextStep}
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Bank Information */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={styles.stepContent}
                >
                  <h2 className={styles.sectionTitle}>Recipient Bank Details</h2>
                  
                  {(() => {
                    const sel = COUNTRIES.find(c => c.code === formData.recipientCountry);
                    return (
                      <div className={styles.bankDetailsInfo}>
                        <div className={styles.infoIcon}>ℹ️</div>
                        <div>
                          <p style={{ margin: 0 }}>
                            Please ensure all bank details are correct. Incorrect information may result in
                            transfer delays or funds being returned.
                          </p>
                          {sel?.bankInfoHint && (
                            <p style={{ margin: '8px 0 0', fontWeight: 600 }}>
                              {sel.emoji} {sel.name}: {sel.bankInfoHint}
                            </p>
                          )}
                          {!sel?.bankInfoHint && sel && (
                            <p style={{ margin: '8px 0 0' }}>
                              {sel.requiresIBAN
                                ? 'IBAN is required for this country.'
                                : 'Account number is required for this country.'}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div className={styles.formGrid}>
                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                      <label>Bank Name <span className={styles.required}>*</span></label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => handleInputChange("bankName", e.target.value)}
                        placeholder="HSBC Bank"
                        className={getFieldError('bankName') ? styles.error : ''}
                      />
                      {getFieldError('bankName') && (
                        <span className={styles.errorMessage}>{getFieldError('bankName')}</span>
                      )}
                    </div>

                    {COUNTRIES.find(c => c.code === formData.recipientCountry)?.requiresIBAN ? (
                      <div className={styles.formField}>
                        <label>IBAN <span className={styles.required}>*</span></label>
                        <input
                          type="text"
                          value={formData.iban}
                          onChange={(e) => handleInputChange("iban", e.target.value)}
                          placeholder="GB00 XXXX 0000 0000 0000 00"
                          className={getFieldError('iban') ? styles.error : ''}
                        />
                        {getFieldError('iban') && (
                          <span className={styles.errorMessage}>{getFieldError('iban')}</span>
                        )}
                      </div>
                    ) : (
                      <div className={styles.formField}>
                        <label>Account Number <span className={styles.required}>*</span></label>
                        <input
                          type="text"
                          value={formData.accountNumber}
                          onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                          placeholder="1234567890"
                          className={getFieldError('accountNumber') ? styles.error : ''}
                        />
                        {getFieldError('accountNumber') && (
                          <span className={styles.errorMessage}>{getFieldError('accountNumber')}</span>
                        )}
                      </div>
                    )}

                    <div className={styles.formField}>
                      <label>SWIFT/BIC Code <span className={styles.required}>*</span></label>
                      <input
                        type="text"
                        value={formData.swiftBic}
                        onChange={(e) => handleInputChange("swiftBic", e.target.value)}
                        placeholder="HBUKGB4B"
                        maxLength={11}
                        className={getFieldError('swiftBic') ? styles.error : ''}
                      />
                      {getFieldError('swiftBic') && (
                        <span className={styles.errorMessage}>{getFieldError('swiftBic')}</span>
                      )}
                    </div>

                    {COUNTRIES.find(c => c.code === formData.recipientCountry)?.requiresSortCode && (
                      <div className={styles.formField}>
                        <label>Sort Code <span className={styles.required}>*</span></label>
                        <input
                          type="text"
                          value={formData.sortCode}
                          onChange={(e) => handleInputChange("sortCode", e.target.value)}
                          placeholder="00-00-00"
                          maxLength={8}
                          className={getFieldError('sortCode') ? styles.error : ''}
                        />
                        {getFieldError('sortCode') && (
                          <span className={styles.errorMessage}>{getFieldError('sortCode')}</span>
                        )}
                      </div>
                    )}

                    {COUNTRIES.find(c => c.code === formData.recipientCountry)?.requiresRoutingNumber && (
                      <div className={styles.formField}>
                        <label>Routing Number <span className={styles.required}>*</span></label>
                        <input
                          type="text"
                          value={formData.routingNumber}
                          onChange={(e) => handleInputChange("routingNumber", e.target.value)}
                          placeholder="123456789"
                          maxLength={9}
                          className={getFieldError('routingNumber') ? styles.error : ''}
                        />
                        {getFieldError('routingNumber') && (
                          <span className={styles.errorMessage}>{getFieldError('routingNumber')}</span>
                        )}
                      </div>
                    )}

                    {/* Country-specific bank identifiers (transit/institution for Canada,
                        IFSC for India, BSB for Australia, CLABE for Mexico, NUBAN for Nigeria, etc.) */}
                    {getBankFieldsForCountry(formData.recipientCountry).map(fdef => {
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
                            placeholder={fdef.placeholder || ""}
                            maxLength={fdef.maxLength}
                            className={getFieldError(errKey) ? styles.error : ''}
                          />
                          {fdef.helpText && (
                            <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginTop: 4 }}>
                              {fdef.helpText}
                            </span>
                          )}
                          {getFieldError(errKey) && (
                            <span className={styles.errorMessage}>{getFieldError(errKey)}</span>
                          )}
                        </div>
                      );
                    })}

                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                      <label>Bank Address</label>
                      <input
                        type="text"
                        value={formData.bankAddress}
                        onChange={(e) => handleInputChange("bankAddress", e.target.value)}
                        placeholder="Bank street address"
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
                      <label>Bank Country</label>
                      <select
                        value={formData.bankCountry}
                        onChange={(e) => handleInputChange("bankCountry", e.target.value)}
                      >
                        <option value="">Select Country</option>
                        {COUNTRIES.map(country => (
                          <option key={country.code} value={country.code}>
                            {country.emoji} {country.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                      <label>Purpose of Transfer <span className={styles.required}>*</span></label>
                      <select
                        value={formData.purpose}
                        onChange={(e) => handleInputChange("purpose", e.target.value)}
                        className={getFieldError('purpose') ? styles.error : ''}
                      >
                        <option value="">Select Purpose</option>
                        {TRANSFER_PURPOSES.map(purpose => (
                          <option key={purpose.value} value={purpose.value}>
                            {purpose.label}
                          </option>
                        ))}
                      </select>
                      {getFieldError('purpose') && (
                        <span className={styles.errorMessage}>{getFieldError('purpose')}</span>
                      )}
                    </div>

                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                      <label>Reference/Message</label>
                      <textarea
                        value={formData.reference}
                        onChange={(e) => handleInputChange("reference", e.target.value)}
                        placeholder="Optional message or reference for recipient"
                        rows={3}
                        maxLength={140}
                      />
                      <span className={styles.charCount}>{formData.reference.length}/140</span>
                    </div>

                    {/* Intermediary Bank (Optional) */}
                    <div className={styles.intermediarySection}>
                      <h4>Intermediary Bank (Optional)</h4>
                      <p className={styles.intermediaryNote}>
                        Only required for certain countries or banks
                      </p>
                      <div className={styles.formGrid}>
                        <div className={styles.formField}>
                          <label>Intermediary Bank Name</label>
                          <input
                            type="text"
                            value={formData.intermediaryBank}
                            onChange={(e) => handleInputChange("intermediaryBank", e.target.value)}
                            placeholder="Intermediary bank name"
                          />
                        </div>
                        <div className={styles.formField}>
                          <label>Intermediary SWIFT/BIC</label>
                          <input
                            type="text"
                            value={formData.intermediarySwift}
                            onChange={(e) => handleInputChange("intermediarySwift", e.target.value)}
                            placeholder="SWIFT code"
                            maxLength={11}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save as Template */}
                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                      <div className={styles.checkboxField}>
                        <input
                          type="checkbox"
                          id="saveTemplate"
                          checked={formData.saveAsTemplate}
                          onChange={(e) => handleInputChange("saveAsTemplate", e.target.checked)}
                        />
                        <label htmlFor="saveTemplate">Save recipient as template for future transfers</label>
                      </div>
                      {formData.saveAsTemplate && (
                        <input
                          type="text"
                          value={formData.templateName}
                          onChange={(e) => handleInputChange("templateName", e.target.value)}
                          placeholder="Template name (e.g., 'John Doe - UK')"
                          className={styles.templateNameInput}
                        />
                      )}
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button 
                      className={styles.btnSecondary}
                      onClick={handlePreviousStep}
                    >
                      Back
                    </button>
                    <button 
                      className={styles.btnPrimary}
                      onClick={handleNextStep}
                    >
                      Review Transfer
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Review & Confirm */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={styles.stepContent}
                >
                  <h2 className={styles.sectionTitle}>Review & Confirm Transfer</h2>
                  
                  <div className={styles.reviewSections}>
                    <div className={styles.reviewCard}>
                      <h3>Transfer Summary</h3>
                      <div className={styles.summaryAmount}>
                        <div className={styles.summaryRow}>
                          <span>You Send:</span>
                          <strong className={styles.primaryAmount}>
                            {formatCurrency(calculateTotal.sourceAmount, formData.sourceCurrency)}
                          </strong>
                        </div>
                        <div className={styles.summaryRow}>
                          <span>Transfer Fee:</span>
                          <strong>{formatCurrency(calculateTotal.fee, formData.sourceCurrency)}</strong>
                        </div>
                        <div className={`${styles.summaryRow} ${styles.total}`}>
                          <span>Total Debit:</span>
                          <strong>{formatCurrency(calculateTotal.totalDebit, formData.sourceCurrency)}</strong>
                        </div>
                        <div className={styles.exchangeInfo}>
                          <span>Exchange Rate: 1 {formData.sourceCurrency} = {getCurrentExchangeRate().toFixed(4)} {formData.targetCurrency}</span>
                        </div>
                        <div className={`${styles.summaryRow} ${styles.receives}`}>
                          <span>Recipient Receives (estimated):</span>
                          <strong className={styles.primaryAmount}>
                            {formatCurrency(calculateTotal.estimatedReceive, formData.targetCurrency)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className={styles.reviewCard}>
                      <h3>Recipient Details</h3>
                      <div className={styles.reviewDetails}>
                        <div className={styles.detailRow}>
                          <span>Name:</span>
                          <strong>{formData.recipientName}</strong>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Location:</span>
                          <strong>
                            {formData.recipientCity}, {COUNTRIES.find(c => c.code === formData.recipientCountry)?.name}
                          </strong>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Address:</span>
                          <strong>{formData.recipientAddress}</strong>
                        </div>
                        {formData.recipientEmail && (
                          <div className={styles.detailRow}>
                            <span>Email:</span>
                            <strong>{formData.recipientEmail}</strong>
                          </div>
                        )}
                        {formData.recipientPhone && (
                          <div className={styles.detailRow}>
                            <span>Phone:</span>
                            <strong>
                              {COUNTRIES.find(c => c.code === formData.recipientCountry)?.phoneCode} {formData.recipientPhone}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.reviewCard}>
                      <h3>Bank Information</h3>
                      <div className={styles.reviewDetails}>
                        <div className={styles.detailRow}>
                          <span>Bank:</span>
                          <strong>{formData.bankName}</strong>
                        </div>
                        {formData.iban && (
                          <div className={styles.detailRow}>
                            <span>IBAN:</span>
                            <strong>{formData.iban}</strong>
                          </div>
                        )}
                        {formData.accountNumber && (
                          <div className={styles.detailRow}>
                            <span>Account Number:</span>
                            <strong>{formData.accountNumber}</strong>
                          </div>
                        )}
                        <div className={styles.detailRow}>
                          <span>SWIFT/BIC:</span>
                          <strong>{formData.swiftBic}</strong>
                        </div>
                        {formData.sortCode && (
                          <div className={styles.detailRow}>
                            <span>Sort Code:</span>
                            <strong>{formData.sortCode}</strong>
                          </div>
                        )}
                        {formData.routingNumber && (
                          <div className={styles.detailRow}>
                            <span>Routing Number:</span>
                            <strong>{formData.routingNumber}</strong>
                          </div>
                        )}
                        {getBankFieldsForCountry(formData.recipientCountry).map(fdef => {
                          const v = formData.extraBankFields[fdef.id];
                          if (!v) return null;
                          return (
                            <div key={fdef.id} className={styles.detailRow}>
                              <span>{fdef.label}:</span>
                              <strong>{v}</strong>
                            </div>
                          );
                        })}
                        {formData.intermediaryBank && (
                          <>
                            <div className={styles.detailRow}>
                              <span>Intermediary Bank:</span>
                              <strong>{formData.intermediaryBank}</strong>
                            </div>
                            <div className={styles.detailRow}>
                              <span>Intermediary SWIFT:</span>
                              <strong>{formData.intermediarySwift}</strong>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className={styles.reviewCard}>
                      <h3>Transfer Information</h3>
                      <div className={styles.reviewDetails}>
                        <div className={styles.detailRow}>
                          <span>From Account:</span>
                          <strong>{formData.fromAccount.charAt(0).toUpperCase() + formData.fromAccount.slice(1)} Account</strong>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Speed:</span>
                          <strong>
                            {TRANSFER_SPEEDS.find(s => s.id === formData.transferSpeed)?.name} - {
                              TRANSFER_SPEEDS.find(s => s.id === formData.transferSpeed)?.time
                            }
                          </strong>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Purpose:</span>
                          <strong>
                            {TRANSFER_PURPOSES.find(p => p.value === formData.purpose)?.label}
                          </strong>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Relationship:</span>
                          <strong>
                            {RELATIONSHIPS.find(r => r.value === formData.relationship)?.label}
                          </strong>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Source of Funds:</span>
                          <strong>
                            {SOURCE_OF_FUNDS.find(s => s.value === formData.sourceOfFunds)?.label}
                          </strong>
                        </div>
                        {formData.reference && (
                          <div className={styles.detailRow}>
                            <span>Reference:</span>
                            <strong>{formData.reference}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Show API Response if there's an error */}
                  {submitResponse && !submitResponse.success && (
                    <div className={styles.errorAlert}>
                      <div className={styles.errorIcon}>⚠️</div>
                      <div>
                        <strong>Error:</strong> {submitResponse.error}
                        {submitResponse.missingFields && submitResponse.missingFields.length > 0 && (
                          <>
                            <br />
                            <strong>Missing fields:</strong> {submitResponse.missingFields.join(', ')}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={styles.complianceSection}>
                    <h3>Compliance & Legal</h3>
                    <div className={styles.complianceNotice}>
                      <input 
                        type="checkbox"
                        id="compliance"
                        checked={formData.complianceAccepted}
                        onChange={(e) => handleInputChange("complianceAccepted", e.target.checked)}
                        className={getFieldError('compliance') ? styles.error : ''}
                      />
                      <label htmlFor="compliance">
                        I confirm that:
                        <ul>
                          <li>The information provided is accurate and complete</li>
                          <li>I comply with all applicable laws and regulations regarding international money transfers</li>
                          <li>The funds are not derived from illegal activities</li>
                          <li>I understand that providing false information is a criminal offense</li>
                          <li>I accept the terms and conditions of this transfer</li>
                        </ul>
                      </label>
                    </div>
                    {getFieldError('compliance') && (
                      <span className={styles.errorMessage}>{getFieldError('compliance')}</span>
                    )}
                  </div>

                  <div className={styles.formActions}>
                    <button 
                      className={styles.btnSecondary}
                      onClick={handlePreviousStep}
                      disabled={loading}
                    >
                      Back
                    </button>
                    <button 
                      className={styles.btnPrimary}
                      onClick={handleSubmit}
                      disabled={loading || !formData.complianceAccepted}
                    >
                      {loading ? (
                        <>
                          <span className={styles.spinner}></span>
                          Processing Transfer...
                        </>
                      ) : (
                        "Confirm & Send Transfer"
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Success/Failure */}
              {currentStep === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={styles.successContent}
                >
                  <div className={styles.successIcon}>
                    {submitResponse?.success ? '✅' : '❌'}
                  </div>
                  <h2 className={styles.successTitle}>
                    {submitResponse?.success ? 'Transfer Initiated Successfully!' : 'Transfer Failed'}
                  </h2>
                  <p className={styles.successMessage}>
                    {submitResponse?.success ? (
                      <>
                        Your international transfer of {formatCurrency(parseFloat(formData.amount), formData.sourceCurrency)} to{' '}
                        {formData.recipientName} has been {submitResponse.transfer?.status === 'completed' ? 'completed' : 'initiated'}.
                      </>
                    ) : (
                      <>
                        We couldn't process your transfer at this time. {submitResponse?.details || submitResponse?.error}
                      </>
                    )}
                  </p>

                  {submitResponse?.success && (
                    <>
                      <div className={styles.referenceNumber}>
                        <span>Reference Number:</span>
                        <strong>{submitResponse.transferReference || `INT${Date.now()}`}</strong>
                      </div>

                      <div className={styles.transferSummarySuccess}>
                        <h3>Transfer Details</h3>
                        <div className={styles.summaryGrid}>
                          <div className={styles.summaryItem}>
                            <span>From Account:</span>
                            <strong>{formData.fromAccount.charAt(0).toUpperCase() + formData.fromAccount.slice(1)}</strong>
                          </div>
                          <div className={styles.summaryItem}>
                            <span>Amount Sent:</span>
                            <strong>{formatCurrency(calculateTotal.sourceAmount, formData.sourceCurrency)}</strong>
                          </div>
                          <div className={styles.summaryItem}>
                            <span>Transfer Fee:</span>
                            <strong>{formatCurrency(calculateTotal.fee, formData.sourceCurrency)}</strong>
                          </div>
                          <div className={styles.summaryItem}>
                            <span>Total Debited:</span>
                            <strong>{formatCurrency(calculateTotal.totalDebit, formData.sourceCurrency)}</strong>
                          </div>
                          <div className={styles.summaryItem}>
                            <span>Exchange Rate:</span>
                            <strong>1 {formData.sourceCurrency} = {getCurrentExchangeRate().toFixed(4)} {formData.targetCurrency}</strong>
                          </div>
                          <div className={styles.summaryItem}>
                            <span>Recipient Gets:</span>
                            <strong>{formatCurrency(calculateTotal.estimatedReceive, formData.targetCurrency)}</strong>
                          </div>
                          <div className={styles.summaryItem}>
                            <span>New Balance:</span>
                            <strong>{formatCurrency(submitResponse.newBalance || 0, formData.sourceCurrency)}</strong>
                          </div>
                          <div className={styles.summaryItem}>
                            <span>Status:</span>
                            <strong className={styles.statusBadge}>
                              {submitResponse.transfer?.status === 'completed' ? '✅ Completed' : '⏳ Processing'}
                            </strong>
                          </div>
                          <div className={styles.summaryItem}>
                            <span>Estimated Arrival:</span>
                            <strong>{submitResponse.transfer?.estimatedCompletion || TRANSFER_SPEEDS.find(s => s.id === formData.transferSpeed)?.time}</strong>
                          </div>
                        </div>
                      </div>

                      <div className={styles.nextSteps}>
                        <h3>What Happens Next?</h3>
                        <div className={styles.timeline}>
                          <div className={styles.timelineItem}>
                            <div className={styles.timelineIcon}>✅</div>
                            <div className={styles.timelineContent}>
                              <strong>Transfer Initiated</strong>
                              <p>Funds have been debited from your account</p>
                            </div>
                          </div>
                          <div className={styles.timelineItem}>
                            <div className={styles.timelineIcon}>📧</div>
                            <div className={styles.timelineContent}>
                              <strong>Confirmation Email</strong>
                              <p>You'll receive a detailed receipt shortly</p>
                            </div>
                          </div>
                          <div className={styles.timelineItem}>
                            <div className={styles.timelineIcon}>🏦</div>
                            <div className={styles.timelineContent}>
                              <strong>Processing</strong>
                              <p>Transfer is being processed through SWIFT network</p>
                            </div>
                          </div>
                          <div className={styles.timelineItem}>
                            <div className={styles.timelineIcon}>🔔</div>
                            <div className={styles.timelineContent}>
                              <strong>Recipient Notification</strong>
                              <p>Recipient will be notified when funds arrive</p>
                            </div>
                          </div>
                          <div className={styles.timelineItem}>
                            <div className={styles.timelineIcon}>💰</div>
                            <div className={styles.timelineContent}>
                              <strong>Completion</strong>
                              <p>Funds will be available within {TRANSFER_SPEEDS.find(s => s.id === formData.transferSpeed)?.time}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={styles.trackingInfo}>
                        <h3>Track Your Transfer</h3>
                        <p>You can track the status of your transfer anytime using the reference number above.</p>
                        <button 
                          className={styles.trackButton}
                          onClick={() => router.push('/transactions')}
                        >
                          📊 Track Transfer Status
                        </button>
                      </div>
                    </>
                  )}

                  {!submitResponse?.success && (
                    <div className={styles.errorDetails}>
                      <h3>Error Details</h3>
                      <div className={styles.errorContent}>
                        <p><strong>Error Code:</strong> {submitResponse?.error || 'TRANSFER_FAILED'}</p>
                        <p><strong>Details:</strong> {submitResponse?.details || 'Please check your information and try again.'}</p>
                        {submitResponse?.missingFields && submitResponse.missingFields.length > 0 && (
                          <p><strong>Missing Fields:</strong> {submitResponse.missingFields.join(', ')}</p>
                        )}
                      </div>
                      <div className={styles.errorActions}>
                        <button 
                          className={styles.btnSecondary}
                          onClick={() => setCurrentStep(4)}
                        >
                          Go Back & Edit
                        </button>
                        <button className={styles.btnPrimary}>
                          Contact Support
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={styles.successActions}>
                    {submitResponse?.success && (
                      <>
                        <button 
                          className={styles.btnSecondary}
                          onClick={() => window.print()}
                        >
                          🖨️ Print Receipt
                        </button>
                        <button 
                          className={styles.btnSecondary}
                          onClick={() => {
                            // Download receipt logic
                            // Destructure to exclude reference from formData
                            const { reference: oldRef, ...formDataWithoutRef } = formData;
                            const receipt = {
                              reference: submitResponse.transferReference, // Use the actual transfer reference
                              date: new Date().toISOString(),
                              ...formDataWithoutRef,
                              ...calculateTotal
                            };
                            const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `transfer-${submitResponse.transferReference}.json`;
                            a.click();
                          }}
                        >
                          📥 Download Receipt
                        </button>
                      </>
                    )}
                    <button 
                      className={styles.btnPrimary}
                      onClick={() => {
                        if (submitResponse?.success) {
                          // Reset form for new transfer
                          setFormData({
                            fromAccount: "checking",
                            amount: "",
                            sourceCurrency: "USD",
                            targetCurrency: "EUR",
                            recipientName: "",
                            recipientEmail: "",
                            recipientPhone: "",
                            recipientAddress: "",
                            recipientCity: "",
                            recipientCountry: "",
                            recipientPostalCode: "",
                            recipientState: "",
                            bankName: "",
                            iban: "",
                            swiftBic: "",
                            sortCode: "",
                            routingNumber: "",
                            accountNumber: "",
                            bankAddress: "",
                            bankCity: "",
                            bankCountry: "",
                            purpose: "",
                            reference: "",
                            transferSpeed: "standard",
                            sourceOfFunds: "",
                            relationship: "",
                            complianceAccepted: false,
                            intermediaryBank: "",
                            intermediarySwift: "",
                            saveAsTemplate: false,
                            templateName: ""
                          });
                          setCurrentStep(1);
                          setSubmitResponse(null);
                        } else {
                          router.push('/dashboard');
                        }
                      }}
                    >
                      {submitResponse?.success ? 'Make Another Transfer' : 'Back to Dashboard'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar */}
          {currentStep < 5 && (
            <div className={styles.infoSidebar}>
              {/* Exchange Rates Card */}
              <div className={styles.exchangeRateCard}>
                <h3>Live Exchange Rates</h3>
                {isRateLoading ? (
                  <div className={styles.rateLoading}>
                    <span className={styles.spinner}></span>
                    Updating rates...
                  </div>
                ) : (
                  <>
                    <div className={styles.ratesList}>
                      {exchangeRates.slice(0, 6).map((rate) => (
                        <div key={`${rate.from}-${rate.to}`} className={styles.rateItem}>
                          <span>{rate.from} → {rate.to}</span>
                          <div className={styles.rateValue}>
                            <strong>{rate.rate.toFixed(4)}</strong>
                            {rate.trend && (
                              <span className={`${styles.rateTrend} ${styles[rate.trend]}`}>
                                {rate.trend === 'up' ? '↑' : rate.trend === 'down' ? '↓' : '→'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className={styles.rateNote}>
                      Last updated: {exchangeRates[0]?.lastUpdated.toLocaleTimeString()}
                    </p>
                  </>
                )}
              </div>

              {/* Transfer Calculator */}
              {currentStep === 1 && formData.amount && (
                <div className={styles.calculatorCard}>
                  <h3>Transfer Calculator</h3>
                  <div className={styles.calculatorDetails}>
                    <div className={styles.calcRow}>
                      <span>Send Amount:</span>
                      <strong>{formatCurrency(calculateTotal.sourceAmount, formData.sourceCurrency)}</strong>
                    </div>
                    <div className={styles.calcRow}>
                      <span>Transfer Fee:</span>
                      <strong>{formatCurrency(calculateTotal.fee, formData.sourceCurrency)}</strong>
                    </div>
                    <div className={styles.calcRow}>
                      <span>Exchange Rate:</span>
                      <strong>{getCurrentExchangeRate().toFixed(4)}</strong>
                    </div>
                    <div className={styles.calcRow}>
                      <span>FX Margin (0.2%):</span>
                      <strong>-{formatCurrency(calculateTotal.convertedAmount * 0.002, formData.targetCurrency)}</strong>
                    </div>
                    <div className={`${styles.calcRow} ${styles.total}`}>
                      <span>Recipient Gets:</span>
                      <strong>{formatCurrency(calculateTotal.estimatedReceive, formData.targetCurrency)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Support Card */}
              <div className={styles.supportCard}>
                <h3>Need Help?</h3>
                <p>Our international transfer specialists are here to help</p>
                <button className={styles.supportButton}>
                  💬 Start Live Chat
                </button>
                <div className={styles.supportContact}>
                  <span>Or call:</span>
                  <strong>1-800-HORIZON</strong>
                </div>
                <div className={styles.supportHours}>
                  <span>Available 24/7</span>
                </div>
              </div>

              {/* Security Card */}
              <div className={styles.securityCard}>
                <h3>Your Security</h3>
                <ul className={styles.securityList}>
                  <li>
                    <span className={styles.securityIcon}>🔒</span>
                    <span>256-bit SSL encryption</span>
                  </li>
                  <li>
                    <span className={styles.securityIcon}>🛡️</span>
                    <span>24/7 fraud monitoring</span>
                  </li>
                  <li>
                    <span className={styles.securityIcon}>✅</span>
                    <span>Licensed & regulated</span>
                  </li>
                  <li>
                    <span className={styles.securityIcon}>🏦</span>
                    <span>SWIFT network member</span>
                  </li>
                  <li>
                    <span className={styles.securityIcon}>💳</span>
                    <span>PCI DSS compliant</span>
                  </li>
                  <li>
                    <span className={styles.securityIcon}>🔐</span>
                    <span>Multi-factor authentication</span>
                  </li>
                </ul>
              </div>

              {/* Limits Section */}
              <div className={styles.limitsSection}>
                <h3>Transfer Limits</h3>
                <div className={styles.limitsList}>
                  <div className={styles.limitItem}>
                    <span>Minimum:</span>
                    <strong>{formatCurrency(limits.minimum, 'USD')}</strong>
                  </div>
                  <div className={styles.limitItem}>
                    <span>Per Transaction:</span>
                    <strong>{formatCurrency(limits.perTransaction, 'USD')}</strong>
                  </div>
                  <div className={styles.limitItem}>
                    <span>Daily Limit:</span>
                    <strong>{formatCurrency(limits.daily, 'USD')}</strong>
                  </div>
                  <div className={styles.limitItem}>
                    <span>Monthly Limit:</span>
                    <strong>{formatCurrency(limits.monthly, 'USD')}</strong>
                  </div>
                </div>
                <p className={styles.limitNote}>
                  Higher limits available for verified business accounts. 
                  <a href="#" className={styles.limitLink}>Learn more</a>
                </p>
              </div>

              {/* Tips Card */}
              <div className={styles.tipsCard}>
                <h3>Transfer Tips</h3>
                <ul className={styles.tipsList}>
                  <li>Double-check recipient details to avoid delays</li>
                  <li>SWIFT codes are 8-11 characters long</li>
                  <li>IBANs start with a 2-letter country code</li>
                  <li>Include reference for easy identification</li>
                  <li>Business days exclude weekends and holidays</li>
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