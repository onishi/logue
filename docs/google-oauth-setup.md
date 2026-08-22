# Google OAuth クライアントの準備

logue へのログインは Google OAuth 2.0（Authorization Code Flow + PKCE）で行う。
以下はユーザー側で Google Cloud Console 上で行う設定（開発用・本番用それぞれ）。

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成（or 既存プロジェクトを利用）
2. 「APIとサービス」→「OAuth 同意画面」を設定（External、アプリ名・サポートメールなど）
3. 「認証情報」→「OAuth クライアント ID を作成」→ アプリケーションの種類は「ウェブ アプリケーション」
4. 「承認済みのリダイレクト URI」に以下を登録
   - 開発用: `http://localhost:8787/api/auth/callback`
   - 本番用: `https://<本番の apps/api のドメイン>/api/auth/callback`
5. 発行された `クライアント ID` / `クライアント シークレット` を取得し、
   - ローカル開発では `apps/api/.dev.vars` に `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` として設定
   - 本番では `wrangler secret put GOOGLE_CLIENT_ID` / `wrangler secret put GOOGLE_CLIENT_SECRET` で登録

`SESSION_SECRET`（セッション Cookie 署名用）は Google とは無関係の、十分にランダムな文字列を
自分で生成して同様に設定する（例: `openssl rand -base64 32`）。

管理方針の詳細は [secrets.md](./secrets.md) を参照。

## Google スプレッドシート連携を使う場合の追加設定

記録データを Google スプレッドシートと双方向同期する機能（設定画面の「Googleスプレッドシート連携」）
を使うには、上記のログイン用設定に加えて以下が必要。ログイン機能自体には影響しない、独立した設定。

1. 「APIとサービス」→「ライブラリ」で **Google Sheets API を有効化**する
2. 「OAuth 同意画面」の「スコープ」に **`https://www.googleapis.com/auth/spreadsheets`** を追加する
   （個人利用のテストモードであれば Google の審査は不要な想定）
3. 同期したい Google スプレッドシートを用意し、ログイン後の設定画面で URL または ID を入力する

連携用の refresh token は既存の `SESSION_SECRET` から導出した鍵で暗号化して保存するため、
新しい環境変数・シークレットの追加は不要。

## Android アプリ（`android/`）を使う場合の追加設定

Android アプリは Credential Manager の「Sign in with Google」でログインする。ブラウザの
リダイレクトを使わないため、上記のログイン用設定に加えて以下が必要。

1. 「認証情報」→「OAuth クライアント ID を作成」→ アプリケーションの種類は「**Android**」を選択し、
   - パッケージ名: `org.wagaya.logue`（`android/app/build.gradle.kts` の `applicationId`）
   - 署名証明書の SHA-1 フィンガープリント: デバッグビルドと本番（リリース）ビルドそれぞれ登録する
     （デバッグ用は `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey
-storepass android -keypass android` で確認できる）
   - ここで作られる「Android」種別のクライアントID自体はアプリのコードには使わない
     （Credential Manager がこのアプリの正当性を検証するためだけに使われる）
2. Android アプリのコード（`AuthRepository.kt` の `GetSignInWithGoogleOption`）には、
   上記のログイン用に既に作成済みの**「ウェブ アプリケーション」種別**の `GOOGLE_CLIENT_ID` を
   `serverClientId` としてそのまま渡す（`android/app/build.gradle.kts` の
   `GOOGLE_SERVER_CLIENT_ID` に設定する。空文字列のままではログインできない）
3. API 側（`apps/api`）の環境変数の追加は不要（既存の `GOOGLE_CLIENT_ID` を
   ID トークンの audience 検証にそのまま使う。`POST /api/auth/mobile-login`）

詳細は `android/README.md` も参照。
