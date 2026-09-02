import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { URL } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";

const args = process.argv.slice(2);
const command = args[0];
const connectionString = process.env.DATABASE_URL?.trim();
const embeddedPath = process.env.BUREAU_EMBEDDED_DATABASE_PATH?.trim();

if (!connectionString && !embeddedPath) {
  throw new Error(
    "DATABASE_URL or BUREAU_EMBEDDED_DATABASE_PATH is required for access operations.",
  );
}

const commands = new Set([
  "create",
  "status",
  "top-up",
  "extend",
  "revoke",
  "generation",
  "budget-add",
  "alerts",
  "alerts-deliver",
  "alert-acknowledge",
]);
if (!command || !commands.has(command)) usage();

const database = connectionString
  ? createPostgresOperations(connectionString)
  : createEmbeddedOperations(embeddedPath ?? "");

try {
  if (command === "create") await createGrant(database);
  if (command === "status") await printStatus(database);
  if (command === "top-up") await topUpGrant(database, args[1], args[2]);
  if (command === "extend") await extendGrant(database, args[1], args[2]);
  if (command === "revoke") await revokeGrant(database, args[1]);
  if (command === "generation") await setGeneration(database, args[1]);
  if (command === "budget-add") await addBudget(database, args[1]);
  if (command === "alerts") await printAlerts(database);
  if (command === "alerts-deliver") await deliverAlerts(database);
  if (command === "alert-acknowledge") {
    await acknowledgeAlert(database, args[1]);
  }
} finally {
  await database.close();
}

