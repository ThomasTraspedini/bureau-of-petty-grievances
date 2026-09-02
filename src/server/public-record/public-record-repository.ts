import type {
  PublicRecord,
  PublicRecordReportReason,
  PublicRecordStatus,
} from "@/domain/public-record/public-record";
import type {
  PublicConsultationAggregate,
  PublicConsultationPosition,
} from "@/domain/public-record/public-consultation";

export interface StoredPublicRecord extends PublicRecord {
  ownerCredentialDigest: string;
  publicationKey: string;
  snapshotDigest: string;
}

export interface CreatePublicRecordInput {
  record: PublicRecord;
  ownerCredentialDigest: string;
  publicationKey: string;
  snapshotDigest: string;
}

export type CreatePublicRecordResult =
  | { status: "created"; record: StoredPublicRecord }
  | { status: "existing"; record: StoredPublicRecord };

export interface OpenPublicRecordReport {
  publicId: string;
  reason: PublicRecordReportReason;
  createdAt: string;
}

export interface SubmitPublicConsultationRepositoryResult {
  aggregate: PublicConsultationAggregate;
  selectedPosition: PublicConsultationPosition;
  created: boolean;
}

export interface PublicRecordRepository {
  create(input: CreatePublicRecordInput): Promise<CreatePublicRecordResult>;
  find(publicId: string): Promise<StoredPublicRecord | null>;
  updateStatus(
    publicId: string,
    expectedStatus: PublicRecordStatus,
    status: PublicRecordStatus,
    updatedAt: string,
  ): Promise<StoredPublicRecord | null>;
  delete(publicId: string): Promise<boolean>;
  report(input: {
    publicId: string;
    reportKey: string;
    reason: PublicRecordReportReason;
    createdAt: string;
  }): Promise<"created" | "existing" | "unavailable">;
  consultationAggregate(
    publicId: string,
    requestedAt: string,
  ): Promise<PublicConsultationAggregate | null>;
  submitConsultation(input: {
    publicId: string;
    participationDigest: string;
    position: PublicConsultationPosition;
    createdAt: string;
  }): Promise<SubmitPublicConsultationRepositoryResult | "unavailable">;
  listOpenReports(): Promise<readonly OpenPublicRecordReport[]>;
  resolveReports(publicId: string, resolvedAt: string): Promise<number>;
}
