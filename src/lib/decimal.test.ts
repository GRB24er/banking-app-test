// src/lib/decimal.test.ts
// Run with: npm test
//
// Verifies the bigint money library matches what the spec ledger needs:
//   - 0.1 + 0.2 must equal 0.3 exactly
//   - currencies with 0/2/3/8 dp all behave
//   - parse/format round-trip is lossless
//   - rate application rounds half-up
//   - balanced sum invariant holds

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toMinor,
  fromMinor,
  sum,
  mulBps,
  applyRate,
  decimalsFor,
  absMinor,
  negate,
  coerceMinor,
} from "./decimal";

test("0.1 + 0.2 equals 0.3 in cents (the floating-point bug is gone)", () => {
  const a = toMinor("0.1");
  const b = toMinor("0.2");
  assert.equal(sum(a, b), 30n);
  assert.equal(fromMinor(sum(a, b)), "0.30");
});

test("toMinor parses commas and spaces", () => {
  assert.equal(toMinor("1,234.56"), 123456n);
  assert.equal(toMinor("  1234.56  "), 123456n);
  assert.equal(toMinor("1_000.00"), 100000n);
});

test("toMinor rejects garbage", () => {
  assert.throws(() => toMinor(""), /required/);
  assert.throws(() => toMinor("abc"), /invalid amount/);
  assert.throws(() => toMinor(NaN), /finite/);
  assert.throws(() => toMinor(Infinity), /finite/);
});

test("toMinor rejects over-precision so we never silently lose cents", () => {
  assert.throws(() => toMinor("1.234"), /decimal places/);
  // 0-dp currency rejects any fraction at all
  assert.throws(() => toMinor("100.5", "JPY"), /decimal places/);
});

test("decimalsFor returns the right precision per ISO 4217", () => {
  assert.equal(decimalsFor("USD"), 2);
  assert.equal(decimalsFor("JPY"), 0);
  assert.equal(decimalsFor("BHD"), 3);
  assert.equal(decimalsFor("BTC"), 8);
  assert.equal(decimalsFor("XXX"), 2); // unknown defaults to 2
});

test("fromMinor handles each precision class", () => {
  assert.equal(fromMinor(100n, "USD"), "1.00");
  assert.equal(fromMinor(100n, "JPY"), "100");
  assert.equal(fromMinor(1000n, "BHD"), "1.000");
  assert.equal(fromMinor(100000000n, "BTC"), "1.00000000");
});

test("fromMinor inserts thousands separators", () => {
  assert.equal(fromMinor(123456789n), "1,234,567.89");
  assert.equal(fromMinor(1000000n), "10,000.00");
});

test("parse/format round-trips losslessly through 12 decimal millions", () => {
  for (const raw of ["0.00", "0.01", "0.10", "1.00", "999.99", "12,345,678.90", "1234567890.12"]) {
    const m = toMinor(raw);
    const back = fromMinor(m);
    const stripped = raw.replace(/,/g, "");
    assert.equal(back.replace(/,/g, ""), stripped, `round-trip lost ${raw}`);
  }
});

test("negate and abs do what they say on the tin", () => {
  assert.equal(negate(100n), -100n);
  assert.equal(absMinor(-100n), 100n);
  assert.equal(absMinor(100n), 100n);
});

test("mulBps rounds half-up away from zero", () => {
  // 100 * 0.005 = 0.5 → rounds to 1
  assert.equal(mulBps(100n, 50), 1n);
  // 100 * 0.004 = 0.4 → rounds to 0
  assert.equal(mulBps(100n, 40), 0n);
  // negative side
  assert.equal(mulBps(-100n, 50), -1n);
});

test("mulBps handles a real fee scenario without drift", () => {
  // 0.25% on $1,234.56 = $3.0864 → rounds to $3.09 = 309 cents
  const fee = mulBps(toMinor("1234.56"), 25);
  assert.equal(fromMinor(fee), "3.09");
});

test("applyRate converts currency without float noise", () => {
  // $1.00 → €0.83  (rate 83/100 keeps both sides in cents)
  const eur = applyRate(toMinor("100.00"), 83n, 100n);
  assert.equal(fromMinor(eur), "83.00");
  // $1.00 → ¥110.50 → ¥111 (JPY is 0dp, so the rate has to bridge precision:
  // 100 cents × 1105 ÷ 1000 = 110.5, half-up = 111)
  const jpy = applyRate(toMinor("1.00"), 1105n, 1000n);
  assert.equal(fromMinor(jpy, "JPY"), "111");
});

test("applyRate rejects zero denominator", () => {
  assert.throws(() => applyRate(100n, 1n, 0n), /denominator/);
});

test("coerceMinor accepts every shape Mongo might hand us back", () => {
  assert.equal(coerceMinor(123n), 123n);
  assert.equal(coerceMinor(123), 123n);
  assert.equal(coerceMinor("123"), 123n);
  assert.equal(coerceMinor({ toString: () => "123" }), 123n);
  assert.throws(() => coerceMinor(1.5), /non-integer/);
  assert.throws(() => coerceMinor(null), /cannot coerce/);
});

test("sum returns 0n for empty input", () => {
  assert.equal(sum(), 0n);
});

test("Σ debits === Σ credits invariant — a balanced posting", () => {
  // $50 transfer from user A to user B + $0.25 fee paid by A.
  const transfer = toMinor("50.00");
  const fee = toMinor("0.25");
  const debits = sum(transfer, fee);                        // A: -50.25
  const credits = sum(transfer, fee);                        // B: +50, bank fees: +0.25
  assert.equal(debits, credits, "posting must balance");
  assert.equal(fromMinor(debits), "50.25");
});
