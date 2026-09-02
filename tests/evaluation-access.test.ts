import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  crossedUsageThresholds,
  isAccessCredential,
  isGenerationIdempotencyKey,
} from "@/domain/access/evaluation-access";
import {
  createCredential,
  exchangeEvaluationTokenWith,
  sha256,
} from "@/server/access/access-control-service";
import { createNetworkDigest } from "@/server/access/network-identity";
import { SqlAccessControlRepository } from "@/server/access/sql-access-control-repository";
import { migratePublicRecords } from "@/server/public-record/migrate-public-records";
import { createEmbeddedPostgresDatabase } from "@/server/public-record/sql-adapters";
import type { SqlDatabase } from "@/server/public-record/sql-database";

const NOW = "2026-09-02T12:00:00.000Z";
const LATER = "2026-09-02T12:00:10.000Z";
const WINDOW = "2026-09-02T12:00:00.000Z";
const NETWORK = "a".repeat(64);
const TOKEN = `eva_${"A".repeat(43)}`;
const SESSION_CREDENTIAL = `evs_${"B".repeat(43)}`;
const TOKEN_DIGEST = digest(TOKEN);
const SESSION_DIGEST = digest(SESSION_CREDENTIAL);
const GRANT_ID = `egr_${"c".repeat(22)}`;
const SESSION_ID = `ses_${"d".repeat(22)}`;

describe("evaluation access domain", () => {
  it("validates credential boundaries and detects crossed alert thresholds", () => {
    expect(isAccessCredential(TOKEN, "eva")).toBe(true);
    expect(isAccessCredential(`${TOKEN}x`, "eva")).toBe(false);
    expect(isGenerationIdempotencyKey(`fil_${"x".repeat(22)}`)).toBe(true);
    expect(crossedUsageThresholds(2, 3, 4)).toEqual([75]);
    expect(crossedUsageThresholds(3, 4, 4)).toEqual([90, 100]);
  });

  it("creates a daily HMAC digest without retaining the address", () => {
    const headers = new Headers({ "x-forwarded-for": "198.51.100.7" });
    const first = createNetworkDigest(headers, new Date(NOW), {
      BUREAU_NETWORK_HMAC_SECRET: "x".repeat(32),
      BUREAU_TRUSTED_PROXY_HOPS: "0",
      NODE_ENV: "production",
    });
    const second = createNetworkDigest(
      headers,
      new Date("2026-09-03T12:00:00.000Z"),
      {
        BUREAU_NETWORK_HMAC_SECRET: "x".repeat(32),
        BUREAU_TRUSTED_PROXY_HOPS: "0",
        NODE_ENV: "production",
      },
    );
    expect(first).toMatch(/^[a-f0-9]{64}$/u);
    expect(first).not.toContain("198.51.100.7");
    expect(second).not.toBe(first);
    expect(
      createNetworkDigest(headers, new Date(NOW), { NODE_ENV: "production" }),
    ).toBeNull();
  });
});

