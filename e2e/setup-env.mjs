// E2Eテスト実行前に apps/api/.dev.vars.e2e を生成する（gitignore 対象、テストのたびに
// 生成し直す）。E2E_TEST_AUTH=1 を設定することで、Google OAuthを経由しないテスト専用の
// ログインエンドポイント（POST /api/auth/test-login）を有効にする。このファイルは
// ローカル開発用の本物の .dev.vars とは別ファイルであり、上書きしない。
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const webPort = process.env.E2E_WEB_PORT ?? "5199";

const contents = `GOOGLE_CLIENT_ID=e2e-unused-client-id
GOOGLE_CLIENT_SECRET=e2e-unused-client-secret
SESSION_SECRET=e2e-test-session-secret-not-for-production-use
WEB_ORIGIN=http://localhost:${webPort}
WEB_APP_URL=http://localhost:${webPort}/logue
E2E_TEST_AUTH=1
`;

const outPath = fileURLToPath(new URL("../apps/api/.dev.vars.e2e", import.meta.url));
writeFileSync(outPath, contents);
console.log(`wrote ${outPath}`);
