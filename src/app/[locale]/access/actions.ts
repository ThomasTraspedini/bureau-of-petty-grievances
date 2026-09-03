"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { after } from "next/server";

import { isAccessCredential } from "@/domain/access/evaluation-access";
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
import {
  analyticsSubject,
  recordServerProductEvent,
} from "@/server/observability/runtime-product-analytics";

export async function exchangeStandardToken(
  locale: InterfaceLocale,
  token: unknown,
  journeyId?: unknown,
) {
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
  const successor = isAccessCredential(token, "sti");
  const invitationSubject =
    successor && typeof token === "string"
      ? analyticsSubject("successor_invitation", token)
      : null;
  after(() =>
    recordServerProductEvent({
      journeyId,
      locale,
      department: "chronology",
      name: "access_redeemed",
      properties: {
        kind: successor ? "successor" : "standard",
        outcome: result.status,
        ...(invitationSubject ? { invitationSubject } : {}),
      },
    }),
  );
  if (successor && invitationSubject) {
    after(() =>
      recordServerProductEvent({
        journeyId,
        locale,
        department: "chronology",
        name: "successor_invitation_changed",
        properties: {
          action: "claim",
          outcome: result.status,
          invitationSubject,
        },
      }),
    );
  }
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
  journeyId?: unknown,
) {
  const origin = getRuntimePublicRecordOrigin();
  if (origin.status !== "valid") {
    after(() =>
      recordServerProductEvent({
        journeyId,
        locale,
        department: "chronology",
        name: "successor_invitation_changed",
        properties: {
          action: replace ? "replace" : "issue",
          outcome: "unavailable",
        },
      }),
    );
    return { status: "unavailable" as const };
  }
  const repository = await getRuntimeAccessControlRepository();
  const result = await issueSuccessorTokenWith(
    (await cookies()).get(STANDARD_SESSION_COOKIE)?.value ?? null,
    replace,
    {
      ...createDefaultAccessControlDependencies(repository),
      randomBytes,
    },
  );
  const invitationSubject =
    result.status === "issued"
      ? analyticsSubject("successor_invitation", result.credential)
      : null;
  after(() =>
    recordServerProductEvent({
      journeyId,
      locale,
      department: "chronology",
      name: "successor_invitation_changed",
      properties: {
        action: replace ? "replace" : "issue",
        outcome: result.status,
        ...(invitationSubject ? { invitationSubject } : {}),
      },
    }),
  );
  return result.status === "issued"
    ? {
        status: "issued" as const,
        invitationUrl: `${origin.origin}/${locale}/access#${result.credential}`,
        summary: result.summary,
      }
    : result;
}

export async function cancelSuccessorInvitation(
  locale: InterfaceLocale,
  journeyId?: unknown,
) {
  const repository = await getRuntimeAccessControlRepository();
  const result = await cancelSuccessorTokenWith(
    (await cookies()).get(STANDARD_SESSION_COOKIE)?.value ?? null,
    { repository, now: () => new Date() },
  );
  after(() =>
    recordServerProductEvent({
      journeyId,
      locale,
      department: "chronology",
      name: "successor_invitation_changed",
      properties: { action: "cancel", outcome: result.status },
    }),
  );
  return result;
}
