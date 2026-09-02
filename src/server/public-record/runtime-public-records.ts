import type { PublicRecordRepository } from "./public-record-repository";
import { migratePublicRecords } from "./migrate-public-records";
import {
  createEmbeddedPostgresDatabase,
  createPostgresDatabase,
} from "./sql-adapters";
import { SqlPublicRecordRepository } from "./sql-public-record-repository";

let repositoryPromise: Promise<PublicRecordRepository | null> | undefined;

export async function getRuntimePublicRecordRepository(): Promise<PublicRecordRepository | null> {
  repositoryPromise ??= createRuntimeRepository();
  const currentAttempt = repositoryPromise;
  const repository = await currentAttempt;
  if (repository === null && repositoryPromise === currentAttempt) {
    repositoryPromise = undefined;
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
