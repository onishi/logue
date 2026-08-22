# logue Android アプリ

Web版（`apps/web`）・API（`apps/api`）と同じ Cloudflare Workers REST API をそのまま利用する、
Kotlin + Jetpack Compose のネイティブアプリ。

## 現在の実装状況（Phase C の一部まで）

issue #27（Phase 9: 将来拡張）の一部として着手。

- ログイン（Credential Manager の Sign in with Google → `POST /api/auth/mobile-login`）
- 下部タブ3つ: 記録する（今日の日付固定、日付ページャーなし）／記録一覧（ピボットテーブル、
  絞り込みなし）／項目管理（グループ・記録項目のCRUD。ドラッグ並び替え・「未分類」への
  付け替えは未対応）
- 右上メニュー: CSV入出力（Storage Access Frameworkでのファイル書き出し/読み込み。
  グリッド構築・パースロジックはWeb版 `packages/shared/src/sheetGrid.ts` の移植で、
  Web版で書き出したCSVをこちらで読み込む（逆も同様）ことができる）／設定（テーマ切り替えのみ。
  `/api/user-settings` を共用するためWeb版と設定が同期する）／ログアウト

choice型の記録項目は、記録する画面では自由入力（選択肢ラベルと完全一致する文字列を入力する
必要がある）のままで、専用のピッカーUIは未実装。グラフ、Googleスプレッドシート連携は未実装
（詳細は `plan.md` の Phase 9 セクションを参照）。

**注意**: このプロジェクトは開発時、Android SDK が利用できないサンドボックス環境で
Kotlin/Gradle のソースコードのみを作成したものです。**ビルド・実機/エミュレータでの
動作確認はまだ行われていません。** 初回は必ず Android Studio で開いてビルドエラーがないか
確認してください。

## セットアップ

1. Android Studio（Koala 以降推奨）で `android/` ディレクトリを開く
2. `docs/google-oauth-setup.md` の「Android アプリを使う場合の追加設定」に従って、
   Google Cloud Console で Android 用 OAuth クライアントを作成する
3. `android/app/build.gradle.kts` の `GOOGLE_SERVER_CLIENT_ID` に、ログイン用の
   （ウェブアプリケーション種別の）`GOOGLE_CLIENT_ID` と同じ値を設定する
4. ローカルの `wrangler dev`（`npm run dev:api`、ポート8787）に向けて動作確認したい場合は、
   `android/local.properties`（gitignore対象）に以下を追記し、`API_BASE_URL` を上書きする
   （Android エミュレータからホストマシンの `localhost` には `10.0.2.2` でアクセスする）

   ```properties
   API_BASE_URL=http://10.0.2.2:8787/
   ```

   ※ 現時点では `build.gradle.kts` の `buildConfigField` は本番URL固定のため、
   ローカルAPIに向けたい場合は `defaultConfig` の `buildConfigField("String", "API_BASE_URL", ...)` を
   一時的に書き換えるか、`local.properties` を読む処理を追加すること（Phase Bで対応予定）

## 技術スタック

- Kotlin, Jetpack Compose, Navigation Compose
- Retrofit + OkHttp（`CookieJar` でセッションCookieを永続化。Web版と同じ Cookie ベースの
  セッション機構をそのまま利用しており、API側の変更は最小限に抑えている）
- Credential Manager（`androidx.credentials`）による Google ログイン
