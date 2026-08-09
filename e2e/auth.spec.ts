import { expect, test } from "./fixtures";

test("ログイン後、認証済みの画面（タブナビゲーション・ユーザーメニュー）が表示される", async ({
  page,
  loginAsTestUser,
}) => {
  await loginAsTestUser("taro@example.com");
  await page.goto("/");

  await expect(page.getByRole("navigation", { name: "画面切り替え" })).toBeVisible();
  for (const label of ["記録する", "記録一覧", "グラフ", "項目管理"]) {
    await expect(
      page.getByRole("navigation", { name: "画面切り替え" }).getByRole("button", { name: label }),
    ).toBeVisible();
  }

  // ログイン前の「Google でログイン」ボタンはもう表示されていない
  await expect(page.getByRole("button", { name: "Google でログイン" })).not.toBeVisible();

  // ユーザーメニューにテストユーザー名が表示される
  await expect(page.getByRole("button", { name: "E2E Test User のメニュー" })).toBeVisible();
});

test("未ログイン状態ではログインボタンが表示される", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Google でログイン" })).toBeVisible();
});
