export interface StandardAccessRow {
  sessionId: string;
  sessionExpiresAt: string;
  tenureId: string;
  tenureStatus: "active" | "transfer_pending" | "transferred";
  providerCompletions: number;
  entitlementId: string;
  entitlementStatus: "active" | "revoked";
  entitlementExpiresAt: string;
  creditLimit: number;
  creditsReserved: number;
  creditsConsumed: number;
}

export function parseStandardAccessRow(
  value: unknown,
): StandardAccessRow | null {
  if (!isRecord(value)) return null;
  const providerCompletions = Number(value.providerCompletions);
  const creditLimit = Number(value.creditLimit);
  const creditsReserved = Number(value.creditsReserved);
  const creditsConsumed = Number(value.creditsConsumed);
  if (
    typeof value.sessionId !== "string" ||
    typeof value.tenureId !== "string" ||
    typeof value.entitlementId !== "string" ||
    !isDateValue(value.sessionExpiresAt) ||
    !isDateValue(value.entitlementExpiresAt) ||
    (value.tenureStatus !== "active" &&
      value.tenureStatus !== "transfer_pending" &&
      value.tenureStatus !== "transferred") ||
    (value.entitlementStatus !== "active" &&
      value.entitlementStatus !== "revoked") ||
    ![providerCompletions, creditLimit, creditsReserved, creditsConsumed].every(
      Number.isSafeInteger,
    )
  ) {
    return null;
  }
  return {
    sessionId: value.sessionId,
    sessionExpiresAt: toIsoString(value.sessionExpiresAt),
    tenureId: value.tenureId,
    tenureStatus: value.tenureStatus,
    providerCompletions,
    entitlementId: value.entitlementId,
    entitlementStatus: value.entitlementStatus,
    entitlementExpiresAt: toIsoString(value.entitlementExpiresAt),
    creditLimit,
    creditsReserved,
    creditsConsumed,
  };
}

export function parseAccessRow(value: unknown): {
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

export function parseGenerationRequest(value: unknown): {
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

export function parseControl(value: unknown): {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isDateValue(value: unknown): value is Date | string {
  return (
    value instanceof Date ||
    (typeof value === "string" && Number.isFinite(new Date(value).getTime()))
  );
}

export function toIsoString(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
