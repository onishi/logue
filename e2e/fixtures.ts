import { test as base, expect } from "@playwright/test";
import { E2E_API_BASE_URL } from "../playwright.config";

type Fixtures = {
  /** Google OAuthを経由せず、指定したメールアドレス（省略時は毎回ユニーク）のユーザーで
   * ログイン状態にする。POST /api/auth/test-login はE2Eテスト実行時のみ有効な
   * バイパスエンドポイント（apps/api/src/auth/routes.ts）。 */
  loginAsTestUser: (email?: string) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  loginAsTestUser: async ({ page }, use) => {
    await use(async (email) => {
      const res = await page.request.post(`${E2E_API_BASE_URL}/api/auth/test-login`, {
        headers: { "X-Logue-Client": "e2e" },
        data: {
          email: email ?? `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        },
      });
      expect(res.ok(), `test-login failed: ${res.status()} ${await res.text()}`).toBeTruthy();
    });
  },
});

export { expect };
