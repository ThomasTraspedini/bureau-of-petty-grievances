import {
  isPublicRecordId,
  isPublicRecordStatus,
  PUBLIC_RECORD_SNAPSHOT_VERSION,
  type PublicRecord,
  type PublicRecordReportReason,
  type PublicRecordStatus,
} from "@/domain/public-record/public-record";
import { validateChronologyDeterminationSnapshot } from "@/domain/determination/determination-experience";

import type {
  CreatePublicRecordInput,
  CreatePublicRecordResult,
  OpenPublicRecordReport,
  PublicRecordRepository,
  StoredPublicRecord,
} from "./public-record-repository";
import type { SqlDatabase, SqlSession } from "./sql-database";

const RECORD_COLUMNS = `
  public_id AS "publicId",
  publication_key AS "publicationKey",
  owner_credential_digest AS "ownerCredentialDigest",
  snapshot_digest AS "snapshotDigest",
  snapshot_version AS "snapshotVersion",
  locale,
  department,
  status,
  snapshot,
  issued_at AS "issuedAt",
  published_at AS "publishedAt",
  expires_at AS "expiresAt",
  updated_at AS "updatedAt"`;

export class SqlPublicRecordRepository implements PublicRecordRepository {
  constructor(private readonly database: SqlDatabase) {}

  async create(
    input: CreatePublicRecordInput,
  ): Promise<CreatePublicRecordResult> {
    return this.database.transaction(async (session) => {
      const inserted = await session.query(
        `INSERT INTO public_records (
          public_id, publication_key, owner_credential_digest, snapshot_digest,
          snapshot_version, locale, department, status, snapshot, issued_at,
          published_at, expires_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'chronology', $7, $8::jsonb, $9, $10, $11, $12)
        ON CONFLICT (publication_key) DO NOTHING
        RETURNING ${RECORD_COLUMNS}`,
        [
          input.record.publicId,
          input.publicationKey,
          input.ownerCredentialDigest,
          input.snapshotDigest,
          input.record.snapshotVersion,
          input.record.snapshot.locale,
          input.record.status,
          JSON.stringify(input.record.snapshot),
          input.record.snapshot.issuedAt,
          input.record.publishedAt,
          input.record.expiresAt,
          input.record.updatedAt,
        ],
      );
      const insertedRecord = parseStoredRecord(inserted.rows[0]);
      if (insertedRecord !== null) {
        return { status: "created", record: insertedRecord };
      }

      const existing = await findByPublicationKey(
        session,
        input.publicationKey,
      );
      if (existing === null) {
        throw new Error("The idempotent record could not be recovered.");
      }
      return { status: "existing", record: existing };
    });
  }

  async find(publicId: string): Promise<StoredPublicRecord | null> {
    const result = await this.database.query(
      `SELECT ${RECORD_COLUMNS} FROM public_records WHERE public_id = $1`,
      [publicId],
    );
    return parseStoredRecord(result.rows[0]);
  }

  async updateStatus(
    publicId: string,
    expectedStatus: PublicRecordStatus,
    status: PublicRecordStatus,
    updatedAt: string,
  ): Promise<StoredPublicRecord | null> {
    const result = await this.database.query(
      `UPDATE public_records
       SET status = $1, updated_at = $2
       WHERE public_id = $3 AND status = $4
       RETURNING ${RECORD_COLUMNS}`,
      [status, updatedAt, publicId, expectedStatus],
    );
    return parseStoredRecord(result.rows[0]);
  }

  async delete(publicId: string): Promise<boolean> {
    const result = await this.database.query(
      "DELETE FROM public_records WHERE public_id = $1",
      [publicId],
    );
    return result.affectedRows === 1;
  }

