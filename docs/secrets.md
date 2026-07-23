# 環境変数・シークレット管理

## apps/api（Cloudflare Workers）

- ローカル開発: `apps/api/.dev.vars`（`.dev.vars.example` をコピーして作成、git 管理外）
- 本番: `wrangler secret put <NAME>` で Cloudflare に登録（リポジトリには保存しない）
- 必要な値:
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google OAuth クライアント情報
  - `SESSION_SECRET`: セッション Cookie 署名用のランダム文字列

## apps/web（Cloudflare Pages / Vite）

- ローカル開発: `apps/web/.env`（`.env.example` をコピーして作成、git 管理外）
- 本番: Cloudflare Pages のプロジェクト設定で環境変数を登録
- `VITE_` プレフィックスの値はビルド時にクライアントバンドルへ埋め込まれるため、
  秘匿情報（クライアントシークレット等）は置かない

## CI（GitHub Actions）

- Cloudflare へのデプロイを CI から行う場合は `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` を
  GitHub リポジトリの Secrets に登録して利用する（Phase 8 で本番デプロイを自動化する際に整備）
