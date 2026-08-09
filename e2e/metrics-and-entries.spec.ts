import { expect, test } from "./fixtures";
import { createGroup, createNumberMetric, goToTab } from "./helpers";

test("記録項目を作成し、記録して、記録一覧のピボットテーブル・絞り込みで確認できる", async ({
  page,
  loginAsTestUser,
}) => {
  await loginAsTestUser();
  await page.goto("/");

  // 項目管理: グループと数値項目を作成
  await goToTab(page, "項目管理");
  await createGroup(page, "体組成");
  await createNumberMetric(page, { name: "体重", unit: "kg", groupName: "体組成" });

  // 記録する: 今日の日付で値を入力して保存
  await goToTab(page, "記録する");
  await page.getByRole("spinbutton", { name: "体重" }).fill("70.5");
  await page.locator("form.screen").getByRole("button", { name: "記録する" }).click();
  await expect(page.getByText("記録しました")).toBeVisible();

  // 記録一覧: ピボットテーブルに反映されていることを確認
  await goToTab(page, "記録一覧");
  await expect(page.getByRole("columnheader", { name: "体重（kg）" })).toBeVisible();
  await expect(page.getByText("70.5 kg")).toBeVisible();

  // 絞り込み（開閉式）を開いてグループで絞り込む
  await page.getByRole("button", { name: "絞り込み" }).click();
  await page.getByLabel("グループで絞り込み").selectOption({ label: "体組成" });
  await expect(page.getByRole("columnheader", { name: "体重（kg）" })).toBeVisible();
});
