"use server";

import {
  type FilingError,
  validateChronologyDraft,
} from "@/domain/filing/chronology";

export type CompleteFilingResult =
  { status: "accepted" } | { status: "rejected"; errors: FilingError[] };

export async function completeFilingReview(
  locale: string,
  draft: unknown,
): Promise<CompleteFilingResult> {
  const result = await Promise.resolve(validateChronologyDraft(draft, locale));
  if (result.status === "invalid") {
    return { status: "rejected", errors: result.errors };
  }

  return { status: "accepted" };
}
