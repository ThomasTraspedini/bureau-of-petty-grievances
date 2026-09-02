import type { AccessControlRepository } from "./access-control-repository";
import { SqlAccessControlRepository } from "./sql-access-control-repository";
import { getRuntimeSqlDatabase } from "../public-record/runtime-database";

declare global {
  var bureauAccessControlRepositoryPromise:
    Promise<AccessControlRepository | null> | undefined;
}

export async function getRuntimeAccessControlRepository(): Promise<AccessControlRepository | null> {
  globalThis.bureauAccessControlRepositoryPromise ??= createRepository();
  const currentAttempt = globalThis.bureauAccessControlRepositoryPromise;
  const repository = await currentAttempt;
  if (
    repository === null &&
    globalThis.bureauAccessControlRepositoryPromise === currentAttempt
  ) {
    globalThis.bureauAccessControlRepositoryPromise = undefined;
  }
  return repository;
}

async function createRepository(): Promise<AccessControlRepository | null> {
  const database = await getRuntimeSqlDatabase();
  return database === null ? null : new SqlAccessControlRepository(database);
}
