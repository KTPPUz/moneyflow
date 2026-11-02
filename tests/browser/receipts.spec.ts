import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { randomInt, randomUUID } from "node:crypto";
import type { FinanceData } from "../../src/types/finance";

const origin = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3001";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
const file = { name: "สลิปทดสอบ.png", mimeType: "image/png", buffer: png };

async function signUp(request: APIRequestContext) {
  const response = await request.post("/api/auth/sign-up/email", {
    headers: {
      origin,
      "x-forwarded-for": `10.${randomInt(255)}.${randomInt(255)}.${randomInt(255)}`,
    },
    data: {
      email: `receipt-${randomUUID()}@example.com`,
      password: "e2e-password-123",
      name: "Receipt test",
    },
  });
  expect(response.ok()).toBe(true);
}
async function snapshot(request: APIRequestContext) {
  const response = await request.get("/api/finance");
  expect(response.ok()).toBe(true);
  return (await response.json()) as { data: FinanceData; revision: number };
}
async function seed(request: APIRequestContext) {
  const state = await snapshot(request);
  state.data.accounts = [
    { id: "cash", name: "เงินสด", type: "cash", openingBalanceSatang: 0 },
  ];
  state.data.transactions = [
    {
      id: "expense",
      kind: "expense",
      amountSatang: 10000,
      date: "2026-11-02",
      accountId: "cash",
      categoryId: "food",
      description: "อาหารทดสอบ",
    },
  ];
  expect((await request.put("/api/finance", { data: state })).ok()).toBe(true);
}
async function openEditor(page: Page, description = "อาหารทดสอบ") {
  await page
    .getByRole("button", { name: `แก้ไข ${description}`, exact: true })
    .click();
  return page.getByRole("dialog");
}
test.beforeEach(async ({ page }) => {
  await signUp(page.request);
  await seed(page.request);
  await page.clock.setFixedTime(new Date("2026-11-02T09:00:00+07:00"));
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
});
test.setTimeout(120000);

