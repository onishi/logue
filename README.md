# logue

体重・ファスティング・筋トレ・食事など、何でも自由に記録できるパーソナルログアプリ。
数値項目はグラフ化（移動平均含む）できる。アプリ側に組み込みの記録項目は一切持たず、
ユーザーが記録項目（metric）を自分で定義してから記録する。

詳細な開発計画・進捗は [plan.md](./plan.md) を参照。本 README は現時点の仕様・構成のスナップショット。

## 技術スタック

- **フロントエンド**: React（関数コンポーネント）+ Vite + TypeScript strict、Cloudflare Pages にデプロイ
- **バックエンド**: Cloudflare Workers + [Hono](https://hono.dev/)。REST API として Web／将来クライアントから共通利用
- **DB**: Cloudflare D1（SQLite）
- **認証**: Google OAuth 2.0（Authorization Code Flow + PKCE）。Workers 上で実装し、セッションは署名付き Cookie
- **グラフ**: Recharts（予定）
- **テスト**: Jest。Workers ランタイム依存部分は D1 のフェイク実装（`apps/api/src/testing/fakeD1.ts`）でテスト
- **構成管理**: モノレポ（npm workspaces）

## モノレポ構成

```
/apps
  /web        - React フロントエンド (Cloudflare Pages)
  /api        - Cloudflare Workers API (Hono)
/packages
  /shared     - 共通型定義（@logue/shared）
/docs         - ドキュメント（環境変数、Google OAuth 設定手順など）
```

将来の Android アプリや外部デバイス連携も `apps/api` の REST API をそのまま再利用する想定。

## データモデル（設計方針）

- `users` - Google アカウント連携のユーザー（実装済み）
- `metric_groups` - metric をまとめるグループ（例:「体組成」「筋トレ」「食事」など、ユーザーが自由作成）。名前・表示順を持つ（未実装）
- `metrics` - ユーザーが定義する記録項目。種別（`number` / `choice` / `text`）、単位、選択肢、表示順、
  所属する `metric_group`、アーカイブ状態（`is_archived`）を持つ（未実装）
- `entries` - 実際の記録データ（metric_id, user_id, value, recorded_at など）（未実装）
- `choice_options` - `choice` 型 metric の選択肢マスタ（未実装）
- `user_settings` - 表示設定・単位設定など（未実装）

使わなくなった metric は削除せず `is_archived` フラグで非表示にする方針（記録入力・一覧には出さないが、
過去の entries とグラフには使い続けられるようにする）。体重・ファスティング・筋トレ・食事なども含め、
アプリ側に組み込みの記録項目は一切持たず、初期状態では metrics は空。

## 現在の実装状況

現時点で実装済みなのは **Phase 0（プロジェクト基盤）** と **Phase 1（認証基盤）**。
metric / entry まわりの機能（Phase 2 以降）は未実装で、フロントエンドはログイン状態の確認・
ログイン／ログアウトのみ行うプレースホルダー画面。

### 実装済み

- モノレポ基盤（npm workspaces / ESLint / Prettier / Jest / TypeScript strict）
- Cloudflare Workers + Hono の API 雛形、D1 データベースと `users` テーブルのマイグレーション
- Google OAuth 2.0 Authorization Code Flow（PKCE 対応）によるログイン
  - `GET /api/auth/login` - Google 認可画面へリダイレクト（state・PKCE code_verifier を Cookie に保存）
  - `GET /api/auth/callback` - コールバック処理、トークン検証、ユーザー作成/紐付け、セッション発行
  - `POST /api/auth/logout` - セッション Cookie の削除
  - `GET /api/auth/me` - ログイン中ユーザー情報の取得（要認証）
  - `GET /api/health` - ヘルスチェック
- セッション管理: 署名付き Cookie（有効期限30日、残り7日を切ったら自動延長）
- 認証必須 API 向けミドルウェア（`requireAuth`）
- フロントエンドのログイン/ログアウト UI・認証状態管理（`useAuth` フック）
- GitHub Actions CI（format check / lint / typecheck / test）

### 未実装（Phase 2 以降、詳細は plan.md）

- metrics / entries などのデータモデルとその CRUD API
- 記録項目管理画面・動的記録入力フォーム・記録一覧
- ユーザー設定・表示カスタマイズ
- グラフ・可視化（移動平均等）
- PWA 化・ダークモード等の UI/UX 仕上げ
- 過去データ一括入力・Google スプレッドシート連携
- 本番リリース

## セットアップ

```bash
npm ci
```

### 環境変数

- `apps/api/.dev.vars`（`.dev.vars.example` をコピー）に `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` /
  `SESSION_SECRET` / `WEB_ORIGIN` を設定
- `apps/web/.env`（`.env.example` をコピー）に `VITE_API_BASE_URL` を設定

Google OAuth クライアントの作成手順は [docs/google-oauth-setup.md](./docs/google-oauth-setup.md)、
環境変数・シークレット管理方針の詳細は [docs/secrets.md](./docs/secrets.md) を参照。

### 開発サーバー起動

```bash
npm run dev:api   # Cloudflare Workers API (http://localhost:8787)
npm run dev:web   # Vite 開発サーバー (http://localhost:5173)
```

## コマンド一覧

| コマンド                                  | 内容                            |
| ----------------------------------------- | ------------------------------- |
| `npm run lint`                            | ESLint                          |
| `npm run format` / `npm run format:check` | Prettier（適用 / チェックのみ） |
| `npm run typecheck`                       | 各ワークスペースの型チェック    |
| `npm test`                                | Jest（全ワークスペース）        |
| `npm run dev:web` / `npm run dev:api`     | 開発サーバー起動                |

CI（GitHub Actions）では push / PR ごとに `format:check` → `lint` → `typecheck` → `test` を実行する。

## 開発ワークフロー

`main` から機能ブランチを作成し、機能単位でコミット。ひとまとまりの機能ができたらプルリクエストを
作成する（マージ・デプロイはユーザー確認の上で実施）。詳細は [AGENTS.md](./AGENTS.md) を参照。
