# 環境変数・シークレット管理

## apps/api（Cloudflare Workers）

- ローカル開発: `apps/api/.dev.vars`（`.dev.vars.example` をコピーして作成、git 管理外）
- 本番: `wrangler secret put <NAME>` で Cloudflare に登録（リポジトリには保存しない）
- 必要な値:
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google OAuth クライアント情報
  - `SESSION_SECRET`: セッション Cookie 署名用のランダム文字列
- `wrangler.toml` の `[vars]` にある `WEB_ORIGIN`（CORS許可オリジン）・
  `WEB_APP_URL`（ログイン後のリダイレクト先）は
  本番用の値をデフォルトにしているため、ローカル開発では `.dev.vars` に
  `WEB_ORIGIN=http://localhost:5173` / `WEB_APP_URL=http://localhost:5173` を追加して
  上書きする（`wrangler dev` は同名キーを `.dev.vars` の値で上書きする）
- `E2E_TEST_AUTH`: **本番・通常の開発環境（`.dev.vars`）には絶対に設定しない。**
  `"1"` を設定すると、Google OAuthを経由せず任意のメールアドレスでセッションを発行できる
  テスト専用エンドポイント `POST /api/auth/test-login` が有効になる（未設定時は404を返し、
  存在自体が分からない）。E2Eテスト実行時のみ `apps/api/.dev.vars.e2e`（`npm run test:e2e` が
  自動生成、git管理外）で設定される。詳細は README の「E2Eテスト」節を参照

## apps/web（Cloudflare Pages / Vite）

- ローカル開発: `apps/web/.env`（`.env.example` をコピーして作成、git 管理外）
- 本番: Cloudflare Pages のプロジェクト設定で環境変数を登録
- `VITE_` プレフィックスの値はビルド時にクライアントバンドルへ埋め込まれるため、
  秘匿情報（クライアントシークレット等）は置かない
- Google OAuth のクライアント ID/シークレットはフロントエンドには渡さない。ログインは
  `apps/api` の `/api/auth/login` へのフルページ遷移で行うため、`apps/web` 側では
  Google 関連の値を保持しない

## CI（GitHub Actions）

- 通常の CI（`.github/workflows/ci.yml`）は Cloudflare の認証情報を必要としない
  （`test`/`e2e` ジョブはローカルの `wrangler dev` ＋ローカル D1 のみで完結する）
- 本番デプロイ（`.github/workflows/deploy.yml`）だけは Cloudflare へのアクセスが必要なため、
  `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` を GitHub リポジトリの
  Settings → Secrets and variables → Actions に登録する
  - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare ダッシュボード右サイドバーの Account ID
  - `CLOUDFLARE_API_TOKEN`: Cloudflare ダッシュボード → My Profile → API Tokens で発行。
    「Edit Cloudflare Workers」テンプレートをベースに、対象アカウントで
    **Workers Scripts: Edit**・**D1: Edit**・**Cloudflare Pages: Edit** の3権限を持つトークンを作成する
  - この2つの Secrets は `deploy.yml` の `environment: production` にひもづける。完全な自動
    デプロイにする場合、Settings → Environments → production に必須レビュアーを設定しないこと。
    必須レビュアーを設定すると、自動起動後に承認待ちとなる

## 本番デプロイ手順

Cloudflare Pages 側は GitHub 連携（Git Provider）を設定していないため、GitHub Actions の
`deploy` ワークフローから `wrangler` 経由でデプロイする。`main` へのpushを対象にした `CI`
ワークフローがすべて成功すると、`workflow_run` を通じて成功したコミットSHAをチェックアウトし、
APIのD1マイグレーション適用・Workersデプロイ・Webビルド・Pagesデプロイを順に自動実行する。
CI失敗時やPull RequestのCIではデプロイしない。連続実行は `production-deploy` concurrency groupで
直列化する。必要に応じてGitHubのActionsタブから `Deploy` ワークフローを手動実行でき、
手動実行時もデプロイ前に `format:check` / `lint` / `typecheck` / Jestを通す。

手元から直接デプロイしたい場合（ワークフローを使わない場合）は、リポジトリルートから
1コマンドで API・Web 両方をデプロイできる（内部で `wrangler` に `--config`/ワークスペース指定を
渡しているため `cd` は不要）。ローカル実行には別途 `wrangler login` 済みであるか、
`CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` を環境変数で渡す必要がある。

```bash
npm run deploy
```

API・Web を個別にデプロイしたい場合は `npm run deploy:api` / `npm run deploy:web` を使う。
中身は以下と同等:

```bash
# API（Cloudflare Workers）: D1 のリモートマイグレーション適用 → デプロイ
npx wrangler d1 migrations apply logue-db --remote --config apps/api/wrangler.toml
npx wrangler deploy --config apps/api/wrangler.toml

# Web（Cloudflare Pages）: 本番 API の URL を指定してビルド → デプロイ
echo "VITE_API_BASE_URL=https://logue-api.wagaya.workers.dev" > apps/web/.env.production
npm run build --workspace apps/web
npx wrangler pages deploy apps/web/dist --project-name logue-web
```

- 本番 URL: Web = `https://logue.wagaya.org`（実体は Cloudflare Pages プロジェクト
  `logue-web` に Custom Domain として割り当てて配信) /
  API = `https://logue-api.wagaya.workers.dev`
- `.env.production` は `.gitignore` の `.env.*` に含まれるため commit されない。デプロイのたびに
  上記のとおり手元で生成する
- 本番の `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` は [google-oauth-setup.md](./google-oauth-setup.md)
  の手順で発行し、`wrangler secret put` で登録するまでログイン機能は動作しない
