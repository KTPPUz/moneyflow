import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../src/data/legacy-seed";
import {
  accountBalance,
  budgetState,
  foodMetrics,
  summarize,
} from "../src/lib/finance";
import {
  formatMoney,
  parseMoney,
  percentLabel,
  sumSatang,
} from "../src/lib/money";
import {
  localDate,
  monthsEnding,
  shiftMonth,
  validDate,
} from "../src/lib/dates";
import { financeSchema, transactionFormSchema } from "../src/lib/validation";
test("financial inputs preserve cents, allow negative net and reject invalid amounts", () => {
  assert.equal(parseMoney("0.10") + parseMoney("0.20"), 30);
  assert.equal(formatMoney(-123456), "−฿1,234.56");
  for (const v of [
    "0",
    "-1",
    "NaN",
    "1e3",
    "0.001",
    "10000000000000",
    "1,000",
  ]) {
    assert.throws(() => parseMoney(v));
  }
  assert.throws(() => sumSatang([Number.MAX_SAFE_INTEGER, 1]));
});
test("PRD acceptance example and zero denominators", () => {
  const d = createSeed("2026-10-30");
  d.transactions = [
    {
      id: "p",
      kind: "expense",
      categoryId: "meals",
      accountId: "cash",
      amountSatang: 600000,
      date: "2026-09-10",
      description: "",
    },
    {
      id: "c",
      kind: "expense",
      categoryId: "meals",
      accountId: "cash",
      amountSatang: 720000,
      date: "2026-10-10",
      description: "",
    },
    {
      id: "pi",
      kind: "income",
      categoryId: "salary",
      accountId: "bank",
      amountSatang: 3000000,
      date: "2026-09-01",
      description: "",
    },
    {
      id: "ci",
      kind: "income",
      categoryId: "salary",
      accountId: "bank",
      amountSatang: 3500000,
      date: "2026-10-01",
      description: "",
    },
  ];
  let metrics = foodMetrics(d, "2026-10", "2026-09");
  assert.equal(percentLabel(metrics.mom, true), "+20.00%");
  assert.equal(percentLabel(metrics.incomeShare), "20.57%");
  assert.equal(percentLabel(metrics.pp, true, " pp"), "+0.57 pp");
  d.transactions = d.transactions.filter(
    (t) => t.kind !== "income" && t.id !== "p",
  );
  metrics = foodMetrics(d, "2026-10", "2026-09");
  assert.equal(metrics.incomeShare, null);
  assert.equal(metrics.mom, null);
  assert.equal(metrics.pp, null);
  assert.equal(metrics.newSpending, true);
  assert.equal(summarize(d, "2026-10").balance, -720000);
});
test("fixture totals reconcile to transactions for all months, including renamed food and edits", () => {
  const d = financeSchema.parse(createSeed("2026-10-30"));
  for (const m of monthsEnding("2026-10", 13)) {
    const s = summarize(d, m);
    assert.equal(sumSatang(s.categories.map((c) => c.amount)), s.expense);
    assert.equal(s.income - s.expense, s.balance);
  }
  assert.equal(summarize(d, "2026-10").food, 812000);
  d.categories.find((c) => c.id === "food")!.name = "อร่อย";
  const t = d.transactions.find((t) => t.id === "2026-09-meal-1")!;
  const before = summarize(d, "2026-09").food;
  t.amountSatang += 1;
  assert.equal(summarize(d, "2026-09").food, before + 1);
});
test("refund offsets expense in refund month, transfers and credit settlements excluded from income/expense", () => {
  const d = createSeed("2026-10-30");
  d.transactions = [
    {
      id: "purchase",
      kind: "expense",
      categoryId: "meals",
      accountId: "credit",
      amountSatang: 10000,
      date: "2026-09-30",
      description: "",
    },
    {
      id: "refund",
      kind: "refund",
      refundOf: "purchase",
      categoryId: "meals",
      accountId: "credit",
      amountSatang: 2000,
      date: "2026-10-01",
      description: "คืนเงิน",
    },
  ];
  d.transfers = [
    {
      id: "pay-card",
      sourceAccountId: "bank",
      destinationAccountId: "credit",
      amountSatang: 8000,
      date: "2026-10-02",
    },
  ];
  financeSchema.parse(d);
  assert.equal(summarize(d, "2026-10").income, 0);
  assert.equal(summarize(d, "2026-10").expense, -2000);
  assert.equal(accountBalance(d, "credit"), 0);
  assert.equal(accountBalance(d, "bank"), 4992000);
  d.transactions[1].amountSatang = 10001;
  assert.equal(financeSchema.safeParse(d).success, false);
});
test("month and Bangkok date boundaries", () => {
  assert.equal(localDate(new Date("2026-09-30T17:00:00Z")), "2026-10-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
  const d = createSeed("2026-10-30");
  d.transactions = [
    {
      id: "x",
      kind: "income",
      categoryId: "salary",
      accountId: "bank",
      amountSatang: 1,
      date: "2026-09-30",
      description: "",
    },
  ];
  assert.equal(summarize(d, "2026-10").income, 0);
  assert.equal(summarize(d, "2026-09").income, 1);
});
test("budget thresholds, referenced category archiving and invalid date/form inputs", () => {
  for (const [used, status] of [
    [79, "normal"],
    [80, "warning"],
    [100, "reached"],
    [101, "exceeded"],
  ] as const)
    assert.equal(budgetState(used, 100).status, status);
  assert.equal(budgetState(20, 0).ratio, null);
  const d = createSeed("2026-10-30");
  d.categories.find((c) => c.id === "food")!.archivedAt = "2026-10-30";
  assert.equal(financeSchema.safeParse(d).success, true);
  const old = summarize(d, "2026-10");
  d.categories = d.categories.filter((c) => c.id !== "food");
  assert.equal(financeSchema.safeParse(d).success, false);
  assert.equal(old.food, 812000);
  assert.equal(
    transactionFormSchema.safeParse({
      kind: "expense",
      amount: "0",
      date: "2026-02-30",
      categoryId: "",
      accountId: "",
      description: "",
      notes: "",
      tags: "",
    }).success,
    false,
  );
});
