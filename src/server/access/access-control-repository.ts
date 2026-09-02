import type { GenerationAccessFallbackReason } from "@/domain/access/evaluation-access";

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

export interface AccessControlRepository {
  exchangeEvaluationAccess(
    input: ExchangeEvaluationAccessInput,
  ): Promise<ExchangeEvaluationAccessResult>;
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
