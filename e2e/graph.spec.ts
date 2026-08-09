import { expect, test } from "./fixtures";
import { createNumberMetric, goToTab } from "./helpers";

test("グラフ画面で表示単位・移動平均・表ビューを切り替えられる", async ({
  page,
  loginAsTestUser,
}) => {
  await loginAsTestUser();
  await page.goto("/");

  await goToTab(page, "項目管理");
  await createNumberMetric(page, { name: "体重", unit: "kg" });

  // 2日分の記録を作成する
  await goToTab(page, "記録する");
  for (const [date, value] of [
    ["2026-07-01", "70"],
    ["2026-07-02", "71"],
  ] as const) {
    await page.getByLabel("記録日").fill(date);
    await page.getByRole("spinbutton", { name: "体重" }).fill(value);
    await page.locator("form.screen").getByRole("button", { name: "記録する" }).click();
    await expect(page.getByText("記録しました")).toBeVisible();
  }

  await goToTab(page, "グラフ");
  await expect(page.getByRole("heading", { name: "体重（kg）" })).toBeVisible();

  await page.getByRole("button", { name: "表示設定" }).click();
  await page.getByLabel("表示単位").selectOption("week");
  await page.getByLabel("移動平均").selectOption("7");

  await page.getByRole("button", { name: "表で見る" }).click();
  await expect(page.getByRole("columnheader", { name: "日付" })).toBeVisible();
  await expect(page.getByRole("button", { name: "グラフで見る" })).toBeVisible();
});
