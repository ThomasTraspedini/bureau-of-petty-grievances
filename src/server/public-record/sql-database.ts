export type SqlParameter = string | number | boolean | Date | null;

export interface SqlQueryResult {
  rows: readonly Record<string, unknown>[];
  affectedRows: number;
}

export interface SqlSession {
  query(
    statement: string,
    parameters?: readonly SqlParameter[],
  ): Promise<SqlQueryResult>;
}

export interface SqlDatabase extends SqlSession {
  transaction<T>(operation: (session: SqlSession) => Promise<T>): Promise<T>;
}
