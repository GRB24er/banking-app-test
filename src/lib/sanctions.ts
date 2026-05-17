// src/lib/sanctions.ts
//
// Minimal in-memory sanctions screening. NOT a substitute for a real OFAC
// service — we use a small fragment list plus the embargoed-country list
// from countries.ts. Output is one of:
//   hit       → blocking; refuse the transaction outright
//   warning   → enhanced due diligence required (PEP, grey-list, etc.)
//   clear     → proceed normally

export type SanctionsTier = "hit" | "warning" | "clear";

export interface SanctionsResult {
  tier: SanctionsTier;
  reasons: string[];
  matches: { kind: "name" | "country" | "pep"; value: string }[];
}

// OFAC SDN-style fragments. Real production code pulls the daily XML feed;
// for local dev / tests this curated list is enough to exercise the
// blocking path.
const OFAC_NAME_FRAGMENTS = [
  "kim jong un", "vladimir putin", "bashar al-assad", "ayatollah khamenei",
  "lazarus group", "evil corp", "wagner group", "hezbollah",
  "narco cartel", "al-qaeda", "isis", "islamic state",
];

// Politically Exposed Persons — trigger EDD review rather than block.
const PEP_KEYWORDS = [
  "minister", "ambassador", "head of state", "head of government",
  "central bank governor", "supreme court justice", "senator",
];

// Embargoed countries we will never send to.
export const EMBARGOED_COUNTRIES = new Set(["IR", "KP", "SY", "CU", "RU", "BY"]);

// Greylist — heightened review but transfers allowed with EDD surcharge.
export const GREYLIST_COUNTRIES = new Set([
  "AF", "MM", "VE", "ZW", "SD", "SS", "YE", "LY", "SO", "CD", "CF", "PK",
]);

function norm(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").trim();
}

export function screenSanctions(input: {
  name?: string;
  countryCode?: string;
  notes?: string;
}): SanctionsResult {
  const reasons: string[] = [];
  const matches: SanctionsResult["matches"] = [];
  let tier: SanctionsTier = "clear";

  if (input.countryCode) {
    const cc = input.countryCode.toUpperCase();
    if (EMBARGOED_COUNTRIES.has(cc)) {
      tier = "hit";
      reasons.push(`destination ${cc} is embargoed`);
      matches.push({ kind: "country", value: cc });
    } else if (GREYLIST_COUNTRIES.has(cc)) {
      // We're in the `else if` branch — tier is still "clear" here.
      tier = "warning";
      reasons.push(`destination ${cc} requires enhanced due diligence`);
      matches.push({ kind: "country", value: cc });
    }
  }

  const haystack = norm([input.name, input.notes].filter(Boolean).join(" "));
  if (haystack) {
    for (const frag of OFAC_NAME_FRAGMENTS) {
      if (haystack.includes(frag)) {
        tier = "hit";
        reasons.push(`name matches OFAC fragment: "${frag}"`);
        matches.push({ kind: "name", value: frag });
      }
    }
    if (tier !== "hit") {
      for (const kw of PEP_KEYWORDS) {
        if (haystack.includes(kw)) {
          // We've already short-circuited the "hit" case above.
          if ((tier as SanctionsTier) === "clear") tier = "warning";
          reasons.push(`PEP indicator: "${kw}"`);
          matches.push({ kind: "pep", value: kw });
        }
      }
    }
  }

  return { tier, reasons, matches };
}
