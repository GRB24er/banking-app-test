// Shared country / bank-field registry used by international AND wire transfer pages.
// Each country lists which identifiers are needed to execute a payout to that destination.

export interface BankFieldDef {
  id: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  maxLength?: number;
  pattern?: string; // serialized regex (e.g. "^\\d{5}$")
  patternError?: string;
  required?: boolean;
}

export interface Country {
  code: string;
  name: string;
  currency: string;
  emoji?: string;
  phoneCode?: string;
  requiresIBAN: boolean;
  requiresSortCode?: boolean;
  requiresRoutingNumber?: boolean;
  extraFields?: BankFieldDef[];
  bankInfoHint?: string;
}

export type Region =
  | "north_america" | "europe_eea" | "europe_other" | "mena"
  | "africa_sub" | "asia_pacific" | "latin_america" | "oceania";

export type SanctionsTier = "none" | "edd" | "restricted" | "embargo";

// Region + sanctions metadata kept in a parallel map so we don't touch the
// existing COUNTRIES array layout.
const COUNTRY_META: Record<string, { region: Region; sanctionsTier: SanctionsTier }> = {
  // North America
  US: { region: "north_america", sanctionsTier: "none" },
  CA: { region: "north_america", sanctionsTier: "none" },
  MX: { region: "north_america", sanctionsTier: "none" },
  // Eurozone / EEA
  AT: { region: "europe_eea", sanctionsTier: "none" }, BE: { region: "europe_eea", sanctionsTier: "none" },
  CY: { region: "europe_eea", sanctionsTier: "none" }, EE: { region: "europe_eea", sanctionsTier: "none" },
  FI: { region: "europe_eea", sanctionsTier: "none" }, FR: { region: "europe_eea", sanctionsTier: "none" },
  DE: { region: "europe_eea", sanctionsTier: "none" }, GR: { region: "europe_eea", sanctionsTier: "none" },
  IE: { region: "europe_eea", sanctionsTier: "none" }, IT: { region: "europe_eea", sanctionsTier: "none" },
  LV: { region: "europe_eea", sanctionsTier: "none" }, LT: { region: "europe_eea", sanctionsTier: "none" },
  LU: { region: "europe_eea", sanctionsTier: "none" }, MT: { region: "europe_eea", sanctionsTier: "none" },
  NL: { region: "europe_eea", sanctionsTier: "none" }, PT: { region: "europe_eea", sanctionsTier: "none" },
  SK: { region: "europe_eea", sanctionsTier: "none" }, SI: { region: "europe_eea", sanctionsTier: "none" },
  ES: { region: "europe_eea", sanctionsTier: "none" }, GB: { region: "europe_eea", sanctionsTier: "none" },
  CH: { region: "europe_eea", sanctionsTier: "none" }, NO: { region: "europe_eea", sanctionsTier: "none" },
  SE: { region: "europe_eea", sanctionsTier: "none" }, DK: { region: "europe_eea", sanctionsTier: "none" },
  IS: { region: "europe_eea", sanctionsTier: "none" }, PL: { region: "europe_eea", sanctionsTier: "none" },
  CZ: { region: "europe_eea", sanctionsTier: "none" }, HU: { region: "europe_eea", sanctionsTier: "none" },
  RO: { region: "europe_eea", sanctionsTier: "none" }, BG: { region: "europe_eea", sanctionsTier: "none" },
  HR: { region: "europe_eea", sanctionsTier: "none" },
  // Europe other
  RS: { region: "europe_other", sanctionsTier: "edd" },
  UA: { region: "europe_other", sanctionsTier: "edd" },
  TR: { region: "europe_other", sanctionsTier: "edd" },
  RU: { region: "europe_other", sanctionsTier: "embargo" },
  BY: { region: "europe_other", sanctionsTier: "embargo" },
  // MENA
  AE: { region: "mena", sanctionsTier: "none" }, SA: { region: "mena", sanctionsTier: "none" },
  QA: { region: "mena", sanctionsTier: "none" }, KW: { region: "mena", sanctionsTier: "none" },
  BH: { region: "mena", sanctionsTier: "none" }, OM: { region: "mena", sanctionsTier: "none" },
  JO: { region: "mena", sanctionsTier: "none" }, LB: { region: "mena", sanctionsTier: "edd" },
  IL: { region: "mena", sanctionsTier: "none" }, EG: { region: "mena", sanctionsTier: "none" },
  MA: { region: "mena", sanctionsTier: "none" }, TN: { region: "mena", sanctionsTier: "none" },
  DZ: { region: "mena", sanctionsTier: "none" },
  IR: { region: "mena", sanctionsTier: "embargo" }, SY: { region: "mena", sanctionsTier: "embargo" },
  YE: { region: "mena", sanctionsTier: "edd" }, LY: { region: "mena", sanctionsTier: "edd" },
  // Sub-Saharan Africa
  ZA: { region: "africa_sub", sanctionsTier: "none" }, NG: { region: "africa_sub", sanctionsTier: "edd" },
  KE: { region: "africa_sub", sanctionsTier: "none" }, GH: { region: "africa_sub", sanctionsTier: "none" },
  ET: { region: "africa_sub", sanctionsTier: "edd" }, UG: { region: "africa_sub", sanctionsTier: "none" },
  TZ: { region: "africa_sub", sanctionsTier: "none" }, RW: { region: "africa_sub", sanctionsTier: "none" },
  SN: { region: "africa_sub", sanctionsTier: "none" }, CI: { region: "africa_sub", sanctionsTier: "none" },
  CM: { region: "africa_sub", sanctionsTier: "none" },
  SD: { region: "africa_sub", sanctionsTier: "edd" }, SS: { region: "africa_sub", sanctionsTier: "edd" },
  SO: { region: "africa_sub", sanctionsTier: "edd" }, CD: { region: "africa_sub", sanctionsTier: "edd" },
  CF: { region: "africa_sub", sanctionsTier: "edd" }, ZW: { region: "africa_sub", sanctionsTier: "edd" },
  // Asia-Pacific
  AU: { region: "oceania", sanctionsTier: "none" }, NZ: { region: "oceania", sanctionsTier: "none" },
  JP: { region: "asia_pacific", sanctionsTier: "none" }, KR: { region: "asia_pacific", sanctionsTier: "none" },
  CN: { region: "asia_pacific", sanctionsTier: "edd" }, HK: { region: "asia_pacific", sanctionsTier: "none" },
  TW: { region: "asia_pacific", sanctionsTier: "none" }, SG: { region: "asia_pacific", sanctionsTier: "none" },
  MY: { region: "asia_pacific", sanctionsTier: "none" }, TH: { region: "asia_pacific", sanctionsTier: "none" },
  VN: { region: "asia_pacific", sanctionsTier: "none" }, ID: { region: "asia_pacific", sanctionsTier: "none" },
  PH: { region: "asia_pacific", sanctionsTier: "none" }, IN: { region: "asia_pacific", sanctionsTier: "none" },
  PK: { region: "asia_pacific", sanctionsTier: "edd" }, BD: { region: "asia_pacific", sanctionsTier: "none" },
  LK: { region: "asia_pacific", sanctionsTier: "none" }, NP: { region: "asia_pacific", sanctionsTier: "none" },
  KP: { region: "asia_pacific", sanctionsTier: "embargo" }, MM: { region: "asia_pacific", sanctionsTier: "edd" },
  AF: { region: "asia_pacific", sanctionsTier: "edd" },
  // Latin America
  BR: { region: "latin_america", sanctionsTier: "none" }, AR: { region: "latin_america", sanctionsTier: "none" },
  CL: { region: "latin_america", sanctionsTier: "none" }, CO: { region: "latin_america", sanctionsTier: "none" },
  PE: { region: "latin_america", sanctionsTier: "none" }, UY: { region: "latin_america", sanctionsTier: "none" },
  PY: { region: "latin_america", sanctionsTier: "none" }, EC: { region: "latin_america", sanctionsTier: "none" },
  BO: { region: "latin_america", sanctionsTier: "none" }, GT: { region: "latin_america", sanctionsTier: "none" },
  CR: { region: "latin_america", sanctionsTier: "none" }, PA: { region: "latin_america", sanctionsTier: "none" },
  DO: { region: "latin_america", sanctionsTier: "none" },
  VE: { region: "latin_america", sanctionsTier: "edd" }, CU: { region: "latin_america", sanctionsTier: "embargo" },
};

