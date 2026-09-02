import { PUBLIC_RECORD_SCHEMA_SQL } from "./schema";
import type { SqlDatabase } from "./sql-database";

export async function migratePublicRecords(
  database: SqlDatabase,
): Promise<void> {
  const statements = PUBLIC_RECORD_SCHEMA_SQL.split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
  await database.transaction(async (session) => {
    for (const statement of statements) {
      await session.query(statement);
    }
  });
}
