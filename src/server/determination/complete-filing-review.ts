import type { Buffer } from "node:buffer";

import { assessFiling } from "@/domain/determination/assessment";
import {
  createDeterminationReference,
  createIssuedDetermination,
  type IssuedDetermination,
} from "@/domain/determination/determination-experience";
import type { FilingError } from "@/domain/filing/chronology";
import { validateFilingDraft } from "@/domain/filing/filing";
import type {
  AnalyticsAccessKind,
  AnalyticsFallbackReason,
  AnalyticsPathCode,
} from "@/domain/observability/product-analytics";
import type { DeterminationLanguageProvider } from "@/providers/determination-language-provider";
import type { AccessControlRepository } from "@/server/access/access-control-repository";
import {
  beginPaidGenerationWith,
  sha256,
} from "@/server/access/access-control-service";

import { generateDeterminationLanguage } from "./generate-determination-language";

export type CompleteFilingResult =
  | { status: "accepted"; determination: IssuedDetermination }
  | { status: "rejected"; errors: FilingError[] }
  | { status: "limited"; retryAfterSeconds: number }
  | { status: "failed" };

export interface CompleteFilingDependencies {
  provider: DeterminationLanguageProvider;
  now: () => Date;
  randomReferencePart: () => string;
}

export interface ControlledCompleteFilingDependencies extends CompleteFilingDependencies {
  accessRepository: AccessControlRepository | null;
  sessionCredential: string | null;
  networkDigest: string | null;
  randomAccessBytes: (size: number) => Buffer;
  monotonicNow?: () => number;
  observe?: (observation: CompleteFilingObservation) => void;
}

export interface CompleteFilingObservation {
  outcome:
    | "accepted_provider"
    | "accepted_fallback"
    | "rejected"
    | "limited"
    | "failed";
  accessKind: AnalyticsAccessKind;
  durationMs: number;
  pathCode?: AnalyticsPathCode;
  attempts?: 1 | 2;
  providerAttempts?: 0 | 1 | 2;
  fallbackReason?: AnalyticsFallbackReason;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
}

export async function completeFilingReviewWith(
  locale: string,
  draft: unknown,
  dependencies: CompleteFilingDependencies,
): Promise<CompleteFilingResult> {
  const validation = validateFilingDraft(draft, locale);
  if (validation.status === "invalid") {
    return { status: "rejected", errors: validation.errors };
  }

  try {
    const assessment = assessFiling(validation.filing);
    const generated = await generateDeterminationLanguage({
      filing: validation.filing,
      assessment,
      provider: dependencies.provider,
    });
    if (generated.status !== "completed") return { status: "failed" };

    const issuedAt = dependencies.now();
    return {
      status: "accepted",
      determination: createIssuedDetermination(
        createDeterminationReference(
          issuedAt,
          dependencies.randomReferencePart(),
          validation.filing.department,
        ),
        issuedAt.toISOString(),
        assessment,
        generated.language,
      ),
    };
  } catch {
    return { status: "failed" };
  }
}

