import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import process from "node:process";

import { PGlite } from "@electric-sql/pglite";

import { PUBLIC_RECORD_SCHEMA_SQL } from "../../src/server/public-record/schema.ts";

const databasePath = process.env.BUREAU_EMBEDDED_DATABASE_PATH?.trim();
const evaluationToken = process.env.BUREAU_E2E_EVALUATION_TOKEN?.trim();
if (!databasePath || !evaluationToken) {
  throw new Error("The e2e database path and evaluation token are required.");
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
