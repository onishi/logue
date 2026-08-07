/**
 * wagaya.org のリバースプロキシ配下 (`/logue`) で動かすためのベースパス。
 * vite.config.ts の `base` と一致させる。ローカル開発・ビルド後のどちらも
 * このプレフィックス付きの URL でのみ動作する。
 */
export const APP_BASE = "/logue";
