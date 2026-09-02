import { createHash, randomBytes } from "node:crypto";

import {
  EVALUATOR_SESSION_LIFETIME_MS,
  GENERATION_REQUEST_LEASE_MS,
  GENERATION_REQUEST_LIFETIME_MS,
  isAccessCredential,
  isGenerationIdempotencyKey,
} from "@/domain/access/evaluation-access";

import type {
  AccessControlRepository,
  BeginGenerationResult,
  ExchangeEvaluationAccessResult,
} from "./access-control-repository";

export const EVALUATION_SESSION_COOKIE = "bpg_evaluation_session_v1";

export interface AccessControlServiceDependencies {
  repository: AccessControlRepository | null;
  now: () => Date;
  randomBytes: (size: number) => Buffer;
}

export type ExchangeEvaluationTokenResult =
  | { status: "accepted"; credential: string; expiresAt: string }
  | {
      status: "invalid" | "expired" | "revoked" | "limited" | "unavailable";
    };

export async function exchangeEvaluationTokenWith(
  token: unknown,
  networkDigest: string | null,
  dependencies: AccessControlServiceDependencies,
): Promise<ExchangeEvaluationTokenResult> {
  if (!isAccessCredential(token, "eva")) return { status: "invalid" };
  if (dependencies.repository === null || networkDigest === null) {
    return { status: "unavailable" };
  }
  const now = dependencies.now();
  const credential = createCredential("evs", dependencies.randomBytes(32));
  const result: ExchangeEvaluationAccessResult =
    await dependencies.repository.exchangeEvaluationAccess({
      tokenDigest: sha256(token),
      sessionId: createIdentifier("ses", dependencies.randomBytes(16)),
      sessionCredentialDigest: sha256(credential),
      networkDigest,
      now: now.toISOString(),
      sessionExpiresAt: new Date(
        now.getTime() + EVALUATOR_SESSION_LIFETIME_MS,
      ).toISOString(),
      windowStart: minuteWindow(now),
    });
  return result.status === "accepted"
    ? { status: "accepted", credential, expiresAt: result.expiresAt }
    : result;
}

export async function beginPaidGenerationWith(
  input: {
    sessionCredential: string | null;
    idempotencyKey: unknown;
    filingDigest: string;
    reference: string;
    networkDigest: string | null;
  },
  dependencies: AccessControlServiceDependencies,
): Promise<BeginGenerationResult> {
  if (input.sessionCredential === null) {
    return { status: "fallback", reason: "anonymous" };
  }
  if (
    !isAccessCredential(input.sessionCredential, "evs") ||
    !isGenerationIdempotencyKey(input.idempotencyKey)
  ) {
    return { status: "invalid" };
  }
  if (dependencies.repository === null || input.networkDigest === null) {
    return { status: "fallback", reason: "control_unavailable" };
  }
  const now = dependencies.now();
  return dependencies.repository.beginGeneration({
    sessionCredentialDigest: sha256(input.sessionCredential),
    idempotencyKey: input.idempotencyKey,
    filingDigest: input.filingDigest,
    requestId: createIdentifier("gen", dependencies.randomBytes(16)),
    reference: input.reference,
    networkDigest: input.networkDigest,
    now: now.toISOString(),
    expiresAt: new Date(
      now.getTime() + GENERATION_REQUEST_LIFETIME_MS,
    ).toISOString(),
    leaseUntil: new Date(
      now.getTime() + GENERATION_REQUEST_LEASE_MS,
    ).toISOString(),
    windowStart: minuteWindow(now),
  });
}

export function createDefaultAccessControlDependencies(
  repository: AccessControlRepository | null,
): AccessControlServiceDependencies {
  return {
    repository,
    now: () => new Date(),
    randomBytes,
  };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createCredential(prefix: string, bytes: Buffer): string {
  return `${prefix}_${bytes.toString("base64url")}`;
}

export function createIdentifier(prefix: string, bytes: Buffer): string {
  return `${prefix}_${bytes.toString("base64url")}`;
}

function minuteWindow(now: Date): string {
  return new Date(Math.floor(now.getTime() / 60_000) * 60_000).toISOString();
}
