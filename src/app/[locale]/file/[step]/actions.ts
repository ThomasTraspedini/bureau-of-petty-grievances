"use server";

import { randomBytes } from "node:crypto";

import { createConfiguredOpenAIDeterminationLanguageProvider } from "@/providers/openai-determination-language";
import {
  completeFilingReviewWith,
  type CompleteFilingResult,
} from "@/server/determination/complete-filing-review";

export type { CompleteFilingResult };

export async function completeFilingReview(
  locale: string,
  draft: unknown,
): Promise<CompleteFilingResult> {
  return completeFilingReviewWith(locale, draft, {
    provider: createConfiguredOpenAIDeterminationLanguageProvider(),
    now: () => new Date(),
    randomReferencePart: () => randomBytes(3).toString("hex").toUpperCase(),
  });
}
