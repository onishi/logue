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
