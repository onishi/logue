import type { UserRow } from "../db/users";

/**
 * db/users.ts が発行する2種類のクエリ（users を id/google_sub で SELECT、INSERT）だけに
 * 対応した最小限のインメモリ D1 スタブ。Miniflare なしで db 層のロジックをテストするために使う。
 */
export class FakeD1 {
  rows: UserRow[] = [];

  prepare(sql: string) {
    const rows = this.rows;
    return {
      bind: (...args: unknown[]) => ({
        first: async <T>(): Promise<T | null> => {
          if (sql.includes("WHERE google_sub")) {
            return (rows.find((r) => r.google_sub === args[0]) as T | undefined) ?? null;
          }
          if (sql.includes("WHERE id")) {
            return (rows.find((r) => r.id === args[0]) as T | undefined) ?? null;
          }
          throw new Error(`FakeD1: unsupported query "${sql}"`);
        },
        run: async () => {
          if (sql.startsWith("INSERT INTO users")) {
            const [id, googleSub, email, name, pictureUrl] = args as [
              string,
              string,
              string,
              string | null,
              string | null,
            ];
            const now = new Date().toISOString();
            rows.push({
              id,
              google_sub: googleSub,
              email,
              name,
              picture_url: pictureUrl,
              created_at: now,
              updated_at: now,
            });
            return { success: true };
          }
          throw new Error(`FakeD1: unsupported query "${sql}"`);
        },
      }),
    };
  }
}

export function createFakeD1(): D1Database {
  return new FakeD1() as unknown as D1Database;
}
