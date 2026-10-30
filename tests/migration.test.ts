import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../src/data/legacy-seed";
import { emptyFinanceData } from "../src/data/local/initial-data";
import { migrateLegacyData } from "../src/data/local/migrate-legacy";
import { financeSchema } from "../src/lib/validation";
import { summarize } from "../src/lib/finance";
test("fresh data and unchanged legacy fixture produce no fabricated balances or records", () => {
  assert.deepEqual(emptyFinanceData(), {
    version: 2,
    transactions: [],
    categories: [],
    accounts: [],
    budgets: [],
    transfers: [],
  });
  for (const date of ["2026-10-01", "2026-10-30", "2025-02-28"])
    assert.deepEqual(
      migrateLegacyData(financeSchema.parse(createSeed(date))),
      emptyFinanceData(),
    );
});
test("legacy cleanup retains user records, custom settings and necessary references only", () => {
  const d = createSeed("2026-10-30");
  d.transactions.push({
    id: "personal-1",
    kind: "expense",
    amountSatang: 12345,
    date: "2026-10-30",
    categoryId: "meals",
    accountId: "cash",
    description: "ของฉัน",
  });
  d.transactions.find((t) => t.id === "2026-09-coffee-1")!.amountSatang = 8000;
  d.budgets.find((b) => b.id === "2026-10-food")!.amountSatang = 200000;
  d.categories.push({
    id: "custom",
    name: "ส่วนตัว",
    kind: "expense",
    isFood: false,
    icon: "wallet",
    color: "#123456",
    order: 22,
  });
  const clean = financeSchema.parse(migrateLegacyData(d));
  assert.equal(clean.transactions.length, 2);
  assert.ok(clean.transactions.some((t) => t.id === "personal-1"));
  assert.equal(clean.budgets.length, 1);
  assert.deepEqual(
    clean.accounts.map((a) => [a.id, a.openingBalanceSatang]),
    [["cash", 0]],
  );
  assert.ok(clean.categories.some((c) => c.id === "custom"));
  assert.ok(clean.categories.some((c) => c.id === "food"));
  assert.equal(summarize(clean, "2026-10").income, 0);
  assert.equal(summarize(clean, "2026-10").expense, 12345);
});
test("cleanup preserves refund links and custom account opening balance", () => {
  const d = createSeed("2026-10-30");
  const original = d.transactions.find((t) => t.id === "2026-10-meal-1")!;
  d.transactions.push({
    id: "my-refund",
    kind: "refund",
    refundOf: original.id,
    amountSatang: 1000,
    date: "2026-10-30",
    categoryId: original.categoryId,
    accountId: original.accountId,
    description: "คืนเงินจริง",
  });
  d.accounts.find((a) => a.id === "bank")!.openingBalanceSatang = 123456;
  const clean = financeSchema.parse(migrateLegacyData(d));
  assert.equal(clean.transactions.length, 2);
  assert.equal(
    clean.accounts.find((a) => a.id === "bank")!.openingBalanceSatang,
    123456,
  );
  assert.equal(
    clean.transactions.find((t) => t.kind === "refund")!.refundOf,
    original.id,
  );
});
