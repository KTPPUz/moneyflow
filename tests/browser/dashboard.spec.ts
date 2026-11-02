import { createSeed } from "../../src/data/legacy-seed";
import { ensureDefaultCategories } from "../../src/data/local/default-categories";
import { test, expect, type Page } from "@playwright/test";
import { randomInt, randomUUID } from "node:crypto";
import type { FinanceData } from "../../src/types/finance";
const ORIGIN = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3001";
async function signUp(page: Page) {
  const response = await page.request.post("/api/auth/sign-up/email", {
    // A distinct client address keeps production rate limits out of the test run.
    headers: {
      origin: ORIGIN,
      "x-forwarded-for": `10.${randomInt(255)}.${randomInt(255)}.${randomInt(255)}`,
    },
    data: {
      email: `e2e-${randomUUID()}@example.com`,
      password: "e2e-password-123",
      name: "e2e",
    },
  });
  expect(response.ok()).toBe(true);
}
async function savedData(page: Page) {
  const response = await page.request.get("/api/finance");
  expect(response.ok()).toBe(true);
  return (await response.json()) as { data: FinanceData; revision: number };
}
async function seedData(page: Page, data: FinanceData) {
  const { revision } = await savedData(page);
  const response = await page.request.put("/api/finance", {
    data: { data, revision },
  });
  expect(response.ok()).toBe(true);
}
test.beforeEach(async ({ page }, info) => {
  await signUp(page);
  if (
    !info.title.startsWith("fresh start") &&
    !info.title.startsWith("legacy cleanup") &&
    !info.title.startsWith("housing expense") &&
    !info.title.startsWith("account data")
  )
    await seedData(page, ensureDefaultCategories(createSeed("2026-10-30")));
  await page.clock.setFixedTime(new Date("2026-10-30T09:00:00+07:00"));
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
});
async function addTransaction(
  page: Page,
  description = "ข้าวทดสอบ",
  amount = "123.45",
  category = "food",
) {
  const mobile = page.viewportSize()!.width < 640;
  await page
    .getByRole("button", {
      name: mobile ? "เพิ่มรายการใหม่" : "เพิ่มรายการ",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: /จำนวนเงิน/ }).fill(amount);
  await dialog
    .getByRole("combobox", { name: /^หมวดหมู่ / })
    .selectOption(category);
  await dialog.getByRole("textbox", { name: /^รายละเอียด/ }).fill(description);
  await dialog
    .getByRole("button", { name: "บันทึกรายการ", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}
test("food chart switches daily and monthly independently of percentage units", async ({
  page,
}) => {
  await page.goto("/analytics/food");
  const trend = page.locator(".analytics-trend");
  await page.getByLabel("ช่วงวิเคราะห์จากเดือน").fill("2026-10");
  await page.getByLabel("ช่วงวิเคราะห์ถึงเดือน").fill("2026-10");
  await trend.locator("summary").click();
  await expect(trend.locator("tbody tr")).toHaveCount(1);
  await trend.getByRole("button", { name: "รายวัน", exact: true }).click();
  await expect(trend.locator("tbody tr")).toHaveCount(31);
  await expect(
    trend.getByRole("columnheader", { name: "วันที่", exact: true }),
  ).toBeVisible();
  await trend.getByRole("button", { name: "% รายรับ", exact: true }).click();
  await expect(trend.locator("tbody tr")).toHaveCount(31);
  await expect(
    trend.getByRole("button", { name: "รายวัน", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await trend.getByRole("button", { name: "รายเดือน", exact: true }).click();
  await expect(trend.locator("tbody tr")).toHaveCount(1);
  await expect(
    trend.getByRole("button", { name: "% รายรับ", exact: true }),
  ).toHaveClass("selected");
});

test("dashboard and routes are responsive, figures reconcile and themes persist", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/dashboard");
  await expect(page.locator(".stat-value").first()).toHaveText("฿50,000");
  await expect(page.locator(".stat-value").nth(1)).toHaveText("฿32,450");
  await expect(page.locator(".stat-value").last()).toHaveText("16.24%");
  await expect(page.locator(".transaction-list .transaction")).toHaveCount(5);
  await page
    .getByRole("combobox", { name: "เลือกเดือน", exact: true })
    .selectOption("09");
  await expect(page.locator(".stat-value").last()).not.toHaveText("16.24%");
  await page
    .getByRole("combobox", { name: "เลือกปี", exact: true })
    .selectOption("2027");
  await expect(page.locator(".stat-value").last()).toHaveText("N/A");
  await expect(page.locator(".transaction-list")).toContainText(
    "ยังไม่มีข้อมูล",
  );
  await page
    .getByRole("combobox", { name: "เลือกปี", exact: true })
    .selectOption("2026");
  await page
    .getByRole("combobox", { name: "เลือกเดือน", exact: true })
    .selectOption("10");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("dashboard-light.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "เปลี่ยนเป็น Dark Mode" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.screenshot({
    path: info.outputPath("dashboard-dark.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "เปลี่ยนเป็น Light Mode" }).click();
  for (const route of [
    "/transactions",
    "/analytics/food",
    "/analytics/monthly",
    "/budgets",
    "/categories",
    "/accounts",
    "/settings",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
      route + " overflow",
    ).toBe(true);
    if (info.project.name === "desktop" || info.project.name === "mobile")
      await page.screenshot({
        path: info.outputPath(route.replaceAll("/", "-") + ".png"),
        fullPage: true,
      });
  }
  expect(errors).toEqual([]);
});
test("transaction validation, CRUD, recalculation, persistence and undo", async ({
  page,
}, info) => {
  test.skip(!["desktop", "mobile"].includes(info.project.name));
  await page.goto("/transactions");
  await addTransaction(page);
  await page
    .getByRole("textbox", { name: "ค้นหารายละเอียดรายการ" })
    .fill("ข้าวทดสอบ");
  await expect(page.locator(".full-transaction-list .transaction")).toHaveCount(
    1,
  );
  await expect(page.locator(".full-transaction-list")).toContainText("฿123.45");
  await page
    .getByRole("button", { name: "แก้ไข ข้าวทดสอบ", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: /จำนวนเงิน/ }).fill("0");
  await dialog.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(dialog.getByRole("alert")).toContainText("มากกว่า 0");
  await dialog.getByRole("textbox", { name: /จำนวนเงิน/ }).fill("212.34");
  await dialog.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.locator(".full-transaction-list")).toContainText(
    "ข้าวทดสอบ",
  );
  await page.goto("/dashboard");
  await expect(page.locator(".stat-value").last()).toHaveText("16.66%");
  await expect(page.locator(".stat-value").nth(1)).toHaveText("฿32,662.34");
  await page.goto("/transactions");
  await page
    .getByRole("textbox", { name: "ค้นหารายละเอียดรายการ" })
    .fill("ข้าวทดสอบ");
  await page.getByRole("button", { name: "ลบ ข้าวทดสอบ", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ยืนยันลบรายการ" })
    .click();
  await expect(page.locator(".full-transaction-list .transaction")).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "เลิกทำ", exact: true }).click();
  await expect(page.locator(".full-transaction-list .transaction")).toHaveCount(
    1,
  );
  await page.getByRole("combobox", { name: "กรองบัญชี" }).selectOption("bank");
  await expect(page.locator(".full-transaction-list .transaction")).toHaveCount(
    0,
  );
});
test("budgets and custom food categories remain consistent after archiving", async ({
  page,
}, info) => {
  test.skip(!["desktop", "mobile"].includes(info.project.name));
  await page.goto("/budgets");
  await page
    .getByRole("button", { name: "แก้งบ อาหารและเครื่องดื่ม", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "จำนวนงบประมาณ (บาท)" })
    .fill("1000");
  await page
    .getByRole("button", { name: "บันทึกงบประมาณ", exact: true })
    .click();
  await expect(
    page.locator(".category-budget").filter({ hasText: "อาหารและเครื่องดื่ม" }),
  ).toContainText("เกินงบ ฿7,120");
  await page.goto("/categories");
  await page
    .getByRole("button", { name: "สร้างหมวดหมู่", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "ชื่อหมวดหมู่" })
    .fill("อาหารนอกบ้านทดสอบ");
  await page
    .getByRole("dialog")
    .getByRole("checkbox", { name: "จัดเป็นค่าอาหารสำหรับการวิเคราะห์" })
    .check();
  await page
    .getByRole("button", { name: "บันทึกหมวดหมู่", exact: true })
    .click();
  await expect(
    page.locator(".category-card").filter({ hasText: "อาหารนอกบ้านทดสอบ" }),
  ).toHaveCount(1);
  const customId = (await savedData(page)).data.categories.find(
    (c) => c.name === "อาหารนอกบ้านทดสอบ",
  )!.id;
  await page.goto("/transactions");
  await addTransaction(page, "อาหารหมวดใหม่", "100", customId);
  await page.goto("/categories");
  await page
    .getByRole("button", { name: "เก็บถาวร อาหารนอกบ้านทดสอบ", exact: true })
    .click();
  await page
    .getByRole("button", { name: "ยืนยันเก็บถาวร", exact: true })
    .click();
  await expect(
    page.locator(".category-card").filter({ hasText: "อาหารนอกบ้านทดสอบ" }),
  ).toHaveCount(0);
  await page.getByRole("checkbox", { name: "ดูหมวดที่เก็บถาวร" }).check();
  await expect(
    page.locator(".category-card").filter({ hasText: "อาหารนอกบ้านทดสอบ" }),
  ).toContainText("1 รายการ");
  await page.goto("/analytics/food");
  await expect(page.locator(".stat-value").first()).toHaveText("฿8,220");
  await expect(page.locator(".food-breakdown")).toContainText(
    "อาหารนอกบ้านทดสอบ",
  );
});
test("failed load can be retried and offers no destructive reset", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  let failing = true;
  await page.route("**/api/finance", (route) =>
    failing
      ? route.fulfill({ status: 500, json: { message: "ฐานข้อมูลล่ม" } })
      : route.continue(),
  );
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "โหลดข้อมูลไม่สำเร็จ" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /ล้างข้อมูล/ })).toHaveCount(0);
  failing = false;
  await page.getByRole("button", { name: "ลองอีกครั้ง" }).click();
  await expect(page.locator(".stat-value").first()).toHaveText("฿50,000");
});
test("failed save preserves input and shows error instead of success", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.route("**/api/finance", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({
          status: 500,
          json: { message: "เชื่อมต่อฐานข้อมูลไม่สำเร็จ" },
        })
      : route.continue(),
  );
  await page.goto("/transactions");
  await page.getByRole("button", { name: "เพิ่มรายการ", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: /จำนวนเงิน/ }).fill("99.99");
  await dialog
    .getByRole("combobox", { name: /^หมวดหมู่ / })
    .selectOption("food");
  await dialog.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: /จำนวนเงิน/ })).toHaveValue(
    "99.99",
  );
  await expect(page.locator(".toast.error")).toContainText(
    "เชื่อมต่อฐานข้อมูลไม่สำเร็จ",
  );
  await expect(dialog.getByRole("alert")).toContainText(
    "เชื่อมต่อฐานข้อมูลไม่สำเร็จ",
  );
});
test("account data survives sign-out, stays private and rejects stale saves", async ({
  page,
  browser,
}, info) => {
  test.skip(info.project.name !== "desktop");
  const first = await savedData(page);
  const data = structuredClone(first.data);
  data.accounts.push({
    id: "secret-account",
    name: "บัญชีลับ",
    type: "cash",
    openingBalanceSatang: -50,
  });
  data.transactions.push({
    id: "t1",
    kind: "expense",
    amountSatang: 1,
    date: "2026-01-31",
    categoryId: "food",
    accountId: "secret-account",
    description: "ขอบเดือน",
    notes: "",
    tags: ["ก"],
  });
  await seedData(page, data);
  const stale = await page.request.put("/api/finance", {
    data: { data: first.data, revision: first.revision },
  });
  expect(stale.status()).toBe(409);
  const stored = (await savedData(page)).data;
  expect(stored.accounts[0].openingBalanceSatang).toBe(-50);
  expect(stored.transactions[0]).toEqual(data.transactions[0]);
  // Removing a row while repointing what referenced it must save in one go.
  const moved = structuredClone(stored);
  moved.accounts = [{ ...moved.accounts[0], id: "new-account" }];
  moved.transactions[0].accountId = "new-account";
  await seedData(page, moved);
  expect((await savedData(page)).data.accounts[0].id).toBe("new-account");
  await seedData(page, { ...moved, transactions: [], accounts: [] });
  expect((await savedData(page)).data.accounts).toHaveLength(0);
  const other = await browser.newContext({ baseURL: ORIGIN });
  const otherPage = await other.newPage();
  expect((await otherPage.request.get("/api/finance")).status()).toBe(401);
  await otherPage.goto("/dashboard");
  await expect(otherPage).toHaveURL(/\/login$/);
  await signUp(otherPage);
  await seedData(otherPage, data);
  expect((await savedData(page)).data.transactions).toHaveLength(0);
  expect((await savedData(otherPage)).data.transactions).toHaveLength(1);
  await other.close();
});

