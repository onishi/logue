// @types/node 全体を読み込むと @cloudflare/workers-types のグローバル定義（fetch, Response 等）と
// 衝突するため、テストで使う node:sqlite の最小限の型だけをここで独自に宣言する。
declare module "node:sqlite" {
  export class StatementSync {
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
    run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  }

  export class DatabaseSync {
    constructor(location: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}
