import { test, expect, type Page } from "@playwright/test";
import { randomInt, randomUUID } from "node:crypto";
import type { FinanceData } from "../../src/types/finance";
import { removeAccount } from "../../src/lib/accounts";

test.skip(
  process.env.E2E_ACCOUNTS !== "true",
  "Requires disposable account test database",
);
const origin = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3001";
async function snapshot(page: Page) {
  const response = await page.request.get("/api/finance");
  expect(response.ok()).toBe(true);
  return (await response.json()) as { data: FinanceData; revision: number };
}
test.beforeEach(async ({ page }) => {
  const response = await page.request.post("/api/auth/sign-up/email", {
    headers: {
      origin,
      "x-forwarded-for": `10.${randomInt(255)}.${randomInt(255)}.${randomInt(255)}`,
    },
    data: {
      email: `accounts-${randomUUID()}@example.com`,
      password: "test-password-123",
      name: "Account Test",
    },
  });
  expect(response.ok()).toBe(true);
  const state = await snapshot(page);
  state.data.accounts = [
    { id: "cash", name: "เงินสด", type: "cash", openingBalanceSatang: 12345 },
    { id: "bank", name: "ธนาคาร", type: "bank", openingBalanceSatang: -1000 },
    { id: "wallet", name: "กระเป๋า", type: "ewallet", openingBalanceSatang: 0 },
  ];
  state.data.transactions = [
    {
      id: "i",
      kind: "income",
      accountId: "cash",
      categoryId: "salary",
      amountSatang: 50000,
      date: "2026-10-01",
      description: "เงินเดือน",
    },
    {
      id: "e",
      kind: "expense",
      accountId: "cash",
      categoryId: "food",
      amountSatang: 10000,
      date: "2026-10-02",
      description: "อาหาร",
    },
    {
      id: "r",
      kind: "refund",
      refundOf: "e",
      accountId: "cash",
      categoryId: "food",
      amountSatang: 123,
      date: "2026-10-03",
      description: "คืนเงิน",
    },
  ];
  state.data.transfers = [
    {
      id: "t",
      sourceAccountId: "wallet",
      destinationAccountId: "cash",
      amountSatang: 99,
      date: "2026-10-03",
    },
  ];
  expect((await page.request.put("/api/finance", { data: state })).ok()).toBe(
    true,
  );
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
});