test("fresh start contains no demo data and supports first account/category/transaction", async ({
  page,
}, info) => {
  test.skip(!["desktop", "mobile"].includes(info.project.name));
  await page.goto("/dashboard");
  await expect(page.locator(".stat-value").first()).toHaveText("฿0");
  await expect(page.locator(".stat-value").nth(1)).toHaveText("฿0");
  await expect(page.locator(".stat-value").last()).toHaveText("N/A");
  await expect(page.locator("body")).not.toContainText("DEMO");
  await expect(page.locator("body")).not.toContainText("ข้อมูลจำลอง");
  await page.reload();
  await expect(page.locator(".stat-value").first()).toHaveText("฿0");
  await page.goto("/accounts");
  await expect(page.locator(".account-card")).toHaveCount(0);
  await page
    .getByRole("button", { name: "เพิ่มบัญชีแรก", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "ชื่อบัญชี" })
    .fill("กระเป๋าของฉัน");
  await page.getByRole("button", { name: "บันทึกบัญชี", exact: true }).click();
  await expect(page.locator(".account-card")).toContainText("฿0");
  await page.goto("/categories");
  await expect(page.locator(".category-card")).toHaveCount(12);
  await page.reload();
  await expect(page.locator(".category-card")).toHaveCount(12);
  await page
    .getByRole("button", { name: "สร้างหมวดหมู่", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "ชื่อหมวดหมู่" })
    .fill("อาหารของฉัน");
  await page
    .getByRole("dialog")
    .getByRole("checkbox", { name: "จัดเป็นค่าอาหารสำหรับการวิเคราะห์" })
    .check();
  await page.getByRole("button", { name: "บันทึกหมวดหมู่" }).click();
  await expect(
    page.locator(".category-card").filter({ hasText: "อาหารของฉัน" }),
  ).toHaveCount(1);
  const id = (await savedData(page)).data.categories.find(
    (c) => c.name === "อาหารของฉัน",
  )!.id;
  await page.goto("/transactions");
  await addTransaction(page, "มื้อแรกของฉัน", "50.25", id);
  await page.goto("/dashboard");
  await expect(page.locator(".stat-value").nth(1)).toHaveText("฿50.25");
  await expect(page.locator(".stat-value").nth(2)).toHaveText("−฿50.25");
  await page.reload();
  await expect(page.locator(".stat-value").nth(1)).toHaveText("฿50.25");
});
test("legacy cleanup removes old generated records but preserves personally added transactions", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  const seed = createSeed("2026-10-30");
  seed.transactions.push({
    id: "my-real-entry",
    kind: "expense",
    amountSatang: 5000,
    date: "2026-10-30",
    categoryId: "meals",
    accountId: "cash",
    description: "รายการของฉัน",
  });
  await page.addInitScript((value) => {
    if (!localStorage.getItem("moneyflow-local-v1"))
      localStorage.setItem("moneyflow-demo-v2", JSON.stringify(value));
  }, seed);
  await page.goto("/dashboard");
  await expect(page.locator(".stat-value").first()).toHaveText("฿0");
  await expect(page.locator(".stat-value").nth(1)).toHaveText("฿50");
  await page.goto("/transactions");
  await expect(page.locator(".full-transaction-list .transaction")).toHaveCount(
    1,
  );
  await expect(page.locator(".full-transaction-list")).toContainText(
    "รายการของฉัน",
  );
  await page.reload();
  await expect(page.locator(".full-transaction-list .transaction")).toHaveCount(
    1,
  );
});