test("receipts survive edits, reload, replacement and delete undo; removal and cancel work", async ({
  page,
}) => {
  const state = await snapshot(page.request);
  state.data.transactions = [];
  expect((await page.request.put("/api/finance", { data: state })).ok()).toBe(
    true,
  );
  await page.goto("/transactions");
  await page
    .getByRole("button", {
      name:
        page.viewportSize()!.width < 640 ? "เพิ่มรายการใหม่" : "เพิ่มรายการ",
      exact: true,
    })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: /จำนวนเงิน/ }).fill("100");
  await dialog
    .getByRole("combobox", { name: /^หมวดหมู่ / })
    .selectOption("food");
  await dialog.getByRole("textbox", { name: /^รายละเอียด/ }).fill("อาหารทดสอบ");
  await dialog.locator('input[type="file"]').setInputFiles(file);
  await expect(
    dialog.getByRole("img", { name: "สลิปที่แนบกับรายการ" }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "บันทึกรายการ", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  const link = page.getByRole("link", {
    name: "ดูสลิป อาหารทดสอบ",
    exact: true,
  });
  await expect(link).toBeVisible();
  const firstUrl = await link.getAttribute("href");
  const image = await page.request.get(firstUrl!);
  expect(image.status()).toBe(200);
  expect(image.headers()["cache-control"]).toBe("private, no-store");
  expect(await image.body()).toEqual(png);
  await page.reload();
  await expect(link).toHaveAttribute("href", firstUrl!);
  dialog = await openEditor(page);
  await expect(
    dialog.getByRole("img", { name: "สลิปที่แนบกับรายการ" }),
  ).toHaveAttribute("src", firstUrl!);
  await expect
    .poll(() =>
      dialog
        .getByRole("img", { name: "สลิปที่แนบกับรายการ" })
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await dialog
    .getByRole("button", { name: "บันทึกรายการ", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(link).toHaveAttribute("href", firstUrl!);
  dialog = await openEditor(page);
  await dialog
    .locator('input[type="file"]')
    .setInputFiles({ ...file, name: "replacement.png" });
  await dialog
    .getByRole("button", { name: "บันทึกรายการ", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(link).not.toHaveAttribute("href", firstUrl!);
  const replacementUrl = await link.getAttribute("href");
  await page
    .getByRole("button", { name: "ลบ อาหารทดสอบ", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ยืนยันลบรายการ", exact: true })
    .click();
  await expect(link).toHaveCount(0);
  await page.getByRole("button", { name: "เลิกทำ", exact: true }).click();
  await expect(link).toHaveAttribute("href", replacementUrl!);
  expect((await page.request.get(replacementUrl!)).status()).toBe(200);
  dialog = await openEditor(page);
  await dialog.getByRole("button", { name: "นำสลิปออก", exact: true }).click();
  await dialog.getByRole("button", { name: "ยกเลิก", exact: true }).click();
  await expect(link).toHaveAttribute("href", replacementUrl!);
  dialog = await openEditor(page);
  await dialog.getByRole("button", { name: "นำสลิปออก", exact: true }).click();
  await dialog
    .getByRole("button", { name: "บันทึกรายการ", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(link).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "แก้ไข อาหารทดสอบ", exact: true }),
  ).toBeVisible();
  await expect(link).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("receipt API rejects unsafe uploads and isolates viewing and attachment between users", async ({
  page,
  playwright,
}) => {
  const anonymous = await playwright.request.newContext({ baseURL: origin });
  const other = await playwright.request.newContext({ baseURL: origin });
  try {
    const headers = {
      origin,
      "content-type": "image/png",
      "x-file-name": encodeURIComponent("สลิป.png"),
    };
    expect(
      (await anonymous.post("/api/receipts", { headers, data: png })).status(),
    ).toBe(401);
    expect(
      (
        await page.request.post("/api/receipts", {
          headers: { ...headers, origin: "https://evil.example" },
          data: png,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/receipts", {
          headers,
          data: Buffer.from("<svg></svg>"),
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.post("/api/receipts", {
          headers,
          data: Buffer.alloc(2 * 1024 * 1024 + 1),
        })
      ).status(),
    ).toBe(400);
    const uploaded = await page.request.post("/api/receipts", {
      headers,
      data: png,
    });
    expect(uploaded.status()).toBe(201);
    const { id } = await uploaded.json();
    expect((await anonymous.get(`/api/receipts/${id}`)).status()).toBe(401);
    await signUp(other);
    await seed(other);
    expect((await other.get(`/api/receipts/${id}`)).status()).toBe(404);
    const foreignState = await snapshot(other);
    foreignState.data.transactions[0].receiptId = id;
    expect(
      (await other.put("/api/finance", { data: foreignState })).status(),
    ).toBe(400);
    const state = await snapshot(page.request);
    state.data.transactions[0].receiptId = id;
    expect((await page.request.put("/api/finance", { data: state })).ok()).toBe(
      true,
    );
    expect((await page.request.delete("/api/finance")).ok()).toBe(true);
    expect((await page.request.get(`/api/receipts/${id}`)).status()).toBe(404);
  } finally {
    await anonymous.dispose();
    await other.dispose();
  }
});

test("a failed finance save retains the uploaded receipt for retry without uploading it twice", async ({
  page,
}) => {
  await page.goto("/transactions");
  const dialog = await openEditor(page);
  await dialog.locator('input[type="file"]').setInputFiles(file);
  let uploads = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/receipts") && request.method() === "POST")
      uploads++;
  });
  await page.route("**/api/finance", async (route) => {
    if (route.request().method() === "PUT") {
      await route.fulfill({
        status: 500,
        json: { message: "ทดสอบบันทึกไม่สำเร็จ" },
      });
    } else await route.continue();
  });
  await dialog
    .getByRole("button", { name: "บันทึกรายการ", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("ทดสอบบันทึกไม่สำเร็จ");
  expect(uploads).toBe(1);
  await page.unroute("**/api/finance");
  await dialog
    .getByRole("button", { name: "บันทึกรายการ", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("link", { name: "ดูสลิป อาหารทดสอบ", exact: true }),
  ).toBeVisible();
  expect(uploads).toBe(1);
});

test("large photos are compressed and unsupported files show an error", async ({
  page,
}, info) => {
  await page.goto("/transactions");
  const dialog = await openEditor(page);
  const input = dialog.locator('input[type="file"]');
  await input.setInputFiles({
    name: "test.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg></svg>"),
  });
  await expect(dialog.getByRole("alert")).toContainText("JPG, PNG หรือ WebP");
  const originalSize = await input.evaluate(async (element) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1100;
    canvas.height = 1100;
    const context = canvas.getContext("2d")!;
    const image = context.createImageData(1100, 1100);
    let seed = 12345;
    for (let i = 0; i < image.data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      image.data[i] = i % 4 === 3 ? 255 : seed >>> 24;
    }
    context.putImageData(image, 0, 0);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((value) => resolve(value!), "image/png"),
    );
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([blob], "large-photo.png", { type: "image/png" }),
    );
    (element as HTMLInputElement).files = transfer.files;
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return blob.size;
  });
  expect(originalSize).toBeGreaterThan(2 * 1024 * 1024);
  await expect(
    dialog.getByRole("img", { name: "สลิปที่แนบกับรายการ" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "บันทึกรายการ", exact: true }),
  ).toBeEnabled();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("receipt-preview.png"),
    fullPage: true,
  });
  await dialog
    .getByRole("button", { name: "บันทึกรายการ", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  const link = page.getByRole("link", {
    name: "ดูสลิป อาหารทดสอบ",
    exact: true,
  });
  const image = await page.request.get((await link.getAttribute("href"))!);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/jpeg");
  expect((await image.body()).length).toBeLessThanOrEqual(2 * 1024 * 1024);
});
