// src/config/brand.ts
// Central brand configuration — single source of truth for all brand-related constants.
// Import and use these values everywhere instead of hardcoding strings.

export const BRAND = {
  // Core Identity
  name: "ZentriBank",
  legalName: "ZentriBank Capital",
  tagline: "Your trusted partner in financial services",
  shortTagline: "Banking Made Simple",

  // Contact
  email: "admin@zentribank.capital",
  supportEmail: "admin@zentribank.capital",
  securityEmail: "admin@zentribank.capital",

  // Address
  address: "100 Wall Street, New York, NY 10005",
  city: "New York",
  state: "NY",
  zip: "10005",
  country: "United States",

  // Regulatory
  fdic: true,
  fdicInsuranceLimit: "$250,000",
  nmls: "NMLS #2024001",
  equalHousing: true,

  // URLs
  website: "https://zentribank.capital",
  privacyUrl: "/privacy",
  termsUrl: "/terms",
  disclosuresUrl: "/disclosures",

  // Social
  twitter: "https://twitter.com/zentribank",
  linkedin: "https://linkedin.com/company/zentribank",
  facebook: "https://facebook.com/zentribank",
  instagram: "https://instagram.com/zentribank",

  // Copyright
  get copyright() {
    return `© ${new Date().getFullYear()} ${this.legalName}. All rights reserved.`;
  },
  get legalLine() {
    return `Member FDIC • ${this.nmls} • Equal Housing Lender`;
  },
} as const;

export default BRAND;