test("housing expense 4400 saves from dashboard with personal cash account", async ({
  page,
}, info) => {
  test.skip(!["desktop", "mobile"].includes(info.project.name));
  const initial = ensureDefaultCategories({
    version: 2,
    accounts: [
      {
        id: "personal-cash",
        name: "เงินสด",
        type: "cash",
        openingBalanceSatang: 0,
      },
    ],
    categories: [],
    transactions: [],
    budgets: [],
    transfers: [],
  });
  await seedData(page, initial);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "เปลี่ยนเป็น Dark Mode" }).click();
  await page
    .getByRole("button", {
      name: info.project.name === "mobile" ? "เพิ่มรายการใหม่" : "เพิ่มรายการ",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: /จำนวนเงิน/ }).fill("4400");
  await dialog
    .getByRole("combobox", { name: /^หมวดหมู่ / })
    .selectOption("home");
  await dialog
    .getByRole("combobox", { name: /^บัญชี/ })
    .selectOption("personal-cash");
  await dialog.getByLabel(/^วันที่/).fill("2026-10-30");
  await dialog.getByRole("textbox", { name: /^รายละเอียด/ }).fill("ค่าหอพัก");
  await dialog
    .getByRole("button", { name: "บันทึกรายการ", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".stat-value").nth(1)).toHaveText("฿4,400");
  const saved = (await savedData(page)).data;
  expect(saved.transactions).toHaveLength(1);
  expect(saved.transactions[0]).toMatchObject({
    amountSatang: 440000,
    categoryId: "home",
    accountId: "personal-cash",
    description: "ค่าหอพัก",
    date: "2026-10-30",
  });
});

