# 環境変数・シークレット管理

## apps/api（Cloudflare Workers）

- ローカル開発: `apps/api/.dev.vars`（`.dev.vars.example` をコピーして作成、git 管理外）
- 本番: `wrangler secret put <NAME>` で Cloudflare に登録（リポジトリには保存しない）
- 必要な値:
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google OAuth クライアント情報
  - `SESSION_SECRET`: セッション Cookie 署名用のランダム文字列
- `wrangler.toml` の `[vars]` にある `WEB_ORIGIN`（CORS許可オリジン。パスを含めない）・
  `WEB_APP_URL`（ログイン後のリダイレクト先。`wagaya.org` 配下の `/logue` プレフィックスを含む）は
  本番用の値をデフォルトにしているため、ローカル開発では `.dev.vars` に
  `WEB_ORIGIN=http://localhost:5173` / `WEB_APP_URL=http://localhost:5173/logue` を追加して
  上書きする（`wrangler dev` は同名キーを `.dev.vars` の値で上書きする）

## apps/web（Cloudflare Pages / Vite）

- ローカル開発: `apps/web/.env`（`.env.example` をコピーして作成、git 管理外）
- 本番: Cloudflare Pages のプロジェクト設定で環境変数を登録
- `VITE_` プレフィックスの値はビルド時にクライアントバンドルへ埋め込まれるため、
  秘匿情報（クライアントシークレット等）は置かない
- Google OAuth のクライアント ID/シークレットはフロントエンドには渡さない。ログインは
  `apps/api` の `/api/auth/login` へのフルページ遷移で行うため、`apps/web` 側では
  Google 関連の値を保持しない

## CI（GitHub Actions）

- Cloudflare へのデプロイを CI から行う場合は `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` を
  GitHub リポジトリの Secrets に登録して利用する（Phase 8 で本番デプロイを自動化する際に整備）

## 本番デプロイ手順（暫定・手動）

Cloudflare Pages 側は GitHub 連携（Git Provider）を設定していないため、現状は手元から
`wrangler` で手動デプロイする。Phase 8 で GitHub Actions 経由の自動デプロイに置き換える想定。

リポジトリルートから1コマンドで API・Web 両方をデプロイできる（内部で `wrangler` に
`--config`/ワークスペース指定を渡しているため `cd` は不要）。

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
echo "VITE_API_BASE_URL=https://logue-api.anison.workers.dev" > apps/web/.env.production
npm run build --workspace apps/web
npx wrangler pages deploy apps/web/dist --project-name logue-web
```

- 本番 URL: Web = `https://wagaya.org/logue`（実体は `https://logue-web.pages.dev`
  を `wagaya.org` の Worker がリバースプロキシしている。直接 `logue-web.pages.dev` に
  アクセスしてもアセットのパスが `/logue` 前提のため正しく動かない）/
  API = `https://logue-api.anison.workers.dev`
- `.env.production` は `.gitignore` の `.env.*` に含まれるため commit されない。デプロイのたびに
  上記のとおり手元で生成する
- 本番の `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` は [google-oauth-setup.md](./google-oauth-setup.md)
  の手順で発行し、`wrangler secret put` で登録するまでログイン機能は動作しない
