import { DatabaseSync, type StatementSync } from "node:sqlite";
import migration0001 from "../../migrations/0001_create_users.sql";
import migration0002 from "../../migrations/0002_create_metric_groups.sql";
import migration0003 from "../../migrations/0003_create_metrics.sql";
import migration0004 from "../../migrations/0004_create_choice_options.sql";
import migration0005 from "../../migrations/0005_create_entries.sql";
import migration0006 from "../../migrations/0006_create_user_settings.sql";

const MIGRATIONS_IN_ORDER = [
  migration0001,
  migration0002,
  migration0003,
  migration0004,
  migration0005,
  migration0006,
];

function wrapStatement(stmt: StatementSync, args: unknown[]) {
  return {
    first: async <T>(column?: string): Promise<T | null> => {
      const row = stmt.get(...args);
      if (!row) return null;
      if (column) return (row[column] as T | undefined) ?? null;
      return row as T;
    },
    run: async () => {
      stmt.run(...args);
      return { success: true };
    },
    all: async <T>(): Promise<{ results: T[] }> => {
      return { results: stmt.all(...args) as T[] };
    },
  };
}

/**
 * apps/api/migrations の実マイグレーションを流し込んだインメモリ SQLite を
 * D1Database として使えるようにする薄いアダプタ。Miniflare なしで db 層のロジックを
 * 実際のスキーマに対してテストするために使う。
 */
export function createTestD1(): D1Database {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  for (const migration of MIGRATIONS_IN_ORDER) {
    sqlite.exec(migration);
  }

  const adapter = {
    prepare(sql: string) {
      return {
        bind: (...args: unknown[]) => wrapStatement(sqlite.prepare(sql), args),
      };
    },
  };

  return adapter as unknown as D1Database;
}
