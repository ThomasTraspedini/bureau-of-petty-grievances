import { migratePublicRecords } from "./migrate-public-records";
import {
  createEmbeddedPostgresDatabase,
  createPostgresDatabase,
} from "./sql-adapters";
import type { SqlDatabase } from "./sql-database";

declare global {
  var bureauSqlDatabasePromise: Promise<SqlDatabase | null> | undefined;
}

export async function getRuntimeSqlDatabase(): Promise<SqlDatabase | null> {
  globalThis.bureauSqlDatabasePromise ??= createRuntimeDatabase();
  const currentAttempt = globalThis.bureauSqlDatabasePromise;
  const database = await currentAttempt;
  if (
    database === null &&
    globalThis.bureauSqlDatabasePromise === currentAttempt
  ) {
    globalThis.bureauSqlDatabasePromise = undefined;
  }
  return database;
}

async function createRuntimeDatabase(): Promise<SqlDatabase | null> {
  const connectionString = process.env.DATABASE_URL?.trim();
  const embeddedPath = process.env.BUREAU_EMBEDDED_DATABASE_PATH?.trim();
  if (!connectionString && !embeddedPath) return null;

  try {
    const database = connectionString
      ? createPostgresDatabase(connectionString)
      : createEmbeddedPostgresDatabase(embeddedPath).database;
    await migratePublicRecords(database);
    return database;
  } catch {
    return null;
  }
}