export function regionOf(code: string): Region {
  return COUNTRY_META[code.toUpperCase()]?.region ?? "europe_other";
}

export function sanctionsTierOf(code: string): SanctionsTier {
  return COUNTRY_META[code.toUpperCase()]?.sanctionsTier ?? "none";
}

export function isEmbargoed(code: string): boolean {
  return sanctionsTierOf(code) === "embargo";
}

// ─────────── Reusable bank-field definitions ───────────
export const FIELD_TRANSIT_CA: BankFieldDef = {
  id: "transitNumber",
  label: "Transit Number",
  placeholder: "12345",
  helpText: "5 digits — branch identifier",
  maxLength: 5,
  pattern: "^\\d{5}$",
  patternError: "Transit number must be exactly 5 digits",
  required: true,
};
export const FIELD_INSTITUTION_CA: BankFieldDef = {
  id: "institutionNumber",
  label: "Institution Number",
  placeholder: "001",
  helpText: "3 digits — bank identifier (e.g. 001=BMO, 002=Scotia, 003=RBC, 004=TD, 010=CIBC)",
  maxLength: 3,
  pattern: "^\\d{3}$",
  patternError: "Institution number must be exactly 3 digits",
  required: true,
};
export const FIELD_BSB_AU: BankFieldDef = {
  id: "bsbCode",
  label: "BSB Code",
  placeholder: "123-456",
  helpText: "6 digits (Bank-State-Branch identifier)",
  maxLength: 7,
  pattern: "^\\d{3}-?\\d{3}$",
  patternError: "BSB must be 6 digits, e.g. 123-456",
  required: true,
};
export const FIELD_IFSC_IN: BankFieldDef = {
  id: "ifscCode",
  label: "IFSC Code",
  placeholder: "HDFC0001234",
  helpText: "11 characters — first 4 letters identify the bank, 5th is 0, last 6 identify the branch",
  maxLength: 11,
  pattern: "^[A-Z]{4}0[A-Z0-9]{6}$",
  patternError: "IFSC format: 4 letters + 0 + 6 alphanumeric",
  required: true,
};
export const FIELD_CLABE_MX: BankFieldDef = {
  id: "clabe",
  label: "CLABE",
  placeholder: "012345678901234567",
  helpText: "18 digits — Mexican standardized banking code (preferred over plain account number)",
  maxLength: 18,
  pattern: "^\\d{18}$",
  patternError: "CLABE must be exactly 18 digits",
  required: true,
};
export const FIELD_CBU_AR: BankFieldDef = {
  id: "cbu",
  label: "CBU / CVU",
  placeholder: "1234567890123456789012",
  helpText: "22 digits — Argentine Uniform Bank Code",
  maxLength: 22,
  pattern: "^\\d{22}$",
  patternError: "CBU must be exactly 22 digits",
  required: true,
};
export const FIELD_CUIT_AR: BankFieldDef = {
  id: "cuit",
  label: "CUIT / CUIL",
  placeholder: "20-12345678-9",
  helpText: "Recipient's tax ID (11 digits)",
  maxLength: 13,
  required: true,
};
export const FIELD_AGENCY_BR: BankFieldDef = {
  id: "agencyNumber",
  label: "Agência",
  placeholder: "1234",
  helpText: "Branch (agência) number — usually 4 digits",
  maxLength: 6,
  required: true,
};
export const FIELD_CPF_CNPJ_BR: BankFieldDef = {
  id: "cpfCnpj",
  label: "CPF / CNPJ",
  placeholder: "123.456.789-00",
  helpText: "Recipient's tax ID — CPF (individual, 11 digits) or CNPJ (company, 14 digits)",
  maxLength: 18,
  required: true,
};
export const FIELD_PIX_BR: BankFieldDef = {
  id: "pixKey",
  label: "PIX Key (optional)",
  placeholder: "Email, phone, CPF/CNPJ, or random key",
  helpText: "If recipient has a PIX key, transfer is instant",
  required: false,
};
export const FIELD_RUT_CL: BankFieldDef = {
  id: "rut",
  label: "RUT",
  placeholder: "12.345.678-9",
  helpText: "Recipient's Chilean tax/national ID",
  maxLength: 12,
  required: true,
};
export const FIELD_CCI_PE: BankFieldDef = {
  id: "cci",
  label: "CCI",
  placeholder: "00212345678901234567",
  helpText: "20 digits — Código de Cuenta Interbancario",
  maxLength: 20,
  pattern: "^\\d{20}$",
  patternError: "CCI must be 20 digits",
  required: true,
};
export const FIELD_CNAPS_CN: BankFieldDef = {
  id: "cnaps",
  label: "CNAPS Code",
  placeholder: "123456789012",
  helpText: "12-digit Chinese bank routing code (recommended for CNY transfers)",
  maxLength: 12,
  pattern: "^\\d{12}$",
  patternError: "CNAPS must be 12 digits",
  required: false,
};
export const FIELD_BANK_NAME_CN: BankFieldDef = {
  id: "recipientNameChinese",
  label: "Recipient Name (Chinese characters)",
  placeholder: "张三",
  helpText: "Required by some Chinese banks for CNY transfers",
  required: false,
};
export const FIELD_BANK_CODE_JP: BankFieldDef = {
  id: "bankCode",
  label: "Bank Code",
  placeholder: "0001",
  helpText: "4-digit Japanese bank code (e.g. 0001=Mizuho, 0005=Mitsubishi UFJ)",
  maxLength: 4,
  pattern: "^\\d{4}$",
  patternError: "Bank code must be 4 digits",
  required: true,
};
export const FIELD_BRANCH_CODE_JP: BankFieldDef = {
  id: "branchCode",
  label: "Branch Code",
  placeholder: "001",
  helpText: "3-digit branch code",
  maxLength: 3,
  pattern: "^\\d{3}$",
  patternError: "Branch code must be 3 digits",
  required: true,
};
export const FIELD_ACCOUNT_TYPE_JP: BankFieldDef = {
  id: "accountTypeJP",
  label: "Account Type",
  placeholder: "Futsu (普通) or Touza (当座)",
  helpText: "Futsu = Ordinary/Savings, Touza = Current/Checking",
  required: true,
};
export const FIELD_BANK_CODE_KR: BankFieldDef = {
  id: "bankCode",
  label: "Bank Code",
  placeholder: "088",
  helpText: "3-digit Korean bank code",
  maxLength: 3,
  required: true,
};
export const FIELD_BANK_CODE_HK: BankFieldDef = {
  id: "bankCode",
  label: "Bank Code",
  placeholder: "004",
  helpText: "3-digit Hong Kong bank code (e.g. 004=HSBC, 012=BOC, 024=HSC)",
  maxLength: 3,
  pattern: "^\\d{3}$",
  patternError: "Bank code must be 3 digits",
  required: true,
};
export const FIELD_BRANCH_CODE_HK: BankFieldDef = {
  id: "branchCode",
  label: "Branch Code",
  placeholder: "123",
  helpText: "3-digit branch code",
  maxLength: 3,
  required: true,
};
export const FIELD_NUBAN_NG: BankFieldDef = {
  id: "nuban",
  label: "NUBAN Account Number",
  placeholder: "0123456789",
  helpText: "10-digit Nigerian Uniform Bank Account Number",
  maxLength: 10,
  pattern: "^\\d{10}$",
  patternError: "NUBAN must be exactly 10 digits",
  required: true,
};
export const FIELD_BRANCH_CODE_ZA: BankFieldDef = {
  id: "branchCode",
  label: "Branch Code",
  placeholder: "632005",
  helpText: "6-digit South African universal branch code",
  maxLength: 6,
  pattern: "^\\d{6}$",
  patternError: "Branch code must be 6 digits",
  required: true,
};
export const FIELD_BRANCH_CODE_KE: BankFieldDef = {
  id: "branchCode",
  label: "Branch Code",
  placeholder: "12345",
  helpText: "Bank branch code (3-5 digits)",
  maxLength: 5,
  required: true,
};
export const FIELD_BANK_CODE_KE: BankFieldDef = {
  id: "bankCode",
  label: "Bank Code",
  placeholder: "01",
  helpText: "Kenyan bank code (2 digits)",
  maxLength: 2,
  required: true,
};
export const FIELD_BIK_RU: BankFieldDef = {
  id: "bik",
  label: "BIK",
  placeholder: "044525225",
  helpText: "9-digit Russian bank identifier (БИК)",
  maxLength: 9,
  pattern: "^\\d{9}$",
  patternError: "BIK must be 9 digits",
  required: true,
};
export const FIELD_CORR_ACCOUNT_RU: BankFieldDef = {
  id: "correspondentAccount",
  label: "Correspondent Account",
  placeholder: "30101810400000000225",
  helpText: "20-digit correspondent account",
  maxLength: 20,
  pattern: "^\\d{20}$",
  patternError: "Correspondent account must be 20 digits",
  required: true,
};
export const FIELD_INN_RU: BankFieldDef = {
  id: "inn",
  label: "INN (Tax ID)",
  placeholder: "770123456789",
  helpText: "Russian tax identification number (10 or 12 digits)",
  maxLength: 12,
  required: false,
};
export const FIELD_RIB_MA: BankFieldDef = {
  id: "rib",
  label: "RIB",
  placeholder: "012 345 67890123456789 12",
  helpText: "24-digit Moroccan bank account identifier",
  maxLength: 30,
  required: true,
};
export const FIELD_BD_ROUTING: BankFieldDef = {
  id: "bdRoutingNumber",
  label: "Routing Number",
  placeholder: "020270329",
  helpText: "9-digit Bangladesh Bank routing number",
  maxLength: 9,
  pattern: "^\\d{9}$",
  patternError: "Routing number must be 9 digits",
  required: true,
};
export const FIELD_NZ_ACCOUNT: BankFieldDef = {
  id: "nzAccountFormatted",
  label: "Account Number (formatted)",
  placeholder: "XX-XXXX-XXXXXXX-XXX",
  helpText: "NZ account format: bank-branch-account-suffix",
  maxLength: 20,
  required: true,
};

