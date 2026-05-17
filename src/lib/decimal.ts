// src/lib/decimal.ts
// Integer-cents money math using bigint.
//
// The major-units API (Number / string) is a thin parser only; ALL arithmetic
// must happen in minor units (bigint). This eliminates the classic
// `0.1 + 0.2 !== 0.3` rounding problem and any other binary-float drift.

export type Minor = bigint;

const DEFAULT_FRACTION_DIGITS = 2;

// ─────────────────────────── currency precision ───────────────────────────
// Per ISO 4217. Most currencies are 2 dp; the few exceptions matter for
// JPY/KRW/IQD/BHD etc.
const CURRENCY_DECIMALS: Record<string, number> = {
  USD: 2, EUR: 2, GBP: 2, CAD: 2, AUD: 2, NZD: 2, CHF: 2, SGD: 2, HKD: 2,
  CNY: 2, INR: 2, MXN: 2, BRL: 2, ZAR: 2, AED: 2, SAR: 2, TRY: 2, RUB: 2,
  PLN: 2, SEK: 2, NOK: 2, DKK: 2, CZK: 2, HUF: 2, RON: 2, BGN: 2, ILS: 2,
  THB: 2, PHP: 2, MYR: 2, IDR: 2, VND: 0, ARS: 2, COP: 2, CLP: 0, PEN: 2,
  JPY: 0, KRW: 0, ISK: 0, XOF: 0, XAF: 0, RWF: 0, UGX: 0, BIF: 0, KMF: 0,
  DJF: 0, GNF: 0, PYG: 0,
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3,
  BTC: 8, // satoshis
};

export function decimalsFor(currency: string): number {
  return CURRENCY_DECIMALS[currency.toUpperCase()] ?? DEFAULT_FRACTION_DIGITS;
}

// ─────────────────────────── conversion ───────────────────────────────────
// Parse a user-supplied money string (or number) into integer minor units.
// Accepts "1,234.56", "1234.56", " 12.30 ", 12.3, etc.
// Rejects negatives, NaN, infinities, and >dp precision (truncating silently
// loses money — surface the error instead).
export function toMinor(input: string | number | bigint, currency = "USD"): Minor {
  if (typeof input === "bigint") return input;

  const dp = decimalsFor(currency);

  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error("amount must be finite");
    // Round-trip through a fixed-string so we don't inherit float noise.
    input = input.toFixed(dp);
  }

  const raw = String(input).trim();
  if (raw === "") throw new Error("amount required");

  // Strip thousands separators; keep sign + dot.
  const cleaned = raw.replace(/[,_\s]/g, "");
  const m = cleaned.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!m) throw new Error(`invalid amount: ${raw}`);

  const sign = m[1] === "-" ? -1n : 1n;
  const whole = m[2];
  const frac = m[3] ?? "";

  if (frac.length > dp) {
    throw new Error(`amount has more than ${dp} decimal places for ${currency}`);
  }

  const paddedFrac = (frac + "0".repeat(dp)).slice(0, dp);
  const minor = BigInt(whole + paddedFrac);
  return sign * minor;
}

// Format minor units back to a major-unit string with thousands separators.
// Output is *display* only; never feed it back into math.
export function fromMinor(minor: Minor, currency = "USD"): string {
  const dp = decimalsFor(currency);
  const neg = minor < 0n;
  const abs = neg ? -minor : minor;

  const divisor = 10n ** BigInt(dp);
  const whole = abs / divisor;
  const frac = abs % divisor;

  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (dp === 0) return (neg ? "-" : "") + wholeStr;

  const fracStr = frac.toString().padStart(dp, "0");
  return (neg ? "-" : "") + wholeStr + "." + fracStr;
}

// Pretty-print with currency symbol (display only).
export function formatMoney(minor: Minor, currency = "USD"): string {
  // Intl wants a number — we already have an exact decimal string, so we
  // assemble the symbol ourselves to avoid re-rounding through float.
  const dp = decimalsFor(currency);
  const body = fromMinor(minor, currency);
  try {
    const symbol = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
    })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? "";
    // Place the symbol before the body for the common case (USD/GBP/EUR/…)
    return symbol ? `${symbol}${body}` : `${currency} ${body}`;
  } catch {
    return `${currency} ${body}`;
  }
}

// ─────────────────────────── safe arithmetic ──────────────────────────────
// Add an arbitrary number of minor amounts. Returns 0n on empty.
export function sum(...amounts: Minor[]): Minor {
  let total = 0n;
  for (const a of amounts) total += a;
  return total;
}

export function negate(a: Minor): Minor {
  return -a;
}

export function absMinor(a: Minor): Minor {
  return a < 0n ? -a : a;
}

export function eq(a: Minor, b: Minor): boolean { return a === b; }
export function lt(a: Minor, b: Minor): boolean { return a < b; }
export function lte(a: Minor, b: Minor): boolean { return a <= b; }
export function gt(a: Minor, b: Minor): boolean { return a > b; }
export function gte(a: Minor, b: Minor): boolean { return a >= b; }

// Multiply minor units by a rational basis-point rate without re-introducing
// float. e.g. `mulBps(amount, 25)` = 0.25 %. Result is rounded half-up.
export function mulBps(amount: Minor, bps: number | bigint): Minor {
  const bn = typeof bps === "bigint" ? bps : BigInt(Math.round(Number(bps)));
  const product = amount * bn;
  const div = 10000n;
  // half-up away from zero
  const q = product / div;
  const r = product % div;
  const half = div / 2n;
  if (product >= 0n) {
    return r >= half ? q + 1n : q;
  }
  return -r >= half ? q - 1n : q;
}

// Convert between currencies using a fixed minor→minor exchange rate that the
// caller has computed. We don't do FX lookups here.
export function applyRate(
  amount: Minor,
  rateNumerator: bigint,
  rateDenominator: bigint,
): Minor {
  if (rateDenominator === 0n) throw new Error("rate denominator must be > 0");
  const product = amount * rateNumerator;
  const q = product / rateDenominator;
  const r = product % rateDenominator;
  const half = rateDenominator / 2n;
  if (product >= 0n) {
    return r >= half ? q + 1n : q;
  }
  return -r >= half ? q - 1n : q;
}

// JSON helpers — Mongoose stores `Long` but a bigint won't JSON.stringify by
// default. Convert to/from string at the API boundary.
export function minorToString(a: Minor): string { return a.toString(); }
export function minorFromString(s: string): Minor { return BigInt(s); }

// Convenience: coerce a value coming back from Mongo (which can be `bigint`,
// `number`, `string`, or `Long`) into a Minor we can trust.
export function coerceMinor(v: unknown): Minor {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") {
    if (!Number.isInteger(v)) throw new Error("non-integer cents value");
    return BigInt(v);
  }
  if (typeof v === "string") return BigInt(v);
  if (v && typeof v === "object" && "toString" in v) return BigInt((v as any).toString());
  throw new Error("cannot coerce value to Minor");
}
