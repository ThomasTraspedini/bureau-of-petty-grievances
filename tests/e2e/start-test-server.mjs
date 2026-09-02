import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import process from "node:process";

import { PGlite } from "@electric-sql/pglite";

import { PUBLIC_RECORD_SCHEMA_SQL } from "../../src/server/public-record/schema.ts";

const databasePath = process.env.BUREAU_EMBEDDED_DATABASE_PATH?.trim();
const evaluationToken = process.env.BUREAU_E2E_EVALUATION_TOKEN?.trim();
const standardToken = process.env.BUREAU_E2E_STANDARD_TOKEN?.trim();
const standardSession = process.env.BUREAU_E2E_STANDARD_SESSION?.trim();
if (!databasePath || !evaluationToken || !standardToken || !standardSession) {
  throw new Error("The e2e database path and access fixtures are required.");
}

const database = new PGlite(`file://${databasePath}`);
try {
  for (const statement of PUBLIC_RECORD_SCHEMA_SQL.split(";")
    .map((item) => item.trim())
    .filter(Boolean)) {
    await database.query(statement);
  }
  await database.query(
    `INSERT INTO evaluation_grants (
       grant_id, token_digest, status, credit_limit, created_at, expires_at, updated_at
     ) VALUES ($1, $2, 'active', 100, now(), now() + interval '30 days', now())
     ON CONFLICT (grant_id) DO UPDATE SET
       token_digest = EXCLUDED.token_digest,
       status = 'active',
       expires_at = EXCLUDED.expires_at,
       updated_at = now()`,
    [
      `egr_${"e".repeat(22)}`,
      createHash("sha256").update(evaluationToken).digest("hex"),
    ],
  );
  await database.query(
    `INSERT INTO standard_authorizations (
       authorization_id, token_digest, status, created_at, expires_at, updated_at
     ) VALUES ($1, $2, 'available', now(), now() + interval '30 days', now())
     ON CONFLICT (authorization_id) DO UPDATE SET
       token_digest = EXCLUDED.token_digest,
       status = 'available',
       claimed_at = NULL,
       entitlement_id = NULL,
       expires_at = EXCLUDED.expires_at,
       updated_at = now()`,
    [
      `sau_${"s".repeat(22)}`,
      createHash("sha256").update(standardToken).digest("hex"),
    ],
  );
  await database.query(
    `INSERT INTO standard_entitlements (
       entitlement_id, status, credit_limit, credits_consumed,
       created_at, expires_at, updated_at
     ) VALUES ($1, 'active', 5, 1, now(), now() + interval '180 days', now())
     ON CONFLICT (entitlement_id) DO UPDATE SET
       status = 'active', credits_reserved = 0, credits_consumed = 1,
       expires_at = EXCLUDED.expires_at, updated_at = now()`,
    [`ste_${"e".repeat(22)}`],
  );
  await database.query(
    `INSERT INTO standard_tenures (
       tenure_id, entitlement_id, ordinal, status, provider_completions,
       created_at, updated_at
     ) VALUES ($1, $2, 1, 'active', 1, now(), now())
     ON CONFLICT (tenure_id) DO UPDATE SET
       status = 'active', provider_completions = 1, ended_at = NULL, updated_at = now()`,
    [`stn_${"e".repeat(22)}`, `ste_${"e".repeat(22)}`],
  );
  await database.query(
    `INSERT INTO standard_sessions (
       session_id, tenure_id, credential_digest, created_at, expires_at, last_used_at
     ) VALUES ($1, $2, $3, now(), now() + interval '180 days', now())
     ON CONFLICT (session_id) DO UPDATE SET
       credential_digest = EXCLUDED.credential_digest,
       expires_at = EXCLUDED.expires_at, last_used_at = now()`,
    [
      `ses_${"t".repeat(22)}`,
      `stn_${"e".repeat(22)}`,
      createHash("sha256").update(standardSession).digest("hex"),
    ],
  );
  await database.query(
    `INSERT INTO standard_entitlements (
       entitlement_id, status, credit_limit, created_at, expires_at, updated_at
     ) VALUES ($1, 'active', 5, now(), now() + interval '180 days', now())
     ON CONFLICT (entitlement_id) DO UPDATE SET
       status = 'active', credits_reserved = 0, credits_consumed = 0,
       expires_at = EXCLUDED.expires_at, updated_at = now()`,
    [`ste_${"v".repeat(22)}`],
  );
  await database.query(
    `INSERT INTO standard_tenures (
       tenure_id, entitlement_id, ordinal, status, created_at, updated_at
     ) VALUES ($1, $2, 1, 'active', now(), now())
     ON CONFLICT (tenure_id) DO UPDATE SET
       status = 'active', provider_completions = 0, ended_at = NULL, updated_at = now()`,
    [`stn_${"v".repeat(22)}`, `ste_${"v".repeat(22)}`],
  );
  await database.query(
    `INSERT INTO standard_sessions (
       session_id, tenure_id, credential_digest, created_at, expires_at, last_used_at
     ) VALUES ($1, $2, $3, now(), now() + interval '180 days', now())
     ON CONFLICT (session_id) DO UPDATE SET
       credential_digest = EXCLUDED.credential_digest,
       expires_at = EXCLUDED.expires_at, last_used_at = now()`,
    [
      `ses_${"v".repeat(22)}`,
      `stn_${"v".repeat(22)}`,
      createHash("sha256")
        .update(`sts_${"V".repeat(43)}`)
        .digest("hex"),
    ],
  );
} finally {
  await database.close();
}

if (process.env.BUREAU_E2E_SEED_ONLY === "1") process.exit(0);

const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "4173",
  ],
  { stdio: "inherit", env: process.env },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
