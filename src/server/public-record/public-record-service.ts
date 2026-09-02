import { createHash, timingSafeEqual } from "node:crypto";

import {
  validateChronologyDeterminationSnapshot,
  DETERMINATION_TRANSIENT_LIFETIME_MS,
  type ChronologyDeterminationSnapshot,
} from "@/domain/determination/determination-experience";
import {
  isOwnerCredential,
  isOwnerLifecycleAction,
  isPublicationKey,
  isPublicRecordId,
  isPublicRecordReportReason,
  isReportKey,
  ownerTransition,
  publicRecordAvailability,
  PUBLIC_RECORD_LIFETIME_DAYS,
  PUBLIC_RECORD_SNAPSHOT_VERSION,
  type PublicRecord,
  type PublicRecordAvailability,
  type PublicRecordReportReason,
} from "@/domain/public-record/public-record";
import {
  isPublicConsultationParticipationKey,
  isPublicConsultationPosition,
  type PublicConsultationAggregate,
  type PublicConsultationPosition,
} from "@/domain/public-record/public-consultation";

import type { PublicRecordRepository } from "./public-record-repository";

export type PublishPublicRecordResult =
  | {
      status: "published";
      publicId: string;
      expiresAt: string;
      created: boolean;
    }
  | { status: "invalid" | "failed" };

export interface PublicRecordServiceDependencies {
  repository: PublicRecordRepository;
  now: () => Date;
  publicId: () => string;
  lifetimeDays?: number;
}

