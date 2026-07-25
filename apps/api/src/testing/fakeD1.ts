/**
 * Miniflare なしで db 層のロジックをテストするための最小限のインメモリ D1 スタブ。
 * db/*.ts が発行する単純な CRUD クエリ（単一テーブルの SELECT/INSERT/UPDATE/DELETE、
 * JOIN なし）だけをサポートする汎用パーサー。
 */

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

const TABLE_NAMES = [
  "users",
  "metric_groups",
  "metrics",
  "choice_options",
  "entries",
  "user_settings",
] as const;

function matchCondition(row: Row, cond: string, arg: unknown): boolean {
  const m = cond.match(/^(\w+)\s*(=|!=|>=|<=|>|<)\s*\?$/);
  if (!m) throw new Error(`FakeD1: unsupported condition "${cond}"`);
  const col = m[1]!;
  const op = m[2]!;
  const actual = row[col] as never;
  const value = arg as never;
  switch (op) {
    case "=":
      return actual === value;
    case "!=":
      return actual !== value;
    case ">=":
      return actual >= value;
    case "<=":
      return actual <= value;
    case ">":
      return actual > value;
    case "<":
      return actual < value;
    default:
      return false;
  }
}

function filterRows(rows: Row[], whereClause: string | undefined, args: unknown[]): Row[] {
  if (!whereClause) return rows;
  const conds = whereClause.split(/\s+AND\s+/i);
  if (conds.length !== args.length) {
    throw new Error(`FakeD1: condition/arg count mismatch in WHERE "${whereClause}"`);
  }
  return rows.filter((row) => conds.every((cond, i) => matchCondition(row, cond, args[i])));
}

function applyOrderBy(rows: Row[], orderByClause: string | undefined): Row[] {
  if (!orderByClause) return rows;
  const parts = orderByClause.split(",").map((p) => p.trim());
  return [...rows].sort((a, b) => {
    for (const part of parts) {
      const [col, dirRaw] = part.split(/\s+/);
      const dir = (dirRaw ?? "ASC").toUpperCase();
      const av = a[col!] as string | number;
      const bv = b[col!] as string | number;
      if (av < bv) return dir === "DESC" ? 1 : -1;
      if (av > bv) return dir === "DESC" ? -1 : 1;
    }
    return 0;
  });
}

function requireTable(tables: Tables, table: string): Row[] {
  const rows = tables[table];
  if (!rows) throw new Error(`FakeD1: unknown table "${table}"`);
  return rows;
}

function execSelect(tables: Tables, sql: string, args: unknown[]): Row[] {
  const m = sql.match(
    /^SELECT\s+.+?\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER BY\s+(.+))?$/is,
  );
  if (!m) throw new Error(`FakeD1: unsupported SELECT "${sql}"`);
  const [, table, whereClause, orderByClause] = m;
  const rows = requireTable(tables, table!);
  return applyOrderBy(filterRows(rows, whereClause, args), orderByClause);
}

function execInsert(tables: Tables, sql: string, args: unknown[]) {
  const m = sql.match(/^INSERT INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (!m) throw new Error(`FakeD1: unsupported INSERT "${sql}"`);
  const [, table, colsRaw] = m;
  const cols = colsRaw!.split(",").map((c) => c.trim());
  if (cols.length !== args.length) {
    throw new Error(`FakeD1: column/value count mismatch for INSERT into "${table}"`);
  }
  const row: Row = {};
  cols.forEach((col, i) => {
    row[col] = args[i];
  });
  requireTable(tables, table!).push(row);
  return { success: true, meta: { changes: 1 } };
}

function execUpdate(tables: Tables, sql: string, args: unknown[]) {
  const m = sql.match(/^UPDATE (\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)$/is);
  if (!m) throw new Error(`FakeD1: unsupported UPDATE "${sql}"`);
  const [, table, setClause, whereClause] = m;
  const setParts = setClause!.split(",").map((p) => p.trim());
  const setArgs = args.slice(0, setParts.length);
  const whereArgs = args.slice(setParts.length);
  const targets = filterRows(requireTable(tables, table!), whereClause, whereArgs);
  for (const row of targets) {
    setParts.forEach((part, i) => {
      const colMatch = part.match(/^(\w+)\s*=\s*\?$/);
      if (!colMatch) throw new Error(`FakeD1: unsupported SET clause "${part}"`);
      row[colMatch[1]!] = setArgs[i];
    });
  }
  return { success: true, meta: { changes: targets.length } };
}

function execDelete(tables: Tables, sql: string, args: unknown[]) {
  const m = sql.match(/^DELETE FROM (\w+)\s+WHERE\s+(.+)$/is);
  if (!m) throw new Error(`FakeD1: unsupported DELETE "${sql}"`);
  const [, table, whereClause] = m;
  const rows = requireTable(tables, table!);
  const targets = new Set(filterRows(rows, whereClause, args));
  tables[table!] = rows.filter((r) => !targets.has(r));
  return { success: true, meta: { changes: targets.size } };
}

function execMutation(tables: Tables, sql: string, args: unknown[]) {
  const trimmed = sql.trim();
  if (/^INSERT/i.test(trimmed)) return execInsert(tables, trimmed, args);
  if (/^UPDATE/i.test(trimmed)) return execUpdate(tables, trimmed, args);
  if (/^DELETE/i.test(trimmed)) return execDelete(tables, trimmed, args);
  throw new Error(`FakeD1: unsupported mutation "${sql}"`);
}

export class FakeD1 {
  tables: Tables = Object.fromEntries(TABLE_NAMES.map((t) => [t, []]));

  prepare(sql: string) {
    const tables = this.tables;
    return {
      bind: (...args: unknown[]) => ({
        first: async <T>(): Promise<T | null> => {
          const trimmed = sql.trim();
          if (!/^SELECT/i.test(trimmed)) {
            throw new Error(`FakeD1: first() called on non-SELECT "${sql}"`);
          }
          return (execSelect(tables, trimmed, args)[0] as T | undefined) ?? null;
        },
        all: async <T>(): Promise<{ results: T[] }> => {
          const trimmed = sql.trim();
          if (!/^SELECT/i.test(trimmed)) {
            throw new Error(`FakeD1: all() called on non-SELECT "${sql}"`);
          }
          return { results: execSelect(tables, trimmed, args) as T[] };
        },
        run: async () => execMutation(tables, sql, args),
      }),
    };
  }
}

export function createFakeD1(): D1Database {
  return new FakeD1() as unknown as D1Database;
}
