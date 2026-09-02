"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";

import { createConfiguredOpenAIDeterminationLanguageProvider } from "@/providers/openai-determination-language";
import { EVALUATION_SESSION_COOKIE } from "@/server/access/access-control-service";
import { createNetworkDigest } from "@/server/access/network-identity";
import { getRuntimeAccessControlRepository } from "@/server/access/runtime-access-control";
import {
  completeFilingReviewControlledWith,
  type CompleteFilingResult,
} from "@/server/determination/complete-filing-review";

export type { CompleteFilingResult };

export async function completeFilingReview(
  locale: string,
  draft: unknown,
  idempotencyKey: unknown,
): Promise<CompleteFilingResult> {
  const requestTime = new Date();
  const requestCookies = await cookies();
  const requestHeaders = await headers();
  return completeFilingReviewControlledWith(locale, draft, idempotencyKey, {
    provider: createConfiguredOpenAIDeterminationLanguageProvider(),
    accessRepository: await getRuntimeAccessControlRepository(),
    sessionCredential:
      requestCookies.get(EVALUATION_SESSION_COOKIE)?.value ?? null,
    networkDigest: createNetworkDigest(requestHeaders, requestTime),
    now: () => new Date(),
    randomReferencePart: () => randomBytes(3).toString("hex").toUpperCase(),
    randomAccessBytes: randomBytes,
  });
}