export async function publishPublicRecordWith(
  locale: string,
  input: unknown,
  dependencies: PublicRecordServiceDependencies,
): Promise<PublishPublicRecordResult> {
  if (!isPublishInput(input) || locale !== "en") return { status: "invalid" };
  const now = dependencies.now();
  const validated = validateChronologyDeterminationSnapshot(
    input.snapshot,
    now,
  );
  if (validated.status === "invalid") {
    return { status: "invalid" };
  }
  const issuedAt = new Date(validated.snapshot.issuedAt).getTime();
  if (now.getTime() - issuedAt > DETERMINATION_TRANSIENT_LIFETIME_MS) {
    return { status: "invalid" };
  }

  const publicId = dependencies.publicId();
  if (!isPublicRecordId(publicId)) return { status: "failed" };
  const publishedAt = now.toISOString();
  const lifetimeDays = dependencies.lifetimeDays ?? PUBLIC_RECORD_LIFETIME_DAYS;
  if (
    !Number.isInteger(lifetimeDays) ||
    lifetimeDays < 1 ||
    lifetimeDays > 3650
  ) {
    return { status: "failed" };
  }
  const expiresAt = new Date(
    now.getTime() + lifetimeDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const snapshotDigest = digest(JSON.stringify(validated.snapshot));
  const ownerCredentialDigest = digest(input.ownerCredential);
  const record: PublicRecord = {
    snapshotVersion: PUBLIC_RECORD_SNAPSHOT_VERSION,
    publicId,
    status: "published",
    publishedAt,
    expiresAt,
    updatedAt: publishedAt,
    snapshot: validated.snapshot,
  };

  try {
    const result = await dependencies.repository.create({
      record,
      publicationKey: input.publicationKey,
      ownerCredentialDigest,
      snapshotDigest,
    });
    if (
      result.status === "existing" &&
      (!safeEqual(result.record.ownerCredentialDigest, ownerCredentialDigest) ||
        !safeEqual(result.record.snapshotDigest, snapshotDigest))
    ) {
      return { status: "failed" };
    }
    return {
      status: "published",
      publicId: result.record.publicId,
      expiresAt: result.record.expiresAt,
      created: result.status === "created",
    };
  } catch {
    return { status: "failed" };
  }
}

export async function getPublicRecordWith(
  publicId: string,
  repository: PublicRecordRepository,
  now: Date,
): Promise<PublicRecordAvailability> {
  if (!isPublicRecordId(publicId)) return { status: "unavailable" };
  try {
    return publicRecordAvailability(await repository.find(publicId), now);
  } catch {
    return { status: "unavailable" };
  }
}

export type OwnedPublicRecordResult =
  | { status: "authorized"; record: PublicRecord }
  | { status: "unauthorized" | "unavailable" };

export async function getOwnedPublicRecordWith(
  publicId: string,
  ownerCredential: string,
  repository: PublicRecordRepository,
): Promise<OwnedPublicRecordResult> {
  if (!isPublicRecordId(publicId) || !isOwnerCredential(ownerCredential)) {
    return { status: "unauthorized" };
  }
  try {
    const stored = await repository.find(publicId);
    if (stored === null) return { status: "unavailable" };
    if (!safeEqual(stored.ownerCredentialDigest, digest(ownerCredential))) {
      return { status: "unauthorized" };
    }
    return { status: "authorized", record: publicRecordView(stored) };
  } catch {
    return { status: "unavailable" };
  }
}

export type OwnerRecordActionResult =
  | { status: "updated"; record: PublicRecord }
  | { status: "deleted" }
  | { status: "invalid" | "unauthorized" | "unavailable" | "failed" };

export async function applyOwnerRecordActionWith(
  publicId: string,
  ownerCredential: string,
  action: unknown,
  repository: PublicRecordRepository,
  now: Date,
): Promise<OwnerRecordActionResult> {
  if (!isOwnerLifecycleAction(action)) return { status: "invalid" };
  const owned = await getOwnedPublicRecordWith(
    publicId,
    ownerCredential,
    repository,
  );
  if (owned.status !== "authorized") return owned;
  const transition = ownerTransition(owned.record.status, action);
  if (transition === null) return { status: "invalid" };
  if (
    action === "restore" &&
    new Date(owned.record.expiresAt).getTime() <= now.getTime()
  ) {
    return { status: "invalid" };
  }
  try {
    if (transition === "delete") {
      return (await repository.delete(publicId))
        ? { status: "deleted" }
        : { status: "unavailable" };
    }
    const updated = await repository.updateStatus(
      publicId,
      owned.record.status,
      transition,
      now.toISOString(),
    );
    return updated === null
      ? { status: "failed" }
      : { status: "updated", record: publicRecordView(updated) };
  } catch {
    return { status: "failed" };
  }
}

export async function reportPublicRecordWith(
  input: unknown,
  repository: PublicRecordRepository,
  now: Date,
): Promise<"reported" | "invalid" | "unavailable" | "failed"> {
  if (!isReportInput(input)) return "invalid";
  try {
    const result = await repository.report({
      publicId: input.publicId,
      reportKey: input.reportKey,
      reason: input.reason,
      createdAt: now.toISOString(),
    });
    return result === "unavailable" ? "unavailable" : "reported";
  } catch {
    return "failed";
  }
}

export type GetPublicConsultationResult =
  | { status: "available"; aggregate: PublicConsultationAggregate }
  | { status: "unavailable" | "failed" };

export async function getPublicConsultationWith(
  locale: string,
  publicId: string,
  repository: PublicRecordRepository,
  now: Date,
): Promise<GetPublicConsultationResult> {
  if (locale !== "en" || !isPublicRecordId(publicId)) {
    return { status: "unavailable" };
  }
  try {
    const aggregate = await repository.consultationAggregate(
      publicId,
      now.toISOString(),
    );
    return aggregate === null
      ? { status: "unavailable" }
      : { status: "available", aggregate };
  } catch {
    return { status: "failed" };
  }
}

export type SubmitPublicConsultationResult =
  | {
      status: "accepted";
      aggregate: PublicConsultationAggregate;
      selectedPosition: PublicConsultationPosition;
      created: boolean;
    }
  | { status: "invalid" | "unavailable" | "failed" };

export async function submitPublicConsultationWith(
  locale: string,
  input: unknown,
  repository: PublicRecordRepository,
  now: Date,
): Promise<SubmitPublicConsultationResult> {
  if (locale !== "en" || !isConsultationInput(input)) {
    return { status: "invalid" };
  }
  try {
    const result = await repository.submitConsultation({
      publicId: input.publicId,
      participationDigest: digest(input.participationKey),
      position: input.position,
      createdAt: now.toISOString(),
    });
    return result === "unavailable"
      ? { status: "unavailable" }
      : { status: "accepted", ...result };
  } catch {
    return { status: "failed" };
  }
}

export async function bureauUnpublishWith(
  publicId: string,
  repository: PublicRecordRepository,
  now: Date,
): Promise<boolean> {
  if (!isPublicRecordId(publicId)) return false;
  try {
    const record = await repository.find(publicId);
    if (record === null) return false;
    if (record.status !== "bureau_unpublished") {
      const updated = await repository.updateStatus(
        publicId,
        record.status,
        "bureau_unpublished",
        now.toISOString(),
      );
      if (updated === null) return false;
    }
    await repository.resolveReports(publicId, now.toISOString());
    return true;
  } catch {
    return false;
  }
}

function isPublishInput(value: unknown): value is {
  snapshot: ChronologyDeterminationSnapshot;
  publicationKey: string;
  ownerCredential: string;
} {
  return (
    isRecord(value) &&
    hasExactly(value, ["snapshot", "publicationKey", "ownerCredential"]) &&
    isPublicationKey(value.publicationKey) &&
    isOwnerCredential(value.ownerCredential)
  );
}

function isReportInput(value: unknown): value is {
  publicId: string;
  reportKey: string;
  reason: PublicRecordReportReason;
} {
  return (
    isRecord(value) &&
    hasExactly(value, ["publicId", "reportKey", "reason"]) &&
    isPublicRecordId(value.publicId) &&
    isReportKey(value.reportKey) &&
    isPublicRecordReportReason(value.reason)
  );
}

function isConsultationInput(value: unknown): value is {
  publicId: string;
  participationKey: string;
  position: PublicConsultationPosition;
} {
  return (
    isRecord(value) &&
    hasExactly(value, ["publicId", "participationKey", "position"]) &&
    isPublicRecordId(value.publicId) &&
    isPublicConsultationParticipationKey(value.participationKey) &&
    isPublicConsultationPosition(value.position)
  );
}

function publicRecordView(record: PublicRecord): PublicRecord {
  return {
    snapshotVersion: record.snapshotVersion,
    publicId: record.publicId,
    status: record.status,
    publishedAt: record.publishedAt,
    expiresAt: record.expiresAt,
    updatedAt: record.updatedAt,
    snapshot: record.snapshot,
  };
}

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactly(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return (
    actual.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}
