import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";

import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";

const [command, publicId] = process.argv.slice(2);
const connectionString = process.env.DATABASE_URL?.trim();
const embeddedPath = process.env.BUREAU_EMBEDDED_DATABASE_PATH?.trim();

if (!connectionString && !embeddedPath) {
  throw new Error(
    "DATABASE_URL or BUREAU_EMBEDDED_DATABASE_PATH is required for public-record operations.",
  );
}

if (command !== "list-reports" && command !== "unpublish") {
  throw new Error(
    "Use `npm run records:operate -- list-reports` or `npm run records:operate -- unpublish <public-id>`.",
  );
}

if (command === "unpublish" && !/^rec_[A-Za-z0-9_-]{22}$/u.test(publicId ?? "")) {
  throw new Error("A valid public record identifier is required.");
}

const database = connectionString
  ? createPostgresOperations(connectionString)
  : createEmbeddedOperations(embeddedPath ?? "");

try {
  if (command === "list-reports") {
    const reports = await database.query(`
      SELECT public_id AS "publicId", reason, created_at AS "createdAt"
      FROM public_record_reports
      WHERE status = 'open'
      ORDER BY created_at ASC
    `);
    process.stdout.write(`${JSON.stringify(reports, null, 2)}\n`);
  } else {
    const outcome = await database.transaction(async (transaction) => {
      const records = await transaction.query(
        `UPDATE public_records
         SET status = 'bureau_unpublished', updated_at = now()
         WHERE public_id = $1
         RETURNING public_id`,
        [publicId ?? ""],
      );
      if (records.length !== 1) return "unavailable";
      await transaction.query(
        `UPDATE public_record_reports
         SET status = 'resolved', resolved_at = now()
         WHERE public_id = $1 AND status = 'open'`,
        [publicId ?? ""],
      );
      return "unpublished";
    });
    process.stdout.write(`${outcome}\n`);
  }
} finally {
  await database.close();
}

function createPostgresOperations(url) {
  const sql = postgres(url, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    prepare: false,
  });
  const session = (client) => ({
    query: async (statement, parameters = []) => [
      ...(await client.unsafe(statement, parameters)),
    ],
  });
  return {
    ...session(sql),
    transaction: (operation) =>
      sql.begin(async (transaction) => operation(session(transaction))),
    close: () => sql.end({ timeout: 5 }),
  };
}

function createEmbeddedOperations(dataDirectory) {
  const absoluteDirectory = resolve(dataDirectory);
  mkdirSync(dirname(absoluteDirectory), { recursive: true });
  const client = new PGlite(`file://${absoluteDirectory}`);
  const session = (connection) => ({
    query: async (statement, parameters = []) =>
      (await connection.query(statement, parameters)).rows,
  });
  return {
    ...session(client),
    transaction: (operation) =>
      client.transaction(async (transaction) => operation(session(transaction))),
    close: () => client.close(),
  };
}
