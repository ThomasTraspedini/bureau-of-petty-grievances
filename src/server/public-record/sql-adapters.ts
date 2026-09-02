import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  PGlite,
  type PGliteInterface,
  type Transaction,
} from "@electric-sql/pglite";
import postgres, { type Sql, type TransactionSql } from "postgres";

import type {
  SqlDatabase,
  SqlParameter,
  SqlQueryResult,
  SqlSession,
} from "./sql-database";

export function createPostgresDatabase(connectionString: string): SqlDatabase {
  const sql = postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return postgresDatabase(sql);
}

function postgresDatabase(sql: Sql): SqlDatabase {
  return {
    query: (statement, parameters) => postgresQuery(sql, statement, parameters),
    transaction: async (operation) => {
      const result = await sql.begin(async (transaction) => ({
        value: await operation(postgresSession(transaction)),
      }));
      return result.value;
    },
  };
}

function postgresSession(sql: TransactionSql): SqlSession {
  return {
    query: (statement, parameters) => postgresQuery(sql, statement, parameters),
  };
}

async function postgresQuery(
  sql: Sql | TransactionSql,
  statement: string,
  parameters: readonly SqlParameter[] = [],
): Promise<SqlQueryResult> {
  const result = await sql.unsafe<Record<string, unknown>[]>(statement, [
    ...parameters,
  ]);
  return { rows: [...result], affectedRows: result.count };
}

export function createEmbeddedPostgresDatabase(dataDirectory?: string): {
  database: SqlDatabase;
  close: () => Promise<void>;
} {
  let client: PGlite;
  if (dataDirectory) {
    const absoluteDirectory = resolve(dataDirectory);
    mkdirSync(dirname(absoluteDirectory), { recursive: true });
    client = new PGlite(`file://${absoluteDirectory}`);
  } else {
    client = new PGlite();
  }
  return {
    database: pgliteDatabase(client),
    close: () => client.close(),
  };
}

function pgliteDatabase(client: PGliteInterface): SqlDatabase {
  return {
    query: (statement, parameters) =>
      pgliteQuery(client, statement, parameters),
    transaction: (operation) =>
      client.transaction((transaction) =>
        operation(pgliteSession(transaction)),
      ),
  };
}

function pgliteSession(transaction: Transaction): SqlSession {
  return {
    query: (statement, parameters) =>
      pgliteQuery(transaction, statement, parameters),
  };
}

async function pgliteQuery(
  client: Pick<PGliteInterface, "query"> | Transaction,
  statement: string,
  parameters: readonly SqlParameter[] = [],
): Promise<SqlQueryResult> {
  const result = await client.query<Record<string, unknown>>(statement, [
    ...parameters,
  ]);
  return {
    rows: result.rows,
    affectedRows: result.affectedRows ?? 0,
  };
}
