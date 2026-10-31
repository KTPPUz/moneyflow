import assert from "node:assert/strict";
import test from "node:test";
import {
  paymentSummary,
  paymentChannel,
  accountUsage,
  canReceiveAccount,
  parseOpeningBalance,
  removeAccount,
  saveAccount,
} from "../src/lib/accounts";
import { accountBalance, summarize } from "../src/lib/finance";
import { MAX_AMOUNT, sumSatang } from "../src/lib/money";
import { financeSchema } from "../src/lib/validation";
import { emptyFinanceData } from "../src/data/local/initial-data";
import { ensureDefaultCategories } from "../src/data/local/default-categories";
function fixture() {
  const data = ensureDefaultCategories(emptyFinanceData());
  data.accounts = [
    { id: "cash", name: "เงินสด", type: "cash", openingBalanceSatang: 12345 },
    { id: "bank", name: "ธนาคาร", type: "bank", openingBalanceSatang: -1000 },
    { id: "wallet", name: "กระเป๋า", type: "ewallet", openingBalanceSatang: 0 },
  ];
  data.transactions = [
    {
      id: "i",
      kind: "income",
      accountId: "cash",
      categoryId: "salary",
      amountSatang: 50000,
      date: "2026-10-01",
      description: "",
    },
    {
      id: "e",
      kind: "expense",
      accountId: "cash",
      categoryId: "food",
      amountSatang: 10000,
      date: "2026-10-02",
      description: "",
    },
    {
      id: "r",
      kind: "refund",
      refundOf: "e",
      accountId: "cash",
      categoryId: "food",
      amountSatang: 123,
      date: "2026-10-03",
      description: "",
    },
  ];
  data.transfers = [
    {
      id: "t",
      sourceAccountId: "wallet",
      destinationAccountId: "cash",
      amountSatang: 99,
      date: "2026-10-03",
    },
  ];
  return data;
}
test("cash and bank expenses share one income pool regardless of which account receives income", () => {
  const data = fixture();
  data.accounts = data.accounts
    .slice(0, 2)
    .map((a) => ({ ...a, openingBalanceSatang: 0 }));
  data.transfers = [];
  data.transactions = [
    { ...data.transactions[0], accountId: "bank", amountSatang: 2397500 },
    { ...data.transactions[1], accountId: "cash", amountSatang: 21400 },
    {
      ...data.transactions[1],
      id: "bank-expense",
      accountId: "bank",
      amountSatang: 1017538,
    },
  ];
  assert.deepEqual(paymentSummary(data), {
    income: 2397500,
    expense: 1038938,
    opening: 0,
    balance: 1358562,
  });
  assert.equal(paymentChannel(data, "cash").expense, 21400);
  assert.equal(paymentChannel(data, "bank").expense, 1017538);
  const before = paymentSummary(data);
  data.transactions[0].accountId = "cash";
  assert.deepEqual(paymentSummary(data), before);
  data.transactions.push({
    ...data.transactions[1],
    id: "refund",
    kind: "refund",
    refundOf: data.transactions[1].id,
    amountSatang: 100,
  });
  assert.equal(paymentSummary(data).balance, 1358662);
  assert.equal(paymentChannel(data, "cash").expense, 21300);
  data.accounts[0].openingBalanceSatang = 50000;
  assert.equal(paymentSummary(data).balance, 1408662);
  data.transfers = [
    {
      id: "move",
      sourceAccountId: "bank",
      destinationAccountId: "cash",
      amountSatang: 10000,
      date: "2026-10-01",
    },
  ];
  assert.equal(paymentSummary(data).balance, 1408662);
});
test("editing accounts preserves references, order and ledger totals while opening balance updates exact account totals", () => {
  const before = fixture();
  const after = saveAccount(
    before,
    {
      ...before.accounts[0],
      name: "ส่วนตัว",
      type: "credit",
      openingBalanceSatang: -10001,
    },
    true,
  );
  assert.deepEqual(
    after.accounts.map((a) => a.id),
    before.accounts.map((a) => a.id),
  );
  assert.deepEqual(after.transactions, before.transactions);
  assert.deepEqual(after.transfers, before.transfers);
  assert.deepEqual(summarize(after, "2026-10"), summarize(before, "2026-10"));
  assert.equal(
    accountBalance(after, "cash"),
    accountBalance(before, "cash") - 22346,
  );
  assert.throws(() =>
    saveAccount(before, { ...before.accounts[0], name: " ธนาคาร " }, true),
  );
  assert.throws(() =>
    saveAccount(before, { ...before.accounts[0], id: "deleted" }, true),
  );
  assert.equal(parseOpeningBalance("-0.10"), -10);
  assert.equal(parseOpeningBalance("0"), 0);
  assert.equal(parseOpeningBalance("-0.00"), 0);
  for (const invalid of ["1e3", "0.001", "--1", "-1.001", "NaN"])
    assert.throws(() => parseOpeningBalance(invalid));
});
test("deleting a used account reassigns originals, refunds, transfers and opening balance without changing total money", () => {
  const before = fixture();
  assert.equal(accountUsage(before, "cash").transactions, 3);
  assert.throws(() => removeAccount(before, "cash"));
  assert.equal(canReceiveAccount(before, "cash", "wallet"), false);
  assert.throws(() => removeAccount(before, "cash", "wallet"));
  const after = removeAccount(before, "cash", "bank");
  assert.equal(financeSchema.safeParse(after).success, true);
  assert.equal(after.accounts.length, 2);
  assert.equal(
    after.accounts.find((a) => a.id === "bank")!.openingBalanceSatang,
    11345,
  );
  assert.ok(after.transactions.every((t) => t.accountId === "bank"));
  assert.equal(after.transactions.find((t) => t.id === "r")!.refundOf, "e");
  assert.equal(after.transfers[0].destinationAccountId, "bank");
  assert.deepEqual(summarize(after, "2026-10"), summarize(before, "2026-10"));
  const total = (d: typeof before) =>
    sumSatang(d.accounts.map((a) => accountBalance(d, a.id)));
  assert.equal(total(before), total(after));
  assert.equal(before.accounts.length, 3);
});
test("unused accounts can be removed and merging rejects missing accounts or out-of-range opening balances", () => {
  const data = fixture();
  data.transactions = [];
  data.transfers = [];
  assert.equal(removeAccount(data, "cash").accounts.length, 2);
  assert.throws(() => removeAccount(data, "cash", "missing"));
  assert.throws(() => removeAccount(data, "cash", "cash"));
  assert.throws(() => removeAccount(data, "missing"));
  data.accounts[0].openingBalanceSatang = MAX_AMOUNT;
  data.accounts[1].openingBalanceSatang = 1;
  assert.throws(() => removeAccount(data, "cash", "bank"));
});
