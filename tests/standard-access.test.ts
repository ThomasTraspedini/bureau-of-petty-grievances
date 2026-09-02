import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_STANDARD_CREDIT_LIMIT,
  isStandardEntitlementId,
  isStandardTenureId,
} from "@/domain/access/standard-access";
import { SqlAccessControlRepository } from "@/server/access/sql-access-control-repository";
import { migratePublicRecords } from "@/server/public-record/migrate-public-records";
import { createEmbeddedPostgresDatabase } from "@/server/public-record/sql-adapters";
import type { SqlDatabase } from "@/server/public-record/sql-database";

const NOW = "2026-09-02T12:00:00.000Z";
const LATER = "2026-09-02T12:00:10.000Z";
const ENTITLEMENT_EXPIRY = "2027-03-01T12:00:00.000Z";
const INVITATION_EXPIRY = "2026-10-02T12:00:00.000Z";
const NETWORK = "a".repeat(64);
const AUTHORIZATION = `std_${"A".repeat(43)}`;
const SUCCESSOR = `sti_${"B".repeat(43)}`;
const AUTHORIZATION_ID = `sau_${"a".repeat(22)}`;
const ENTITLEMENT_ID = `ste_${"b".repeat(22)}`;
const FIRST_TENURE_ID = `stn_${"c".repeat(22)}`;
const FIRST_SESSION_ID = `ses_${"d".repeat(22)}`;
const FIRST_SESSION = `sts_${"E".repeat(43)}`;
const SECOND_TENURE_ID = `stn_${"f".repeat(22)}`;
const SECOND_SESSION_ID = `ses_${"g".repeat(22)}`;
const SECOND_SESSION = `sts_${"H".repeat(43)}`;

describe("standard access domain", () => {
  it("keeps language-neutral identifiers and a fixed five-credit allowance", () => {
    expect(DEFAULT_STANDARD_CREDIT_LIMIT).toBe(5);
    expect(isStandardEntitlementId(ENTITLEMENT_ID)).toBe(true);
    expect(isStandardTenureId(FIRST_TENURE_ID)).toBe(true);
    expect(isStandardEntitlementId(`ste_${"x".repeat(21)}`)).toBe(false);
  });
});