test("sign-up form checks the password confirmation and shows the display name", async ({
  browser,
}, info) => {
  test.skip(!["desktop", "mobile"].includes(info.project.name));
  const context = await browser.newContext({
    baseURL: ORIGIN,
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByRole("button", { name: "ยังไม่มีบัญชี? สร้างบัญชี" }).click();
  await page.getByLabel("ชื่อที่แสดง").fill("  สมชาย  ");
  await page.getByLabel("อีเมล").fill(`e2e-${randomUUID()}@example.com`);
  const password = page.getByLabel("รหัสผ่าน", { exact: true });
  await password.fill("e2e-password-123");
  await page.getByLabel("ยืนยันรหัสผ่าน").fill("e2e-password-999");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "แสดงรหัสผ่าน" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "สร้างบัญชี", exact: true }).click();
  await expect(page.locator(".field-error")).toContainText("ไม่ตรงกัน");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("ยืนยันรหัสผ่าน").fill("e2e-password-123");
  await page.getByRole("button", { name: "สร้างบัญชี", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator(".profile-name")).toHaveText("สมชาย");
  await expect(page.locator(".avatar")).toHaveText("ส");
  await context.close();
});

test("profile menu signs out and ends the session", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /^เมนูบัญชี/ }).click();
  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/finance")).status()).toBe(401);
});
