import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const API_PORT = process.env.E2E_API_PORT ?? "8798";
const WEB_PORT = process.env.E2E_WEB_PORT ?? "5199";

export const E2E_API_BASE_URL = `http://localhost:${API_PORT}`;
const webBaseUrl = `http://localhost:${WEB_PORT}/`;

// 一部のサンドボックス環境にはこのパスに Chromium がプリインストールされており、
// 使うと再ダウンロードを避けられる。存在しない環境（CI・通常のローカル開発機など）では
// Playwright 標準のブラウザ解決（`playwright install` 済みのもの）にそのまま任せる。
const SANDBOX_CHROMIUM_PATH = "/opt/pw-browsers/chromium";
const executablePath = existsSync(SANDBOX_CHROMIUM_PATH) ? SANDBOX_CHROMIUM_PATH : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: webBaseUrl,
    trace: "retain-on-failure",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `npx wrangler dev --env-file .dev.vars.e2e --port ${API_PORT}`,
      cwd: "apps/api",
      url: `${E2E_API_BASE_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: "pipe",
    },
    {
      command: `npx vite --port ${WEB_PORT}`,
      cwd: "apps/web",
      url: webBaseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: "pipe",
      env: { VITE_API_BASE_URL: E2E_API_BASE_URL },
    },
  ],
});
