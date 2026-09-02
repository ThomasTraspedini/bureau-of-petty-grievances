import { createHash } from "node:crypto";

import {
  GENERATION_RATE_LIMITS,
  crossedUsageThresholds,
} from "@/domain/access/evaluation-access";

import type {
  AccessControlRepository,
  BeginGenerationInput,
  BeginGenerationResult,
  ExchangeEvaluationAccessInput,
  ExchangeEvaluationAccessResult,
  ReserveProviderAttemptResult,
} from "./access-control-repository";
import type { SqlDatabase, SqlSession } from "../public-record/sql-database";

const WINDOW_SECONDS = 60;

export class SqlAccessControlRepository implements AccessControlRepository {
  constructor(private readonly database: SqlDatabase) {}

  async exchangeEvaluationAccess(
    input: ExchangeEvaluationAccessInput,
  ): Promise<ExchangeEvaluationAccessResult> {
    return this.database.transaction(async (session) => {
      await removeExpiredRateBuckets(session, input.now);
      const result = await session.query(
        `SELECT grant_id AS "grantId", status, expires_at AS "expiresAt"
         FROM evaluation_grants
         WHERE token_digest = $1
         FOR UPDATE`,
        [input.tokenDigest],
      );
      const grant = result.rows[0];
      if (!grant || typeof grant.grantId !== "string") {
        return { status: "invalid" } as const;
      }
      if (grant.status === "revoked") return { status: "revoked" } as const;
      if (!isDateValue(grant.expiresAt)) return { status: "invalid" } as const;
      const grantExpiresAt = toIsoString(grant.expiresAt);
      if (new Date(grantExpiresAt).getTime() <= new Date(input.now).getTime()) {
        return { status: "expired" } as const;
      }

      const networkAllowed = await incrementRateLimit(
        session,
        "exchange_network",
        input.networkDigest,
        input.windowStart,
        GENERATION_RATE_LIMITS.network,
      );
      const grantAllowed = await incrementRateLimit(
        session,
        "exchange_grant",
        digest(input.tokenDigest),
        input.windowStart,
        GENERATION_RATE_LIMITS.grant,
      );
      if (!networkAllowed || !grantAllowed) {
        return { status: "limited" } as const;
      }

      const expiresAt = new Date(
        Math.min(
          new Date(grantExpiresAt).getTime(),
          new Date(input.sessionExpiresAt).getTime(),
        ),
      ).toISOString();
      await session.query(
        `INSERT INTO evaluation_sessions (
          session_id, grant_id, credential_digest, created_at, expires_at, last_used_at
        ) VALUES ($1, $2, $3, $4, $5, $4)`,
        [
          input.sessionId,
          grant.grantId,
          input.sessionCredentialDigest,
          input.now,
          expiresAt,
        ],
      );
      return { status: "accepted", expiresAt } as const;
    });
  }

