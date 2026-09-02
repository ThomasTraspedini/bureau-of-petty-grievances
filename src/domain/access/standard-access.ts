export const STANDARD_AUTHORIZATION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export const STANDARD_ENTITLEMENT_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
export const SUCCESSOR_INVITATION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export const DEFAULT_STANDARD_CREDIT_LIMIT = 5;

export function isStandardAuthorizationId(value: unknown): value is string {
  return typeof value === "string" && /^sau_[A-Za-z0-9_-]{22}$/u.test(value);
}

export function isStandardEntitlementId(value: unknown): value is string {
  return typeof value === "string" && /^ste_[A-Za-z0-9_-]{22}$/u.test(value);
}

export function isStandardTenureId(value: unknown): value is string {
  return typeof value === "string" && /^stn_[A-Za-z0-9_-]{22}$/u.test(value);
}

export function isSuccessorInvitationId(value: unknown): value is string {
  return typeof value === "string" && /^sin_[A-Za-z0-9_-]{22}$/u.test(value);
}

export interface StandardAccessSummary {
  status: "active" | "transfer_pending" | "exhausted";
  creditsRemaining: number;
  transferEligible: boolean;
  expiresAt: string;
  invitationExpiresAt?: string;
}
