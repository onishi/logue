export type Env = {
  DB: D1Database;
  WEB_ORIGIN: string;
  WEB_APP_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  // E2Eテスト実行時のみ "1" を設定する。本番のwrangler.toml/secretsには絶対に設定しない
  // （/api/auth/test-login がGoogle OAuthを経由せずセッションを発行できてしまうため）。
  E2E_TEST_AUTH?: string;
};
