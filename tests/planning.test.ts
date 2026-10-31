import test from "node:test";
import assert from "node:assert/strict";
import {
  savingsProgress,
  planningAlerts,
  daysUntil,
  billTiming,
} from "../src/lib/planning";
import { planningSchema } from "../src/lib/planning-validation";
import { emptyPlanningData } from "../src/types/planning";
import { emptyFinanceData } from "../src/data/local/initial-data";
import { ensureDefaultCategories } from "../src/data/local/default-categories";
import { hasSameOrigin } from "../src/lib/request-origin";

test("Origin check uses the public Host behind Next and rejects cross-site or opaque origins", () => {
  const request = (origin: string) =>
    new Request("http://localhost:3004/api/planning", {
      headers: { host: "127.0.0.1:3004", origin },
    });
  assert.equal(hasSameOrigin(request("http://127.0.0.1:3004")), true);
  assert.equal(hasSameOrigin(request("http://localhost:3004")), false);
  assert.equal(hasSameOrigin(request("https://other.example")), false);
  assert.equal(hasSameOrigin(request("null")), false);
  assert.equal(hasSameOrigin(request("http://127.0.0.1:3004/path")), false);
});

test("savings progress uses exact satang, inclusive calendar months, and ceiling without financial ledger effects", () => {
  const data = emptyPlanningData();
  const goal = {
    id: "g",
    name: "เงินสำรอง",
    targetSatang: 10000,
    dueDate: "2026-12-31",
  };
  data.goals.push(goal);
  data.contributions.push({
    id: "c",
    goalId: "g",
    amountSatang: 3333,
    date: "2026-10-01",
    note: "",
  });
  const state = savingsProgress(goal, data, "2026-10-31");
  assert.equal(state.saved, 3333);
  assert.equal(state.remaining, 6667);
  assert.equal(state.months, 3);
  assert.equal(state.monthly, 2223);
  assert.equal(savingsProgress(goal, data, "2027-01-01").monthly, 6667);
  assert.equal(savingsProgress(goal, data, "2027-01-01").overdue, true);
  data.contributions.push({
    id: "done",
    goalId: "g",
    amountSatang: 7000,
    date: "2026-10-01",
    note: "",
  });
  const complete = savingsProgress(goal, data, "2026-10-31");
  assert.equal(complete.saved, 10333);
  assert.equal(complete.monthly, 0);
  assert.equal(complete.complete, true);
  assert.equal(complete.overdue, false);
  data.contributions = [];
  assert.equal(savingsProgress(goal, data, "2026-12-31").monthly, 10000);
});
test("bill reminders respect lead window, today, overdue, paid status, leap years and calendar boundaries", () => {
  const bill = {
    id: "b",
    name: "ค่าเช่า",
    amountSatang: 440000,
    dueDate: "2026-11-01",
    remindDays: 7,
  };
  assert.equal(daysUntil("2026-11-01", "2026-10-31"), 1);
  assert.equal(daysUntil("2024-03-01", "2024-02-28"), 2);
  assert.equal(billTiming(bill, "2026-10-24").needsAlert, false);
  assert.equal(billTiming(bill, "2026-10-25").needsAlert, true);
  assert.equal(billTiming(bill, "2026-11-01").label, "ครบกำหนดวันนี้");
  assert.equal(billTiming(bill, "2026-11-03").label, "เลยกำหนด 2 วัน");
  assert.equal(
    billTiming({ ...bill, paidDate: "2026-10-31" }, "2026-11-03").needsAlert,
    false,
  );
});
test("budget alerts use current-month ledger, net refunds, and escalate read IDs at 80/100/over 100 percent", () => {
  const finance = ensureDefaultCategories(emptyFinanceData());
  const planning = emptyPlanningData();
  finance.budgets = [
    { id: "food", month: "2026-10", categoryId: "food", amountSatang: 10000 },
  ];
  finance.transactions = [
    {
      id: "e",
      kind: "expense",
      categoryId: "meals",
      accountId: "cash",
      amountSatang: 7900,
      date: "2026-10-01",
      description: "",
    },
  ];
  const categoryAlerts = () =>
    planningAlerts(finance, planning, "2026-10-31").filter((a) =>
      a.id.includes(":food:"),
    );
  assert.equal(categoryAlerts().length, 0);
  finance.transactions[0].amountSatang = 8000;
  assert.ok(categoryAlerts()[0].id.endsWith(":warning"));
  planning.readAlertIds.push(categoryAlerts()[0].id);
  finance.transactions[0].amountSatang = 10000;
  assert.ok(categoryAlerts()[0].id.endsWith(":reached"));
  assert.ok(!planning.readAlertIds.includes(categoryAlerts()[0].id));
  finance.transactions[0].amountSatang = 10001;
  assert.equal(categoryAlerts()[0].severity, "danger");
  finance.transactions.push({
    id: "refund",
    kind: "refund",
    refundOf: "e",
    categoryId: "meals",
    accountId: "cash",
    amountSatang: 3000,
    date: "2026-10-31",
    description: "",
  });
  assert.equal(categoryAlerts().length, 0);
  assert.equal(planningAlerts(finance, planning, "2026-11-01").length, 0);
});
test("notifications recalculate income-derived overall budgets and paid bills", () => {
  const finance = ensureDefaultCategories(emptyFinanceData());
  const data = emptyPlanningData();
  assert.deepEqual(planningAlerts(finance, data, "2026-10-31"), []);
  finance.transactions = [
    {
      id: "e",
      kind: "expense",
      categoryId: "food",
      accountId: "a",
      amountSatang: 8000,
      date: "2026-10-31",
      description: "",
    },
  ];
  assert.ok(
    planningAlerts(finance, data, "2026-10-31")[0].id.endsWith("no-income"),
  );
  finance.transactions.push({
    id: "i",
    kind: "income",
    categoryId: "salary",
    accountId: "a",
    amountSatang: 10000,
    date: "2026-10-31",
    description: "",
  });
  assert.ok(
    planningAlerts(finance, data, "2026-10-31")[0].id.endsWith("warning"),
  );
  finance.transactions[1].amountSatang = 20000;
  assert.equal(planningAlerts(finance, data, "2026-10-31").length, 0);
  data.bills = [
    {
      id: "b",
      name: "ค่าไฟ",
      dueDate: "2026-11-01",
      amountSatang: 50000,
      remindDays: 7,
    },
  ];
  const upcoming = planningAlerts(finance, data, "2026-10-31")[0];
  assert.equal(upcoming.kind, "bill");
  const due = planningAlerts(finance, data, "2026-11-01")[0];
  assert.notEqual(upcoming.id, due.id);
  assert.equal(due.severity, "danger");
  data.bills[0].paidDate = "2026-10-31";
  assert.deepEqual(planningAlerts(finance, data, "2026-10-31"), []);
});
test("planning validation rejects orphan contributions, duplicates, invalid amounts and invalid dates", () => {
  assert.equal(planningSchema.safeParse(emptyPlanningData()).success, true);
  const data = emptyPlanningData();
  data.goals = [
    { id: "g", name: "เที่ยว", dueDate: "2026-02-30", targetSatang: 0 },
  ];
  assert.equal(planningSchema.safeParse(data).success, false);
  data.goals[0] = {
    id: "g",
    name: "เที่ยว",
    dueDate: "2026-12-31",
    targetSatang: 10000,
  };
  data.contributions = [
    {
      id: "c",
      goalId: "missing",
      amountSatang: 100,
      date: "2026-01-01",
      note: "",
    },
  ];
  assert.equal(planningSchema.safeParse(data).success, false);
  data.contributions[0].goalId = "g";
  assert.equal(planningSchema.safeParse(data).success, true);
  data.contributions.push({ ...data.contributions[0] });
  assert.equal(planningSchema.safeParse(data).success, false);
});