  async beginGeneration(
    input: BeginGenerationInput,
  ): Promise<BeginGenerationResult> {
    return this.database.transaction(async (session) => {
      await removeExpiredRateBuckets(session, input.now);
      const result = await session.query(
        `SELECT
           es.session_id AS "sessionId",
           es.expires_at AS "sessionExpiresAt",
           eg.grant_id AS "grantId",
           eg.status AS "grantStatus",
           eg.expires_at AS "grantExpiresAt",
           eg.credit_limit AS "creditLimit",
           eg.credits_reserved AS "creditsReserved",
           eg.credits_consumed AS "creditsConsumed"
         FROM evaluation_sessions es
         JOIN evaluation_grants eg USING (grant_id)
         WHERE es.credential_digest = $1
         FOR UPDATE OF eg, es`,
        [input.sessionCredentialDigest],
      );
      const access = parseAccessRow(result.rows[0]);
      if (access === null) {
        return { status: "fallback", reason: "invalid_session" } as const;
      }
      const now = new Date(input.now).getTime();
      if (new Date(access.sessionExpiresAt).getTime() <= now) {
        return { status: "fallback", reason: "expired_session" } as const;
      }
      if (access.grantStatus === "revoked") {
        return { status: "fallback", reason: "revoked_grant" } as const;
      }
      if (new Date(access.grantExpiresAt).getTime() <= now) {
        return { status: "fallback", reason: "expired_grant" } as const;
      }

      const existing = await session.query(
        `SELECT
           request_id AS "requestId", filing_digest AS "filingDigest",
           procedural_reference AS reference, status,
           lease_until AS "leaseUntil", expires_at AS "expiresAt",
           created_at AS "createdAt"
         FROM generation_requests
         WHERE session_id = $1 AND idempotency_key = $2`,
        [access.sessionId, input.idempotencyKey],
      );
      let request = parseGenerationRequest(existing.rows[0]);
      if (request !== null && new Date(request.expiresAt).getTime() <= now) {
        if (request.status === "reserved") {
          await session.query(
            `UPDATE evaluation_grants
             SET credits_reserved = credits_reserved - 1, updated_at = $1
             WHERE grant_id = $2 AND credits_reserved > 0`,
            [input.now, access.grantId],
          );
        }
        await session.query(
          `DELETE FROM generation_requests WHERE request_id = $1`,
          [request.requestId],
        );
        request = null;
      }
      if (request !== null) {
        if (request.filingDigest !== input.filingDigest) {
          return { status: "invalid" } as const;
        }
        if (request.status === "reserved") {
          const leaseRemaining = new Date(request.leaseUntil).getTime() - now;
          if (leaseRemaining > 0) {
            return {
              status: "pending",
              retryAfterSeconds: Math.max(1, Math.ceil(leaseRemaining / 1000)),
            } as const;
          }
          await session.query(
            `UPDATE generation_requests
             SET status = 'recovered_fallback', completed_at = $1
             WHERE request_id = $2 AND status = 'reserved'`,
            [input.now, request.requestId],
          );
          await session.query(
            `UPDATE evaluation_grants
             SET credits_reserved = credits_reserved - 1, updated_at = $1
             WHERE grant_id = $2 AND credits_reserved > 0`,
            [input.now, access.grantId],
          );
          return {
            status: "fallback",
            reason: "recovered_request",
            reference: request.reference,
            issuedAt: request.createdAt,
          } as const;
        }
        return {
          status: "fallback",
          reason: "completed_request",
          reference: request.reference,
          issuedAt: request.createdAt,
        } as const;
      }

      const sessionAllowed = await incrementRateLimit(
        session,
        "session",
        input.sessionCredentialDigest,
        input.windowStart,
        GENERATION_RATE_LIMITS.session,
      );
      const networkAllowed = await incrementRateLimit(
        session,
        "network",
        input.networkDigest,
        input.windowStart,
        GENERATION_RATE_LIMITS.network,
      );
      const grantAllowed = await incrementRateLimit(
        session,
        "grant",
        digest(access.grantId),
        input.windowStart,
        GENERATION_RATE_LIMITS.grant,
      );
      if (!sessionAllowed || !networkAllowed || !grantAllowed) {
        return {
          status: "limited",
          retryAfterSeconds: secondsUntilNextWindow(input.now),
        } as const;
      }

      const previousUsed = access.creditsReserved + access.creditsConsumed;
      if (previousUsed >= access.creditLimit) {
        return { status: "fallback", reason: "exhausted_grant" } as const;
      }

      await session.query(
        `UPDATE evaluation_grants
         SET credits_reserved = credits_reserved + 1, updated_at = $1
         WHERE grant_id = $2`,
        [input.now, access.grantId],
      );
      await session.query(
        `UPDATE evaluation_sessions SET last_used_at = $1 WHERE session_id = $2`,
        [input.now, access.sessionId],
      );
      await session.query(
        `INSERT INTO generation_requests (
          request_id, session_id, grant_id, idempotency_key, filing_digest,
          procedural_reference, status, created_at, expires_at, lease_until
        ) VALUES ($1, $2, $3, $4, $5, $6, 'reserved', $7, $8, $9)`,
        [
          input.requestId,
          access.sessionId,
          access.grantId,
          input.idempotencyKey,
          input.filingDigest,
          input.reference,
          input.now,
          input.expiresAt,
          input.leaseUntil,
        ],
      );
      return {
        status: "reserved",
        requestId: input.requestId,
        reference: input.reference,
        issuedAt: input.now,
      } as const;
    });
  }

