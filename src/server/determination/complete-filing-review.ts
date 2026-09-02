import type { Buffer } from "node:buffer";

import {
  assessChronologyFiling,
  type ChronologyAssessment,
} from "@/domain/determination/chronology-assessment";
import {
  createDeterminationReference,
  DETERMINATION_EXPERIENCE_VERSION,
  type IssuedChronologyDetermination,
} from "@/domain/determination/determination-experience";
import type { FilingError } from "@/domain/filing/chronology";
import { validateChronologyDraft } from "@/domain/filing/chronology";
import type { DeterminationLanguageProvider } from "@/providers/determination-language-provider";
import type { AccessControlRepository } from "@/server/access/access-control-repository";
import {
  beginPaidGenerationWith,
  sha256,
} from "@/server/access/access-control-service";

import { generateDeterminationLanguage } from "./generate-determination-language";

export type CompleteFilingResult =
  | { status: "accepted"; determination: IssuedChronologyDetermination }
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
}

export async function completeFilingReviewWith(
  locale: string,
  draft: unknown,
  dependencies: CompleteFilingDependencies,
): Promise<CompleteFilingResult> {
  const validation = validateChronologyDraft(draft, locale);
  if (validation.status === "invalid") {
    return { status: "rejected", errors: validation.errors };
  }

  try {
    const assessment: ChronologyAssessment = assessChronologyFiling(
      validation.filing,
    );
    const generated = await generateDeterminationLanguage({
      filing: validation.filing,
      assessment,
      provider: dependencies.provider,
    });
    if (generated.status !== "completed") return { status: "failed" };

    const issuedAt = dependencies.now();
    return {
      status: "accepted",
      determination: {
        experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
        locale: validation.filing.locale,
        reference: createDeterminationReference(
          issuedAt,
          dependencies.randomReferencePart(),
        ),
        issuedAt: issuedAt.toISOString(),
        assessment,
        language: generated.language,
      },
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
  const validation = validateChronologyDraft(draft, locale);
  if (validation.status === "invalid") {
    return { status: "rejected", errors: validation.errors };
  }

  let reservedRequestId: string | null = null;
  let reservationFinalized = false;
  try {
    const assessment = assessChronologyFiling(validation.filing);
    const initialIssuedAt = dependencies.now();
    const initialReference = createDeterminationReference(
      initialIssuedAt,
      dependencies.randomReferencePart(),
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

    if (access.status === "invalid") return { status: "failed" };
    if (access.status === "limited" || access.status === "pending") {
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

    return {
      status: "accepted",
      determination: {
        experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
        locale: validation.filing.locale,
        reference,
        issuedAt: issuedAt.toISOString(),
        assessment,
        language: generated.language,
      },
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
    return { status: "failed" };
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
