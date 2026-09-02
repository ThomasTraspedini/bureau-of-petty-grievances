import type { PublicRecordRepository } from "./public-record-repository";
import { getRuntimeSqlDatabase } from "./runtime-database";
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
  const database = await getRuntimeSqlDatabase();
  return database === null ? null : new SqlPublicRecordRepository(database);
}
