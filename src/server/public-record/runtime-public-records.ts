import type { PublicRecordRepository } from "./public-record-repository";
import { migratePublicRecords } from "./migrate-public-records";
import {
  createEmbeddedPostgresDatabase,
  createPostgresDatabase,
} from "./sql-adapters";
import { SqlPublicRecordRepository } from "./sql-public-record-repository";

declare global {
  var bureauPublicRecordRepositoryPromise:
    Promise<PublicRecordRepository | null> | undefined;
}

export async function getRuntimePublicRecordRepository(): Promise<PublicRecordRepository | null> {
  globalThis.bureauPublicRecordRepositoryPromise ??= createRuntimeRepository();
  const currentAttempt = globalThis.bureauPublicRecordRepositoryPromise;
  const repository = await currentAttempt;
  if (
    repository === null &&
    globalThis.bureauPublicRecordRepositoryPromise === currentAttempt
  ) {
    globalThis.bureauPublicRecordRepositoryPromise = undefined;
  }
  return repository;
}

async function createRuntimeRepository(): Promise<PublicRecordRepository | null> {
  const connectionString = process.env.DATABASE_URL?.trim();
  const embeddedPath = process.env.BUREAU_EMBEDDED_DATABASE_PATH?.trim();
  if (!connectionString && !embeddedPath) return null;

  try {
    const database = connectionString
      ? createPostgresDatabase(connectionString)
      : createEmbeddedPostgresDatabase(embeddedPath).database;
    await migratePublicRecords(database);
    return new SqlPublicRecordRepository(database);
  } catch {
    return null;
  }
}
