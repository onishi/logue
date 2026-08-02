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

- [x] Google Cloud Console で OAuth クライアント作成（開発用・本番用の両リダイレクト URI を
      1つのクライアントに登録し、本番の `wrangler secret` に設定済み。ローカル `.dev.vars` は
      未設定のダミー値のままなので、ローカル開発でログインを試す場合は同じ Client ID/Secret を
      そちらにも設定する）
- [x] Workers 上に Google OAuth 2.0 Authorization Code Flow を実装（PKCE 対応）
- [x] コールバック処理・トークン検証・ユーザー作成/紐付け（`users` テーブル）
- [x] セッション発行（署名付き Cookie、有効期限・リフレッシュ方針の設計）
- [x] フロントエンドのログイン/ログアウト UI・認証状態管理
- [x] 認証必須 API の権限チェックミドルウェア（`requireAuth`）
- [x] 認証まわりのユニットテスト

## Phase 2: データモデル & API 基盤

- [x] D1 マイグレーション作成（`users`, `metric_groups`, `metrics`, `entries`, `choice_options`, `user_settings`）
- [x] `packages/shared` に Zod スキーマ・型定義を集約（API 入出力のバリデーション兼用）
- [x] metrics CRUD API（記録項目の作成・編集・削除・並び替え）
- [x] entries CRUD API（記録の作成・編集・削除・期間指定取得）
- [x] API のユニット/結合テスト
- [x] API クライアント（`packages/shared` 経由でフロントから型安全に呼び出し）

## Phase 3: 記録項目管理・汎用記録入力（MVP）

組み込みの記録機能は作らず、「記録項目（metric）をユーザーが定義し、それに対して記録（entry）
を入力する」という汎用機能のみを実装する。体重やファスティングなどはこの上でユーザー自身が
metric として作成する想定。

- [x] 記録項目（metric）管理画面（追加・編集・削除・並び替え）
- [x] 入力タイプ設定（数値／選択肢／自由入力）と単位の付随設定（アイコンは未対応、Phase 6 で検討）
- [x] 選択肢（choice_options）の管理 UI
- [x] metric グルーピング機能（グループ作成・編集・並び替え、metric をグループに割り当て）
- [x] metric のアーカイブ（非表示）機能（一覧・入力画面には出さず、データと履歴グラフは維持。再表示も可能）
- [x] 動的記録入力フォーム（metric の入力タイプに応じて数値/選択肢/自由入力の UI を出し分け、グループ単位で表示）
- [x] 日々の記録一覧・タイムライン表示画面（グループ単位の表示切り替え）
- [ ] （任意）オンボーディング用テンプレート機能：体重・ファスティング・筋トレ・食事などの
      metric 定義サンプルを提示し、ユーザーが選んだものだけをワンクリックで追加できる補助機能。
      あくまで提案であり、何も選ばなければ metric は一切作成されない
- [x] 各機能の単体テスト

## Phase 4: ユーザー設定・表示カスタマイズ

- [x] ユーザー設定画面（テーマ: 端末の設定に合わせる/ライト/ダーク。表示順は Phase 3 の
      グループ・記録項目の並び替え機能でカバー済み。デフォルト単位は現状の設計では
      単位が metric ごとに個別設定のため対象外）
- [x] カスタマイズ機能のテスト

## Phase 5: グラフ・可視化

- [x] 数値メトリクスの時系列グラフ（日別／週別／月別切り替え）
- [x] 移動平均線（7日・30日・カスタム日数）の算出・表示
- [x] 複数メトリクスの重ね合わせ／比較表示
- [x] グラフ画面のレスポンシブ対応（dataviz スキルのガイドライン準拠。ResponsiveContainer +
      カラーパレット + 表ビューへの切り替えで実装）
- [x] グラフ計算ロジック（移動平均等）のユニットテスト

## Phase 6: UI/UX 仕上げ・PWA 化

- [x] モバイルファーストなレスポンシブ UI 全体調整（アプリシェル・5画面すべてに `.screen` 等の
      クラスとレスポンシブ CSS を適用済み: タブバーの横スクロール化、ボタン/入力欄のタップ領域確保、
      グラフの表ビューを横スクロールコンテナで囲む対応、ログイン後は不要になるランディング見出しを
      非表示にして縦スペースを確保、など。Playwright で実ブラウザ確認したところ、タブレット/
      デスクトップ幅ではヘッダー・コンテンツ・タブバーが画面幅いっぱいに間延びして見えていたため、
      `--app-max-width`（640px）で中央寄せする形に修正。モバイル幅（〜480px）の見た目は変更なし）
- [x] ダークモード対応（Phase 4/5 で実装済み。設定画面の「端末の設定に合わせる/ライト/ダーク」に加え、
      全コンポーネントが CSS 変数（`apps/web/src/index.css`）経由で配色しているためハードコードされた
      色はなく、グラフの配色も含めて既にダーク/ライト両対応）
- [x] PWA 化（`vite-plugin-pwa`（Workbox）を導入。manifest（アイコン一式・maskable/apple-touch-icon
      含む）、service worker によるアプリシェルのプリキャッシュ、`/api/*` の GET を
      NetworkFirst でランタイムキャッシュしオフライン時も直近の閲覧内容を表示できるようにした。
      ホーム画面追加は manifest 対応により標準的に可能）
