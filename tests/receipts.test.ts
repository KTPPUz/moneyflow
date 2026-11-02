import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_RECEIPT_BYTES,
  readReceiptBody,
  validateReceipt,
  ReceiptValidationError,
} from "../src/lib/receipts";
import { transactionSchema } from "../src/lib/validation";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);

test("receipts validate file signatures, supported MIME types, names and size limits", () => {
  assert.equal(validateReceipt(png, "image/png", "สลิป.png"), "สลิป.png");
  assert.equal(
    validateReceipt(png, "image/png", "C:\\fakepath\\slip.png"),
    "slip.png",
  );
  assert.throws(
    () => validateReceipt(png, "image/jpeg", "slip.jpg"),
    ReceiptValidationError,
  );
  assert.throws(
    () =>
      validateReceipt(Buffer.from("<svg></svg>"), "image/svg+xml", "slip.svg"),
    ReceiptValidationError,
  );
  assert.throws(
    () => validateReceipt(new Uint8Array(), "image/png", "slip.png"),
    ReceiptValidationError,
  );
  assert.throws(
    () =>
      validateReceipt(
        new Uint8Array(MAX_RECEIPT_BYTES + 1),
        "image/png",
        "slip.png",
      ),
    ReceiptValidationError,
  );
  assert.throws(
    () => validateReceipt(png, "image/png", "a\r\nb.png"),
    ReceiptValidationError,
  );
  assert.throws(
    () => validateReceipt(png, "image/png", "a".repeat(181)),
    ReceiptValidationError,
  );
});

test("receipt bodies enforce the limit for streamed uploads without Content-Length", async () => {
  const data = await readReceiptBody(
    new Request("http://localhost/", { method: "POST", body: png }),
  );
  assert.deepEqual(Buffer.from(data), png);
  await assert.rejects(
    readReceiptBody(
      new Request("http://localhost/", {
        method: "POST",
        body: new Uint8Array(MAX_RECEIPT_BYTES + 1),
      }),
    ),
    ReceiptValidationError,
  );
  await assert.rejects(
    readReceiptBody(
      new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Length": String(MAX_RECEIPT_BYTES + 1) },
        body: png,
      }),
    ),
    ReceiptValidationError,
  );
});

test("transaction validation preserves a receipt reference and accepts existing transactions without receipts", () => {
  const row = {
    id: "t",
    kind: "expense",
    amountSatang: 100,
    date: "2026-11-02",
    categoryId: "food",
    accountId: "cash",
    description: "test",
  };
  assert.equal(transactionSchema.parse(row).receiptId, undefined);
  const receiptId = "afc539fe-dddc-4c16-b3dc-82800b0dbe31";
  assert.equal(
    transactionSchema.parse({ ...row, receiptId }).receiptId,
    receiptId,
  );
  assert.equal(
    transactionSchema.safeParse({ ...row, receiptId: "../other-user" }).success,
    false,
  );
});
