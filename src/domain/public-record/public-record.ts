import type { ChronologyDeterminationSnapshot } from "@/domain/determination/determination-experience";

export const PUBLIC_RECORD_SNAPSHOT_VERSION = 1 as const;
export const PUBLIC_RECORD_LIFETIME_DAYS = 180 as const;

export const PUBLIC_RECORD_STATUSES = [
  "published",
  "owner_unpublished",
  "bureau_unpublished",
] as const;
export type PublicRecordStatus = (typeof PUBLIC_RECORD_STATUSES)[number];

export const PUBLIC_RECORD_REPORT_REASONS = [
  "privacy_concern",
  "harmful_content",
  "wrong_person",
  "other_safety_concern",
] as const;
export type PublicRecordReportReason =
  (typeof PUBLIC_RECORD_REPORT_REASONS)[number];

export interface PublicRecord {
  snapshotVersion: typeof PUBLIC_RECORD_SNAPSHOT_VERSION;
  publicId: string;
  status: PublicRecordStatus;
  publishedAt: string;
  expiresAt: string;
  updatedAt: string;
  snapshot: ChronologyDeterminationSnapshot;
}

export type PublicRecordAvailability =
  | { status: "available"; record: PublicRecord }
  | {
      status:
        "expired" | "owner_unpublished" | "bureau_unpublished" | "unavailable";
    };

export type OwnerLifecycleAction = "unpublish" | "restore" | "delete";

export function isOwnerLifecycleAction(
  value: unknown,
): value is OwnerLifecycleAction {
  return value === "unpublish" || value === "restore" || value === "delete";
}

export function isPublicRecordId(value: unknown): value is string {
  return typeof value === "string" && /^rec_[A-Za-z0-9_-]{22}$/u.test(value);
}

export function isOwnerCredential(value: unknown): value is string {
  return typeof value === "string" && /^own_[A-Za-z0-9_-]{43}$/u.test(value);
}

export function isPublicationKey(value: unknown): value is string {
  return typeof value === "string" && /^pub_[A-Za-z0-9_-]{22}$/u.test(value);
}

export function isReportKey(value: unknown): value is string {
  return typeof value === "string" && /^rpt_[A-Za-z0-9_-]{22}$/u.test(value);
}

export function isPublicRecordStatus(
  value: unknown,
): value is PublicRecordStatus {
  return PUBLIC_RECORD_STATUSES.some((status) => status === value);
}

export function isPublicRecordReportReason(
  value: unknown,
): value is PublicRecordReportReason {
  return PUBLIC_RECORD_REPORT_REASONS.some((reason) => reason === value);
}

export function publicRecordAvailability(
  record: PublicRecord | null,
  now: Date,
): PublicRecordAvailability {
  if (record === null) return { status: "unavailable" };
  if (record.status !== "published") return { status: record.status };
  const expiresAt = new Date(record.expiresAt);
  if (
    !Number.isFinite(expiresAt.getTime()) ||
    expiresAt.getTime() <= now.getTime()
  ) {
    return { status: "expired" };
  }
  return { status: "available", record };
}

export function ownerTransition(
  status: PublicRecordStatus,
  action: OwnerLifecycleAction,
): PublicRecordStatus | "delete" | null {
  if (action === "delete") return "delete";
  if (action === "unpublish" && status === "published") {
    return "owner_unpublished";
  }
  if (action === "restore" && status === "owner_unpublished") {
    return "published";
  }
  return null;
}
