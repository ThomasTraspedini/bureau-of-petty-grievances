import type { GenerationAccessFallbackReason } from "@/domain/access/evaluation-access";
import type { StandardAccessSummary } from "@/domain/access/standard-access";

export interface ExchangeEvaluationAccessInput {
  tokenDigest: string;
  sessionId: string;
  sessionCredentialDigest: string;
  networkDigest: string;
  now: string;
  sessionExpiresAt: string;
  windowStart: string;
}

export type ExchangeEvaluationAccessResult =
  | { status: "accepted"; expiresAt: string }
  | { status: "invalid" | "expired" | "revoked" | "limited" };

export interface BeginGenerationInput {
  accessKind?: "evaluation" | "standard";
  sessionCredentialDigest: string;
  idempotencyKey: string;
  filingDigest: string;
  requestId: string;
  reference: string;
  networkDigest: string;
  now: string;
  expiresAt: string;
  leaseUntil: string;
  windowStart: string;
}

export type BeginGenerationResult =
  | {
      status: "reserved";
      requestId: string;
      reference: string;
      issuedAt: string;
    }
  | { status: "pending"; retryAfterSeconds: number }
  | { status: "limited"; retryAfterSeconds: number }
  | {
      status: "fallback";
      reason: GenerationAccessFallbackReason;
      reference?: string;
      issuedAt?: string;
    }
  | { status: "invalid" };

export type ReserveProviderAttemptResult =
  | { status: "allowed" }
  | {
      status: "denied";
      reason: "generation_disabled" | "global_budget_exhausted";
    };

export interface ExchangeStandardAccessInput {
  tokenKind: "authorization" | "successor";
  tokenDigest: string;
  entitlementId: string;
  tenureId: string;
  sessionId: string;
  sessionCredentialDigest: string;
  networkDigest: string;
  now: string;
  entitlementExpiresAt: string;
  sessionExpiresAt: string;
  windowStart: string;
}

export type ExchangeStandardAccessResult =
  | { status: "accepted"; summary: StandardAccessSummary }
  | { status: "invalid" | "expired" | "claimed" | "revoked" | "limited" };

export type StandardAccessStatusResult =
  | { status: "available"; summary: StandardAccessSummary }
  | { status: "invalid" | "expired" | "transferred" | "revoked" };

export interface IssueSuccessorInvitationInput {
  sessionCredentialDigest: string;
  invitationId: string;
  tokenDigest: string;
  now: string;
  expiresAt: string;
  replace: boolean;
}

export type IssueSuccessorInvitationResult =
  | { status: "issued"; summary: StandardAccessSummary }
  | {
      status:
        | "invalid"
        | "expired"
        | "transferred"
        | "not_eligible"
        | "exhausted"
        | "pending"
        | "disabled";
    };

export type CancelSuccessorInvitationResult =
  | { status: "cancelled"; summary: StandardAccessSummary }
  | { status: "invalid" | "expired" | "transferred" | "not_pending" };

export interface AccessControlRepository {
  exchangeEvaluationAccess(
    input: ExchangeEvaluationAccessInput,
  ): Promise<ExchangeEvaluationAccessResult>;
  exchangeStandardAccess(
    input: ExchangeStandardAccessInput,
  ): Promise<ExchangeStandardAccessResult>;
  getStandardAccessStatus(
    sessionCredentialDigest: string,
    now: string,
  ): Promise<StandardAccessStatusResult>;
  issueSuccessorInvitation(
    input: IssueSuccessorInvitationInput,
  ): Promise<IssueSuccessorInvitationResult>;
  cancelSuccessorInvitation(
    sessionCredentialDigest: string,
    now: string,
  ): Promise<CancelSuccessorInvitationResult>;
  beginGeneration(input: BeginGenerationInput): Promise<BeginGenerationResult>;
  reserveProviderAttempt(
    requestId: string,
    now: string,
  ): Promise<ReserveProviderAttemptResult>;
  completeGeneration(
    requestId: string,
    outcome: "provider" | "fallback" | "failed",
    completedAt: string,
  ): Promise<void>;
}
