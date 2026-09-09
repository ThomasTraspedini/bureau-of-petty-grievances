import { createHash } from "node:crypto";

import {
  GENERATION_RATE_LIMITS,
  crossedUsageThresholds,
} from "@/domain/access/evaluation-access";
import {
  DEFAULT_STANDARD_CREDIT_LIMIT,
  type StandardAccessSummary,
} from "@/domain/access/standard-access";

import type {
  AccessControlRepository,
  BeginGenerationInput,
  BeginGenerationResult,
  CancelSuccessorInvitationResult,
  ExchangeEvaluationAccessInput,
  ExchangeEvaluationAccessResult,
  ExchangeStandardAccessInput,
  ExchangeStandardAccessResult,
  IssueSuccessorInvitationInput,
  IssueSuccessorInvitationResult,
  ReserveProviderAttemptResult,
  StandardAccessStatusResult,
} from "./access-control-repository";
import {
  isDateValue,
  parseAccessRow,
  parseControl,
  parseGenerationRequest,
  parseStandardAccessRow,
  toIsoString,
  type StandardAccessRow,
} from "./sql-access-control-rows";
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

  async exchangeStandardAccess(
    input: ExchangeStandardAccessInput,
  ): Promise<ExchangeStandardAccessResult> {
    return this.database.transaction(async (session) => {
      await removeExpiredRateBuckets(session, input.now);
      if (input.tokenKind === "authorization") {
        return exchangeStandardAuthorization(session, input);
      }
      return exchangeSuccessorInvitation(session, input);
    });
  }

  async getStandardAccessStatus(
    sessionCredentialDigest: string,
    now: string,
  ): Promise<StandardAccessStatusResult> {
    return this.database.transaction(async (session) => {
      const access = await selectStandardAccess(
        session,
        sessionCredentialDigest,
        true,
      );
      if (access === null) return { status: "invalid" } as const;
      const nowMs = new Date(now).getTime();
      if (new Date(access.sessionExpiresAt).getTime() <= nowMs) {
        return { status: "expired" } as const;
      }
      if (access.entitlementStatus === "revoked") {
        return { status: "revoked" } as const;
      }
      if (new Date(access.entitlementExpiresAt).getTime() <= nowMs) {
        return { status: "expired" } as const;
      }
      await recoverExpiredSuccessorInvitation(session, access, now);
      const current = await selectStandardAccess(
        session,
        sessionCredentialDigest,
        false,
      );
      if (current === null || current.tenureStatus === "transferred") {
        return { status: "transferred" } as const;
      }
      return {
        status: "available",
        summary: await standardSummary(session, current),
      } as const;
    });
  }

  async issueSuccessorInvitation(
    input: IssueSuccessorInvitationInput,
  ): Promise<IssueSuccessorInvitationResult> {
    return this.database.transaction(async (session) => {
      let access = await selectStandardAccess(
        session,
        input.sessionCredentialDigest,
        true,
      );
      if (access === null) return { status: "invalid" } as const;
      const nowMs = new Date(input.now).getTime();
      if (
        new Date(access.sessionExpiresAt).getTime() <= nowMs ||
        new Date(access.entitlementExpiresAt).getTime() <= nowMs
      ) {
        return { status: "expired" } as const;
      }
      if (access.entitlementStatus === "revoked") {
        return { status: "invalid" } as const;
      }
      await recoverExpiredSuccessorInvitation(session, access, input.now);
      access =
        (await selectStandardAccess(
          session,
          input.sessionCredentialDigest,
          false,
        )) ?? access;
      if (access.tenureStatus === "transferred") {
        return { status: "transferred" } as const;
      }
      const control = await session.query(
        `SELECT issuance_enabled AS "issuanceEnabled"
         FROM successor_control WHERE control_id = 1 FOR UPDATE`,
      );
      if (control.rows[0]?.issuanceEnabled !== true) {
        return { status: "disabled" } as const;
      }
      const remaining = remainingCredits(access);
      if (remaining <= 0) return { status: "exhausted" } as const;
      if (access.creditsReserved > 0) {
        return { status: "not_eligible" } as const;
      }
      if (access.tenureStatus === "active") {
        if (access.providerCompletions < 1) {
          return { status: "not_eligible" } as const;
        }
      } else if (!input.replace) {
        return { status: "pending" } as const;
      }

      if (access.tenureStatus === "transfer_pending") {
        await session.query(
          `UPDATE successor_invitations
           SET status = 'replaced', updated_at = $1
           WHERE entitlement_id = $2 AND from_tenure_id = $3 AND status = 'active'`,
          [input.now, access.entitlementId, access.tenureId],
        );
      }
      const expiresAt = new Date(
        Math.min(
          new Date(input.expiresAt).getTime(),
          new Date(access.entitlementExpiresAt).getTime(),
        ),
      ).toISOString();
      await session.query(
        `INSERT INTO successor_invitations (
           invitation_id, entitlement_id, from_tenure_id, token_digest,
           status, created_at, expires_at, updated_at
         ) VALUES ($1, $2, $3, $4, 'active', $5, $6, $5)`,
        [
          input.invitationId,
          access.entitlementId,
          access.tenureId,
          input.tokenDigest,
          input.now,
          expiresAt,
        ],
      );
      await session.query(
        `UPDATE standard_tenures
         SET status = 'transfer_pending', updated_at = $1
         WHERE tenure_id = $2 AND status IN ('active', 'transfer_pending')`,
        [input.now, access.tenureId],
      );
      return {
        status: "issued",
        summary: {
          status: "transfer_pending",
          creditsRemaining: remaining,
          transferEligible: false,
          expiresAt: access.entitlementExpiresAt,
          invitationExpiresAt: expiresAt,
        },
      } as const;
    });
  }

  async cancelSuccessorInvitation(
    sessionCredentialDigest: string,
    now: string,
  ): Promise<CancelSuccessorInvitationResult> {
    return this.database.transaction(async (session) => {
      let access = await selectStandardAccess(
        session,
        sessionCredentialDigest,
        true,
      );
      if (access === null) return { status: "invalid" } as const;
      const nowMs = new Date(now).getTime();
      if (
        new Date(access.sessionExpiresAt).getTime() <= nowMs ||
        new Date(access.entitlementExpiresAt).getTime() <= nowMs
      ) {
        return { status: "expired" } as const;
      }
      await recoverExpiredSuccessorInvitation(session, access, now);
      access =
        (await selectStandardAccess(session, sessionCredentialDigest, false)) ??
        access;
      if (access.tenureStatus === "transferred") {
        return { status: "transferred" } as const;
      }
      if (access.tenureStatus !== "transfer_pending") {
        return { status: "not_pending" } as const;
      }
      await session.query(
        `UPDATE successor_invitations
         SET status = 'cancelled', updated_at = $1
         WHERE entitlement_id = $2 AND from_tenure_id = $3 AND status = 'active'`,
        [now, access.entitlementId, access.tenureId],
      );
      await session.query(
        `UPDATE standard_tenures SET status = 'active', updated_at = $1
         WHERE tenure_id = $2 AND status = 'transfer_pending'`,
        [now, access.tenureId],
      );
      return {
        status: "cancelled",
        summary: {
          status: "active",
          creditsRemaining: remainingCredits(access),
          transferEligible:
            access.providerCompletions > 0 && remainingCredits(access) > 0,
          expiresAt: access.entitlementExpiresAt,
        },
      } as const;
    });
  }

  async beginGeneration(
    input: BeginGenerationInput,
  ): Promise<BeginGenerationResult> {
    if (input.accessKind === "standard") {
      return this.beginStandardGeneration(input);
    }
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

  private async beginStandardGeneration(
    input: BeginGenerationInput,
  ): Promise<BeginGenerationResult> {
    return this.database.transaction(async (session) => {
      await removeExpiredRateBuckets(session, input.now);
      let access = await selectStandardAccess(
        session,
        input.sessionCredentialDigest,
        true,
      );
      if (access === null) {
        return { status: "fallback", reason: "invalid_session" } as const;
      }
      const now = new Date(input.now).getTime();
      if (new Date(access.sessionExpiresAt).getTime() <= now) {
        return { status: "fallback", reason: "expired_session" } as const;
      }
      if (access.entitlementStatus === "revoked") {
        return { status: "fallback", reason: "revoked_entitlement" } as const;
      }
      if (new Date(access.entitlementExpiresAt).getTime() <= now) {
        return { status: "fallback", reason: "expired_entitlement" } as const;
      }
      await recoverExpiredSuccessorInvitation(session, access, input.now);
      access =
        (await selectStandardAccess(
          session,
          input.sessionCredentialDigest,
          false,
        )) ?? access;
      if (access.tenureStatus === "transferred") {
        return { status: "fallback", reason: "transferred_access" } as const;
      }
      if (access.tenureStatus === "transfer_pending") {
        return { status: "fallback", reason: "transfer_pending" } as const;
      }

      const existing = await session.query(
        `SELECT request_id AS "requestId", filing_digest AS "filingDigest",
                procedural_reference AS reference, status,
                lease_until AS "leaseUntil", expires_at AS "expiresAt",
                created_at AS "createdAt"
         FROM standard_generation_requests
         WHERE session_id = $1 AND idempotency_key = $2`,
        [access.sessionId, input.idempotencyKey],
      );
      let request = parseGenerationRequest(existing.rows[0]);
      if (request !== null && new Date(request.expiresAt).getTime() <= now) {
        if (request.status === "reserved") {
          await session.query(
            `UPDATE standard_entitlements
             SET credits_reserved = credits_reserved - 1, updated_at = $1
             WHERE entitlement_id = $2 AND credits_reserved > 0`,
            [input.now, access.entitlementId],
          );
        }
        await session.query(
          `DELETE FROM standard_generation_requests WHERE request_id = $1`,
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
            `UPDATE standard_generation_requests
             SET status = 'recovered_fallback', completed_at = $1
             WHERE request_id = $2 AND status = 'reserved'`,
            [input.now, request.requestId],
          );
          await session.query(
            `UPDATE standard_entitlements
             SET credits_reserved = credits_reserved - 1, updated_at = $1
             WHERE entitlement_id = $2 AND credits_reserved > 0`,
            [input.now, access.entitlementId],
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
        digest(access.entitlementId),
        input.windowStart,
        GENERATION_RATE_LIMITS.grant,
      );
      if (!sessionAllowed || !networkAllowed || !grantAllowed) {
        return {
          status: "limited",
          retryAfterSeconds: secondsUntilNextWindow(input.now),
        } as const;
      }
      if (remainingCredits(access) <= 0) {
        return { status: "fallback", reason: "exhausted_grant" } as const;
      }

      await session.query(
        `UPDATE standard_entitlements
         SET credits_reserved = credits_reserved + 1, updated_at = $1
         WHERE entitlement_id = $2`,
        [input.now, access.entitlementId],
      );
      await session.query(
        `UPDATE standard_sessions SET last_used_at = $1 WHERE session_id = $2`,
        [input.now, access.sessionId],
      );
      await session.query(
        `INSERT INTO standard_generation_requests (
           request_id, session_id, tenure_id, entitlement_id, idempotency_key,
           filing_digest, procedural_reference, status, created_at, expires_at, lease_until
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'reserved', $8, $9, $10)`,
        [
          input.requestId,
          access.sessionId,
          access.tenureId,
          access.entitlementId,
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
      let request = await session.query(
        `SELECT status, provider_attempts AS "providerAttempts"
         FROM generation_requests WHERE request_id = $1 FOR UPDATE`,
        [requestId],
      );
      if (!request.rows[0]) {
        request = await session.query(
          `SELECT status, provider_attempts AS "providerAttempts"
           FROM standard_generation_requests WHERE request_id = $1 FOR UPDATE`,
          [requestId],
        );
      }
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
      await session.query(
        `UPDATE standard_generation_requests
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
      if (typeof grantId !== "string") {
        await completeStandardGeneration(
          session,
          requestId,
          outcome,
          completedAt,
        );
        return;
      }
      if (
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

async function exchangeStandardAuthorization(
  session: SqlSession,
  input: ExchangeStandardAccessInput,
): Promise<ExchangeStandardAccessResult> {
  const result = await session.query(
    `SELECT authorization_id AS "authorizationId", status,
            expires_at AS "expiresAt"
     FROM standard_authorizations WHERE token_digest = $1 FOR UPDATE`,
    [input.tokenDigest],
  );
  const row = result.rows[0];
  if (!row || typeof row.authorizationId !== "string") {
    return { status: "invalid" };
  }
  if (row.status === "claimed") return { status: "claimed" };
  if (row.status === "revoked") return { status: "revoked" };
  if (!isDateValue(row.expiresAt)) return { status: "invalid" };
  if (new Date(row.expiresAt).getTime() <= new Date(input.now).getTime()) {
    return { status: "expired" };
  }
  if (!(await standardExchangeAllowed(session, input))) {
    return { status: "limited" };
  }

  await session.query(
    `INSERT INTO standard_entitlements (
       entitlement_id, status, credit_limit, created_at, expires_at, updated_at
     ) VALUES ($1, 'active', $2, $3, $4, $3)`,
    [
      input.entitlementId,
      DEFAULT_STANDARD_CREDIT_LIMIT,
      input.now,
      input.entitlementExpiresAt,
    ],
  );
  await session.query(
    `INSERT INTO standard_tenures (
       tenure_id, entitlement_id, ordinal, status, created_at, updated_at
     ) VALUES ($1, $2, 1, 'active', $3, $3)`,
    [input.tenureId, input.entitlementId, input.now],
  );
  await insertStandardSession(session, input, input.tenureId);
  await session.query(
    `UPDATE standard_authorizations
     SET status = 'claimed', claimed_at = $1, entitlement_id = $2, updated_at = $1
     WHERE authorization_id = $3 AND status = 'available'`,
    [input.now, input.entitlementId, row.authorizationId],
  );
  return {
    status: "accepted",
    summary: {
      status: "active",
      creditsRemaining: DEFAULT_STANDARD_CREDIT_LIMIT,
      transferEligible: false,
      expiresAt: input.entitlementExpiresAt,
    },
  };
}

async function exchangeSuccessorInvitation(
  session: SqlSession,
  input: ExchangeStandardAccessInput,
): Promise<ExchangeStandardAccessResult> {
  const result = await session.query(
    `SELECT si.invitation_id AS "invitationId", si.status,
            si.expires_at AS "invitationExpiresAt",
            si.from_tenure_id AS "fromTenureId",
            se.entitlement_id AS "entitlementId",
            se.status AS "entitlementStatus",
            se.expires_at AS "entitlementExpiresAt",
            se.credit_limit AS "creditLimit",
            se.credits_reserved AS "creditsReserved",
            se.credits_consumed AS "creditsConsumed",
            st.ordinal, st.status AS "tenureStatus"
     FROM successor_invitations si
     JOIN standard_entitlements se USING (entitlement_id)
     JOIN standard_tenures st ON st.tenure_id = si.from_tenure_id
     WHERE si.token_digest = $1
     FOR UPDATE OF si, se, st`,
    [input.tokenDigest],
  );
  const row = result.rows[0];
  if (
    !row ||
    typeof row.invitationId !== "string" ||
    typeof row.fromTenureId !== "string" ||
    typeof row.entitlementId !== "string"
  ) {
    return { status: "invalid" };
  }
  if (row.status === "claimed") return { status: "claimed" };
  if (row.status !== "active") return { status: "invalid" };
  if (
    !isDateValue(row.invitationExpiresAt) ||
    !isDateValue(row.entitlementExpiresAt)
  ) {
    return { status: "invalid" };
  }
  const now = new Date(input.now).getTime();
  if (new Date(row.invitationExpiresAt).getTime() <= now) {
    await expireInvitation(
      session,
      row.invitationId,
      row.fromTenureId,
      input.now,
    );
    return { status: "expired" };
  }
  if (row.entitlementStatus === "revoked") return { status: "revoked" };
  if (new Date(row.entitlementExpiresAt).getTime() <= now) {
    return { status: "expired" };
  }
  if (row.tenureStatus !== "transfer_pending") return { status: "invalid" };
  const creditLimit = Number(row.creditLimit);
  const creditsReserved = Number(row.creditsReserved);
  const creditsConsumed = Number(row.creditsConsumed);
  const ordinal = Number(row.ordinal);
  if (
    ![creditLimit, creditsReserved, creditsConsumed, ordinal].every(
      Number.isSafeInteger,
    ) ||
    creditsReserved !== 0 ||
    creditLimit - creditsConsumed <= 0 ||
    ordinal >= DEFAULT_STANDARD_CREDIT_LIMIT
  ) {
    return { status: "invalid" };
  }
  if (!(await standardExchangeAllowed(session, input))) {
    return { status: "limited" };
  }

  await session.query(
    `UPDATE standard_tenures
     SET status = 'transferred', ended_at = $1, updated_at = $1
     WHERE tenure_id = $2 AND status = 'transfer_pending'`,
    [input.now, row.fromTenureId],
  );
  await session.query(
    `INSERT INTO standard_tenures (
       tenure_id, entitlement_id, ordinal, status, created_at, updated_at
     ) VALUES ($1, $2, $3, 'active', $4, $4)`,
    [input.tenureId, row.entitlementId, ordinal + 1, input.now],
  );
  await insertStandardSession(
    session,
    {
      ...input,
      entitlementExpiresAt: toIsoString(row.entitlementExpiresAt),
    },
    input.tenureId,
  );
  await session.query(
    `UPDATE successor_invitations
     SET status = 'claimed', to_tenure_id = $1, claimed_at = $2, updated_at = $2
     WHERE invitation_id = $3 AND status = 'active'`,
    [input.tenureId, input.now, row.invitationId],
  );
  return {
    status: "accepted",
    summary: {
      status: "active",
      creditsRemaining: creditLimit - creditsConsumed,
      transferEligible: false,
      expiresAt: toIsoString(row.entitlementExpiresAt),
    },
  };
}

async function standardExchangeAllowed(
  session: SqlSession,
  input: ExchangeStandardAccessInput,
): Promise<boolean> {
  const networkAllowed = await incrementRateLimit(
    session,
    "exchange_network",
    input.networkDigest,
    input.windowStart,
    GENERATION_RATE_LIMITS.network,
  );
  const tokenAllowed = await incrementRateLimit(
    session,
    "exchange_grant",
    digest(input.tokenDigest),
    input.windowStart,
    GENERATION_RATE_LIMITS.grant,
  );
  return networkAllowed && tokenAllowed;
}

async function insertStandardSession(
  session: SqlSession,
  input: ExchangeStandardAccessInput,
  tenureId: string,
): Promise<void> {
  const expiresAt = new Date(
    Math.min(
      new Date(input.sessionExpiresAt).getTime(),
      new Date(input.entitlementExpiresAt).getTime(),
    ),
  ).toISOString();
  await session.query(
    `INSERT INTO standard_sessions (
       session_id, tenure_id, credential_digest, created_at, expires_at, last_used_at
     ) VALUES ($1, $2, $3, $4, $5, $4)`,
    [
      input.sessionId,
      tenureId,
      input.sessionCredentialDigest,
      input.now,
      expiresAt,
    ],
  );
}

async function selectStandardAccess(
  session: SqlSession,
  sessionCredentialDigest: string,
  lock: boolean,
): Promise<StandardAccessRow | null> {
  const result = await session.query(
    `SELECT ss.session_id AS "sessionId", ss.expires_at AS "sessionExpiresAt",
            st.tenure_id AS "tenureId", st.status AS "tenureStatus",
            st.provider_completions AS "providerCompletions",
            se.entitlement_id AS "entitlementId",
            se.status AS "entitlementStatus",
            se.expires_at AS "entitlementExpiresAt",
            se.credit_limit AS "creditLimit",
            se.credits_reserved AS "creditsReserved",
            se.credits_consumed AS "creditsConsumed"
     FROM standard_sessions ss
     JOIN standard_tenures st USING (tenure_id)
     JOIN standard_entitlements se USING (entitlement_id)
     WHERE ss.credential_digest = $1
     ${lock ? "FOR UPDATE OF ss, st, se" : ""}`,
    [sessionCredentialDigest],
  );
  return parseStandardAccessRow(result.rows[0]);
}

async function recoverExpiredSuccessorInvitation(
  session: SqlSession,
  access: StandardAccessRow,
  now: string,
): Promise<void> {
  if (access.tenureStatus !== "transfer_pending") return;
  const result = await session.query(
    `SELECT invitation_id AS "invitationId", expires_at AS "expiresAt"
     FROM successor_invitations
     WHERE entitlement_id = $1 AND from_tenure_id = $2 AND status = 'active'
     FOR UPDATE`,
    [access.entitlementId, access.tenureId],
  );
  const invitation = result.rows[0];
  if (
    invitation &&
    typeof invitation.invitationId === "string" &&
    isDateValue(invitation.expiresAt) &&
    new Date(invitation.expiresAt).getTime() <= new Date(now).getTime()
  ) {
    await expireInvitation(
      session,
      invitation.invitationId,
      access.tenureId,
      now,
    );
  }
}

async function expireInvitation(
  session: SqlSession,
  invitationId: string,
  tenureId: string,
  now: string,
): Promise<void> {
  await session.query(
    `UPDATE successor_invitations SET status = 'expired', updated_at = $1
     WHERE invitation_id = $2 AND status = 'active'`,
    [now, invitationId],
  );
  await session.query(
    `UPDATE standard_tenures SET status = 'active', updated_at = $1
     WHERE tenure_id = $2 AND status = 'transfer_pending'`,
    [now, tenureId],
  );
}

async function standardSummary(
  session: SqlSession,
  access: StandardAccessRow,
): Promise<StandardAccessSummary> {
  const remaining = remainingCredits(access);
  if (access.tenureStatus === "transfer_pending") {
    const invitation = await session.query(
      `SELECT expires_at AS "expiresAt" FROM successor_invitations
       WHERE entitlement_id = $1 AND from_tenure_id = $2 AND status = 'active'`,
      [access.entitlementId, access.tenureId],
    );
    const expiresAt = invitation.rows[0]?.expiresAt;
    return {
      status: "transfer_pending",
      creditsRemaining: remaining,
      transferEligible: false,
      expiresAt: access.entitlementExpiresAt,
      ...(isDateValue(expiresAt)
        ? { invitationExpiresAt: toIsoString(expiresAt) }
        : {}),
    };
  }
  return {
    status: remaining === 0 ? "exhausted" : "active",
    creditsRemaining: remaining,
    transferEligible:
      remaining > 0 &&
      access.creditsReserved === 0 &&
      access.providerCompletions > 0,
    expiresAt: access.entitlementExpiresAt,
  };
}

function remainingCredits(access: StandardAccessRow): number {
  return Math.max(
    0,
    access.creditLimit - access.creditsReserved - access.creditsConsumed,
  );
}

async function completeStandardGeneration(
  session: SqlSession,
  requestId: string,
  outcome: "provider" | "fallback" | "failed",
  completedAt: string,
): Promise<void> {
  const request = await session.query(
    `SELECT req.entitlement_id AS "entitlementId", req.tenure_id AS "tenureId"
     FROM standard_generation_requests req
     JOIN standard_entitlements se USING (entitlement_id)
     JOIN standard_tenures st USING (tenure_id)
     WHERE req.request_id = $1 AND req.status = 'reserved'
     FOR UPDATE OF req, se, st`,
    [requestId],
  );
  const row = request.rows[0];
  if (
    typeof row?.entitlementId !== "string" ||
    typeof row.tenureId !== "string"
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
    `UPDATE standard_generation_requests SET status = $1, completed_at = $2
     WHERE request_id = $3 AND status = 'reserved'`,
    [status, completedAt, requestId],
  );
  if (outcome === "provider") {
    await session.query(
      `UPDATE standard_entitlements
       SET credits_reserved = credits_reserved - 1,
           credits_consumed = credits_consumed + 1,
           updated_at = $1
       WHERE entitlement_id = $2 AND credits_reserved > 0`,
      [completedAt, row.entitlementId],
    );
    await session.query(
      `UPDATE standard_tenures
       SET provider_completions = provider_completions + 1, updated_at = $1
       WHERE tenure_id = $2 AND status = 'active'`,
      [completedAt, row.tenureId],
    );
  } else {
    await session.query(
      `UPDATE standard_entitlements
       SET credits_reserved = credits_reserved - 1, updated_at = $1
       WHERE entitlement_id = $2 AND credits_reserved > 0`,
      [completedAt, row.entitlementId],
    );
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
