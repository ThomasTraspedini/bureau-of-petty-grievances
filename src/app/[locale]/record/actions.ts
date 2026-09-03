"use server";

import { randomBytes } from "node:crypto";
import { after } from "next/server";

import { isPublicConsultationPosition } from "@/domain/public-record/public-consultation";
import {
  isOwnerLifecycleAction,
  isPublicRecordId,
  isPublicRecordReportReason,
} from "@/domain/public-record/public-record";
import {
  applyOwnerRecordActionWith,
  getOwnedPublicRecordWith,
  publishPublicRecordWith,
  reportPublicRecordWith,
  submitPublicConsultationWith,
  type OwnedPublicRecordResult,
  type OwnerRecordActionResult,
  type PublishPublicRecordResult,
  type SubmitPublicConsultationResult,
} from "@/server/public-record/public-record-service";
import { getRuntimePublicRecordRepository } from "@/server/public-record/runtime-public-records";
import {
  analyticsSubject,
  recordServerProductEvent,
} from "@/server/observability/runtime-product-analytics";

export type {
  OwnedPublicRecordResult,
  OwnerRecordActionResult,
  PublishPublicRecordResult,
  SubmitPublicConsultationResult,
};

export async function publishPublicRecord(
  locale: string,
  input: unknown,
  journeyId?: unknown,
): Promise<PublishPublicRecordResult> {
  const department = departmentFromPublishInput(input);
  const repository = await getRuntimePublicRecordRepository();
  const result =
    repository === null
      ? ({ status: "failed" } as const)
      : await publishPublicRecordWith(locale, input, {
          repository,
          now: () => new Date(),
          publicId: () => `rec_${randomBytes(16).toString("base64url")}`,
        });
  const subject =
    result.status === "published"
      ? analyticsSubject("public_record", result.publicId)
      : null;
  after(() =>
    recordServerProductEvent({
      journeyId,
      locale: "en",
      department,
      name: "public_record_published",
      properties: {
        outcome: result.status,
        ...(result.status === "published"
          ? {
              created: result.created,
              ...(subject ? { recordSubject: subject } : {}),
            }
          : {}),
      },
    }),
  );
  return result;
}

export async function loadOwnedPublicRecord(
  publicId: string,
  ownerCredential: string,
): Promise<OwnedPublicRecordResult> {
  const repository = await getRuntimePublicRecordRepository();
  if (repository === null) return { status: "unavailable" };
  return getOwnedPublicRecordWith(publicId, ownerCredential, repository);
}

export async function applyOwnerRecordAction(
  publicId: string,
  ownerCredential: string,
  action: unknown,
  journeyId?: unknown,
): Promise<OwnerRecordActionResult> {
  const repository = await getRuntimePublicRecordRepository();
  const department = await departmentForPublicId(repository, publicId);
  const result =
    repository === null
      ? ({ status: "unavailable" } as const)
      : await applyOwnerRecordActionWith(
          publicId,
          ownerCredential,
          action,
          repository,
          new Date(),
        );
  const subject = isPublicRecordId(publicId)
    ? analyticsSubject("public_record", publicId)
    : null;
  if (subject && isOwnerLifecycleAction(action)) {
    after(() =>
      recordServerProductEvent({
        journeyId,
        locale: "en",
        department,
        name: "owner_record_changed",
        properties: {
          action,
          outcome: result.status,
          recordSubject: subject,
        },
      }),
    );
  }
  return result;
}

export async function reportPublicRecord(
  input: unknown,
  journeyId?: unknown,
): Promise<"reported" | "invalid" | "unavailable" | "failed"> {
  const repository = await getRuntimePublicRecordRepository();
  const department =
    isRecord(input) && typeof input.publicId === "string"
      ? await departmentForPublicId(repository, input.publicId)
      : "chronology";
  const result =
    repository === null
      ? "failed"
      : await reportPublicRecordWith(input, repository, new Date());
  if (isRecord(input) && isPublicRecordId(input.publicId)) {
    const subject = analyticsSubject("public_record", input.publicId);
    if (subject) {
      after(() =>
        recordServerProductEvent({
          journeyId,
          locale: "en",
          department,
          name: "report_submitted",
          properties: {
            recordSubject: subject,
            outcome: result,
            ...(isPublicRecordReportReason(input.reason)
              ? { reason: input.reason }
              : {}),
          },
        }),
      );
    }
  }
  return result;
}

export async function submitPublicConsultation(
  locale: string,
  input: unknown,
  journeyId?: unknown,
): Promise<SubmitPublicConsultationResult> {
  const repository = await getRuntimePublicRecordRepository();
  const department =
    isRecord(input) && typeof input.publicId === "string"
      ? await departmentForPublicId(repository, input.publicId)
      : "chronology";
  const result =
    repository === null
      ? ({ status: "failed" } as const)
      : await submitPublicConsultationWith(
          locale,
          input,
          repository,
          new Date(),
        );
  if (isRecord(input) && isPublicRecordId(input.publicId)) {
    const subject = analyticsSubject("public_record", input.publicId);
    if (subject) {
      after(() =>
        recordServerProductEvent({
          journeyId,
          locale: "en",
          department,
          name: "consultation_submitted",
          properties: {
            recordSubject: subject,
            outcome: result.status,
            ...(isPublicConsultationPosition(input.position)
              ? { position: input.position }
              : {}),
          },
        }),
      );
    }
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function departmentFromPublishInput(input: unknown) {
  if (
    !isRecord(input) ||
    !isRecord(input.snapshot) ||
    !isRecord(input.snapshot.filing)
  ) {
    return "chronology" as const;
  }
  return input.snapshot.filing.department === "digital_conduct"
    ? ("digital_conduct" as const)
    : ("chronology" as const);
}

async function departmentForPublicId(
  repository: Awaited<ReturnType<typeof getRuntimePublicRecordRepository>>,
  publicId: string,
) {
  if (repository === null || !isPublicRecordId(publicId))
    return "chronology" as const;
  try {
    const stored = await repository.find(publicId);
    return stored?.snapshot.filing.department === "digital_conduct"
      ? ("digital_conduct" as const)
      : ("chronology" as const);
  } catch {
    return "chronology" as const;
  }
}
