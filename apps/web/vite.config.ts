import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { APP_BASE } from "./src/lib/basePath.ts";

const base = `${APP_BASE}/`;

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png"],
      manifest: {
        name: "logue",
        short_name: "logue",
        description:
          "体重・ファスティング・筋トレ・食事など、何でも自由に記録できるパーソナルログアプリ",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#f6f5f3",
        theme_color: "#f6f5f3",
        lang: "ja",
        icons: [
          {
            src: `${base}icons/icon-192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: `${base}icons/icon-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: `${base}icons/icon-maskable-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // API はアプリと別オリジン（Cloudflare Workers）なので pathname だけで判定する
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
            method: "GET",
            handler: "NetworkFirst",
            options: {
              cacheName: "logue-api-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
