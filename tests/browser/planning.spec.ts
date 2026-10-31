import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { randomInt, randomUUID } from "node:crypto";
import { emptyPlanningData, type PlanningData } from "../../src/types/planning";

// This suite writes only to the disposable database of the explicitly enabled test server.
test.skip(
  process.env.E2E_PLANNING !== "true",
  "Requires isolated planning test database",
);
const origin = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3001";
async function register(request: APIRequestContext) {
  const response = await request.post("/api/auth/sign-up/email", {
    headers: {
      origin,
      "x-forwarded-for": `10.${randomInt(255)}.${randomInt(255)}.${randomInt(255)}`,
    },
    data: {
      email: `planning-${randomUUID()}@example.com`,
      name: "Planning Test",
      password: "test-password-123",
    },
  });
  expect(response.ok()).toBe(true);
}
async function read(request: APIRequestContext) {
  const response = await request.get("/api/planning");
  expect(response.ok()).toBe(true);
  return (await response.json()) as { data: PlanningData; revision: number };
}
async function save(request: APIRequestContext, data: PlanningData) {
  const snapshot = await read(request);
  const response = await request.put("/api/planning", {
    headers: { origin },
    data: { data, revision: snapshot.revision },
  });
  expect(response.ok()).toBe(true);
}
async function createGoal(page: Page) {
  await page.goto("/goals");
  await page
    .getByRole("button", { name: "สร้างเป้าหมาย", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("ชื่อเป้าหมาย").fill("เงินสำรองฉุกเฉิน");
  await dialog.getByLabel("ยอดเป้าหมาย (บาท)").fill("10000");
  await dialog.getByLabel("วันที่ตั้งเป้า").fill("2026-12-31");
  await dialog.getByLabel("ออมไว้แล้ว (บาท)").fill("1000");
  await dialog.getByRole("button", { name: "บันทึกเป้าหมาย" }).click();
  await expect(dialog).not.toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await register(page.request);
  await page.clock.setFixedTime(new Date("2026-10-31T10:00:00+07:00"));
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
});

test("goals persist contributions, recalculate monthly savings, handle edits and delete history", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const before = await (await page.request.get("/api/finance")).json();
  await createGoal(page);
  const summary = page.locator(".planning-summary > .panel").first();
  const label = await summary.locator(":scope > span").last().boundingBox();
  const value = await summary.locator(":scope > strong").boundingBox();
  expect(value!.y).toBeGreaterThanOrEqual(label!.y + label!.height);
  const card = page.locator(".goal-card");
  await expect(card.locator(".goal-amount strong")).toHaveText("฿1,000");
  await expect(card.locator(".goal-monthly strong")).toHaveText("฿3,000");
  // Simulate another device saving while this tab still has the older revision.
  const external = await read(page.request);
  external.data.bills.push({
    id: "other-device",
    name: "บิลจากอีกอุปกรณ์",
    amountSatang: 10000,
    dueDate: "2027-02-01",
    remindDays: 7,
  });
  await save(page.request, external.data);
  await card.getByRole("button", { name: "เพิ่มเงินออม" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("จำนวนเงินออม (บาท)").fill("0");
  await dialog
    .getByRole("button", { name: "บันทึกเงินออม", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog.getByLabel("จำนวนเงินออม (บาท)").fill("500.25");
  await dialog
    .getByRole("button", { name: "บันทึกเงินออม", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(card.locator(".goal-amount strong")).toHaveText("฿1,500.25");
  await expect(card.locator(".goal-monthly strong")).toHaveText("฿2,833.25");
  expect((await read(page.request)).data.bills[0].id).toBe("other-device");
  expect((await read(page.request)).data.contributions).toHaveLength(2);
  await page.reload();
  await expect(card.locator(".goal-amount strong")).toHaveText("฿1,500.25");
  await card
    .getByRole("button", { name: "แก้ไขเป้าหมาย เงินสำรองฉุกเฉิน" })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("วันที่ตั้งเป้า").fill("2026-11-30");
  await dialog.getByRole("button", { name: "บันทึกเป้าหมาย" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(card.locator(".goal-monthly strong")).toHaveText("฿4,249.88");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("goals-light.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "เปลี่ยนเป็น Dark Mode" }).click();
  await page.screenshot({
    path: info.outputPath("goals-dark.png"),
    fullPage: true,
  });
  await card.getByRole("button", { name: "ประวัติ", exact: true }).click();
  await page.getByRole("button", { name: "ลบเงินออม ฿500.25" }).click();
  await page.getByRole("button", { name: "ยืนยันลบ" }).click();
  await expect(card.locator(".goal-amount strong")).toHaveText("฿1,000");
  await card
    .getByRole("button", { name: "ลบเป้าหมาย เงินสำรองฉุกเฉิน" })
    .click();
  await page.getByRole("button", { name: "ยืนยันลบ" }).click();
  await expect(card).toHaveCount(0);
  const after = await (await page.request.get("/api/finance")).json();
  expect(after.data).toEqual(before.data);
  expect((await read(page.request)).data.contributions).toHaveLength(0);
  expect(errors).toEqual([]);
});

test("budget warnings and due bills update unread count, persist reads, and stop after payment", async ({
  page,
}, info) => {
  const finance = await (await page.request.get("/api/finance")).json();
  finance.data.accounts = [
    { id: "cash", name: "เงินสด", type: "cash", openingBalanceSatang: 0 },
  ];
  finance.data.transactions = [
    {
      id: "income",
      kind: "income",
      amountSatang: 1000000,
      date: "2026-10-31",
      accountId: "cash",
      categoryId: "salary",
      description: "ทดสอบรายรับ",
    },
    {
      id: "expense",
      kind: "expense",
      amountSatang: 810000,
      date: "2026-10-31",
      accountId: "cash",
      categoryId: "food",
      description: "ทดสอบรายจ่าย",
    },
  ];
  finance.data.budgets = [
    {
      id: "food-budget",
      month: "2026-10",
      categoryId: "food",
      amountSatang: 1000000,
    },
  ];
  expect((await page.request.put("/api/finance", { data: finance })).ok()).toBe(
    true,
  );
  await page.goto("/reminders");
  await expect(page.locator(".planning-alert")).toHaveCount(2);
  await page.getByRole("button", { name: "เพิ่มบิล", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("ชื่อบิล").fill("ค่าเช่าห้อง");
  await dialog.getByLabel("ยอดที่ต้องจ่าย (บาท)").fill("4400.50");
  await dialog.getByLabel("วันที่ครบกำหนด").fill("2026-11-01");
  await dialog.getByRole("button", { name: "บันทึกบิล", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".planning-alert")).toHaveCount(3);
  await expect(page.locator(".notification-count")).toContainText("3");
  await page
    .getByRole("button", { name: "อ่านทั้งหมดแล้ว", exact: true })
    .click();
  await expect(page.locator(".notification-count")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".planning-alert.read")).toHaveCount(3);
  const bill = page.locator(".bill-card");
  await bill.getByRole("button", { name: "แก้ไขบิล ค่าเช่าห้อง" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("ยอดที่ต้องจ่าย (บาท)").fill("4500");
  await dialog.getByRole("button", { name: "บันทึกบิล", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".notification-count")).toContainText("1");
  await page.getByRole("button", { name: "การแจ้งเตือน", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "รายการแจ้งเตือน" }),
  ).toContainText("ค่าเช่าห้อง");
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("reminders-light.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "เปลี่ยนเป็น Dark Mode" }).click();
  await page.screenshot({
    path: info.outputPath("reminders-dark.png"),
    fullPage: true,
  });
  await bill.getByRole("button", { name: "ชำระแล้ว", exact: true }).click();
  await expect(bill).toHaveCount(0);
  await expect(page.locator(".planning-alert")).toHaveCount(2);
  await expect(page.locator(".notification-count")).toHaveCount(0);
  await page.getByRole("button", { name: "ชำระแล้ว", exact: true }).click();
  await expect(bill).toContainText("ชำระแล้ว");
  await bill.getByRole("button", { name: "เปลี่ยนเป็นยังไม่ชำระ" }).click();
  await page.getByRole("button", { name: "ยังไม่ชำระ", exact: true }).click();
  await expect(bill).toContainText("ค่าเช่าห้อง");
  await bill.getByRole("button", { name: "ลบบิล ค่าเช่าห้อง" }).click();
  await page.getByRole("button", { name: "ยืนยันลบ" }).click();
  await expect(bill).toHaveCount(0);
  const finalFinance = await (await page.request.get("/api/finance")).json();
  expect(
    finalFinance.data.transactions.map((t: { id: string }) => t.id).sort(),
  ).toEqual(["expense", "income"]);
});

test("planning API isolates users, rejects stale saves and invalid references, and resets atomically", async ({
  page,
  browser,
}) => {
  const data = emptyPlanningData();
  data.goals = [
    {
      id: "shared-id",
      name: "Private Goal",
      targetSatang: 10001,
      dueDate: "2026-12-31",
    },
  ];
  data.contributions = [
    {
      id: "c",
      goalId: "shared-id",
      amountSatang: 101,
      date: "2026-10-01",
      note: "private",
    },
  ];
  data.bills = [
    {
      id: "b",
      name: "Private Bill",
      dueDate: "2026-11-01",
      amountSatang: 20001,
      remindDays: 7,
    },
  ];
  await save(page.request, data);
  expect((await read(page.request)).data).toEqual(data);
  const context = await browser.newContext({ baseURL: origin });
  try {
    expect((await context.request.get("/api/planning")).status()).toBe(401);
    await register(context.request);
    expect((await read(context.request)).data).toEqual(emptyPlanningData());
    await save(context.request, {
      ...emptyPlanningData(),
      goals: [{ ...data.goals[0], name: "Other user's goal" }],
    });
    expect((await read(page.request)).data.goals[0].name).toBe("Private Goal");
    const current = await read(page.request);
    const stale = await page.request.put("/api/planning", {
      headers: { origin },
      data: { data, revision: current.revision - 1 },
    });
    expect(stale.status()).toBe(409);
    const invalid = await page.request.put("/api/planning", {
      headers: { origin },
      data: {
        data: {
          ...data,
          contributions: [{ ...data.contributions[0], goalId: "someone-else" }],
        },
        revision: current.revision,
      },
    });
    expect(invalid.status()).toBe(400);
    const crossOrigin = await page.request.put("/api/planning", {
      headers: { origin: "https://other.example" },
      data: current,
    });
    expect(crossOrigin.status()).toBe(403);
    expect((await page.request.delete("/api/finance")).ok()).toBe(true);
    expect((await read(page.request)).data).toEqual(emptyPlanningData());
    expect((await read(context.request)).data.goals[0].name).toBe(
      "Other user's goal",
    );
  } finally {
    await context.close();
  }
});

test("failed planning saves preserve entered values and the page can retry a failed read", async ({
  page,
}) => {
  await page.route("**/api/planning", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "ทดสอบโหลดแผนไม่สำเร็จ" }),
    });
  });
  await page.goto("/goals");
  await expect(page.locator(".error-state")).toContainText(
    "ทดสอบโหลดแผนไม่สำเร็จ",
  );
  await page.unroute("**/api/planning");
  await page.getByRole("button", { name: "ลองอีกครั้ง", exact: true }).click();
  await page
    .getByRole("button", { name: "สร้างเป้าหมาย", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("ชื่อเป้าหมาย").fill("คงค่าฟอร์ม");
  await dialog.getByLabel("ยอดเป้าหมาย (บาท)").fill("5000");
  await dialog.getByLabel("วันที่ตั้งเป้า").fill("2026-12-31");
  await page.route("**/api/planning", async (route) => {
    if (route.request().method() === "PUT")
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "ทดสอบบันทึกไม่สำเร็จ" }),
      });
    else await route.continue();
  });
  await dialog.getByRole("button", { name: "บันทึกเป้าหมาย" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("ทดสอบบันทึกไม่สำเร็จ");
  await expect(dialog.getByLabel("ชื่อเป้าหมาย")).toHaveValue("คงค่าฟอร์ม");
  expect((await read(page.request)).data.goals).toHaveLength(0);
});
