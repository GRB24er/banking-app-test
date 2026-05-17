// src/lib/rateLimit.ts
//
// Mongo-backed rate limiter. Fails OPEN: if the storage is unreachable,
// we let the request through and log a warning. Limits should be a defence
// in depth, not the only barrier — auth, idempotency, and KYC do the heavy
// lifting on money endpoints.

import RateLimit from "@/models/RateLimit";
import { log } from "@/lib/logger";

export interface PolicyDef {
  windowSec: number;
  max: number;
}

export const POLICIES: Record<string, PolicyDef> = {
  auth_login:       { windowSec: 60 * 5,  max: 10 },   // 10 attempts per 5 min
  auth_register:    { windowSec: 60 * 60, max: 5 },
  otp_request:      { windowSec: 60 * 10, max: 5 },
  otp_verify:       { windowSec: 60 * 10, max: 10 },
  transfer_init:    { windowSec: 60,      max: 10 },   // 10 transfers / minute
  password_reset:   { windowSec: 60 * 15, max: 3 },
  kyc_submit:       { windowSec: 60 * 60, max: 3 },
};

export interface CheckResult {
  ok: boolean;
  policy: string;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(policy: string, identifier: string): Promise<CheckResult> {
  const def = POLICIES[policy];
  if (!def) throw new Error(`unknown rate-limit policy: ${policy}`);

  const now = Date.now();
  const windowMs = def.windowSec * 1000;
  // Bucket by floor(now / window). Each policy gets a fresh row per window.
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);

  try {
    const updated = await RateLimit.findOneAndUpdate(
      { policy, identifier, windowStart },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, new: true },
    );
    const count = updated.count ?? 1;
    return {
      ok: count <= def.max,
      policy,
      remaining: Math.max(0, def.max - count),
      resetAt: expiresAt,
    };
  } catch (err: any) {
    log.warn("rateLimit.failed-open", { policy, identifier, error: err?.message });
    return { ok: true, policy, remaining: def.max, resetAt: expiresAt };
  }
}
