import test from "node:test";
import assert from "node:assert/strict";
import { ensureDefaultCategories } from "../src/data/local/default-categories";
import { emptyFinanceData } from "../src/data/local/initial-data";
import { financeSchema } from "../src/lib/validation";
test("standard categories contain expense, income and food groups without financial demo records", () => {
  const empty = emptyFinanceData();
  const data = financeSchema.parse(ensureDefaultCategories(empty));
  assert.equal(data.categories.length, 21);
  assert.equal(data.categories.filter((c) => c.kind === "income").length, 5);
  assert.equal(
    data.categories.filter((c) => c.kind === "expense" && !c.parentId).length,
    12,
  );
  assert.equal(data.categories.filter((c) => c.parentId === "food").length, 4);
  assert.ok(
    data.categories
      .filter((c) => c.id === "food" || c.parentId === "food")
      .every((c) => c.isFood),
  );
  assert.deepEqual(data.transactions, []);
  assert.deepEqual(data.accounts, []);
  assert.deepEqual(data.budgets, []);
  assert.equal(empty.categories.length, 0);
  assert.equal(ensureDefaultCategories(data), data);
});
test("repeat insertion preserves renamed, archived and custom categories and all financial records", () => {
  const data = ensureDefaultCategories(emptyFinanceData());
  const food = data.categories.find((c) => c.id === "food")!;
  food.name = "อาหารส่วนตัว";
  food.color = "#123456";
  food.archivedAt = "2026-10-30";
  food.order = 99;
  data.categories.push({
    id: "my-category",
    name: "งานอดิเรก",
    kind: "expense",
    isFood: false,
    icon: "ticket",
    color: "#456789",
    order: 100,
  });
  data.accounts.push({
    id: "personal",
    name: "ของฉัน",
    type: "cash",
    openingBalanceSatang: 12345,
  });
  const before = structuredClone(data);
  assert.equal(ensureDefaultCategories(data), data);
  assert.deepEqual(data, before);
});
test("reuse equivalent user category names and attach food children to its actual identifier", () => {
  const data = emptyFinanceData();
  data.categories.push({
    id: "user-food",
    name: "อาหารและเครื่องดื่ม",
    kind: "expense",
    isFood: true,
    icon: "coffee",
    color: "#123456",
    order: 0,
  });
  const result = financeSchema.parse(ensureDefaultCategories(data));
  assert.equal(
    result.categories.filter((c) => c.name === "อาหารและเครื่องดื่ม").length,
    1,
  );
  assert.equal(
    result.categories.find((c) => c.id === "meals")?.parentId,
    "user-food",
  );
  assert.equal(
    result.categories.find((c) => c.id === "meals")?.color,
    "#123456",
  );
  assert.equal(ensureDefaultCategories(result), result);
});
