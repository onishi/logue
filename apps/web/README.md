# @logue/web

logue のフロントエンド（React + Vite、Cloudflare Pages にデプロイ）。
本番は `wagaya.org` の Worker が `/logue` にリバースプロキシする前提のため、
`vite.config.ts` の `base` は `/logue/` に固定している
（`src/lib/basePath.ts` の `APP_BASE` が唯一のソース）。

- `npm run dev --workspace apps/web` で開発サーバー起動（`base` が `/logue/` のため
  `http://localhost:5173/logue/` を開く。ルート `/` ではない点に注意）
- `npm run build --workspace apps/web` で本番ビルド
- lint / format / test はリポジトリルートから一括で実行する
