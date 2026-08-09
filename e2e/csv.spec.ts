import { expect, test } from "./fixtures";
import { createNumberMetric, goToCsvScreen, goToTab } from "./helpers";

test("CSV入出力画面でエクスポートとTSV貼り付けインポートができる", async ({
  page,
  loginAsTestUser,
}) => {
  await loginAsTestUser();
  await page.goto("/");

  await goToTab(page, "項目管理");
  await createNumberMetric(page, { name: "体重", unit: "kg" });

  await goToTab(page, "記録する");
  await page.getByLabel("記録日").fill("2026-07-01");
  await page.getByRole("spinbutton", { name: "体重" }).fill("70");
  await page.locator("form.screen").getByRole("button", { name: "記録する" }).click();
  await expect(page.getByText("記録しました")).toBeVisible();

  await goToCsvScreen(page);
  await expect(page.getByRole("heading", { name: "CSV入出力" })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "CSVでダウンロード" }).click(),
  ]);
  const csvPath = await download.path();
  expect(csvPath).toBeTruthy();
  const fs = await import("node:fs/promises");
  const csvText = await fs.readFile(csvPath!, "utf-8");
  const BOM = String.fromCharCode(0xfeff);
  expect(csvText.startsWith(BOM) ? csvText.slice(BOM.length) : csvText).toContain("2026-07-01,70");

  // スプレッドシートからのコピペを想定したTSV貼り付けインポート（単位付きの値も無視される）
  await page
    .getByLabel("スプレッドシートからコピーした内容を貼り付けて読み込む")
    .fill("日付\t体重（kg）\n2026-07-02\t71kg");
  await page.getByRole("button", { name: "貼り付けた内容を読み込む" }).click();
  await expect(page.getByText("1件を読み込みます。")).toBeVisible();
  await page.getByRole("button", { name: "インポートする" }).click();
  await expect(page.getByText("1件を読み込みました")).toBeVisible();

  await goToTab(page, "記録一覧");
  await expect(page.getByText("71 kg")).toBeVisible();
});