describe("SQL evaluation access and cost control", () => {
  let database: SqlDatabase;
  let close: () => Promise<void>;
  let repository: SqlAccessControlRepository;

  beforeEach(async () => {
    const embedded = createEmbeddedPostgresDatabase();
    database = embedded.database;
    close = embedded.close;
    await migratePublicRecords(database);
    repository = new SqlAccessControlRepository(database);
    await insertGrant(database, 100);
  });

  afterEach(async () => {
    await close();
  });

  it("exchanges a digest-backed link for a bounded digest-only session", async () => {
    const result = await exchange();
    expect(result).toEqual({
      status: "accepted",
      expiresAt: "2026-09-16T12:00:00.000Z",
    });
    const rows = await database.query(
      `SELECT credential_digest AS "credentialDigest" FROM evaluation_sessions`,
    );
    expect(rows.rows).toEqual([{ credentialDigest: SESSION_DIGEST }]);
    expect(JSON.stringify(rows.rows)).not.toContain(SESSION_CREDENTIAL);
    expect(JSON.stringify(rows.rows)).not.toContain(TOKEN);
  });

  it("reserves one credit for concurrent exact requests and recovers without another dispatch", async () => {
    await exchange();
    const input = generationInput(1);
    const results = await Promise.all([
      repository.beginGeneration(input),
      repository.beginGeneration(input),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([
      "pending",
      "reserved",
    ]);

    await database.query(
      `UPDATE generation_requests SET lease_until = $1 WHERE request_id = $2`,
      ["2026-09-02T11:59:59.000Z", input.requestId],
    );
    const recovered = await repository.beginGeneration(input);
    expect(recovered).toMatchObject({
      status: "fallback",
      reason: "recovered_request",
      reference: input.reference,
    });
    const grants = await database.query(
      `SELECT credits_reserved AS "reserved", credits_consumed AS "consumed"
       FROM evaluation_grants WHERE grant_id = $1`,
      [GRANT_ID],
    );
    expect(grants.rows[0]).toEqual({ reserved: 0, consumed: 0 });
  });

  it("cannot overspend one remaining credit across distinct concurrent filings", async () => {
    await exchange();
    await database.query(
      `UPDATE evaluation_grants SET credit_limit = 1 WHERE grant_id = $1`,
      [GRANT_ID],
    );
    const results = await Promise.all([
      repository.beginGeneration(generationInput(1)),
      repository.beginGeneration(generationInput(2)),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([
      "fallback",
      "reserved",
    ]);
    expect(results).toContainEqual({
      status: "fallback",
      reason: "exhausted_grant",
    });
  });

  it("cannot overspend the global attempt budget under concurrency", async () => {
    await exchange();
    const first = generationInput(1);
    const second = generationInput(2);
    await repository.beginGeneration(first);
    await repository.beginGeneration(second);
    await database.query(
      `UPDATE generation_control SET attempt_limit = 1 WHERE control_id = 1`,
    );
    const results = await Promise.all([
      repository.reserveProviderAttempt(first.requestId, LATER),
      repository.reserveProviderAttempt(second.requestId, LATER),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([
      "allowed",
      "denied",
    ]);
    expect(results).toContainEqual({
      status: "denied",
      reason: "global_budget_exhausted",
    });
  });

  it("counts dispatched provider attempts globally and refunds only logical credits", async () => {
    await exchange();
    await database.query(
      `UPDATE generation_control SET attempt_limit = 1 WHERE control_id = 1`,
    );
    const input = generationInput(1);
    expect(await repository.beginGeneration(input)).toMatchObject({
      status: "reserved",
    });
    await expect(
      repository.reserveProviderAttempt(input.requestId, LATER),
    ).resolves.toEqual({ status: "allowed" });
    await expect(
      repository.reserveProviderAttempt(input.requestId, LATER),
    ).resolves.toEqual({
      status: "denied",
      reason: "global_budget_exhausted",
    });
    await repository.completeGeneration(input.requestId, "fallback", LATER);

    const control = await database.query(
      `SELECT attempts_dispatched AS "attempts" FROM generation_control WHERE control_id = 1`,
    );
    const grant = await database.query(
      `SELECT credits_reserved AS "reserved", credits_consumed AS "consumed"
       FROM evaluation_grants WHERE grant_id = $1`,
      [GRANT_ID],
    );
    expect(control.rows[0]).toEqual({ attempts: 1 });
    expect(grant.rows[0]).toEqual({ reserved: 0, consumed: 0 });
  });

  it("consumes one logical credit after a validated provider outcome", async () => {
    await exchange();
    const input = generationInput(1);
    await repository.beginGeneration(input);
    await repository.reserveProviderAttempt(input.requestId, LATER);
    await repository.completeGeneration(input.requestId, "provider", LATER);
    await repository.completeGeneration(input.requestId, "provider", LATER);

    const grant = await database.query(
      `SELECT credits_reserved AS "reserved", credits_consumed AS "consumed"
       FROM evaluation_grants WHERE grant_id = $1`,
      [GRANT_ID],
    );
    expect(grant.rows[0]).toEqual({ reserved: 0, consumed: 1 });
  });

  it("enforces session rate limits while exact retries remain idempotent", async () => {
    await exchange();
    for (const index of [1, 2, 3]) {
      const input = generationInput(index);
      expect(await repository.beginGeneration(input)).toMatchObject({
        status: "reserved",
      });
      await repository.completeGeneration(input.requestId, "fallback", LATER);
    }
    await expect(
      repository.beginGeneration(generationInput(4)),
    ).resolves.toEqual({
      status: "limited",
      retryAfterSeconds: 60,
    });
    await expect(
      repository.beginGeneration(generationInput(1)),
    ).resolves.toMatchObject({
      status: "fallback",
      reason: "completed_request",
    });
  });

  it("permits a new reservation only after the 30-minute idempotency window", async () => {
    await exchange();
    const input = generationInput(1);
    await repository.beginGeneration(input);
    await repository.completeGeneration(input.requestId, "fallback", LATER);
    const afterWindow = {
      ...input,
      now: "2026-09-02T12:31:00.000Z",
      expiresAt: "2026-09-02T13:01:00.000Z",
      leaseUntil: "2026-09-02T12:31:30.000Z",
      windowStart: "2026-09-02T12:31:00.000Z",
    };
    await expect(
      repository.beginGeneration(afterWindow),
    ).resolves.toMatchObject({
      status: "reserved",
      requestId: input.requestId,
    });
  });

  it("falls back for revoked, expired, exhausted, and disabled controls", async () => {
    await exchange();
    await database.query(
      `UPDATE evaluation_grants SET credit_limit = 0 WHERE grant_id = $1`,
      [GRANT_ID],
    );
    await expect(
      repository.beginGeneration(generationInput(1)),
    ).resolves.toMatchObject({
      status: "fallback",
      reason: "exhausted_grant",
    });

    await database.query(
      `UPDATE evaluation_grants SET credit_limit = 100, status = 'revoked' WHERE grant_id = $1`,
      [GRANT_ID],
    );
    await expect(
      repository.beginGeneration(generationInput(2)),
    ).resolves.toMatchObject({
      status: "fallback",
      reason: "revoked_grant",
    });

    await database.query(
      `UPDATE evaluation_grants SET status = 'active' WHERE grant_id = $1`,
      [GRANT_ID],
    );
    const input = generationInput(3);
    await repository.beginGeneration(input);
    await database.query(
      `UPDATE generation_control SET generation_enabled = false WHERE control_id = 1`,
    );
    await expect(
      repository.reserveProviderAttempt(input.requestId, LATER),
    ).resolves.toEqual({ status: "denied", reason: "generation_disabled" });
  });

  it("creates categorical threshold alerts without filing content", async () => {
    await exchange();
    await database.query(
      `UPDATE evaluation_grants SET credit_limit = 4 WHERE grant_id = $1`,
      [GRANT_ID],
    );
    for (const index of [1, 2, 3, 4]) {
      const input = generationInput(index);
      await repository.beginGeneration(input);
      await repository.completeGeneration(input.requestId, "provider", LATER);
      await database.query(`DELETE FROM generation_rate_limits`);
    }
    const alerts = await database.query(
      `SELECT threshold FROM generation_usage_alerts
       WHERE scope = 'evaluation_pool' ORDER BY threshold`,
    );
    expect(alerts.rows).toEqual([
      { threshold: 75 },
      { threshold: 90 },
      { threshold: 100 },
    ]);
    expect(JSON.stringify(alerts.rows)).not.toContain("Marco");
  });

  async function exchange() {
    return repository.exchangeEvaluationAccess({
      tokenDigest: TOKEN_DIGEST,
      sessionId: SESSION_ID,
      sessionCredentialDigest: SESSION_DIGEST,
      networkDigest: NETWORK,
      now: NOW,
      sessionExpiresAt: "2026-09-16T12:00:00.000Z",
      windowStart: WINDOW,
    });
  }
});

describe("evaluation token service", () => {
  it("never passes the raw bearer token to persistence", async () => {
    let receivedDigest = "";
    const result = await exchangeEvaluationTokenWith(TOKEN, NETWORK, {
      repository: {
        exchangeEvaluationAccess(input) {
          receivedDigest = input.tokenDigest;
          return Promise.resolve({
            status: "accepted",
            expiresAt: input.sessionExpiresAt,
          });
        },
        exchangeStandardAccess() {
          return Promise.resolve({ status: "invalid" });
        },
        getStandardAccessStatus() {
          return Promise.resolve({ status: "invalid" });
        },
        issueSuccessorInvitation() {
          return Promise.resolve({ status: "invalid" });
        },
        cancelSuccessorInvitation() {
          return Promise.resolve({ status: "invalid" });
        },
        beginGeneration() {
          return Promise.resolve({ status: "fallback", reason: "anonymous" });
        },
        reserveProviderAttempt() {
          return Promise.resolve({ status: "allowed" });
        },
        async completeGeneration() {
          await Promise.resolve();
        },
      },
      now: () => new Date(NOW),
      randomBytes: (size) => Buffer.alloc(size, 7),
    });
    expect(result.status).toBe("accepted");
    expect(receivedDigest).toBe(sha256(TOKEN));
    expect(receivedDigest).not.toContain(TOKEN);
    if (result.status === "accepted") {
      expect(isAccessCredential(result.credential, "evs")).toBe(true);
      expect(createCredential("evs", Buffer.alloc(32, 7))).toBe(
        result.credential,
      );
    }
  });
});

function generationInput(index: number) {
  const suffix = String(index).padStart(22, "0");
  return {
    sessionCredentialDigest: SESSION_DIGEST,
    idempotencyKey: `fil_${suffix}`,
    filingDigest: "f".repeat(64),
    requestId: `gen_${suffix}`,
    reference: `CHR · 2026 · A${String(index).padStart(5, "0")}`,
    networkDigest: NETWORK,
    now: NOW,
    expiresAt: "2026-09-02T12:30:00.000Z",
    leaseUntil: "2026-09-02T12:00:30.000Z",
    windowStart: WINDOW,
  };
}

async function insertGrant(database: SqlDatabase, creditLimit: number) {
  await database.query(
    `INSERT INTO evaluation_grants (
       grant_id, token_digest, status, credit_limit, created_at, expires_at, updated_at
     ) VALUES ($1, $2, 'active', $3, $4, $5, $4)`,
    [GRANT_ID, TOKEN_DIGEST, creditLimit, NOW, "2026-10-02T12:00:00.000Z"],
  );
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
