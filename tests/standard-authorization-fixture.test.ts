import { createHash, randomBytes } from "node:crypto";

import { expect, it } from "vitest";

import {
  exchangeStandardTokenWith,
  getStandardAccessStatusWith,
} from "@/server/access/access-control-service";
import { SqlAccessControlRepository } from "@/server/access/sql-access-control-repository";
import { migratePublicRecords } from "@/server/public-record/migrate-public-records";
import { createEmbeddedPostgresDatabase } from "@/server/public-record/sql-adapters";

import {
  seedStandardAuthorizations,
  STANDARD_AUTHORIZATION_EXPIRY,
  standardAuthorizationToken,
} from "./e2e/standard-authorization-fixture";

it("isolates all three attempts and persists the same expiry across redemption dates", async () => {
  const { database, close } = createEmbeddedPostgresDatabase();
  try {
    await migratePublicRecords(database);
    const seed = `std_${"S".repeat(43)}`;
    await seedStandardAuthorizations(database, seed);
    const repository = new SqlAccessControlRepository(database);

    for (let retry = 0; retry < 3; retry += 1) {
      const dependencies = {
        repository,
        now: () => new Date(`${String(2026 + retry)}-09-02T12:00:00.000Z`),
        randomBytes,
      };
      const token = standardAuthorizationToken(seed, retry);
      const result = await exchangeStandardTokenWith(
        token,
        "a".repeat(64),
        dependencies,
      );
      expect(result.status).toBe("accepted");
      if (result.status !== "accepted") throw new Error("Redemption failed");

      await expect(
        getStandardAccessStatusWith(result.credential, dependencies),
      ).resolves.toMatchObject({
        status: "available",
        summary: {
          status: "active",
          creditsRemaining: 5,
          expiresAt: STANDARD_AUTHORIZATION_EXPIRY,
        },
      });
      await expect(
        exchangeStandardTokenWith(token, "a".repeat(64), dependencies),
      ).resolves.toEqual({ status: "claimed" });
    }

    const sessions = await database.query(
      "SELECT expires_at FROM standard_sessions",
    );
    expect(sessions.rows).toHaveLength(3);
    for (const row of sessions.rows) {
      expect(row.expires_at).toEqual(new Date(STANDARD_AUTHORIZATION_EXPIRY));
    }

    // Other authorizations retain production's redemption-relative expiry.
    const otherToken = `std_${"O".repeat(43)}`;
    await database.query(
      `INSERT INTO standard_authorizations (
         authorization_id, token_digest, status, created_at, expires_at, updated_at
       ) VALUES ($1, $2, 'available', now(), $3, now())`,
      [
        `sau_${"o".repeat(22)}`,
        createHash("sha256").update(otherToken).digest("hex"),
        STANDARD_AUTHORIZATION_EXPIRY,
      ],
    );
    const dependencies = {
      repository,
      now: () => new Date("2026-09-02T12:00:00.000Z"),
      randomBytes,
    };
    const other = await exchangeStandardTokenWith(
      otherToken,
      "b".repeat(64),
      dependencies,
    );
    if (other.status !== "accepted") throw new Error("Redemption failed");
    await expect(
      getStandardAccessStatusWith(other.credential, dependencies),
    ).resolves.toMatchObject({
      status: "available",
      summary: { expiresAt: "2027-03-01T12:00:00.000Z" },
    });
  } finally {
    await close();
  }
});
