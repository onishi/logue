# logue 開発計画

日常記録アプリ「logue」の開発計画。体重・ファスティング・筋トレ・食事など何でも記録でき、
数値項目はグラフ化（移動平均含む）できるパーソナルログアプリ。

## 技術スタック

- **フロントエンド**: React (関数コンポーネント) + Vite + TypeScript strict、Cloudflare Pages にデプロイ
- **バックエンド**: Cloudflare Workers + Hono（軽量ルーター）、REST API として Web/将来クライアントから共通利用
- **DB**: Cloudflare D1 (SQLite)
- **認証**: Google OAuth 2.0（Authorization Code Flow）。Workers 上で実装し、セッションは署名付き Cookie + D1/KV
- **グラフ**: Recharts（dataviz スキルのガイドラインに準拠）
- **テスト**: Jest（AGENTS.md 準拠）。Workers ランタイム依存部分は Miniflare 経由でテスト
- **構成管理**: モノレポ（npm workspaces）

## モノレポ構成（想定）

```
/apps
  /web        - React フロントエンド (Cloudflare Pages)
  /api        - Cloudflare Workers API (Hono)
/packages
  /shared     - 共通型定義・Zod スキーマ・API クライアント
/tests        - 結合テスト等（各パッケージにも単体テストを持つ）
/docs         - ドキュメント
```

将来の Android アプリや外部デバイス連携は `apps/api` の REST API をそのまま再利用する。

## データモデル概略

- `users` - Google アカウント連携のユーザー
- `metric_groups` - metric をまとめるグループ（例: 「体組成」「筋トレ」「食事」など、ユーザーが自由に作成）。名前・表示順を持つ
- `metrics` - ユーザーが定義する記録項目（体重・ファスティング・筋トレ種目・食事など）。
  種別（`number` / `choice` / `text`）、単位、選択肢、表示順、所属する `metric_group`、
  アーカイブ状態（`is_archived`）を持つ
- `entries` - 実際の記録データ（metric_id, user_id, value, recorded_at など）
- `choice_options` - `choice` 型 metric の選択肢マスタ
- `user_settings` - 表示設定・単位設定など

使わなくなった metric は削除せず `is_archived` フラグで非表示にする。アーカイブ済み metric は
記録入力画面や一覧には出てこないが、過去の entries とグラフには引き続き使えるようにする。

体重・ファスティング・筋トレ・食事なども含め、アプリ側に組み込みの記録項目は一切持たない。
初期状態では `metrics` は空で、ユーザーが記録項目管理画面から自分で追加する。

---

## Phase 0: プロジェクト基盤整備

- [x] モノレポ構成のセットアップ（npm workspaces）
- [x] `apps/web`（Vite + React + TS strict）雛形作成
- [x] `apps/api`（Cloudflare Workers + Hono + TS strict）雛形作成
- [x] `packages/shared`（共通型・Zod スキーマ）雛形作成
- [x] ESLint / Prettier 設定
- [x] Jest 設定（各パッケージ共通の設定を `packages/shared` 等に集約）
- [x] Wrangler 設定（`wrangler.toml`）、D1 データベース作成
- [x] GitHub Actions CI（lint / typecheck / test）
- [x] `.env` / secrets 管理方針の整理（Google OAuth クライアント情報など）

## Phase 1: 認証基盤

- [ ] Google Cloud Console で OAuth クライアント作成（開発用・本番用）
- [ ] Workers 上に Google OAuth 2.0 Authorization Code Flow を実装
- [ ] コールバック処理・トークン検証・ユーザー作成/紐付け（`users` テーブル）
- [ ] セッション発行（署名付き Cookie、有効期限・リフレッシュ方針の設計）
- [ ] フロントエンドのログイン/ログアウト UI・認証状態管理
- [ ] 認証必須 API の権限チェックミドルウェア
- [ ] 認証まわりのユニットテスト

## Phase 2: データモデル & API 基盤

- [ ] D1 マイグレーション作成（`users`, `metric_groups`, `metrics`, `entries`, `choice_options`, `user_settings`）
- [ ] `packages/shared` に Zod スキーマ・型定義を集約（API 入出力のバリデーション兼用）
- [ ] metrics CRUD API（記録項目の作成・編集・削除・並び替え）
- [ ] entries CRUD API（記録の作成・編集・削除・期間指定取得）
- [ ] API のユニット/結合テスト
- [ ] API クライアント（`packages/shared` 経由でフロントから型安全に呼び出し）

## Phase 3: 記録項目管理・汎用記録入力（MVP）

