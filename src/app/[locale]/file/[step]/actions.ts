"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { after } from "next/server";

import { createConfiguredOpenAIDeterminationLanguageProvider } from "@/providers/openai-determination-language";
import {
  EVALUATION_SESSION_COOKIE,
  STANDARD_SESSION_COOKIE,
} from "@/server/access/access-control-service";
import { createNetworkDigest } from "@/server/access/network-identity";
import { getRuntimeAccessControlRepository } from "@/server/access/runtime-access-control";
import {
  completeFilingReviewControlledWith,
  type CompleteFilingResult,
} from "@/server/determination/complete-filing-review";
import { recordServerProductEvent } from "@/server/observability/runtime-product-analytics";
import { consumeE2eFailureInstruction } from "@/server/testing/e2e-failure-injection";

export type { CompleteFilingResult };

export async function completeFilingReview(
  locale: string,
  draft: unknown,
  idempotencyKey: unknown,
  journeyId?: unknown,
): Promise<CompleteFilingResult> {
  const department =
    isRecord(draft) && draft.department === "digital_conduct"
      ? "digital_conduct"
      : "chronology";
  const requestTime = new Date();
  const requestCookies = await cookies();
  const requestHeaders = await headers();
  if (consumeE2eFailureInstruction(requestHeaders, "complete_filing")) {
    return { status: "failed" };
  }
  return completeFilingReviewControlledWith(locale, draft, idempotencyKey, {
    provider: createConfiguredOpenAIDeterminationLanguageProvider(),
    accessRepository: await getRuntimeAccessControlRepository(),
    sessionCredential:
      requestCookies.get(STANDARD_SESSION_COOKIE)?.value ??
      requestCookies.get(EVALUATION_SESSION_COOKIE)?.value ??
      null,
    networkDigest: createNetworkDigest(requestHeaders, requestTime),
    now: () => new Date(),
    randomReferencePart: () => randomBytes(3).toString("hex").toUpperCase(),
    randomAccessBytes: randomBytes,
    monotonicNow: () => performance.now(),
    observe: (observation) => {
      after(() =>
        recordServerProductEvent({
          journeyId,
          locale: "en",
          department,
          name: "determination_completed",
          properties: observation,
        }),
      );
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
