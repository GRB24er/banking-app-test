// src/lib/bankingCodes.ts
//
// Per-country wire-rail registry + real-world checksum validators.
// Each validator returns `{ valid: true }` or `{ valid: false, reason }`
// so we can show the user exactly what failed.

import { sanctionsTierOf } from "@/lib/countries";

export type WireRail =
  | "FedWire" | "ACH" | "SameDayACH"
  | "SEPA" | "FasterPayments" | "BACS" | "TARGET2"
  | "BECS" | "NEFT" | "RTGS" | "IMPS" | "UPI"
  | "SPEI" | "PIX" | "EFT" | "Zengin" | "CIPS" | "SWIFT";

export interface RailDef {
  rail: WireRail;
  domestic: boolean;
  speed: "instant" | "same_day" | "next_day" | "1-3_days" | "3-5_days";
  feeMinor: bigint;             // base fee in destination minor units
}

// Per-country list of available rails. The first entry is the default.
export const RAILS_BY_COUNTRY: Record<string, RailDef[]> = {
  US: [
    { rail: "FedWire",    domestic: true,  speed: "same_day", feeMinor: 2500n },
    { rail: "SameDayACH", domestic: true,  speed: "same_day", feeMinor: 500n },
    { rail: "ACH",        domestic: true,  speed: "1-3_days", feeMinor: 100n },
    { rail: "SWIFT",      domestic: false, speed: "1-3_days", feeMinor: 4500n },
  ],
  GB: [
    { rail: "FasterPayments", domestic: true,  speed: "instant",  feeMinor: 0n },
    { rail: "BACS",           domestic: true,  speed: "3-5_days", feeMinor: 50n },
    { rail: "SWIFT",          domestic: false, speed: "1-3_days", feeMinor: 1500n },
  ],
  // Eurozone — SEPA covers them all
  ...Object.fromEntries(
    ["AT","BE","CY","EE","FI","FR","DE","GR","IE","IT","LV","LT","LU","MT",
     "NL","PT","SK","SI","ES","HR"].map((c) => [c, [
      { rail: "SEPA",  domestic: true,  speed: "same_day", feeMinor: 0n },
      { rail: "SWIFT", domestic: false, speed: "1-3_days", feeMinor: 1500n },
    ]] satisfies [string, RailDef[]]),
  ),
  AU: [{ rail: "BECS", domestic: true, speed: "same_day", feeMinor: 0n }, { rail: "SWIFT", domestic: false, speed: "1-3_days", feeMinor: 2000n }],
  IN: [
    { rail: "IMPS",  domestic: true,  speed: "instant",  feeMinor: 500n },
    { rail: "NEFT",  domestic: true,  speed: "same_day", feeMinor: 0n },
    { rail: "RTGS",  domestic: true,  speed: "same_day", feeMinor: 2500n },
    { rail: "SWIFT", domestic: false, speed: "1-3_days", feeMinor: 5000n },
  ],
  MX: [{ rail: "SPEI",  domestic: true,  speed: "instant", feeMinor: 0n }, { rail: "SWIFT", domestic: false, speed: "1-3_days", feeMinor: 2500n }],
  BR: [{ rail: "PIX",   domestic: true,  speed: "instant", feeMinor: 0n }, { rail: "SWIFT", domestic: false, speed: "1-3_days", feeMinor: 2500n }],
  CA: [{ rail: "EFT",   domestic: true,  speed: "1-3_days", feeMinor: 100n }, { rail: "SWIFT", domestic: false, speed: "1-3_days", feeMinor: 4500n }],
  JP: [{ rail: "Zengin", domestic: true, speed: "same_day", feeMinor: 30000n }, { rail: "SWIFT", domestic: false, speed: "1-3_days", feeMinor: 200000n }],
  CN: [{ rail: "CIPS",  domestic: true,  speed: "same_day", feeMinor: 0n }, { rail: "SWIFT", domestic: false, speed: "1-3_days", feeMinor: 6000n }],
};

export function railsFor(country: string): RailDef[] {
  return RAILS_BY_COUNTRY[country.toUpperCase()] ?? [
    { rail: "SWIFT", domestic: false, speed: "1-3_days", feeMinor: 4500n },
  ];
}

// ISO 13616 IBAN length per country (most common entries).
export const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28,
  BA: 20, BE: 16, BG: 22, BH: 22, BR: 29, BY: 28,
  CH: 21, CR: 22, CY: 28, CZ: 24,
  DE: 22, DK: 18, DO: 28,
  EE: 20, EG: 29, ES: 24,
  FI: 18, FO: 18, FR: 27,
  GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28,
  HR: 21, HU: 28,
  IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27,
  JO: 30,
  KW: 30, KZ: 20,
  LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21,
  MC: 27, MD: 24, ME: 22, MK: 19, MR: 27, MT: 31, MU: 30,
  NL: 18, NO: 15,
  PK: 24, PL: 28, PS: 29, PT: 25,
  QA: 29,
  RO: 24, RS: 22,
  SA: 24, SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28,
  TL: 23, TN: 24, TR: 26,
  UA: 29,
  VA: 22, VG: 24,
  XK: 20,
};

// ───────────────────────── validators ─────────────────────────────────────
export type V = { valid: true } | { valid: false; reason: string };

// ABA / FedWire routing number — mod-10 checksum.
export function validateABA(raw: string): V {
  const n = String(raw ?? "").replace(/\D/g, "");
  if (n.length !== 9) return { valid: false, reason: "ABA routing must be 9 digits" };
  const d = n.split("").map(Number);
  const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  if (sum === 0 || sum % 10 !== 0) return { valid: false, reason: "ABA checksum failed" };
  return { valid: true };
}

