// src/lib/logger.ts
//
// JSON-line structured logger with automatic PII redaction.
// Use it in routes / libs: `log.info("event", { foo: 1 })`.
//
// Anything in the message or context object that looks like a credit-card
// number, SSN, IBAN, account number, email password field, or known
// sensitive header name is replaced with [REDACTED].

import { randomUUID } from "crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEYS = new Set([
  "password", "newPassword", "currentPassword", "secret", "token",
  "authorization", "cookie", "set-cookie", "sessionToken",
  "ssn", "tin", "ein", "pin", "otp", "code",
  "cardNumber", "cvv", "cvc", "cvv2", "expiry",
  "iban", "accountNumber", "routingNumber",
  "dob", "dateOfBirth", "passportNumber",
]);

const REDACTED = "[REDACTED]";

function redactString(s: string): string {
  // Pan-like 13–19 digit groups; IBANs (2 letters + 13–32 alphanumeric);
  // emails inside free-text get only the local part masked.
  return s
    .replace(/\b\d{13,19}\b/g, REDACTED)
    .replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, REDACTED)
    .replace(/([A-Za-z0-9._%+-]{1,3})[A-Za-z0-9._%+-]+(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, "$1***$2");
}

function redactValue(v: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED;
  if (v == null) return v;
  if (typeof v === "string") return redactString(v);
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return v;
  if (Array.isArray(v)) return v.map((x) => redactValue(x, depth + 1));
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = REDACTED;
      } else {
        out[k] = redactValue(val, depth + 1);
      }
    }
    return out;
  }
  return REDACTED;
}

function emit(level: LogLevel, msg: string, ctx?: Record<string, unknown>) {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg: typeof msg === "string" ? redactString(msg) : msg,
    ...(ctx ? (redactValue(ctx) as Record<string, unknown>) : {}),
  };
  const fn =
    level === "error" ? console.error
    : level === "warn" ? console.warn
    : console.log;
  fn(JSON.stringify(line));
}

export const log = {
  debug: (msg: string, ctx?: Record<string, unknown>) => emit("debug", msg, ctx),
  info:  (msg: string, ctx?: Record<string, unknown>) => emit("info",  msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => emit("warn",  msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit("error", msg, ctx),
  withRequestId: (id?: string) => {
    const reqId = id ?? randomUUID();
    return {
      requestId: reqId,
      info: (msg: string, ctx?: Record<string, unknown>) => emit("info", msg, { ...ctx, requestId: reqId }),
      warn: (msg: string, ctx?: Record<string, unknown>) => emit("warn", msg, { ...ctx, requestId: reqId }),
      error: (msg: string, ctx?: Record<string, unknown>) => emit("error", msg, { ...ctx, requestId: reqId }),
    };
  },
};

// Exposed for tests.
export const _internal = { redactValue, redactString };
