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

test("モバイル表示ではヘッダーの左右に余白がある", async ({ page, loginAsTestUser }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsTestUser("mobile@example.com");
  await page.goto("/");

  const brand = page.getByRole("link", { name: "logue" });
  const userMenu = page.getByRole("button", { name: "E2E Test User のメニュー" });
  await expect(brand).toBeVisible();
  await expect(userMenu).toBeVisible();

  const brandBox = await brand.boundingBox();
  const userMenuBox = await userMenu.boundingBox();
  expect(brandBox).not.toBeNull();
  expect(userMenuBox).not.toBeNull();
  expect(brandBox!.x).toBeCloseTo(28, 0);
  expect(390 - (userMenuBox!.x + userMenuBox!.width)).toBeCloseTo(28, 0);
});