describe("SQL standard access transfer", () => {
  let database: SqlDatabase;
  let close: () => Promise<void>;
  let repository: SqlAccessControlRepository;

  beforeEach(async () => {
    const embedded = createEmbeddedPostgresDatabase();
    database = embedded.database;
    close = embedded.close;
    await migratePublicRecords(database);
    repository = new SqlAccessControlRepository(database);
    await insertAuthorization(database);
  });

  afterEach(async () => {
    await close();
  });

  it("redeems an authorization once into one digest-only five-credit entitlement", async () => {
    await expect(exchangeAuthorization()).resolves.toMatchObject({
      status: "accepted",
      summary: {
        status: "active",
        creditsRemaining: 5,
        transferEligible: false,
      },
    });
    await expect(exchangeAuthorization()).resolves.toEqual({
      status: "claimed",
    });

    const rows = await database.query(
      `SELECT se.credit_limit AS "creditLimit", se.credits_consumed AS "consumed",
              ss.credential_digest AS "credentialDigest"
       FROM standard_entitlements se
       JOIN standard_tenures st USING (entitlement_id)
       JOIN standard_sessions ss USING (tenure_id)`,
    );
    expect(rows.rows).toEqual([
      { creditLimit: 5, consumed: 0, credentialDigest: digest(FIRST_SESSION) },
    ]);
    expect(JSON.stringify(rows.rows)).not.toContain(AUTHORIZATION);
    expect(JSON.stringify(rows.rows)).not.toContain(FIRST_SESSION);
  });

  it("unlocks transfer only after provider success and transfers the residual pool", async () => {
    await exchangeAuthorization();
    await completeProviderGeneration(FIRST_SESSION, 1);
    await expect(firstStatus()).resolves.toMatchObject({
      status: "available",
      summary: { creditsRemaining: 4, transferEligible: true },
    });

    await expect(issueSuccessor()).resolves.toMatchObject({
      status: "issued",
      summary: { status: "transfer_pending", creditsRemaining: 4 },
    });
    await expect(
      repository.beginGeneration(generationInput(FIRST_SESSION, 2)),
    ).resolves.toMatchObject({
      status: "fallback",
      reason: "transfer_pending",
    });

    await expect(exchangeSuccessor()).resolves.toMatchObject({
      status: "accepted",
      summary: {
        status: "active",
        creditsRemaining: 4,
        transferEligible: false,
        expiresAt: ENTITLEMENT_EXPIRY,
      },
    });
    await expect(firstStatus()).resolves.toEqual({ status: "transferred" });
    await expect(secondStatus()).resolves.toMatchObject({
      status: "available",
      summary: { creditsRemaining: 4, transferEligible: false },
    });

    const pools = await database.query(
      `SELECT COUNT(*)::text AS count, MAX(credit_limit) AS "creditLimit",
              MAX(credits_consumed) AS consumed FROM standard_entitlements`,
    );
    expect(pools.rows).toEqual([{ count: "1", creditLimit: 5, consumed: 1 }]);
  });

  it("refunds fallback without unlocking a transfer", async () => {
    await exchangeAuthorization();
    const input = generationInput(FIRST_SESSION, 1);
    await repository.beginGeneration(input);
    await repository.reserveProviderAttempt(input.requestId, LATER);
    await repository.completeGeneration(input.requestId, "fallback", LATER);
    await expect(firstStatus()).resolves.toMatchObject({
      status: "available",
      summary: { creditsRemaining: 5, transferEligible: false },
    });
    await expect(issueSuccessor()).resolves.toEqual({ status: "not_eligible" });
  });

  it("cancels, replaces, and expires one invitation without duplicating authority", async () => {
    await exchangeAuthorization();
    await completeProviderGeneration(FIRST_SESSION, 1);
    await repository.issueSuccessorInvitation({
      sessionCredentialDigest: digest(FIRST_SESSION),
      invitationId: `sin_${"j".repeat(22)}`,
      tokenDigest: digest(`sti_${"J".repeat(43)}`),
      now: LATER,
      expiresAt: INVITATION_EXPIRY,
      replace: false,
    });
    await expect(
      repository.cancelSuccessorInvitation(digest(FIRST_SESSION), LATER),
    ).resolves.toMatchObject({
      status: "cancelled",
      summary: { status: "active", creditsRemaining: 4 },
    });

    await issueSuccessor();
    const replacement = await repository.issueSuccessorInvitation({
      sessionCredentialDigest: digest(FIRST_SESSION),
      invitationId: `sin_${"r".repeat(22)}`,
      tokenDigest: digest(`sti_${"R".repeat(43)}`),
      now: LATER,
      expiresAt: INVITATION_EXPIRY,
      replace: true,
    });
    expect(replacement.status).toBe("issued");
    await expect(exchangeSuccessor()).resolves.toEqual({ status: "invalid" });

    await database.query(
      `UPDATE successor_invitations SET expires_at = $1 WHERE status = 'active'`,
      ["2026-09-02T12:00:11.000Z"],
    );
    await expect(
      repository.getStandardAccessStatus(
        digest(FIRST_SESSION),
        "2026-09-02T12:00:12.000Z",
      ),
    ).resolves.toMatchObject({
      status: "available",
      summary: { status: "active", transferEligible: true },
    });
  });

  it("allows only one concurrent claim and never creates another pool", async () => {
    await exchangeAuthorization();
    await completeProviderGeneration(FIRST_SESSION, 1);
    await issueSuccessor();
    const results = await Promise.all([
      exchangeSuccessor(),
      exchangeSuccessor(),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([
      "accepted",
      "claimed",
    ]);
    const count = await database.query(
      `SELECT COUNT(*)::text AS count FROM standard_entitlements`,
    );
    expect(count.rows[0]).toEqual({ count: "1" });
  });

  it("honors the independent successor issuance kill switch", async () => {
    await exchangeAuthorization();
    await completeProviderGeneration(FIRST_SESSION, 1);
    await database.query(
      `UPDATE successor_control SET issuance_enabled = false WHERE control_id = 1`,
    );
    await expect(issueSuccessor()).resolves.toEqual({ status: "disabled" });
    await expect(firstStatus()).resolves.toMatchObject({
      status: "available",
      summary: { status: "active", creditsRemaining: 4 },
    });
  });

  async function exchangeAuthorization() {
    return repository.exchangeStandardAccess({
      tokenKind: "authorization",
      tokenDigest: digest(AUTHORIZATION),
      entitlementId: ENTITLEMENT_ID,
      tenureId: FIRST_TENURE_ID,
      sessionId: FIRST_SESSION_ID,
      sessionCredentialDigest: digest(FIRST_SESSION),
      networkDigest: NETWORK,
      now: NOW,
      entitlementExpiresAt: ENTITLEMENT_EXPIRY,
      sessionExpiresAt: ENTITLEMENT_EXPIRY,
      windowStart: NOW,
    });
  }

  async function exchangeSuccessor() {
    return repository.exchangeStandardAccess({
      tokenKind: "successor",
      tokenDigest: digest(SUCCESSOR),
      entitlementId: `ste_${"z".repeat(22)}`,
      tenureId: SECOND_TENURE_ID,
      sessionId: SECOND_SESSION_ID,
      sessionCredentialDigest: digest(SECOND_SESSION),
      networkDigest: NETWORK,
      now: LATER,
      entitlementExpiresAt: "2027-03-11T12:00:00.000Z",
      sessionExpiresAt: "2027-03-11T12:00:00.000Z",
      windowStart: NOW,
    });
  }

  async function issueSuccessor() {
    return repository.issueSuccessorInvitation({
      sessionCredentialDigest: digest(FIRST_SESSION),
      invitationId: `sin_${"i".repeat(22)}`,
      tokenDigest: digest(SUCCESSOR),
      now: LATER,
      expiresAt: INVITATION_EXPIRY,
      replace: false,
    });
  }

  async function firstStatus() {
    return repository.getStandardAccessStatus(digest(FIRST_SESSION), LATER);
  }

  async function secondStatus() {
    return repository.getStandardAccessStatus(digest(SECOND_SESSION), LATER);
  }

  async function completeProviderGeneration(credential: string, index: number) {
    const input = generationInput(credential, index);
    await repository.beginGeneration(input);
    await repository.reserveProviderAttempt(input.requestId, LATER);
    await repository.completeGeneration(input.requestId, "provider", LATER);
  }
});

function generationInput(credential: string, index: number) {
  const suffix = String(index).padStart(22, "0");
  return {
    accessKind: "standard" as const,
    sessionCredentialDigest: digest(credential),
    idempotencyKey: `fil_${suffix}`,
    filingDigest: "f".repeat(64),
    requestId: `gen_${suffix}`,
    reference: `CHR · 2026 · A${String(index).padStart(5, "0")}`,
    networkDigest: NETWORK,
    now: NOW,
    expiresAt: "2026-09-02T12:30:00.000Z",
    leaseUntil: "2026-09-02T12:00:30.000Z",
    windowStart: NOW,
  };
}

async function insertAuthorization(database: SqlDatabase) {
  await database.query(
    `INSERT INTO standard_authorizations (
       authorization_id, token_digest, status, created_at, expires_at, updated_at
     ) VALUES ($1, $2, 'available', $3, $4, $3)`,
    [AUTHORIZATION_ID, digest(AUTHORIZATION), NOW, "2026-10-02T12:00:00.000Z"],
  );
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