async function createGrant(database) {
  const origin = parseOrigin(process.env.BUREAU_PUBLIC_ORIGIN);
  const grantId = `egr_${randomBytes(16).toString("base64url")}`;
  const token = `eva_${randomBytes(32).toString("base64url")}`;
  const tokenDigest = sha256(token);
  const rows = await database.query(
    `INSERT INTO evaluation_grants (
       grant_id, token_digest, status, credit_limit, created_at, expires_at, updated_at
     ) VALUES ($1, $2, 'active', 100, now(), now() + interval '30 days', now())
     RETURNING grant_id AS "grantId", credit_limit AS "creditLimit", expires_at AS "expiresAt"`,
    [grantId, tokenDigest],
  );
  const grant = rows[0];
  process.stdout.write(
    `${JSON.stringify(
      {
        ...grant,
        evaluationUrl: `${origin}/en/evaluate#${token}`,
      },
      null,
      2,
    )}\n`,
  );
}

async function printStatus(database) {
  const grants = await database.query(`
    SELECT grant_id AS "grantId", status, credit_limit AS "creditLimit",
           credits_reserved AS "creditsReserved", credits_consumed AS "creditsConsumed",
           expires_at AS "expiresAt", updated_at AS "updatedAt"
    FROM evaluation_grants ORDER BY created_at ASC
  `);
  const controls = await database.query(`
    SELECT generation_enabled AS "generationEnabled", attempt_limit AS "attemptLimit",
           attempts_dispatched AS "attemptsDispatched", updated_at AS "updatedAt"
    FROM generation_control WHERE control_id = 1
  `);
  const pendingAlerts = await database.query(`
    SELECT COUNT(*)::text AS count FROM generation_usage_alerts WHERE status = 'pending'
  `);
  process.stdout.write(
    `${JSON.stringify(
      { control: controls[0] ?? null, grants, pendingAlerts: pendingAlerts[0]?.count ?? "0" },
      null,
      2,
    )}\n`,
  );
}

async function topUpGrant(database, grantId, amountText) {
  requireGrantId(grantId);
  const amount = positiveInteger(amountText, "A positive credit amount is required.");
  const rows = await database.query(
    `UPDATE evaluation_grants
     SET credit_limit = credit_limit + $1, updated_at = now()
     WHERE grant_id = $2
     RETURNING grant_id AS "grantId", credit_limit AS "creditLimit"`,
    [amount, grantId],
  );
  printMutation(rows[0], "Evaluation grant not found.");
}

async function extendGrant(database, grantId, daysText) {
  requireGrantId(grantId);
  const days = positiveInteger(daysText, "A positive day count is required.");
  const rows = await database.query(
    `UPDATE evaluation_grants
     SET expires_at = GREATEST(expires_at, now()) + ($1 * interval '1 day'), updated_at = now()
     WHERE grant_id = $2 AND status = 'active'
     RETURNING grant_id AS "grantId", expires_at AS "expiresAt"`,
    [days, grantId],
  );
  printMutation(rows[0], "Active evaluation grant not found.");
}

async function revokeGrant(database, grantId) {
  requireGrantId(grantId);
  const rows = await database.query(
    `UPDATE evaluation_grants SET status = 'revoked', updated_at = now()
     WHERE grant_id = $1 AND status = 'active'
     RETURNING grant_id AS "grantId", status`,
    [grantId],
  );
  printMutation(rows[0], "Active evaluation grant not found.");
}

async function setGeneration(database, state) {
  if (state !== "enable" && state !== "disable") {
    throw new Error("Use `generation enable` or `generation disable`.");
  }
  const rows = await database.query(
    `UPDATE generation_control SET generation_enabled = $1, updated_at = now()
     WHERE control_id = 1
     RETURNING generation_enabled AS "generationEnabled", updated_at AS "updatedAt"`,
    [state === "enable"],
  );
  printMutation(rows[0], "Generation control is unavailable.");
}

async function addBudget(database, amountText) {
  const amount = positiveInteger(amountText, "A positive attempt amount is required.");
  const rows = await database.query(
    `UPDATE generation_control SET attempt_limit = attempt_limit + $1, updated_at = now()
     WHERE control_id = 1
     RETURNING attempt_limit AS "attemptLimit", attempts_dispatched AS "attemptsDispatched"`,
    [amount],
  );
  printMutation(rows[0], "Generation control is unavailable.");
}

async function printAlerts(database) {
  const rows = await pendingAlerts(database);
  process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
}

async function deliverAlerts(database) {
  const webhook = parseWebhook(process.env.BUREAU_ALERT_WEBHOOK_URL);
  const secret = process.env.BUREAU_ALERT_WEBHOOK_SECRET?.trim();
  const rows = await pendingAlerts(database);
  let delivered = 0;
  for (const alert of rows) {
    const response = await globalThis.fetch(webhook, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(secret ? { authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({
        event: "bureau.generation-usage-threshold",
        scope: alert.scope,
        scopeId: alert.scopeId,
        threshold: alert.threshold,
        used: alert.used,
        limit: alert.limit,
        createdAt: alert.createdAt,
      }),
      signal: globalThis.AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`Alert delivery failed with HTTP ${String(response.status)}.`);
    }
    await database.query(
      `UPDATE generation_usage_alerts
       SET status = 'delivered', delivered_at = now()
       WHERE alert_id = $1 AND status = 'pending'`,
      [alert.alertId],
    );
    delivered += 1;
  }
  process.stdout.write(`${JSON.stringify({ delivered })}\n`);
}

async function acknowledgeAlert(database, alertIdText) {
  const alertId = positiveInteger(alertIdText, "A positive alert identifier is required.");
  const rows = await database.query(
    `UPDATE generation_usage_alerts SET status = 'acknowledged'
     WHERE alert_id = $1 AND status IN ('pending', 'delivered')
     RETURNING alert_id AS "alertId", status`,
    [alertId],
  );
  printMutation(rows[0], "Open alert not found.");
}

async function pendingAlerts(database) {
  return database.query(`
    SELECT alert_id AS "alertId", scope, scope_id AS "scopeId", threshold,
           used, usage_limit AS "limit", created_at AS "createdAt"
    FROM generation_usage_alerts WHERE status = 'pending' ORDER BY created_at ASC
  `);
}

function printMutation(value, failure) {
  if (!value) throw new Error(failure);
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function requireGrantId(value) {
  if (!/^egr_[A-Za-z0-9_-]{22}$/u.test(value ?? "")) {
    throw new Error("A valid evaluator grant identifier is required.");
  }
}

function positiveInteger(value, failure) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error(failure);
  return number;
}

function parseOrigin(value) {
  const url = new URL(value ?? "");
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("BUREAU_PUBLIC_ORIGIN must be a bare public origin.");
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("BUREAU_PUBLIC_ORIGIN must use HTTPS outside local development.");
  }
  return url.origin;
}

function parseWebhook(value) {
  const url = new URL(value ?? "");
  if (url.protocol !== "https:") {
    throw new Error("BUREAU_ALERT_WEBHOOK_URL must use HTTPS.");
  }
  return url.toString();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function usage() {
  throw new Error(
    "Use create, status, top-up <grant> <credits>, extend <grant> <days>, revoke <grant>, generation <enable|disable>, budget-add <attempts>, alerts, alerts-deliver, or alert-acknowledge <id>.",
  );
}

function createPostgresOperations(url) {
  const sql = postgres(url, { max: 1, connect_timeout: 10, idle_timeout: 5, prepare: false });
  return {
    query: async (statement, parameters = []) => [...(await sql.unsafe(statement, parameters))],
    close: () => sql.end({ timeout: 5 }),
  };
}

function createEmbeddedOperations(dataDirectory) {
  const absoluteDirectory = resolve(dataDirectory);
  mkdirSync(dirname(absoluteDirectory), { recursive: true });
  const client = new PGlite(`file://${absoluteDirectory}`);
  return {
    query: async (statement, parameters = []) =>
      (await client.query(statement, parameters)).rows,
    close: () => client.close(),
  };
}
