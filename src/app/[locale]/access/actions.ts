"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";

import type { InterfaceLocale } from "@/i18n/routing";
import {
  EVALUATION_SESSION_COOKIE,
  STANDARD_SESSION_COOKIE,
  cancelSuccessorTokenWith,
  createDefaultAccessControlDependencies,
  exchangeStandardTokenWith,
  getStandardAccessStatusWith,
  issueSuccessorTokenWith,
} from "@/server/access/access-control-service";
import { createNetworkDigest } from "@/server/access/network-identity";
import { getRuntimeAccessControlRepository } from "@/server/access/runtime-access-control";
import { getRuntimePublicRecordOrigin } from "@/server/public-record/public-record-origin";

export async function exchangeStandardToken(token: unknown) {
  const now = new Date();
  const result = await exchangeStandardTokenWith(
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
  if (result.status !== "accepted") return result;

  const cookieStore = await cookies();
  cookieStore.delete(EVALUATION_SESSION_COOKIE);
  cookieStore.set(STANDARD_SESSION_COOKIE, result.credential, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(result.expiresAt),
  });
  return { status: "accepted" as const, summary: result.summary };
}

export async function getStandardAccessStatus() {
  const repository = await getRuntimeAccessControlRepository();
  return getStandardAccessStatusWith(
    (await cookies()).get(STANDARD_SESSION_COOKIE)?.value ?? null,
    { repository, now: () => new Date() },
  );
}

export async function issueSuccessorInvitation(
  locale: InterfaceLocale,
  replace: boolean,
) {
  const origin = getRuntimePublicRecordOrigin();
  if (origin.status !== "valid") return { status: "unavailable" as const };
  const repository = await getRuntimeAccessControlRepository();
  const result = await issueSuccessorTokenWith(
    (await cookies()).get(STANDARD_SESSION_COOKIE)?.value ?? null,
    replace,
    {
      ...createDefaultAccessControlDependencies(repository),
      randomBytes,
    },
  );
  return result.status === "issued"
    ? {
        status: "issued" as const,
        invitationUrl: `${origin.origin}/${locale}/access#${result.credential}`,
        summary: result.summary,
      }
    : result;
}

export async function cancelSuccessorInvitation() {
  const repository = await getRuntimeAccessControlRepository();
  return cancelSuccessorTokenWith(
    (await cookies()).get(STANDARD_SESSION_COOKIE)?.value ?? null,
    { repository, now: () => new Date() },
  );
}
