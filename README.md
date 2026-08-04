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
- **グラフ**: [Recharts](https://recharts.org/)
- **アイコン**: [Material Symbols](https://fonts.google.com/icons) を SVG パスとして自前バンドル
  （外部フォント/アイコンライブラリの実行時読み込みなし。`apps/web/src/components/materialSymbols.ts`）
- **テスト**: Jest。Workers ランタイム依存部分は D1 のフェイク実装（`apps/api/src/testing/fakeD1.ts`）でテスト
- **構成管理**: モノレポ（npm workspaces）

## モノレポ構成

```
/apps
  /web        - React フロントエンド (Cloudflare Pages)
  /api        - Cloudflare Workers API (Hono)
/packages
  /shared     - 共通型定義・ロジック（@logue/shared）
/docs         - ドキュメント（環境変数、Google OAuth / Sheets 設定手順など）
```

将来の Android アプリや外部デバイス連携も `apps/api` の REST API をそのまま再利用する想定。

## データモデル（設計方針）

- `users` - Google アカウント連携のユーザー
- `metric_groups` - metric をまとめるグループ（例:「体組成」「筋トレ」「食事」など、ユーザーが自由作成）。名前・表示順を持つ
- `metrics` - ユーザーが定義する記録項目。種別（`number` / `choice` / `text`）、単位、選択肢、表示順、
  所属する `metric_group`、アーカイブ状態（`is_archived`）を持つ
- `entries` - 実際の記録データ（metric_id, user_id, value, recorded_at など）
- `choice_options` - `choice` 型 metric の選択肢マスタ
- `user_settings` - 表示設定（現状はテーマのみ。`light` / `dark` を明示的に保存し、未設定時は
  端末の `prefers-color-scheme` に従う「system」として扱う）
- `google_sheets_connections` - ユーザーごとの Google スプレッドシート連携設定（対象シート、
  同期有効/無効、暗号化した refresh token、最終同期日時・エラー、前回同期時点のスナップショット）

使わなくなった metric は削除せず `is_archived` フラグで非表示にする方針（記録入力・一覧には出さないが、
過去の entries とグラフには使い続けられるようにする）。体重・ファスティング・筋トレ・食事なども含め、
アプリ側に組み込みの記録項目は一切持たず、初期状態では metrics は空。

## 画面構成

ログイン後、下部タブから4画面（記録する／記録一覧／グラフ／項目管理）に加え、右上のユーザーメニューから
CSV入出力・設定画面に遷移できる。

- **記録する**（`EntryFormScreen`）: 日付を指定し、アーカイブ済みを除く記録項目をグループ単位のセクションで
  一括入力・上書き保存する画面。値を空にして保存すると該当日の記録を削除扱いにする
- **記録一覧**（`EntryListScreen`）: 日付 × 記録項目のピボットテーブル表示。グループ・記録項目での絞り込み
  （開閉式）、日付ごとの編集導線、画面下部に「過去データを一括入力」への導線
- **過去データを一括入力**（`BulkEntryScreen`）: 記録項目を1つ選び、開始日〜終了日の範囲（最大90日）を
  指定して日付ごとの入力欄をまとめて保存する画面
- **CSV入出力**（`CsvScreen`、ユーザーメニューから遷移）: グループ・記録項目で絞り込んだ範囲を
  UTF-8 BOM 付き CSV としてダウンロード、または CSV ファイルを読み込んで検証結果（不正な行の警告）を
  プレビューしたうえで一括インポートする。エクスポート・インポートで同じ列ヘッダー形式
  （`日付,項目名（単位）,...`）を使うため、書き出したCSVを編集して読み戻す運用が可能
- **グラフ**（`GraphScreen`）: 数値型の記録項目を時系列グラフ（Recharts）で表示。日別／週別／月別の
  表示単位切り替え、移動平均（7日/30日/カスタム日数）、グラフ/表ビューの切り替え。Y軸は系列の
  最小値〜最大値に対して上下20%の余白を持たせた範囲を自動算出し、最小値が0以上の場合は下限を
  0未満にしない
- **項目管理**（`MetricManagementScreen`）: 記録項目グループ・記録項目それぞれの追加・改名・削除・
  アーカイブ（記録項目のみ）と、ドラッグ&ドロップによる並び替え。ドラッグ中の要素はポインターに
  追従して表示され、現在の挿入位置にはアクセントカラーの枠線を表示する（`useDragReorder` フック）
- **設定**（`SettingsScreen`）: テーマ切り替え（端末の設定に合わせる／ライト／ダーク）と
  Google スプレッドシート連携の設定（後述）

## Google スプレッドシート連携

ログイン用の Google OAuth とは別に、`https://www.googleapis.com/auth/spreadsheets` スコープを
要求する独立した OAuth フロー（`/api/sheets/connect`）で連携する。取得した refresh token は
`SESSION_SECRET` から導出した鍵で AES-GCM 暗号化して保存するため、追加の環境変数は不要。

- スプレッドシートをマスターデータとして扱いつつ、アプリからの直接入力とも**双方向に同期**する
- 同一セルが両側で食い違って変更されていた場合は**スプレッドシート側を優先**する3-wayマージ
  （前回同期時点のスナップショットとの差分で「どちらが変更したか」を判定。`apps/api/src/googleSheets/merge.ts`）
- **1時間ごとに自動同期**（Cloudflare Cron Trigger）。設定画面から「今すぐ同期」による手動同期も可能
- CSV機能と共通のグリッド構築・解析ロジック（`packages/shared/src/sheetGrid.ts`）を使用

利用前にユーザー側で Google Cloud Console にて Google Sheets API の有効化・OAuth同意画面への
スコープ追加が必要。手順は [docs/google-oauth-setup.md](./docs/google-oauth-setup.md) を参照。

## 現在の実装状況

**Phase 0〜7 が実装済み**（プロジェクト基盤／認証基盤／データモデル & API 基盤／記録項目管理・
記録入力の MVP／ユーザー設定／グラフ・可視化／UI・UX仕上げ・PWA化／データ入出力・外部連携）。
「記録項目をユーザーが自分で定義し、それに対して記録し、数値項目をグラフで振り返り、CSVや
Googleスプレッドシートで入出力する」という一連の操作が画面から行える状態
（オンボーディング用テンプレート機能は任意項目のため未実装）。

### 実装済み（抜粋）

- モノレポ基盤（npm workspaces / ESLint / Prettier / Jest / TypeScript strict）
- Cloudflare Workers + Hono の API、D1 データベースマイグレーション
  （`users`, `metric_groups`, `metrics`, `choice_options`, `entries`, `user_settings`,
  `google_sheets_connections`）
- Google OAuth 2.0 Authorization Code Flow（PKCE 対応）によるログイン（`/api/auth/*`）
- セッション管理: 署名付き Cookie（有効期限30日、残り7日を切ったら自動延長）
- 認証必須 API 向けミドルウェア（`requireAuth`）
- 記録項目・記録項目グループ・記録の CRUD API（すべて要認証、リクエストボディは
  `packages/shared` の Zod スキーマでバリデーション。`/api/metric-groups`, `/api/metrics`,
  `/api/entries`, `/api/user-settings`）
- Google スプレッドシート連携 API（`/api/sheets/*`: 接続開始・コールバック・状態取得・設定更新・
  手動同期・連携解除）と、1時間ごとの自動同期（Cloudflare Cron Trigger）
- フロントエンド用の型安全な API クライアントと React フック（`apps/web/src/lib/*Api.ts`,
  `apps/web/src/hooks/use*.ts`）
- 上記「画面構成」の全画面
- ドラッグ&ドロップの並び替え（`useDragReorder`）、開閉式の絞り込みセクション（`CollapsibleSection`）
- CSV エクスポート/インポート（`apps/web/src/lib/csv.ts`, `csvImport.ts`,
  `packages/shared/src/sheetGrid.ts`）
- GitHub Actions CI（format check / lint / typecheck / test）
- PWA 化（`vite-plugin-pwa`。manifest・アイコン一式・service worker によるアプリシェルの
  プリキャッシュ、`/api/*` GET の NetworkFirst ランタイムキャッシュ）
- モバイルファーストなレスポンシブ UI（タブレット・デスクトップ幅ではアプリシェルを
  `--app-max-width` で中央寄せ）
- アクセシビリティ（axe-core による自動監査を実施し、配色コントラストや
  ヘッダーのユーザーメニューのフォーカス管理の問題を修正済み）

### 未実装（Phase 8 以降、詳細は plan.md）

- ユニットテストカバレッジの再確認、E2Eテスト、セキュリティレビュー
- 本番環境デプロイ設定の自動化・本番リリース、ドキュメント整備の継続
- Phase 9（将来拡張）: Android アプリ、ウェアラブル/スマート体重計連携、OCR取り込みなど

## セットアップ

```bash
npm ci
```

### 環境変数

- `apps/api/.dev.vars`（`.dev.vars.example` をコピー）に `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` /
  `SESSION_SECRET` / `WEB_ORIGIN` を設定（Google スプレッドシート連携用の追加シークレットは不要。
  `SESSION_SECRET` から鍵を導出して利用する）
- `apps/web/.env`（`.env.example` をコピー）に `VITE_API_BASE_URL` を設定

Google OAuth クライアントの作成・Google Sheets API 有効化の手順は
[docs/google-oauth-setup.md](./docs/google-oauth-setup.md)、環境変数・シークレット管理方針や
本番デプロイ手順の詳細は [docs/secrets.md](./docs/secrets.md) を参照。

### 開発サーバー起動

```bash
npm run dev:api   # Cloudflare Workers API (http://localhost:8787)
npm run dev:web   # Vite 開発サーバー (http://localhost:5173)
```

## デプロイ

Cloudflare Pages 側は Git 連携を設定していないため、手元から `wrangler` で手動デプロイする。

```bash
npm run deploy
```

内部的には D1 のリモートマイグレーション適用 → API（Cloudflare Workers）デプロイ → Web
（Cloudflare Pages）ビルド・デプロイの順に実行する（`npm run deploy:api` / `npm run deploy:web` で
個別実行も可能）。詳細・本番 URL は [docs/secrets.md](./docs/secrets.md) を参照。

## コマンド一覧

| コマンド                                  | 内容                            |
| ----------------------------------------- | ------------------------------- |
| `npm run lint`                            | ESLint                          |
| `npm run format` / `npm run format:check` | Prettier（適用 / チェックのみ） |
| `npm run typecheck`                       | 各ワークスペースの型チェック    |
| `npm test`                                | Jest（全ワークスペース）        |
| `npm run dev:web` / `npm run dev:api`     | 開発サーバー起動                |
| `npm run deploy`                          | 本番デプロイ（API・Web 両方）   |

CI（GitHub Actions）では push / PR ごとに `format:check` → `lint` → `typecheck` → `test` を実行する。

## 開発ワークフロー

`main` から機能ブランチを作成し、機能単位でコミット。ひとまとまりの機能ができたらプルリクエストを
作成する（マージ・デプロイはユーザー確認の上で実施）。詳細は [AGENTS.md](./AGENTS.md) を参照。
