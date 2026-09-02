export const EVALUATOR_GRANT_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export const EVALUATOR_SESSION_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;
export const GENERATION_REQUEST_LIFETIME_MS = 30 * 60 * 1000;
export const GENERATION_REQUEST_LEASE_MS = 30 * 1000;
export const DEFAULT_EVALUATOR_CREDIT_LIMIT = 100;
export const DEFAULT_GLOBAL_ATTEMPT_LIMIT = 200;

export const GENERATION_RATE_LIMITS = {
  session: 3,
  network: 20,
  grant: 30,
} as const;

export const USAGE_ALERT_THRESHOLDS = [75, 90, 100] as const;

export type UsageAlertThreshold = (typeof USAGE_ALERT_THRESHOLDS)[number];
export type GenerationAccessFallbackReason =
  | "anonymous"
  | "invalid_session"
  | "expired_session"
  | "revoked_grant"
  | "expired_grant"
  | "exhausted_grant"
  | "generation_disabled"
  | "global_budget_exhausted"
  | "control_unavailable"
  | "recovered_request"
  | "completed_request"
  | "expired_entitlement"
  | "revoked_entitlement"
  | "transfer_pending"
  | "transferred_access";

export function isEvaluationGrantId(value: unknown): value is string {
  return typeof value === "string" && /^egr_[A-Za-z0-9_-]{22}$/u.test(value);
}

export function isEvaluationSessionId(value: unknown): value is string {
  return typeof value === "string" && /^ses_[A-Za-z0-9_-]{22}$/u.test(value);
}

export function isGenerationRequestId(value: unknown): value is string {
  return typeof value === "string" && /^gen_[A-Za-z0-9_-]{22}$/u.test(value);
}

export function isGenerationIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && /^fil_[A-Za-z0-9_-]{22}$/u.test(value);
}

export function isAccessCredential(
  value: unknown,
  prefix: string,
): value is string {
  return (
    typeof value === "string" &&
    new RegExp(`^${prefix}_[A-Za-z0-9_-]{43}$`, "u").test(value)
  );
}

export function crossedUsageThresholds(
  previousUsed: number,
  currentUsed: number,
  limit: number,
): readonly UsageAlertThreshold[] {
  if (!Number.isSafeInteger(limit) || limit <= 0) return [];
  return USAGE_ALERT_THRESHOLDS.filter(
    (threshold) =>
      previousUsed * 100 < threshold * limit &&
      currentUsed * 100 >= threshold * limit,
  );
}
