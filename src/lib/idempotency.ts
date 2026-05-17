// src/lib/idempotency.ts
//
// Idempotency-Key middleware for money endpoints. Usage:
//
//   const replay = await withIdempotency({ req, scope, userId, body }, async () => {
//     // do the work; return { status, body }
//   });
//   return NextResponse.json(replay.body, { status: replay.status });
//
// Contract:
//   - missing key on a money endpoint → 400
//   - first call → handler runs, response cached
//   - replay with same body  → cached response returned verbatim
//   - replay with different body → 422 (key reuse on different payload)
//   - concurrent in-flight call → 409 (still processing)

import { createHash } from "crypto";
import IdempotencyKey from "@/models/IdempotencyKey";

export interface IdemArgs {
  key: string;
  scope: string;
  userId?: string | null;
  body: unknown;
}

export interface IdemResult<T = unknown> {
  status: number;
  body: T;
}

const TTL_MS = 24 * 60 * 60 * 1000;

export function hashBody(body: unknown): string {
  // Canonicalise: sort object keys recursively, then sha256 the JSON.
  const canon = JSON.stringify(body, sortKeys());
  return createHash("sha256").update(canon).digest("hex");
}

function sortKeys() {
  return (_: string, value: any) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = value[k];
          return acc;
        }, {});
    }
    return value;
  };
}

export class IdempotencyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function withIdempotency<T = unknown>(
  args: IdemArgs,
  handler: () => Promise<IdemResult<T>>,
): Promise<IdemResult<T>> {
  if (!args.key) {
    throw new IdempotencyError(400, "Idempotency-Key header is required");
  }
  if (args.key.length < 8 || args.key.length > 128) {
    throw new IdempotencyError(400, "Idempotency-Key must be 8–128 characters");
  }

  const requestHash = hashBody(args.body);
  const expiresAt = new Date(Date.now() + TTL_MS);

  // Try to reserve the slot. If a row exists already, we replay or reject.
  try {
    await IdempotencyKey.create({
      key: args.key,
      scope: args.scope,
      userId: args.userId ?? null,
      requestHash,
      status: "in_flight",
      expiresAt,
    });
  } catch (err: any) {
    // Duplicate-key on (scope, key) — this is the replay path.
    if (err?.code === 11000) {
      const prior = await IdempotencyKey.findOne({
        scope: args.scope,
        key: args.key,
      }).lean();
      if (!prior) {
        // Race: row gone before we read it. Retry once.
        return withIdempotency(args, handler);
      }
      if (prior.requestHash !== requestHash) {
        throw new IdempotencyError(
          422,
          "Idempotency-Key reused with a different request body",
        );
      }
      if (prior.status === "in_flight") {
        throw new IdempotencyError(409, "Request with this Idempotency-Key is still processing");
      }
      return {
        status: prior.responseStatus ?? 200,
        body: prior.responseBody as T,
      };
    }
    throw err;
  }

  // We own the slot — run the handler.
  try {
    const result = await handler();
    await IdempotencyKey.updateOne(
      { scope: args.scope, key: args.key },
      {
        $set: {
          status: "completed",
          responseStatus: result.status,
          responseBody: result.body,
          completedAt: new Date(),
        },
      },
    );
    return result;
  } catch (err) {
    // Mark the slot failed so the next replay can try again instead of
    // hanging forever in `in_flight`.
    await IdempotencyKey.updateOne(
      { scope: args.scope, key: args.key },
      { $set: { status: "failed", completedAt: new Date() } },
    );
    throw err;
  }
}