  async reserveProviderAttempt(
    requestId: string,
    now: string,
  ): Promise<ReserveProviderAttemptResult> {
    return this.database.transaction(async (session) => {
      const request = await session.query(
        `SELECT status, provider_attempts AS "providerAttempts"
         FROM generation_requests WHERE request_id = $1 FOR UPDATE`,
        [requestId],
      );
      const row = request.rows[0];
      if (
        row?.status !== "reserved" ||
        !Number.isSafeInteger(Number(row.providerAttempts)) ||
        Number(row.providerAttempts) >= 2
      ) {
        return { status: "denied", reason: "generation_disabled" } as const;
      }

      const controlResult = await session.query(
        `SELECT generation_enabled AS "generationEnabled",
                attempt_limit AS "attemptLimit",
                attempts_dispatched AS "attemptsDispatched"
         FROM generation_control WHERE control_id = 1 FOR UPDATE`,
      );
      const control = parseControl(controlResult.rows[0]);
      if (control?.generationEnabled !== true) {
        return { status: "denied", reason: "generation_disabled" } as const;
      }
      if (control.attemptsDispatched >= control.attemptLimit) {
        return {
          status: "denied",
          reason: "global_budget_exhausted",
        } as const;
      }

      await session.query(
        `UPDATE generation_control
         SET attempts_dispatched = attempts_dispatched + 1, updated_at = $1
         WHERE control_id = 1`,
        [now],
      );
      await session.query(
        `UPDATE generation_requests
         SET provider_attempts = provider_attempts + 1
         WHERE request_id = $1`,
        [requestId],
      );
      await insertThresholdAlerts(
        session,
        "global_budget",
        "global",
        control.attemptsDispatched,
        control.attemptsDispatched + 1,
        control.attemptLimit,
        now,
      );
      return { status: "allowed" } as const;
    });
  }

  async completeGeneration(
    requestId: string,
    outcome: "provider" | "fallback" | "failed",
    completedAt: string,
  ): Promise<void> {
    await this.database.transaction(async (session) => {
      const request = await session.query(
        `SELECT gr.grant_id AS "grantId", gr.credit_limit AS "creditLimit",
                gr.credits_consumed AS "creditsConsumed"
         FROM generation_requests req
         JOIN evaluation_grants gr USING (grant_id)
         WHERE req.request_id = $1 AND req.status = 'reserved'
         FOR UPDATE OF req, gr`,
        [requestId],
      );
      const row = request.rows[0];
      const grantId = row?.grantId;
      const creditLimit = Number(row?.creditLimit);
      const creditsConsumed = Number(row?.creditsConsumed);
      if (
        typeof grantId !== "string" ||
        !Number.isSafeInteger(creditLimit) ||
        !Number.isSafeInteger(creditsConsumed)
      ) {
        return;
      }
      const status =
        outcome === "provider"
          ? "completed_provider"
          : outcome === "fallback"
            ? "completed_fallback"
            : "failed_refunded";
      await session.query(
        `UPDATE generation_requests SET status = $1, completed_at = $2
         WHERE request_id = $3 AND status = 'reserved'`,
        [status, completedAt, requestId],
      );
      if (outcome === "provider") {
        await session.query(
          `UPDATE evaluation_grants
           SET credits_reserved = credits_reserved - 1,
               credits_consumed = credits_consumed + 1,
               updated_at = $1
           WHERE grant_id = $2 AND credits_reserved > 0`,
          [completedAt, grantId],
        );
        await insertThresholdAlerts(
          session,
          "evaluation_pool",
          grantId,
          creditsConsumed,
          creditsConsumed + 1,
          creditLimit,
          completedAt,
        );
      } else {
        await session.query(
          `UPDATE evaluation_grants
           SET credits_reserved = credits_reserved - 1, updated_at = $1
           WHERE grant_id = $2 AND credits_reserved > 0`,
          [completedAt, grantId],
        );
      }
    });
  }
}

async function incrementRateLimit(
  session: SqlSession,
  scope: string,
  identityDigest: string,
  windowStart: string,
  limit: number,
): Promise<boolean> {
  const result = await session.query(
    `INSERT INTO generation_rate_limits (
       scope, identity_digest, window_start, request_count
     ) VALUES ($1, $2, $3, 1)
     ON CONFLICT (scope, identity_digest, window_start)
     DO UPDATE SET request_count = generation_rate_limits.request_count + 1
     WHERE generation_rate_limits.request_count < $4
     RETURNING request_count`,
    [scope, identityDigest, windowStart, limit],
  );
  return result.rows.length === 1;
}