組み込みの記録機能は作らず、「記録項目（metric）をユーザーが定義し、それに対して記録（entry）
を入力する」という汎用機能のみを実装する。体重やファスティングなどはこの上でユーザー自身が
metric として作成する想定。

- [ ] 記録項目（metric）管理画面（追加・編集・削除・並び替え）
- [ ] 入力タイプ設定（数値／選択肢／自由入力）と単位・アイコン等の付随設定
- [ ] 選択肢（choice_options）の管理 UI
- [ ] metric グルーピング機能（グループ作成・編集・並び替え、metric をグループに割り当て）
- [ ] metric のアーカイブ（非表示）機能（一覧・入力画面には出さず、データと履歴グラフは維持。再表示も可能）
- [ ] 動的記録入力フォーム（metric の入力タイプに応じて数値/選択肢/自由入力の UI を出し分け、グループ単位で表示）
- [ ] 日々の記録一覧・タイムライン表示画面（グループ単位の表示切り替え）
- [ ] （任意）オンボーディング用テンプレート機能：体重・ファスティング・筋トレ・食事などの
      metric 定義サンプルを提示し、ユーザーが選んだものだけをワンクリックで追加できる補助機能。
      あくまで提案であり、何も選ばなければ metric は一切作成されない
- [ ] 各機能の単体テスト

## Phase 4: ユーザー設定・表示カスタマイズ

- [ ] ユーザー設定画面（表示順、デフォルト単位、テーマなど）
- [ ] カスタマイズ機能のテスト

## Phase 5: グラフ・可視化

- [ ] 数値メトリクスの時系列グラフ（日別／週別／月別切り替え）
- [ ] 移動平均線（7日・30日など、期間可変）の算出・表示
- [ ] 複数メトリクスの重ね合わせ／比較表示
- [ ] グラフ画面のレスポンシブ対応（dataviz スキルのガイドライン準拠）
- [ ] グラフ計算ロジック（移動平均等）のユニットテスト

## Phase 6: UI/UX 仕上げ・PWA 化

- [ ] モバイルファーストなレスポンシブ UI 全体調整
- [ ] ダークモード対応
- [ ] PWA 化（manifest, service worker、ホーム画面追加、オフライン閲覧）
- [ ] アクセシビリティ確認

## Phase 7: データ入出力・外部連携

- [ ] 過去データの一括入力
  - [ ] 日付を指定して複数日分をまとめて入力できるフォーム、および CSV 等での一括インポート UI
  - [ ] 重複日時・不正値のバリデーション
  - [ ] 単体テスト
- [ ] Google スプレッドシート連携
  - [ ] Google Sheets API 用の追加 OAuth スコープ取得・同意フロー対応
  - [ ] エクスポート: entries データを指定のスプレッドシートに書き出し（バックアップ・自分での分析用）
  - [ ] インポート: 既にスプレッドシートで記録しているデータを読み込んで entries に取り込み
  - [ ] 連携設定 UI（対象シート選択、同期方向・タイミングの設定）
  - [ ] 単体テスト

## Phase 8: テスト・品質保証・本番リリース

- [ ] ユニットテストカバレッジ >80% 達成確認
- [ ] E2E テスト（主要フロー: ログイン→記録→グラフ確認）
- [ ] セキュリティレビュー（認証・入力バリデーション・CSRF/XSS対策）
- [ ] Cloudflare Pages / Workers 本番環境デプロイ設定
- [ ] 本番リリース（ユーザー確認の上でデプロイ）
- [ ] ドキュメント整備（README, docs/ 更新）

---

## Phase 9（将来拡張・別プロジェクトフェーズとして着手）

- [ ] Android アプリ開発（既存 API をそのまま利用、Kotlin/Compose 想定）
- [ ] Huawei Watch 連携（Huawei Health Kit / Bluetooth 連携方式の調査含む）
- [ ] Anker 体重計連携（Bluetooth/公式 API の有無調査、データ自動取り込み）
- [ ] スクリーンショットからのデータ取り込み（OCR/画像解析によるメトリクス自動入力）

各項目は連携方式の技術調査から始め、調査結果に応じて詳細フェーズを別途切り出す。

---

## 進め方について

- 各 Phase は AGENTS.md の開発ワークフローに従い、機能ブランチを作成して機能単位でコミット
- Phase 内のまとまった機能ができ次第、プルリクエストを作成（マージ・デプロイはユーザー確認の上）
- Phase 0〜3 で「自分で記録項目を作って記録できる」最小限の MVP、Phase 4〜7 で本格運用可能な形に仕上げる想定