export const COUNTRIES: Country[] = [
  // ─────────────── North America ───────────────
  { code: "US", name: "United States", currency: "USD", emoji: "🇺🇸", phoneCode: "+1", requiresIBAN: false, requiresRoutingNumber: true,
    bankInfoHint: "ABA Routing Number (9 digits) + Account Number + SWIFT/BIC for international wires." },
  { code: "CA", name: "Canada", currency: "CAD", emoji: "🇨🇦", phoneCode: "+1", requiresIBAN: false,
    extraFields: [FIELD_TRANSIT_CA, FIELD_INSTITUTION_CA],
    bankInfoHint: "Recipient legal name (must match account exactly), full address, bank name & branch address, SWIFT/BIC, transit (5 digits), institution (3 digits), account number." },
  { code: "MX", name: "Mexico", currency: "MXN", emoji: "🇲🇽", phoneCode: "+52", requiresIBAN: false,
    extraFields: [FIELD_CLABE_MX],
    bankInfoHint: "CLABE (18 digits) is preferred — it encodes bank, branch and account together." },

  // ─────────────── Eurozone (IBAN) ───────────────
  { code: "AT", name: "Austria", currency: "EUR", emoji: "🇦🇹", phoneCode: "+43", requiresIBAN: true },
  { code: "BE", name: "Belgium", currency: "EUR", emoji: "🇧🇪", phoneCode: "+32", requiresIBAN: true },
  { code: "CY", name: "Cyprus", currency: "EUR", emoji: "🇨🇾", phoneCode: "+357", requiresIBAN: true },
  { code: "EE", name: "Estonia", currency: "EUR", emoji: "🇪🇪", phoneCode: "+372", requiresIBAN: true },
  { code: "FI", name: "Finland", currency: "EUR", emoji: "🇫🇮", phoneCode: "+358", requiresIBAN: true },
  { code: "FR", name: "France", currency: "EUR", emoji: "🇫🇷", phoneCode: "+33", requiresIBAN: true },
  { code: "DE", name: "Germany", currency: "EUR", emoji: "🇩🇪", phoneCode: "+49", requiresIBAN: true },
  { code: "GR", name: "Greece", currency: "EUR", emoji: "🇬🇷", phoneCode: "+30", requiresIBAN: true },
  { code: "IE", name: "Ireland", currency: "EUR", emoji: "🇮🇪", phoneCode: "+353", requiresIBAN: true },
  { code: "IT", name: "Italy", currency: "EUR", emoji: "🇮🇹", phoneCode: "+39", requiresIBAN: true },
  { code: "LV", name: "Latvia", currency: "EUR", emoji: "🇱🇻", phoneCode: "+371", requiresIBAN: true },
  { code: "LT", name: "Lithuania", currency: "EUR", emoji: "🇱🇹", phoneCode: "+370", requiresIBAN: true },
  { code: "LU", name: "Luxembourg", currency: "EUR", emoji: "🇱🇺", phoneCode: "+352", requiresIBAN: true },
  { code: "MT", name: "Malta", currency: "EUR", emoji: "🇲🇹", phoneCode: "+356", requiresIBAN: true },
  { code: "NL", name: "Netherlands", currency: "EUR", emoji: "🇳🇱", phoneCode: "+31", requiresIBAN: true },
  { code: "PT", name: "Portugal", currency: "EUR", emoji: "🇵🇹", phoneCode: "+351", requiresIBAN: true },
  { code: "SK", name: "Slovakia", currency: "EUR", emoji: "🇸🇰", phoneCode: "+421", requiresIBAN: true },
  { code: "SI", name: "Slovenia", currency: "EUR", emoji: "🇸🇮", phoneCode: "+386", requiresIBAN: true },
  { code: "ES", name: "Spain", currency: "EUR", emoji: "🇪🇸", phoneCode: "+34", requiresIBAN: true },

  // ─────────────── Other Europe ───────────────
  { code: "GB", name: "United Kingdom", currency: "GBP", emoji: "🇬🇧", phoneCode: "+44", requiresIBAN: true, requiresSortCode: true,
    bankInfoHint: "Sort code (6 digits) + 8-digit account number, plus IBAN and SWIFT/BIC for international." },
  { code: "CH", name: "Switzerland", currency: "CHF", emoji: "🇨🇭", phoneCode: "+41", requiresIBAN: true },
  { code: "NO", name: "Norway", currency: "NOK", emoji: "🇳🇴", phoneCode: "+47", requiresIBAN: true },
  { code: "SE", name: "Sweden", currency: "SEK", emoji: "🇸🇪", phoneCode: "+46", requiresIBAN: true },
  { code: "DK", name: "Denmark", currency: "DKK", emoji: "🇩🇰", phoneCode: "+45", requiresIBAN: true },
  { code: "IS", name: "Iceland", currency: "ISK", emoji: "🇮🇸", phoneCode: "+354", requiresIBAN: true },
  { code: "PL", name: "Poland", currency: "PLN", emoji: "🇵🇱", phoneCode: "+48", requiresIBAN: true },
  { code: "CZ", name: "Czech Republic", currency: "CZK", emoji: "🇨🇿", phoneCode: "+420", requiresIBAN: true },
  { code: "HU", name: "Hungary", currency: "HUF", emoji: "🇭🇺", phoneCode: "+36", requiresIBAN: true },
  { code: "RO", name: "Romania", currency: "RON", emoji: "🇷🇴", phoneCode: "+40", requiresIBAN: true },
  { code: "BG", name: "Bulgaria", currency: "BGN", emoji: "🇧🇬", phoneCode: "+359", requiresIBAN: true },
  { code: "HR", name: "Croatia", currency: "EUR", emoji: "🇭🇷", phoneCode: "+385", requiresIBAN: true },
  { code: "RS", name: "Serbia", currency: "RSD", emoji: "🇷🇸", phoneCode: "+381", requiresIBAN: true },
  { code: "UA", name: "Ukraine", currency: "UAH", emoji: "🇺🇦", phoneCode: "+380", requiresIBAN: true },
  { code: "TR", name: "Turkey", currency: "TRY", emoji: "🇹🇷", phoneCode: "+90", requiresIBAN: true },
  { code: "RU", name: "Russia", currency: "RUB", emoji: "🇷🇺", phoneCode: "+7", requiresIBAN: false,
    extraFields: [FIELD_BIK_RU, FIELD_CORR_ACCOUNT_RU, FIELD_INN_RU],
    bankInfoHint: "BIK (9 digits), 20-digit account, 20-digit correspondent account, and (for businesses) INN tax ID." },

  // ─────────────── Middle East / North Africa ───────────────
  { code: "AE", name: "United Arab Emirates", currency: "AED", emoji: "🇦🇪", phoneCode: "+971", requiresIBAN: true },
  { code: "SA", name: "Saudi Arabia", currency: "SAR", emoji: "🇸🇦", phoneCode: "+966", requiresIBAN: true },
  { code: "QA", name: "Qatar", currency: "QAR", emoji: "🇶🇦", phoneCode: "+974", requiresIBAN: true },
  { code: "KW", name: "Kuwait", currency: "KWD", emoji: "🇰🇼", phoneCode: "+965", requiresIBAN: true },
  { code: "BH", name: "Bahrain", currency: "BHD", emoji: "🇧🇭", phoneCode: "+973", requiresIBAN: true },
  { code: "OM", name: "Oman", currency: "OMR", emoji: "🇴🇲", phoneCode: "+968", requiresIBAN: false },
  { code: "JO", name: "Jordan", currency: "JOD", emoji: "🇯🇴", phoneCode: "+962", requiresIBAN: true },
  { code: "LB", name: "Lebanon", currency: "LBP", emoji: "🇱🇧", phoneCode: "+961", requiresIBAN: true },
  { code: "IL", name: "Israel", currency: "ILS", emoji: "🇮🇱", phoneCode: "+972", requiresIBAN: true },
  { code: "EG", name: "Egypt", currency: "EGP", emoji: "🇪🇬", phoneCode: "+20", requiresIBAN: true },
  { code: "MA", name: "Morocco", currency: "MAD", emoji: "🇲🇦", phoneCode: "+212", requiresIBAN: false,
    extraFields: [FIELD_RIB_MA] },
  { code: "TN", name: "Tunisia", currency: "TND", emoji: "🇹🇳", phoneCode: "+216", requiresIBAN: true },
  { code: "DZ", name: "Algeria", currency: "DZD", emoji: "🇩🇿", phoneCode: "+213", requiresIBAN: false },

  // ─────────────── Sub-Saharan Africa ───────────────
  { code: "ZA", name: "South Africa", currency: "ZAR", emoji: "🇿🇦", phoneCode: "+27", requiresIBAN: false,
    extraFields: [FIELD_BRANCH_CODE_ZA],
    bankInfoHint: "Universal branch code is 6 digits — same across the bank. Plus standard account number and SWIFT/BIC." },
  { code: "NG", name: "Nigeria", currency: "NGN", emoji: "🇳🇬", phoneCode: "+234", requiresIBAN: false,
    extraFields: [FIELD_NUBAN_NG],
    bankInfoHint: "NUBAN is the standard 10-digit Nigerian account number. Use it instead of the regular account field." },
  { code: "KE", name: "Kenya", currency: "KES", emoji: "🇰🇪", phoneCode: "+254", requiresIBAN: false,
    extraFields: [FIELD_BANK_CODE_KE, FIELD_BRANCH_CODE_KE] },
  { code: "GH", name: "Ghana", currency: "GHS", emoji: "🇬🇭", phoneCode: "+233", requiresIBAN: false,
    extraFields: [{ ...FIELD_BRANCH_CODE_KE, helpText: "Branch code (4 digits)" }] },
  { code: "ET", name: "Ethiopia", currency: "ETB", emoji: "🇪🇹", phoneCode: "+251", requiresIBAN: false },
  { code: "UG", name: "Uganda", currency: "UGX", emoji: "🇺🇬", phoneCode: "+256", requiresIBAN: false },
  { code: "TZ", name: "Tanzania", currency: "TZS", emoji: "🇹🇿", phoneCode: "+255", requiresIBAN: false },
  { code: "RW", name: "Rwanda", currency: "RWF", emoji: "🇷🇼", phoneCode: "+250", requiresIBAN: false },
  { code: "SN", name: "Senegal", currency: "XOF", emoji: "🇸🇳", phoneCode: "+221", requiresIBAN: true },
  { code: "CI", name: "Côte d'Ivoire", currency: "XOF", emoji: "🇨🇮", phoneCode: "+225", requiresIBAN: true },
  { code: "CM", name: "Cameroon", currency: "XAF", emoji: "🇨🇲", phoneCode: "+237", requiresIBAN: false },

  // ─────────────── Asia–Pacific ───────────────
  { code: "AU", name: "Australia", currency: "AUD", emoji: "🇦🇺", phoneCode: "+61", requiresIBAN: false,
    extraFields: [FIELD_BSB_AU],
    bankInfoHint: "BSB (6 digits, Bank-State-Branch) + account number + SWIFT/BIC." },
  { code: "NZ", name: "New Zealand", currency: "NZD", emoji: "🇳🇿", phoneCode: "+64", requiresIBAN: false,
    extraFields: [FIELD_NZ_ACCOUNT],
    bankInfoHint: "NZ account format is XX-XXXX-XXXXXXX-XXX (bank-branch-account-suffix)." },
  { code: "JP", name: "Japan", currency: "JPY", emoji: "🇯🇵", phoneCode: "+81", requiresIBAN: false,
    extraFields: [FIELD_BANK_CODE_JP, FIELD_BRANCH_CODE_JP, FIELD_ACCOUNT_TYPE_JP],
    bankInfoHint: "Bank code (4 digits) + branch code (3 digits) + account type (Futsu/Touza) + account number (7 digits) + recipient name in katakana if possible." },
  { code: "KR", name: "South Korea", currency: "KRW", emoji: "🇰🇷", phoneCode: "+82", requiresIBAN: false,
    extraFields: [FIELD_BANK_CODE_KR] },
  { code: "CN", name: "China", currency: "CNY", emoji: "🇨🇳", phoneCode: "+86", requiresIBAN: false,
    extraFields: [FIELD_CNAPS_CN, FIELD_BANK_NAME_CN],
    bankInfoHint: "For CNY transfers inside China, the CNAPS code is required. Recipient name in Chinese characters speeds up processing." },
  { code: "HK", name: "Hong Kong", currency: "HKD", emoji: "🇭🇰", phoneCode: "+852", requiresIBAN: false,
    extraFields: [FIELD_BANK_CODE_HK, FIELD_BRANCH_CODE_HK] },
  { code: "TW", name: "Taiwan", currency: "TWD", emoji: "🇹🇼", phoneCode: "+886", requiresIBAN: false },
  { code: "SG", name: "Singapore", currency: "SGD", emoji: "🇸🇬", phoneCode: "+65", requiresIBAN: false,
    bankInfoHint: "Bank code + branch code (often combined as 7 digits) + account number + SWIFT/BIC." },
  { code: "MY", name: "Malaysia", currency: "MYR", emoji: "🇲🇾", phoneCode: "+60", requiresIBAN: false },
  { code: "TH", name: "Thailand", currency: "THB", emoji: "🇹🇭", phoneCode: "+66", requiresIBAN: false },
  { code: "VN", name: "Vietnam", currency: "VND", emoji: "🇻🇳", phoneCode: "+84", requiresIBAN: false },
  { code: "ID", name: "Indonesia", currency: "IDR", emoji: "🇮🇩", phoneCode: "+62", requiresIBAN: false },
  { code: "PH", name: "Philippines", currency: "PHP", emoji: "🇵🇭", phoneCode: "+63", requiresIBAN: false },
  { code: "IN", name: "India", currency: "INR", emoji: "🇮🇳", phoneCode: "+91", requiresIBAN: false,
    extraFields: [FIELD_IFSC_IN],
    bankInfoHint: "IFSC code (11 chars) + account number + SWIFT/BIC. Personal transfers above ₹2.5 lakh need additional KYC." },
  { code: "PK", name: "Pakistan", currency: "PKR", emoji: "🇵🇰", phoneCode: "+92", requiresIBAN: true },
  { code: "BD", name: "Bangladesh", currency: "BDT", emoji: "🇧🇩", phoneCode: "+880", requiresIBAN: false,
    extraFields: [FIELD_BD_ROUTING] },
  { code: "LK", name: "Sri Lanka", currency: "LKR", emoji: "🇱🇰", phoneCode: "+94", requiresIBAN: false },
  { code: "NP", name: "Nepal", currency: "NPR", emoji: "🇳🇵", phoneCode: "+977", requiresIBAN: false },

  // ─────────────── Latin America ───────────────
  { code: "BR", name: "Brazil", currency: "BRL", emoji: "🇧🇷", phoneCode: "+55", requiresIBAN: false,
    extraFields: [FIELD_AGENCY_BR, FIELD_CPF_CNPJ_BR, FIELD_PIX_BR],
    bankInfoHint: "Agência (4 digits) + account + CPF or CNPJ tax ID. PIX key (if available) makes the transfer instant." },
  { code: "AR", name: "Argentina", currency: "ARS", emoji: "🇦🇷", phoneCode: "+54", requiresIBAN: false,
    extraFields: [FIELD_CBU_AR, FIELD_CUIT_AR],
    bankInfoHint: "CBU/CVU (22 digits) and recipient's CUIT/CUIL tax ID." },
  { code: "CL", name: "Chile", currency: "CLP", emoji: "🇨🇱", phoneCode: "+56", requiresIBAN: false,
    extraFields: [FIELD_RUT_CL] },
  { code: "CO", name: "Colombia", currency: "COP", emoji: "🇨🇴", phoneCode: "+57", requiresIBAN: false },
  { code: "PE", name: "Peru", currency: "PEN", emoji: "🇵🇪", phoneCode: "+51", requiresIBAN: false,
    extraFields: [FIELD_CCI_PE] },
  { code: "VE", name: "Venezuela", currency: "VES", emoji: "🇻🇪", phoneCode: "+58", requiresIBAN: false },
  { code: "UY", name: "Uruguay", currency: "UYU", emoji: "🇺🇾", phoneCode: "+598", requiresIBAN: false },
  { code: "PY", name: "Paraguay", currency: "PYG", emoji: "🇵🇾", phoneCode: "+595", requiresIBAN: false },
  { code: "EC", name: "Ecuador", currency: "USD", emoji: "🇪🇨", phoneCode: "+593", requiresIBAN: false },
  { code: "BO", name: "Bolivia", currency: "BOB", emoji: "🇧🇴", phoneCode: "+591", requiresIBAN: false },
  { code: "GT", name: "Guatemala", currency: "GTQ", emoji: "🇬🇹", phoneCode: "+502", requiresIBAN: false },
  { code: "CR", name: "Costa Rica", currency: "CRC", emoji: "🇨🇷", phoneCode: "+506", requiresIBAN: true },
  { code: "PA", name: "Panama", currency: "USD", emoji: "🇵🇦", phoneCode: "+507", requiresIBAN: false },
  { code: "DO", name: "Dominican Republic", currency: "DOP", emoji: "🇩🇴", phoneCode: "+1809", requiresIBAN: false },
];

// Account-substitute fields — countries where these REPLACE a plain account number
export const ACCOUNT_EQUIVALENT_FIELDS = ['clabe', 'nuban', 'cbu', 'nzAccountFormatted', 'rib', 'cci'];

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}

export function getBankFieldsForCountry(code: string): BankFieldDef[] {
  const c = getCountry(code);
  return c?.extraFields || [];
}