  async report(input: {
    publicId: string;
    reportKey: string;
    reason: PublicRecordReportReason;
    createdAt: string;
  }): Promise<"created" | "existing" | "unavailable"> {
    const result = await this.database.query(
      `INSERT INTO public_record_reports (public_id, report_key, reason, created_at)
       SELECT public_id, $1, $2, $3
       FROM public_records
       WHERE public_id = $4 AND status = 'published' AND expires_at > $3
       ON CONFLICT (public_id, report_key) DO NOTHING
       RETURNING report_id`,
      [input.reportKey, input.reason, input.createdAt, input.publicId],
    );
    if (result.rows.length === 1) return "created";
    const record = await this.find(input.publicId);
    if (record?.status !== "published") {
      return "unavailable";
    }
    if (
      new Date(record.expiresAt).getTime() <=
      new Date(input.createdAt).getTime()
    ) {
      return "unavailable";
    }
    return "existing";
  }

  async listOpenReports(): Promise<readonly OpenPublicRecordReport[]> {
    const result = await this.database.query(
      `SELECT public_id AS "publicId", reason, created_at AS "createdAt"
       FROM public_record_reports
       WHERE status = 'open'
       ORDER BY created_at ASC`,
    );
    return result.rows.flatMap((row) => {
      if (
        !isPublicRecordId(row.publicId) ||
        !isReportReason(row.reason) ||
        !isDateValue(row.createdAt)
      ) {
        return [];
      }
      return [
        {
          publicId: row.publicId,
          reason: row.reason,
          createdAt: toIsoString(row.createdAt),
        },
      ];
    });
  }

  async resolveReports(publicId: string, resolvedAt: string): Promise<number> {
    const result = await this.database.query(
      `UPDATE public_record_reports
       SET status = 'resolved', resolved_at = $1
       WHERE public_id = $2 AND status = 'open'`,
      [resolvedAt, publicId],
    );
    return result.affectedRows;
  }
}

async function findByPublicationKey(
  session: SqlSession,
  publicationKey: string,
): Promise<StoredPublicRecord | null> {
  const result = await session.query(
    `SELECT ${RECORD_COLUMNS} FROM public_records WHERE publication_key = $1`,
    [publicationKey],
  );
  return parseStoredRecord(result.rows[0]);
}

function parseStoredRecord(value: unknown): StoredPublicRecord | null {
  if (!isRecord(value)) return null;
  const row = value;
  if (
    !isPublicRecordId(row.publicId) ||
    typeof row.publicationKey !== "string" ||
    typeof row.ownerCredentialDigest !== "string" ||
    typeof row.snapshotDigest !== "string" ||
    Number(row.snapshotVersion) !== PUBLIC_RECORD_SNAPSHOT_VERSION ||
    row.locale !== "en" ||
    row.department !== "chronology" ||
    !isPublicRecordStatus(row.status) ||
    !isDateValue(row.publishedAt) ||
    !isDateValue(row.expiresAt) ||
    !isDateValue(row.updatedAt)
  ) {
    return null;
  }
  const publishedAt = toIsoString(row.publishedAt);
  const snapshot = parseJsonValue(row.snapshot);
  const validated = validateChronologyDeterminationSnapshot(
    snapshot,
    new Date(publishedAt),
  );
  if (validated.status === "invalid") return null;

  const record: PublicRecord = {
    snapshotVersion: PUBLIC_RECORD_SNAPSHOT_VERSION,
    publicId: row.publicId,
    status: row.status,
    publishedAt,
    expiresAt: toIsoString(row.expiresAt),
    updatedAt: toIsoString(row.updatedAt),
    snapshot: validated.snapshot,
  };
  return {
    ...record,
    publicationKey: row.publicationKey,
    ownerCredentialDigest: row.ownerCredentialDigest,
    snapshotDigest: row.snapshotDigest,
  };
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function isDateValue(value: unknown): value is Date | string {
  return (
    value instanceof Date ||
    (typeof value === "string" && Number.isFinite(new Date(value).getTime()))
  );
}

function toIsoString(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function isReportReason(value: unknown): value is PublicRecordReportReason {
  return (
    value === "privacy_concern" ||
    value === "harmful_content" ||
    value === "wrong_person" ||
    value === "other_safety_concern"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