// ISO 13616 IBAN: length-per-country + mod-97 == 1.
export function validateIBAN(raw: string): V {
  const iban = String(raw ?? "").replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
    return { valid: false, reason: "IBAN format invalid" };
  }
  const country = iban.slice(0, 2);
  const expected = IBAN_LENGTHS[country];
  if (expected && iban.length !== expected) {
    return { valid: false, reason: `IBAN length for ${country} must be ${expected}` };
  }
  // Move first four chars to the end, then convert letters to digits (A=10..Z=35).
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged
    .split("")
    .map((c) => (/[A-Z]/.test(c) ? (c.charCodeAt(0) - 55).toString() : c))
    .join("");
  // Mod 97 in chunks (the whole string would overflow Number).
  let rem = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const chunk = (rem.toString() + numeric.slice(i, i + 7));
    rem = Number(chunk) % 97;
  }
  if (rem !== 1) return { valid: false, reason: "IBAN checksum failed" };
  return { valid: true };
}

// UK sort code — 6 digits in any of "12-34-56", "123456", "12 34 56".
export function validateUKSortCode(raw: string): V {
  const n = String(raw ?? "").replace(/[^0-9]/g, "");
  if (n.length !== 6) return { valid: false, reason: "Sort code must be 6 digits" };
  return { valid: true };
}

// AU BSB — 6 digits, optionally hyphenated 123-456.
export function validateBSB(raw: string): V {
  const n = String(raw ?? "").replace(/[^0-9]/g, "");
  if (n.length !== 6) return { valid: false, reason: "BSB must be 6 digits" };
  // First two digits identify the bank; 01-99 are valid.
  if (n.startsWith("00")) return { valid: false, reason: "Invalid BSB bank prefix" };
  return { valid: true };
}

// India IFSC — `^[A-Z]{4}0[A-Z0-9]{6}$`
export function validateIFSC(raw: string): V {
  const s = String(raw ?? "").toUpperCase();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(s)) {
    return { valid: false, reason: "IFSC format: 4 letters + 0 + 6 alphanumeric" };
  }
  return { valid: true };
}

// Mexico CLABE — 18 digits, Banxico mod-10 weighted checksum (3,7,1,...).
export function validateCLABE(raw: string): V {
  const n = String(raw ?? "").replace(/\D/g, "");
  if (n.length !== 18) return { valid: false, reason: "CLABE must be 18 digits" };
  const weights = [3, 7, 1];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const product = Number(n[i]) * weights[i % 3];
    sum += product % 10;
  }
  const check = (10 - (sum % 10)) % 10;
  if (check !== Number(n[17])) return { valid: false, reason: "CLABE checksum failed" };
  return { valid: true };
}

// Canada transit + institution.
export function validateCATransit(transit: string, institution: string): V {
  if (!/^\d{5}$/.test(String(transit ?? ""))) return { valid: false, reason: "Transit must be 5 digits" };
  if (!/^\d{3}$/.test(String(institution ?? ""))) return { valid: false, reason: "Institution must be 3 digits" };
  return { valid: true };
}

// Brazil CPF (11 digits) — two checksum digits.
export function validateCPF(raw: string): V {
  const n = String(raw ?? "").replace(/\D/g, "");
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return { valid: false, reason: "CPF must be 11 unique digits" };
  const calc = (slice: string, factor: number) => {
    let s = 0;
    for (let i = 0; i < slice.length; i++) s += Number(slice[i]) * (factor - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  if (calc(n.slice(0, 9), 10) !== Number(n[9])) return { valid: false, reason: "CPF first check digit failed" };
  if (calc(n.slice(0, 10), 11) !== Number(n[10])) return { valid: false, reason: "CPF second check digit failed" };
  return { valid: true };
}

// Brazil CNPJ (14 digits) — corporate tax ID checksum.
export function validateCNPJ(raw: string): V {
  const n = String(raw ?? "").replace(/\D/g, "");
  if (n.length !== 14 || /^(\d)\1{13}$/.test(n)) return { valid: false, reason: "CNPJ must be 14 unique digits" };
  const calc = (slice: string, weights: number[]) => {
    let s = 0;
    for (let i = 0; i < slice.length; i++) s += Number(slice[i]) * weights[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const w1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  if (calc(n.slice(0, 12), w1) !== Number(n[12])) return { valid: false, reason: "CNPJ first check digit failed" };
  if (calc(n.slice(0, 13), w2) !== Number(n[13])) return { valid: false, reason: "CNPJ second check digit failed" };
  return { valid: true };
}

// SWIFT / BIC — 8 or 11 chars: 4 letters + 2 letters (country) + 2 alnum + optional 3 alnum branch.
export function validateSWIFT(raw: string): V {
  const s = String(raw ?? "").toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(s)) {
    return { valid: false, reason: "SWIFT/BIC must be 8 or 11 chars" };
  }
  return { valid: true };
}

// RBI purpose codes for inbound INR remittances (subset).
export const RBI_PURPOSE_CODES = new Set([
  "P0801","P0802","P0803","P0805","P0806",            // family maintenance / gifts
  "P1006","P1007","P1008",                              // travel
  "P0301","P0302",                                      // services
  "S0301","S0302",                                      // education
]);
export function validateRBIPurpose(code: string): V {
  return RBI_PURPOSE_CODES.has(String(code ?? "").toUpperCase().trim())
    ? { valid: true }
    : { valid: false, reason: "Invalid RBI purpose code" };
}

// Pre-flight check: is this destination allowed to receive at all?
export function preflightDestination(country: string): V {
  const tier = sanctionsTierOf(country);
  if (tier === "embargo") return { valid: false, reason: `Destination ${country} is embargoed` };
  return { valid: true };
}
