# logue Android アプリ

Web版（`apps/web`）・API（`apps/api`）と同じ Cloudflare Workers REST API をそのまま利用する、
Kotlin + Jetpack Compose のネイティブアプリ。

## 現在の実装状況（Phase A）

issue #27（Phase 9: 将来拡張）の一部として着手した最小構成。

- ログイン（Credential Manager の Sign in with Google → `POST /api/auth/mobile-login`）
- 記録する画面のみ（今日の日付固定、記録項目のグループ分け・日付ページャーなし）

記録一覧・グラフ・項目管理・CSV・設定は未実装（Phase B/C で追加予定。詳細は `plan.md` の
Phase 9 セクションを参照）。

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