- [x] アクセシビリティ確認（コードレベルでのレビューと修正: 認証後の画面に見た目には出さない
      `<h1>`（sr-only）を追加、ナビに `aria-label`、一覧画面で同じラベルの操作ボタンが複数
      並ぶ箇所（記録項目管理・記録一覧・記録するの削除ボタンなど）に対象を特定できる
      `aria-label` を付与、フォーカスリングを消す CSS がないことを確認。さらに axe-core による
      自動監査を記録する/記録一覧/グラフ/項目管理/設定の主要画面・ライト/ダーク両テーマ・
      ヘッダーのユーザーメニュー展開時等で実施し、`color-contrast` の重大な違反
      （ライトテーマのアクセントカラーが背景に対して 4.41:1 と WCAG AA の 4.5:1 未満だった）を
      検出・修正（`#3a7d74` → `#347068`、コントラスト比 5.2〜5.5:1 に改善）。あわせてユーザー
      メニュー展開中に Tab で最後の項目を抜けると、視覚的に隠れた背後の入力欄へフォーカスが
      移ってしまう問題を発見し、メニュー外へフォーカスが移動したら自動的に閉じるよう修正。
      実際のスクリーンリーダーでの確認はこのセッションでは未実施）

## Phase 7: データ入出力・外部連携

- [x] 過去データの一括入力
  - [x] 日付を指定して複数日分をまとめて入力できるフォーム（`apps/web/src/features/entries/BulkEntryScreen.tsx`。
        記録項目を1つ選び、開始日〜終了日の範囲を指定すると日付ごとの入力欄が並び、まとめて保存できる。
        記録一覧画面の「過去データを一括入力」から遷移）
  - [x] CSV エクスポート（記録一覧画面の「CSVでダウンロード」。現在表示中のピボットテーブル
        （日付×記録項目、グループ・記録項目での絞り込みを反映）をそのままCSVとして書き出す。
        Excel等での文字化けを避けるため UTF-8 BOM 付き。`apps/web/src/lib/csv.ts`）
  - [x] CSV インポート UI（記録一覧画面の「CSVから読み込む」でファイルを選択すると、
        件数と検証結果（ヘッダーが記録項目に一致しない列・日付形式不正・選択肢不一致・数値不正
        などの警告）をプレビュー表示し、「インポートする」で確定する。エクスポート時と同じ
        列ヘッダー形式（`日付,項目名（単位）,...`）を読み取るため、エクスポートしたCSVを編集して
        再インポートする運用が可能。空欄セルは未入力として読み飛ばすのみで、既存レコードの削除は
        行わない（一部の列・行だけ埋めたCSVを安全に再インポートできるようにするため）。
        `apps/web/src/lib/csv.ts`（`parseCsv`）, `apps/web/src/lib/csvImport.ts`（`parseEntriesCsv`））
  - [x] 重複日時・不正値のバリデーション（同一項目・同一日は既存レコードの upsert になるため
        重複作成はそもそも発生しない構造。開始日 > 終了日、一度に入力できる日数の上限（90日）を
        フォーム側でチェック。値の妥当性は既存の API 側バリデーションを踏襲。CSVインポートは
        日付形式・選択肢・数値の妥当性を行ごとにチェックし、不正な行のみスキップする）
  - [x] 単体テスト（`apps/web/src/features/entries/__tests__/BulkEntryScreen.test.tsx`,
        `apps/web/src/lib/__tests__/csv.test.ts`, `apps/web/src/lib/__tests__/csvImport.test.ts`,
        `apps/web/src/features/entries/__tests__/EntryListScreen.test.tsx`）
- [x] Google スプレッドシート連携（スプレッドシートをマスターデータとして扱いつつ、
      アプリからの直接入力とも双方向に同期する。同一セルが両側で食い違って変更されていた
      場合はスプレッドシート側を優先する3-wayマージ。1時間ごとに自動同期、設定画面から
      手動同期も可能）
  - [x] Google Sheets API 用の追加 OAuth スコープ取得・同意フロー対応（既存のログイン用
        OAuthフローとは別に `/api/sheets/connect` 以下で spreadsheets スコープ・オフライン
        アクセスを要求する独立したフローを新設。取得した refresh token は SESSION_SECRET
        から導出した鍵で AES-GCM 暗号化して `google_sheets_connections` テーブルに保存）
  - [x] エクスポート・インポート（同期エンジン `apps/api/src/googleSheets/sync.ts`。
        前回同期時点のスナップショットとの差分でアプリ側/シート側どちらが変更したかを
        判定する3-wayマージ `merge.ts` を用いて、セル単位で entries への反映とシートへの
        書き込みを行う。CSV機能と共通のグリッド構築・解析ロジック
        `packages/shared/src/sheetGrid.ts` を利用）
  - [x] 連携設定 UI（設定画面の「Googleスプレッドシート連携」。スプレッドシートURL/ID・
        シート名の設定、自動同期の有効/無効切り替え、「今すぐ同期」による手動同期、
        最終同期日時・エラー表示、連携解除。`apps/web/src/features/settings/SettingsScreen.tsx`）
  - [x] 同期タイミング設定（Cloudflare Cron Trigger で1時間ごとに自動同期。
        `apps/api/wrangler.toml` の `[triggers]`、`apps/api/src/index.ts` の `scheduled`）
  - [x] 単体テスト（`apps/api/src/googleSheets/__tests__/`（merge/sheetsApi/sync/routes）、
        `apps/api/src/__tests__/crypto.test.ts`、`apps/api/src/auth/__tests__/google.test.ts`、
        `packages/shared/src/__tests__/sheetGrid.test.ts`、
        `apps/web/src/features/settings/__tests__/SettingsScreen.test.tsx`）
  - 利用前にユーザー側で Google Cloud Console にて (1) Google Sheets API の有効化、
    (2) OAuth 同意画面へのスコープ `https://www.googleapis.com/auth/spreadsheets` の追加が必要
    （暗号化鍵は既存の SESSION_SECRET から導出するため、新しい環境変数の追加は不要）

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
