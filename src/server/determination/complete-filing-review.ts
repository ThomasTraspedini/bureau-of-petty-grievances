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

import { generateDeterminationLanguage } from "./generate-determination-language";

export type CompleteFilingResult =
  | { status: "accepted"; determination: IssuedChronologyDetermination }
  | { status: "rejected"; errors: FilingError[] }
  | { status: "failed" };

export interface CompleteFilingDependencies {
  provider: DeterminationLanguageProvider;
  now: () => Date;
  randomReferencePart: () => string;
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
