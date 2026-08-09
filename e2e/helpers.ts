import type { Page } from "@playwright/test";

export async function goToTab(page: Page, label: "記録する" | "記録一覧" | "グラフ" | "項目管理") {
  await page
    .getByRole("navigation", { name: "画面切り替え" })
    .getByRole("button", { name: label })
    .click();
}

export async function openUserMenu(page: Page) {
  await page.getByRole("button", { name: /のメニュー$/ }).click();
}

export async function goToCsvScreen(page: Page) {
  await openUserMenu(page);
  await page.getByRole("menuitem", { name: "CSV入出力" }).click();
}

/** 項目管理画面で新しい記録項目グループを作成する（画面遷移は呼び出し側の責務）。 */
export async function createGroup(page: Page, name: string) {
  await page.getByLabel("新しいグループ名").fill(name);
  await page.getByRole("button", { name: "グループを追加" }).click();
  await page.getByRole("listitem").filter({ hasText: name }).waitFor();
}

/** 項目管理画面で数値型の記録項目を作成する（画面遷移は呼び出し側の責務）。 */
export async function createNumberMetric(
  page: Page,
  options: { name: string; unit?: string; groupName?: string },
) {
  await page.getByLabel("新しい記録項目の名前").fill(options.name);
  await page.getByLabel("新しい記録項目の種別").selectOption("number");
  if (options.unit) {
    await page.getByLabel("新しい記録項目の単位").fill(options.unit);
  }
  if (options.groupName) {
    await page.getByLabel("新しい記録項目のグループ").selectOption({ label: options.groupName });
  }
  await page.getByRole("button", { name: "記録項目を追加" }).click();
  await page.getByText(options.name, { exact: false }).first().waitFor();
}
