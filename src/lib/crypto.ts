// src/lib/crypto.ts
//
// AES-256-GCM PII encryption with versioned ciphertext + HMAC search-hash.
//
// Format: "v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
//
// The key is read from PII_ENCRYPTION_KEY (32 raw bytes, hex or base64). For
// dev convenience we derive a deterministic dev-only key from NEXTAUTH_SECRET
// if the production var is missing — log a warning so it's never silently
// used in prod.

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
} from "crypto";
import { log } from "@/lib/logger";

const VERSION = "v1";
const ALGO = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12; // GCM standard

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (raw) {
    const buf =
      raw.length === KEY_LENGTH * 2 ? Buffer.from(raw, "hex")
      : raw.length === Math.ceil((KEY_LENGTH * 4) / 3) ? Buffer.from(raw, "base64")
      : Buffer.from(raw, "utf8");
    if (buf.length !== KEY_LENGTH) {
      throw new Error(`PII_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes`);
    }
    cachedKey = buf;
    return buf;
  }
  const fallback = process.env.NEXTAUTH_SECRET || "dev-only-insecure-key";
  log.warn("PII_ENCRYPTION_KEY missing — deriving dev key from NEXTAUTH_SECRET");
  cachedKey = scryptSync(fallback, "pii-derive-salt", KEY_LENGTH);
  return cachedKey;
}

let cachedHmacKey: Buffer | null = null;
function loadHmacKey(): Buffer {
  if (cachedHmacKey) return cachedHmacKey;
  const raw = process.env.PII_HMAC_KEY;
  if (raw) {
    cachedHmacKey = Buffer.from(raw, raw.length === 64 ? "hex" : "utf8");
    return cachedHmacKey;
  }
  // Derive from the encryption key; deterministic per env.
  cachedHmacKey = scryptSync(loadKey(), "hmac-salt", 32);
  return cachedHmacKey;
}

// ────────────────────────────── encryption ────────────────────────────────
export function encryptPII(plaintext: string): string {
  if (plaintext == null) throw new Error("plaintext required");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, loadKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(":");
}

export function decryptPII(ciphertext: string): string {
  if (!ciphertext) throw new Error("ciphertext required");
  const parts = ciphertext.split(":");
  if (parts.length !== 4) throw new Error("malformed ciphertext");
  const [version, ivHex, tagHex, encHex] = parts;
  if (version !== VERSION) throw new Error(`unsupported ciphertext version: ${version}`);
  const decipher = createDecipheriv(ALGO, loadKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(encHex, "hex")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

// True if a string looks like a v1 ciphertext (cheap heuristic for callers).
export function isEncrypted(v: string | null | undefined): boolean {
  return typeof v === "string" && /^v\d+:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(v);
}

// ────────────────────────────── search hash ───────────────────────────────
// HMAC-SHA256 — deterministic per (key, input). Use for indexed lookups
// over encrypted columns (e.g. find a user by SSN).
export function searchHash(plaintext: string): string {
  return createHmac("sha256", loadHmacKey()).update(plaintext.trim().toLowerCase()).digest("hex");
}

// ────────────────────────────── masking ───────────────────────────────────
// Display-only masking. Never use the masked value as an identifier.
export function maskAccountNumber(s: string): string {
  if (!s) return "";
  const clean = s.replace(/\s+/g, "");
  if (clean.length <= 4) return "•".repeat(clean.length);
  return "•".repeat(Math.max(0, clean.length - 4)) + clean.slice(-4);
}

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}${"•".repeat(Math.max(1, local.length - head.length))}@${domain}`;
}

export function maskSSN(ssn: string): string {
  const digits = ssn.replace(/\D/g, "");
  if (digits.length < 4) return "•".repeat(digits.length);
  return "•••-••-" + digits.slice(-4);
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return "•".repeat(digits.length - 4) + digits.slice(-4);
}