export async function completeFilingReviewControlledWith(
  locale: string,
  draft: unknown,
  idempotencyKey: unknown,
  dependencies: ControlledCompleteFilingDependencies,
): Promise<CompleteFilingResult> {
  const startedAt = dependencies.monotonicNow?.() ?? Date.now();
  const accessKind = analyticsAccessKind(dependencies.sessionCredential);
  const validation = validateFilingDraft(draft, locale);
  if (validation.status === "invalid") {
    observeSafely(dependencies, {
      outcome: "rejected",
      accessKind,
      durationMs: elapsed(startedAt, dependencies),
    });
    return { status: "rejected", errors: validation.errors };
  }

  const pathCode = analyticsPathCode(validation.filing);

  let reservedRequestId: string | null = null;
  let reservationFinalized = false;
  try {
    const assessment = assessFiling(validation.filing);
    const initialIssuedAt = dependencies.now();
    const initialReference = createDeterminationReference(
      initialIssuedAt,
      dependencies.randomReferencePart(),
      validation.filing.department,
    );

    const access =
      dependencies.provider.isConfigured === false
        ? ({ status: "fallback", reason: "control_unavailable" } as const)
        : await beginPaidGenerationWith(
            {
              sessionCredential: dependencies.sessionCredential,
              idempotencyKey,
              filingDigest: sha256(JSON.stringify(validation.filing)),
              reference: initialReference,
              networkDigest: dependencies.networkDigest,
            },
            {
              repository: dependencies.accessRepository,
              now: dependencies.now,
              randomBytes: dependencies.randomAccessBytes,
            },
          );

    if (access.status === "invalid") {
      observeSafely(dependencies, {
        outcome: "failed",
        accessKind,
        durationMs: elapsed(startedAt, dependencies),
        pathCode,
      });
      return { status: "failed" };
    }
    if (access.status === "limited" || access.status === "pending") {
      observeSafely(dependencies, {
        outcome: "limited",
        accessKind,
        durationMs: elapsed(startedAt, dependencies),
        pathCode,
      });
      return {
        status: "limited",
        retryAfterSeconds: access.retryAfterSeconds,
      };
    }

    const issuedAt = new Date(
      "issuedAt" in access && access.issuedAt
        ? access.issuedAt
        : initialIssuedAt.toISOString(),
    );
    const reference =
      "reference" in access && access.reference
        ? access.reference
        : initialReference;

    let provider = dependencies.provider;
    if (access.status === "reserved") {
      reservedRequestId = access.requestId;
      provider = createMeteredProvider(
        dependencies.provider,
        dependencies.accessRepository,
        access.requestId,
        dependencies.now,
      );
    } else {
      provider = {
        isConfigured: false,
        async generate() {
          await Promise.resolve();
          return { status: "terminal_failure", reason: "configuration" };
        },
      };
    }

    const generated = await generateDeterminationLanguage({
      filing: validation.filing,
      assessment,
      provider,
    });
    if (generated.status !== "completed") {
      if (reservedRequestId !== null && dependencies.accessRepository) {
        await dependencies.accessRepository.completeGeneration(
          reservedRequestId,
          "failed",
          dependencies.now().toISOString(),
        );
        reservationFinalized = true;
      }
      observeSafely(dependencies, {
        outcome: "failed",
        accessKind,
        durationMs: elapsed(startedAt, dependencies),
        pathCode,
      });
      return { status: "failed" };
    }

    if (reservedRequestId !== null && dependencies.accessRepository) {
      await dependencies.accessRepository.completeGeneration(
        reservedRequestId,
        generated.source === "provider" ? "provider" : "fallback",
        dependencies.now().toISOString(),
      );
      reservationFinalized = true;
    }

    const providerBacked = generated.source === "provider";
    const fallbackReason =
      generated.source === "fallback"
        ? access.status === "fallback"
          ? access.reason
          : generated.reason
        : undefined;
    observeSafely(dependencies, {
      outcome: providerBacked ? "accepted_provider" : "accepted_fallback",
      accessKind,
      durationMs: elapsed(startedAt, dependencies),
      pathCode,
      attempts: generated.attempts,
      providerAttempts: access.status === "reserved" ? generated.attempts : 0,
      ...(fallbackReason ? { fallbackReason } : {}),
      inputTokens: generated.tokenUsage.inputTokens,
      outputTokens: generated.tokenUsage.outputTokens,
      ...(generated.source === "provider"
        ? { model: generated.provider.model }
        : generated.model
          ? { model: generated.model }
          : {}),
    });

    return {
      status: "accepted",
      determination: createIssuedDetermination(
        reference,
        issuedAt.toISOString(),
        assessment,
        generated.language,
      ),
    };
  } catch {
    if (
      reservedRequestId !== null &&
      !reservationFinalized &&
      dependencies.accessRepository
    ) {
      try {
        await dependencies.accessRepository.completeGeneration(
          reservedRequestId,
          "failed",
          dependencies.now().toISOString(),
        );
      } catch {
        // A stale reservation is recovered without another provider call.
      }
    }
    observeSafely(dependencies, {
      outcome: "failed",
      accessKind,
      durationMs: elapsed(startedAt, dependencies),
      pathCode,
    });
    return { status: "failed" };
  }
}

function analyticsAccessKind(
  sessionCredential: string | null,
): AnalyticsAccessKind {
  if (sessionCredential?.startsWith("evs_")) return "evaluation";
  if (sessionCredential?.startsWith("sts_")) return "standard";
  return "anonymous";
}

function analyticsPathCode(
  filing:
    | import("@/domain/filing/chronology").ChronologyFiling
    | import("@/domain/filing/digital-conduct").DigitalConductFiling
    | import("@/domain/filing/domestic-affairs").DomesticAffairsFiling
    | import("@/domain/filing/social-planning").SocialPlanningFiling,
): AnalyticsPathCode {
  if (filing.department === "chronology") return `chronology_${filing.offence}`;
  if (filing.department === "digital_conduct")
    return `digital_conduct_${filing.offence}`;
  return filing.department === "domestic_affairs"
    ? `domestic_affairs_${filing.offence}`
    : `social_planning_${filing.offence}`;
}

function elapsed(
  startedAt: number,
  dependencies: ControlledCompleteFilingDependencies,
): number {
  const endedAt = dependencies.monotonicNow?.() ?? Date.now();
  return Math.min(3_600_000, Math.max(0, Math.round(endedAt - startedAt)));
}

function observeSafely(
  dependencies: ControlledCompleteFilingDependencies,
  observation: CompleteFilingObservation,
): void {
  try {
    dependencies.observe?.(observation);
  } catch {
    // Observation cannot change filing completion behavior.
  }
}

function createMeteredProvider(
  provider: DeterminationLanguageProvider,
  repository: AccessControlRepository | null,
  requestId: string,
  now: () => Date,
): DeterminationLanguageProvider {
  return {
    isConfigured: true,
    async generate(command, attempt) {
      if (repository === null) {
        return { status: "terminal_failure", reason: "configuration" };
      }
      const reservation = await repository.reserveProviderAttempt(
        requestId,
        now().toISOString(),
      );
      if (reservation.status === "denied") {
        return { status: "terminal_failure", reason: "configuration" };
      }
      return provider.generate(command, attempt);
    },
  };
}