test("accounts can be renamed, retyped and adjusted with persistence; unused accounts delete after confirmation", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const before = await snapshot(page);
  await page.goto("/accounts");
  await page
    .getByRole("button", { name: "แก้ไขบัญชี เงินสด", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("ยอดยกมา (บาท)")).toHaveValue("123.45");
  await dialog.getByLabel("ชื่อบัญชี").fill("ธนาคาร");
  await dialog.getByRole("button", { name: "บันทึกบัญชี" }).click();
  await expect(dialog.getByRole("alert")).toContainText("มีชื่อบัญชีนี้แล้ว");
  await dialog.getByLabel("ชื่อบัญชี").fill("กระเป๋าส่วนตัว");
  await dialog.getByLabel("ประเภทบัญชี").selectOption("ewallet");
  await dialog.getByLabel("ยอดยกมา (บาท)").fill("200.25");
  await dialog.getByRole("button", { name: "บันทึกบัญชี" }).click();
  await expect(dialog).not.toBeVisible();
  const card = page.locator(".account-card").filter({
    has: page.getByRole("heading", { name: "กระเป๋าส่วนตัว", exact: true }),
  });
  await expect(card).toContainText("e-Wallet");
  await expect(card.locator(":scope > strong")).toHaveText("฿602.47");
  await expect(page.locator(".account-total > strong")).toHaveText("฿591.48");
  await page.reload();
  await expect(card).toContainText("ยอดยกมา ฿200.25");
  expect((await snapshot(page)).data.transactions).toEqual(
    before.data.transactions,
  );
  await page.getByRole("button", { name: "เพิ่มบัญชี", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("ชื่อบัญชี").fill("บัญชีชั่วคราว");
  await dialog.getByLabel("ยอดยกมา (บาท)").fill("10.05");
  await dialog.getByRole("button", { name: "บันทึกบัญชี" }).click();
  await expect(dialog).not.toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("accounts-light.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "เปลี่ยนเป็น Dark Mode" }).click();
  await page.screenshot({
    path: info.outputPath("accounts-dark.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "ลบบัญชี บัญชีชั่วคราว", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("฿10.05");
  await page.getByRole("button", { name: "ยกเลิก", exact: true }).click();
  await expect(page.locator(".account-card")).toHaveCount(4);
  await page
    .getByRole("button", { name: "ลบบัญชี บัญชีชั่วคราว", exact: true })
    .click();
  await page
    .getByRole("button", { name: "ยืนยันลบบัญชี", exact: true })
    .click();
  await expect(page.locator(".account-card")).toHaveCount(3);
  await page.reload();
  await expect(page.locator(".account-card")).toHaveCount(3);
  await expect(page.locator(".account-total > strong")).toHaveText("฿591.48");
  expect(errors).toEqual([]);
});

test("deleting a used account migrates its ledger and opening balance atomically without losing refund or transfer history", async ({
  page,
}) => {
  const before = await snapshot(page);
  await page.goto("/accounts");
  await expect(page.locator(".account-total > strong")).toHaveText("฿514.68");
  await page
    .getByRole("button", { name: "ลบบัญชี เงินสด", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "ยืนยันลบบัญชี" }),
  ).toBeDisabled();
  await expect(
    dialog
      .getByLabel("บัญชีรับย้าย (จำเป็น)")
      .locator('option[value="wallet"]'),
  ).toHaveJSProperty("disabled", true);
  await dialog.getByLabel("บัญชีรับย้าย (จำเป็น)").selectOption("bank");
  await dialog.getByRole("button", { name: "ยืนยันลบบัญชี" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".account-card")).toHaveCount(2);
  await expect(page.locator(".account-total > strong")).toHaveText("฿514.68");
  await page.reload();
  const after = await snapshot(page);
  expect(after.data.accounts.some((a) => a.id === "cash")).toBe(false);
  expect(
    after.data.accounts.find((a) => a.id === "bank")!.openingBalanceSatang,
  ).toBe(11345);
  expect(after.data.transactions.every((t) => t.accountId === "bank")).toBe(
    true,
  );
  expect(
    after.data.transactions.map((t) => ({ ...t, accountId: "cash" })),
  ).toEqual(before.data.transactions);
  expect(after.data.transactions.find((t) => t.id === "r")!.refundOf).toBe("e");
  expect(after.data.transfers[0].destinationAccountId).toBe("bank");
});

test("failed edits keep form input and stale edits do not recreate an account removed from another device", async ({
  page,
}) => {
  await page.goto("/accounts");
  await page
    .getByRole("button", { name: "แก้ไขบัญชี เงินสด", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("ชื่อบัญชี").fill("เปลี่ยนชื่อแล้ว");
  await page.route("**/api/finance", async (route) => {
    if (route.request().method() === "PUT")
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "ทดสอบบันทึกไม่สำเร็จ" }),
      });
    else await route.continue();
  });
  await dialog.getByRole("button", { name: "บันทึกบัญชี" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("ทดสอบบันทึกไม่สำเร็จ");
  await expect(dialog.getByLabel("ชื่อบัญชี")).toHaveValue("เปลี่ยนชื่อแล้ว");
  await page.unroute("**/api/finance");
  const state = await snapshot(page);
  state.data = removeAccount(state.data, "cash", "bank");
  expect((await page.request.put("/api/finance", { data: state })).ok()).toBe(
    true,
  );
  await dialog.getByRole("button", { name: "บันทึกบัญชี" }).click();
  await expect(dialog.getByRole("alert")).toContainText("ถูกลบจากอุปกรณ์อื่น");
  expect(
    (await snapshot(page)).data.accounts.some((a) => a.id === "cash"),
  ).toBe(false);
});
