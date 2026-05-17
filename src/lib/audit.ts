// src/lib/audit.ts
//
// Convenience writer around AuditLog. Call audit() on every privileged
// action — success or failure. Never throws (so an audit-store failure
// doesn't break the business action) but does log to stderr.

import AuditLog, { type AuditOutcome, type IAuditLog } from "@/models/AuditLog";
import { log } from "@/lib/logger";

export interface AuditArgs {
  actor: { kind: "user" | "admin" | "system"; id?: string; email?: string };
  action: string;
  target?: { kind: string; id?: string; reference?: string };
  ip?: string;
  userAgent?: string;
  requestId?: string;
  outcome: AuditOutcome;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export async function audit(args: AuditArgs): Promise<void> {
  try {
    await AuditLog.create({
      actor: args.actor,
      action: args.action,
      target: args.target,
      ip: args.ip,
      userAgent: args.userAgent,
      requestId: args.requestId,
      outcome: args.outcome,
      reason: args.reason,
      metadata: args.metadata,
    } satisfies Partial<IAuditLog>);
  } catch (err: any) {
    log.error("audit.write.failed", {
      action: args.action,
      error: err?.message,
    });
  }
}

// Extract client identifiers from a Next.js / fetch Request.
export function actorContext(req: Request): { ip?: string; userAgent?: string; requestId?: string } {
  const headers = req.headers;
  return {
    ip:
      headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || headers.get("x-real-ip")
      || undefined,
    userAgent: headers.get("user-agent") ?? undefined,
    requestId: headers.get("x-request-id") ?? undefined,
  };
}
