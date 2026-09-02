"use server";

import { randomBytes } from "node:crypto";

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

export type {
  OwnedPublicRecordResult,
  OwnerRecordActionResult,
  PublishPublicRecordResult,
  SubmitPublicConsultationResult,
};

export async function publishPublicRecord(
  locale: string,
  input: unknown,
): Promise<PublishPublicRecordResult> {
  const repository = await getRuntimePublicRecordRepository();
  if (repository === null) return { status: "failed" };
  return publishPublicRecordWith(locale, input, {
    repository,
    now: () => new Date(),
    publicId: () => `rec_${randomBytes(16).toString("base64url")}`,
  });
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
): Promise<OwnerRecordActionResult> {
  const repository = await getRuntimePublicRecordRepository();
  if (repository === null) return { status: "unavailable" };
  return applyOwnerRecordActionWith(
    publicId,
    ownerCredential,
    action,
    repository,
    new Date(),
  );
}

export async function reportPublicRecord(
  input: unknown,
): Promise<"reported" | "invalid" | "unavailable" | "failed"> {
  const repository = await getRuntimePublicRecordRepository();
  if (repository === null) return "failed";
  return reportPublicRecordWith(input, repository, new Date());
}

export async function submitPublicConsultation(
  locale: string,
  input: unknown,
): Promise<SubmitPublicConsultationResult> {
  const repository = await getRuntimePublicRecordRepository();
  if (repository === null) return { status: "failed" };
  return submitPublicConsultationWith(locale, input, repository, new Date());
}
