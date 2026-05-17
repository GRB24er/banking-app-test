// src/lib/crypto.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  encryptPII, decryptPII, isEncrypted, searchHash,
  maskAccountNumber, maskEmail, maskSSN, maskPhone,
} from "./crypto";

test("encryptPII → decryptPII round-trips", () => {
  const plain = "Jane Doe, 123 Main St, SSN 123-45-6789";
  const ct = encryptPII(plain);
  assert.equal(decryptPII(ct), plain);
});

test("ciphertexts are non-deterministic (random IV)", () => {
  assert.notEqual(encryptPII("same input"), encryptPII("same input"));
});

test("ciphertext carries v1 prefix", () => {
  const ct = encryptPII("x");
  assert.match(ct, /^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
});

test("isEncrypted recognises versioned ciphertext", () => {
  assert.equal(isEncrypted(encryptPII("x")), true);
  assert.equal(isEncrypted("plain text"), false);
  assert.equal(isEncrypted(""), false);
});

test("tampered ciphertext fails to decrypt (GCM auth tag works)", () => {
  const ct = encryptPII("secret");
  const parts = ct.split(":");
  // Flip a bit in the ciphertext body.
  parts[3] = parts[3].replace(/^[0-9a-f]/, (c) => (c === "0" ? "f" : "0"));
  assert.throws(() => decryptPII(parts.join(":")));
});

test("searchHash is deterministic for same input", () => {
  assert.equal(searchHash("hello"), searchHash("hello"));
});

test("searchHash is case- and whitespace-insensitive", () => {
  assert.equal(searchHash("  HELLO  "), searchHash("hello"));
});

test("masking helpers", () => {
  assert.equal(maskAccountNumber("1234567890"), "••••••7890");
  assert.equal(maskEmail("alice@example.com"), "al•••@example.com");
  assert.equal(maskSSN("123-45-6789"), "•••-••-6789");
  assert.equal(maskPhone("+1 (415) 555-1234"), "•••••••1234");
});
