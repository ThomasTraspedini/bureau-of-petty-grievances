"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { after } from "next/server";

import {
  EVALUATION_SESSION_COOKIE,
  STANDARD_SESSION_COOKIE,
  createDefaultAccessControlDependencies,
  exchangeEvaluationTokenWith,
} from "@/server/access/access-control-service";
import { createNetworkDigest } from "@/server/access/network-identity";
import { getRuntimeAccessControlRepository } from "@/server/access/runtime-access-control";
import { recordServerProductEvent } from "@/server/observability/runtime-product-analytics";
import type { InterfaceLocale } from "@/i18n/routing";

export type ExchangeEvaluationTokenActionResult =
  | { status: "accepted" }
  | {
      status: "invalid" | "expired" | "revoked" | "limited" | "unavailable";
    };

export async function exchangeEvaluationToken(
  locale: InterfaceLocale,
  token: unknown,
  journeyId?: unknown,
): Promise<ExchangeEvaluationTokenActionResult> {
  const now = new Date();
  const result = await exchangeEvaluationTokenWith(
    token,
    createNetworkDigest(await headers(), now),
    {
      ...createDefaultAccessControlDependencies(
        await getRuntimeAccessControlRepository(),
      ),
      now: () => now,
      randomBytes,
    },
  );
  after(() =>
    recordServerProductEvent({
      journeyId,
      locale,
      department: "chronology",
      name: "access_redeemed",
      properties: { kind: "evaluation", outcome: result.status },
    }),
  );
  if (result.status !== "accepted") return result;

  const expires = new Date(result.expiresAt);
  const cookieStore = await cookies();
  cookieStore.delete(STANDARD_SESSION_COOKIE);
  cookieStore.set(EVALUATION_SESSION_COOKIE, result.credential, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
  return { status: "accepted" };
}
