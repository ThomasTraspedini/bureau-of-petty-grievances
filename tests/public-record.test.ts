import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import { assessSocialPlanningFiling } from "@/domain/determination/social-planning-assessment";
import {
  determinationPresentationVariant,
  DETERMINATION_EXPERIENCE_VERSION,
  type ChronologyDeterminationSnapshot,
  type SocialPlanningDeterminationSnapshot,
} from "@/domain/determination/determination-experience";
import { createChronologyDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import { createSocialPlanningDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import { createEnglishChronologyFallback } from "@/domain/determination/locales/en";
import { createEnglishSocialPlanningFallback } from "@/domain/determination/locales/en-social-planning";
import {
  createEmptyChronologyDraft,
  validateChronologyDraft,
} from "@/domain/filing/chronology";
import {
  createEmptySocialPlanningDraft,
  validateSocialPlanningDraft,
} from "@/domain/filing/social-planning";
import {
  ownerTransition,
  publicRecordAvailability,
} from "@/domain/public-record/public-record";
import {
  consultationPercentage,
  emptyPublicConsultationAggregate,
  PUBLIC_CONSULTATION_POSITIONS,
} from "@/domain/public-record/public-consultation";
import { migratePublicRecords } from "@/server/public-record/migrate-public-records";
import {
  applyOwnerRecordActionWith,
  bureauUnpublishWith,
  getOwnedPublicRecordWith,
  getPublicConsultationWith,
  getPublicRecordWith,
  publishPublicRecordWith,
  reportPublicRecordWith,
  submitPublicConsultationWith,
} from "@/server/public-record/public-record-service";
import { createEmbeddedPostgresDatabase } from "@/server/public-record/sql-adapters";
import type { SqlDatabase } from "@/server/public-record/sql-database";
import { SqlPublicRecordRepository } from "@/server/public-record/sql-public-record-repository";

const ownerCredential = `own_${"A".repeat(43)}`;
const otherCredential = `own_${"B".repeat(43)}`;
const publicationKey = `pub_${"C".repeat(22)}`;
const publicId = `rec_${"D".repeat(22)}`;
const secondPublicId = `rec_${"E".repeat(22)}`;
const reportKey = `rpt_${"F".repeat(22)}`;
const participationKey = `cns_${"G".repeat(43)}`;
const secondParticipationKey = `cns_${"H".repeat(43)}`;
const issuedAt = new Date("2026-09-02T12:00:00.000Z");
const publishedAt = new Date("2026-09-02T12:05:00.000Z");

let database: SqlDatabase;
let closeDatabase: () => Promise<void>;
let repository: SqlPublicRecordRepository;

beforeEach(async () => {
  const embedded = createEmbeddedPostgresDatabase();
  database = embedded.database;
  closeDatabase = embedded.close;
  await migratePublicRecords(database);
  repository = new SqlPublicRecordRepository(database);
});

afterEach(async () => {
  await closeDatabase();
});

describe("persistent public records", () => {
  it("creates an immutable record atomically and replays one publication idempotently", async () => {
    const snapshot = determinationSnapshot();
    let nextId = publicId;
    const publish = () =>
      publishPublicRecordWith(
        "en",
        { snapshot, publicationKey, ownerCredential },
        {
          repository,
          now: () => publishedAt,
          publicId: () => nextId,
        },
      );

    await expect(publish()).resolves.toEqual({
      status: "published",
      publicId,
      expiresAt: "2027-03-01T12:05:00.000Z",
      created: true,
    });
    nextId = secondPublicId;
    await expect(publish()).resolves.toMatchObject({
      status: "published",
      publicId,
      created: false,
    });

    const stored = await repository.find(publicId);
    expect(stored).toMatchObject({
      publicId,
      status: "published",
      snapshot: { filing: { respondent: "Marco" } },
    });
    expect(stored?.ownerCredentialDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(stored?.ownerCredentialDigest).not.toContain(ownerCredential);
    await expect(
      publishPublicRecordWith(
        "en",
        { snapshot, publicationKey, ownerCredential: otherCredential },
        {
          repository,
          now: () => publishedAt,
          publicId: () => secondPublicId,
        },
      ),
    ).resolves.toEqual({ status: "failed" });
  });

  it("persists and restores a Social Planning snapshot through schema version 6", async () => {
    const snapshot = socialDeterminationSnapshot();
    await expect(
      publishPublicRecordWith(
        "en",
        { snapshot, publicationKey, ownerCredential },
        {
          repository,
          now: () => publishedAt,
          publicId: () => publicId,
        },
      ),
    ).resolves.toMatchObject({ status: "published", publicId });
    await expect(repository.find(publicId)).resolves.toMatchObject({
      snapshot: {
        filing: {
          department: "social_planning",
          offence: "decision_drift",
        },
        reference: "SOC · 2026 · P1A2N3",
      },
    });
  });

  it("rejects altered snapshots and unsupported publication input", async () => {
    const snapshot = determinationSnapshot();
    await expect(
      publishPublicRecordWith(
        "en",
        {
          snapshot: {
            ...snapshot,
            filing: {
              ...snapshot.filing,
              facts: { ...snapshot.filing.facts, delayMinutes: 25 },
            },
          },
          publicationKey,
          ownerCredential,
        },
        {
          repository,
          now: () => publishedAt,
          publicId: () => publicId,
        },
      ),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      publishPublicRecordWith(
        "en",
        { snapshot, publicationKey, ownerCredential },
        {
          repository,
          now: () => new Date("2026-09-02T12:30:00.001Z"),
          publicId: () => publicId,
        },
      ),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      publishPublicRecordWith(
        "fr",
        {},
        {
          repository,
          now: () => publishedAt,
          publicId: () => publicId,
        },
      ),
    ).resolves.toEqual({ status: "invalid" });
  });

  it("enforces owner and Bureau lifecycle authority", async () => {
    await createRecord();
    await expect(
      getOwnedPublicRecordWith(publicId, otherCredential, repository),
    ).resolves.toEqual({ status: "unauthorized" });

    const unpublished = await applyOwnerRecordActionWith(
      publicId,
      ownerCredential,
      "unpublish",
      repository,
      new Date("2026-09-03T12:00:00.000Z"),
    );
    expect(unpublished).toMatchObject({
      status: "updated",
      record: { status: "owner_unpublished" },
    });
    await expect(
      getPublicRecordWith(publicId, repository, publishedAt),
    ).resolves.toEqual({ status: "owner_unpublished" });

    const restored = await applyOwnerRecordActionWith(
      publicId,
      ownerCredential,
      "restore",
      repository,
      new Date("2026-09-04T12:00:00.000Z"),
    );
    expect(restored).toMatchObject({
      status: "updated",
      record: { status: "published" },
    });
    await expect(
      reportPublicRecordWith(
        { publicId, reportKey, reason: "privacy_concern" },
        repository,
        publishedAt,
      ),
    ).resolves.toBe("reported");
    await expect(
      bureauUnpublishWith(publicId, repository, publishedAt),
    ).resolves.toBe(true);
    await expect(repository.listOpenReports()).resolves.toEqual([]);
    await expect(
      applyOwnerRecordActionWith(
        publicId,
        ownerCredential,
        "restore",
        repository,
        publishedAt,
      ),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      applyOwnerRecordActionWith(
        publicId,
        ownerCredential,
        "unexpected",
        repository,
        publishedAt,
      ),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      applyOwnerRecordActionWith(
        publicId,
        ownerCredential,
        "delete",
        repository,
        publishedAt,
      ),
    ).resolves.toEqual({ status: "deleted" });
    await expect(repository.find(publicId)).resolves.toBeNull();
    const reports = await database.query(
      "SELECT report_id FROM public_record_reports WHERE public_id = $1",
      [publicId],
    );
    expect(reports.rows).toEqual([]);
  });

  it("records categorical reports idempotently without changing publication", async () => {
    await createRecord();
    const input = {
      publicId,
      reportKey,
      reason: "privacy_concern",
    } as const;
    await expect(
      reportPublicRecordWith(input, repository, publishedAt),
    ).resolves.toBe("reported");
    await expect(
      reportPublicRecordWith(input, repository, publishedAt),
    ).resolves.toBe("reported");
    await expect(repository.listOpenReports()).resolves.toEqual([
      {
        publicId,
        reason: "privacy_concern",
        createdAt: publishedAt.toISOString(),
      },
    ]);
    await expect(
      getPublicRecordWith(publicId, repository, publishedAt),
    ).resolves.toMatchObject({ status: "available" });
  });

  it("starts with honest zero aggregates and records one immutable response idempotently", async () => {
    await createRecord();
    await expect(
      getPublicConsultationWith("en", publicId, repository, publishedAt),
    ).resolves.toEqual({
      status: "available",
      aggregate: emptyPublicConsultationAggregate(),
    });

    const first = await submitPublicConsultationWith(
      "en",
      {
        publicId,
        participationKey,
        position: "grievance_upheld",
      },
      repository,
      publishedAt,
    );
    expect(first).toEqual({
      status: "accepted",
      aggregate: {
        total: 1,
        counts: {
          grievanceUpheld: 1,
          grievanceDismissed: 0,
          upheldWithCircumstancesNoted: 0,
        },
      },
      selectedPosition: "grievance_upheld",
      created: true,
    });

    await expect(
      submitPublicConsultationWith(
        "en",
        {
          publicId,
          participationKey,
          position: "grievance_dismissed",
        },
        repository,
        publishedAt,
      ),
    ).resolves.toMatchObject({
      status: "accepted",
      selectedPosition: "grievance_upheld",
      created: false,
      aggregate: { total: 1 },
    });
    const stored = await database.query(
      `SELECT participation_digest AS "participationDigest", position
       FROM public_record_consultation_responses
       WHERE public_id = $1`,
      [publicId],
    );
    expect(stored.rows).toHaveLength(1);
    expect(stored.rows[0]?.participationDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(stored.rows[0]?.participationDigest).not.toBe(participationKey);
    expect(stored.rows[0]?.position).toBe("grievance_upheld");
  });

  it("preserves exact aggregates across concurrent distinct responses", async () => {
    await createRecord();
    const positions = [
      "grievance_upheld",
      "grievance_dismissed",
      "upheld_with_circumstances_noted",
    ] as const;
    const submissions = Array.from({ length: 18 }, (_, index) =>
      submitPublicConsultationWith(
        "en",
        {
          publicId,
          participationKey: `cns_${String(index).padStart(43, "A")}`,
          position: positions[index % positions.length],
        },
        repository,
        publishedAt,
      ),
    );
    const results = await Promise.all(submissions);
    expect(results.every((result) => result.status === "accepted")).toBe(true);
    await expect(
      getPublicConsultationWith("en", publicId, repository, publishedAt),
    ).resolves.toEqual({
      status: "available",
      aggregate: {
        total: 18,
        counts: {
          grievanceUpheld: 6,
          grievanceDismissed: 6,
          upheldWithCircumstancesNoted: 6,
        },
      },
    });
  });

  it("gates consultation by lifecycle, preserves it through restoration, and deletes it with the record", async () => {
    await createRecord();
    await submitPublicConsultationWith(
      "en",
      {
        publicId,
        participationKey,
        position: "upheld_with_circumstances_noted",
      },
      repository,
      publishedAt,
    );
    await applyOwnerRecordActionWith(
      publicId,
      ownerCredential,
      "unpublish",
      repository,
      publishedAt,
    );
    await expect(
      getPublicConsultationWith("en", publicId, repository, publishedAt),
    ).resolves.toEqual({ status: "unavailable" });
    await expect(
      submitPublicConsultationWith(
        "en",
        {
          publicId,
          participationKey: secondParticipationKey,
          position: "grievance_dismissed",
        },
        repository,
        publishedAt,
      ),
    ).resolves.toEqual({ status: "unavailable" });
    await applyOwnerRecordActionWith(
      publicId,
      ownerCredential,
      "restore",
      repository,
      publishedAt,
    );
    await expect(
      getPublicConsultationWith("en", publicId, repository, publishedAt),
    ).resolves.toMatchObject({
      status: "available",
      aggregate: { total: 1 },
    });
    await applyOwnerRecordActionWith(
      publicId,
      ownerCredential,
      "delete",
      repository,
      publishedAt,
    );
    const retained = await database.query(
      "SELECT response_id FROM public_record_consultation_responses WHERE public_id = $1",
      [publicId],
    );
    expect(retained.rows).toEqual([]);
  });

  it("rejects malformed, unsupported-locale, and expired consultation submissions", async () => {
    await createRecord();
    await expect(
      submitPublicConsultationWith(
        "en",
        { publicId, participationKey: "bad", position: "grievance_upheld" },
        repository,
        publishedAt,
      ),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      submitPublicConsultationWith(
        "en",
        {
          publicId,
          participationKey,
          position: "binding_verdict",
        },
        repository,
        publishedAt,
      ),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      submitPublicConsultationWith(
        "fr",
        {
          publicId,
          participationKey,
          position: "grievance_upheld",
        },
        repository,
        publishedAt,
      ),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      submitPublicConsultationWith(
        "en",
        {
          publicId,
          participationKey,
          position: "grievance_upheld",
        },
        repository,
        new Date("2027-03-01T12:05:00.000Z"),
      ),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("makes expired records unavailable without deleting retained content", async () => {
    await createRecord();
    const expiresAt = new Date("2027-03-01T12:05:00.000Z");
    await expect(
      getPublicRecordWith(publicId, repository, expiresAt),
    ).resolves.toEqual({ status: "expired" });
    await expect(repository.find(publicId)).resolves.toMatchObject({
      publicId,
    });
    await expect(
      applyOwnerRecordActionWith(
        publicId,
        ownerCredential,
        "unpublish",
        repository,
        new Date("2026-09-03T12:00:00.000Z"),
      ),
    ).resolves.toMatchObject({ status: "updated" });
    await expect(
      applyOwnerRecordActionWith(
        publicId,
        ownerCredential,
        "restore",
        repository,
        expiresAt,
      ),
    ).resolves.toEqual({ status: "invalid" });
  });

  it("rolls back a failed database transaction", async () => {
    await expect(
      database.transaction(async (session) => {
        await session.query(
          "INSERT INTO bureau_schema_migrations (version) VALUES ($1)",
          [99],
        );
        throw new Error("rollback probe");
      }),
    ).rejects.toThrow("rollback probe");
    const result = await database.query(
      "SELECT version FROM bureau_schema_migrations WHERE version = $1",
      [99],
    );
    expect(result.rows).toEqual([]);
  });
});

describe("public-record domain lifecycle", () => {
  it("permits only owner-governed transitions and distinguishes expiry", () => {
    expect(ownerTransition("published", "unpublish")).toBe("owner_unpublished");
    expect(ownerTransition("owner_unpublished", "restore")).toBe("published");
    expect(ownerTransition("bureau_unpublished", "restore")).toBeNull();
    expect(ownerTransition("bureau_unpublished", "delete")).toBe("delete");
    const record = {
      snapshotVersion: 1,
      publicId,
      status: "published",
      publishedAt: publishedAt.toISOString(),
      expiresAt: publishedAt.toISOString(),
      updatedAt: publishedAt.toISOString(),
      snapshot: determinationSnapshot(),
    } as const;
    expect(publicRecordAvailability(record, publishedAt)).toEqual({
      status: "expired",
    });
  });

  it("derives bounded consultation percentages without inventing empty results", () => {
    expect(PUBLIC_CONSULTATION_POSITIONS).toEqual([
      "grievance_upheld",
      "grievance_dismissed",
      "upheld_with_circumstances_noted",
    ]);
    expect(consultationPercentage(0, 0)).toBe(0);
    expect(consultationPercentage(1, 3)).toBe(33);
    expect(consultationPercentage(2, 3)).toBe(67);
    expect(consultationPercentage(4, 3)).toBe(0);
  });
});

async function createRecord() {
  const result = await publishPublicRecordWith(
    "en",
    {
      snapshot: determinationSnapshot(),
      publicationKey,
      ownerCredential,
    },
    {
      repository,
      now: () => publishedAt,
      publicId: () => publicId,
    },
  );
  if (result.status !== "published") {
    throw new Error("The public-record fixture must publish.");
  }
}

function determinationSnapshot(): ChronologyDeterminationSnapshot {
  const draft = {
    ...createEmptyChronologyDraft(),
    respondent: "Marco",
    relationship: "friend" as const,
    offence: "premature_departure" as const,
    facts: {
      ...createEmptyChronologyDraft().facts,
      prematureDeparture: { declaredTime: "19:30", delayMinutes: "24" },
    },
    impact: "table_held" as const,
    mitigation: "brings_dessert" as const,
    statement: "Shoes were still being located.",
  };
  const validation = validateChronologyDraft(draft, "en");
  if (validation.status === "invalid") {
    throw new Error("The public-record filing fixture must remain valid.");
  }
  const assessment = assessChronologyFiling(validation.filing);
  const command = createChronologyDeterminationLanguageCommand(
    validation.filing,
    assessment,
  );
  if (command.status === "invalid") {
    throw new Error("The public-record command fixture must remain valid.");
  }
  const reference = "CHR · 2026 · A1B2C3";
  return {
    experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
    locale: "en",
    reference,
    issuedAt: issuedAt.toISOString(),
    assessment,
    language: createEnglishChronologyFallback(command.command),
    filing: validation.filing,
    presentationVariant: determinationPresentationVariant(
      reference,
      assessment.presentation.visualSeed,
    ),
  };
}

function socialDeterminationSnapshot(): SocialPlanningDeterminationSnapshot {
  const draft = {
    ...createEmptySocialPlanningDraft(),
    respondent: "Taylor",
    relationship: "friend" as const,
    offence: "decision_drift" as const,
    facts: {
      ...createEmptySocialPlanningDraft().facts,
      decisionDrift: {
        decisionRoundCount: "5",
        elapsedHours: "72",
        participantCount: "4",
      },
    },
    impact: "participants_waiting" as const,
    mitigation: "usually_flexible" as const,
    statement: "The dinner date remained open through five planning rounds.",
  };
  const validation = validateSocialPlanningDraft(draft, "en");
  if (validation.status === "invalid") throw new Error("Invalid fixture.");
  const assessment = assessSocialPlanningFiling(validation.filing);
  const command = createSocialPlanningDeterminationLanguageCommand(
    validation.filing,
    assessment,
  );
  if (command.status === "invalid") throw new Error("Invalid command.");
  const reference = "SOC · 2026 · P1A2N3";
  return {
    experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
    locale: "en",
    reference,
    issuedAt: issuedAt.toISOString(),
    assessment,
    language: createEnglishSocialPlanningFallback(command.command),
    filing: validation.filing,
    presentationVariant: determinationPresentationVariant(
      reference,
      assessment.presentation.visualSeed,
    ),
  };
}
