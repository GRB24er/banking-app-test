// src/lib/bankingCodes.test.ts — 20 validator tests
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateABA, validateIBAN, validateUKSortCode, validateBSB,
  validateIFSC, validateCLABE, validateCATransit, validateCPF,
  validateCNPJ, validateSWIFT, validateRBIPurpose, preflightDestination,
  railsFor,
} from "./bankingCodes";

test("ABA: real Bank of America routing passes", () => {
  assert.equal(validateABA("026009593").valid, true);
});
test("ABA: bad checksum fails", () => {
  const r = validateABA("026009594");
  assert.equal(r.valid, false);
});
test("ABA: wrong length fails", () => {
  assert.equal(validateABA("12345").valid, false);
});

test("IBAN: real GB IBAN passes mod-97", () => {
  // RBOS example from the IBAN registry
  assert.equal(validateIBAN("GB29 NWBK 6016 1331 9268 19").valid, true);
});
test("IBAN: wrong length for country fails", () => {
  // GB IBAN must be 22 chars
  const r = validateIBAN("GB29NWBK60161331926");
  assert.equal(r.valid, false);
});
test("IBAN: DE IBAN passes", () => {
  assert.equal(validateIBAN("DE89 3704 0044 0532 0130 00").valid, true);
});
test("IBAN: bad checksum fails", () => {
  const r = validateIBAN("DE89370400440532013099");
  assert.equal(r.valid, false);
});

test("UK sort code: hyphenated 12-34-56 passes", () => {
  assert.equal(validateUKSortCode("12-34-56").valid, true);
});
test("UK sort code: 5 digits fails", () => {
  assert.equal(validateUKSortCode("12345").valid, false);
});

test("BSB: 062-000 passes (real CBA branch prefix)", () => {
  assert.equal(validateBSB("062-000").valid, true);
});
test("BSB: 00xxxx fails (invalid bank prefix)", () => {
  assert.equal(validateBSB("00-1234").valid, false);
});

test("IFSC: HDFC0001234 passes", () => {
  assert.equal(validateIFSC("HDFC0001234").valid, true);
});
test("IFSC: wrong 5th char fails", () => {
  assert.equal(validateIFSC("HDFCX001234").valid, false);
});

test("CLABE: 002010077777777771 passes Banxico checksum", () => {
  // Banxico published example
  assert.equal(validateCLABE("002010077777777771").valid, true);
});
test("CLABE: bad checksum fails", () => {
  assert.equal(validateCLABE("002010077777777772").valid, false);
});

test("CA transit/institution: 12345/001 passes", () => {
  assert.equal(validateCATransit("12345", "001").valid, true);
});

test("CPF: real valid CPF passes", () => {
  // 111.444.777-35 — a published example with valid check digits
  assert.equal(validateCPF("11144477735").valid, true);
});
test("CPF: all-same-digit string fails", () => {
  assert.equal(validateCPF("11111111111").valid, false);
});

test("CNPJ: 11.222.333/0001-81 passes", () => {
  assert.equal(validateCNPJ("11222333000181").valid, true);
});

test("SWIFT: 8-char BIC passes", () => {
  assert.equal(validateSWIFT("DEUTDEFF").valid, true);
});
test("SWIFT: 11-char BIC with branch passes", () => {
  assert.equal(validateSWIFT("DEUTDEFF500").valid, true);
});

test("RBI purpose: P0801 (family maintenance) passes", () => {
  assert.equal(validateRBIPurpose("P0801").valid, true);
});

test("preflight: embargoed IR is rejected", () => {
  assert.equal(preflightDestination("IR").valid, false);
});
test("preflight: non-embargoed US is allowed", () => {
  assert.equal(preflightDestination("US").valid, true);
});

test("railsFor: US returns FedWire first", () => {
  const r = railsFor("US");
  assert.equal(r[0].rail, "FedWire");
});
test("railsFor: IN returns IMPS first (instant)", () => {
  const r = railsFor("IN");
  assert.equal(r[0].rail, "IMPS");
  assert.equal(r[0].speed, "instant");
});
test("railsFor: unknown country falls back to SWIFT", () => {
  const r = railsFor("ZZ");
  assert.equal(r[0].rail, "SWIFT");
});