async function removeExpiredRateBuckets(
  session: SqlSession,
  now: string,
): Promise<void> {
  await session.query(
    `DELETE FROM generation_rate_limits
     WHERE window_start < $1::timestamptz - interval '2 minutes'`,
    [now],
  );
}

async function insertThresholdAlerts(
  session: SqlSession,
  scope: "evaluation_pool" | "global_budget",
  scopeId: string,
  previousUsed: number,
  currentUsed: number,
  limit: number,
  createdAt: string,
): Promise<void> {
  for (const threshold of crossedUsageThresholds(
    previousUsed,
    currentUsed,
    limit,
  )) {
    await session.query(
      `INSERT INTO generation_usage_alerts (
         scope, scope_id, threshold, used, usage_limit, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (scope, scope_id, threshold) DO NOTHING`,
      [scope, scopeId, threshold, currentUsed, limit, createdAt],
    );
  }
}

function parseAccessRow(value: unknown): {
  sessionId: string;
  sessionExpiresAt: string;
  grantId: string;
  grantStatus: "active" | "revoked";
  grantExpiresAt: string;
  creditLimit: number;
  creditsReserved: number;
  creditsConsumed: number;
} | null {
  if (!isRecord(value)) return null;
  const creditLimit = Number(value.creditLimit);
  const creditsReserved = Number(value.creditsReserved);
  const creditsConsumed = Number(value.creditsConsumed);
  if (
    typeof value.sessionId !== "string" ||
    typeof value.grantId !== "string" ||
    (value.grantStatus !== "active" && value.grantStatus !== "revoked") ||
    !isDateValue(value.sessionExpiresAt) ||
    !isDateValue(value.grantExpiresAt) ||
    ![creditLimit, creditsReserved, creditsConsumed].every(Number.isSafeInteger)
  ) {
    return null;
  }
  return {
    sessionId: value.sessionId,
    sessionExpiresAt: toIsoString(value.sessionExpiresAt),
    grantId: value.grantId,
    grantStatus: value.grantStatus,
    grantExpiresAt: toIsoString(value.grantExpiresAt),
    creditLimit,
    creditsReserved,
    creditsConsumed,
  };
}

function parseGenerationRequest(value: unknown): {
  requestId: string;
  filingDigest: string;
  reference: string;
  status: string;
  leaseUntil: string;
  expiresAt: string;
  createdAt: string;
} | null {
  if (
    !isRecord(value) ||
    typeof value.requestId !== "string" ||
    typeof value.filingDigest !== "string" ||
    typeof value.reference !== "string" ||
    typeof value.status !== "string" ||
    !isDateValue(value.leaseUntil) ||
    !isDateValue(value.expiresAt) ||
    !isDateValue(value.createdAt)
  ) {
    return null;
  }
  return {
    requestId: value.requestId,
    filingDigest: value.filingDigest,
    reference: value.reference,
    status: value.status,
    leaseUntil: toIsoString(value.leaseUntil),
    expiresAt: toIsoString(value.expiresAt),
    createdAt: toIsoString(value.createdAt),
  };
}

function parseControl(value: unknown): {
  generationEnabled: boolean;
  attemptLimit: number;
  attemptsDispatched: number;
} | null {
  if (!isRecord(value) || typeof value.generationEnabled !== "boolean") {
    return null;
  }
  const attemptLimit = Number(value.attemptLimit);
  const attemptsDispatched = Number(value.attemptsDispatched);
  if (
    !Number.isSafeInteger(attemptLimit) ||
    !Number.isSafeInteger(attemptsDispatched)
  ) {
    return null;
  }
  return {
    generationEnabled: value.generationEnabled,
    attemptLimit,
    attemptsDispatched,
  };
}

function secondsUntilNextWindow(now: string): number {
  const timestamp = new Date(now).getTime();
  return Math.max(
    1,
    Math.ceil(
      (WINDOW_SECONDS * 1000 - (timestamp % (WINDOW_SECONDS * 1000))) / 1000,
    ),
  );
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDateValue(value: unknown): value is Date | string {
  return (
    value instanceof Date ||
    (typeof value === "string" && Number.isFinite(new Date(value).getTime()))
  );
}

function toIsoString(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
