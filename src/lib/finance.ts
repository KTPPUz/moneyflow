import type { FinanceData, MonthSummary, Transaction } from "@/types/finance";
import { monthLabel, shortMonth } from "./dates";
import { percentage, percentChange, sumSatang } from "./money";
export function rootCategory(
  data: Pick<FinanceData, "categories">,
  id: string,
) {
  const category = data.categories.find((c) => c.id === id);
  return category?.parentId
    ? data.categories.find((c) => c.id === category.parentId)
    : category;
}
export function expenseAmount(t: Transaction) {
  return t.kind === "expense"
    ? t.amountSatang
    : t.kind === "refund"
      ? -t.amountSatang
      : 0;
}
export function summarize(data: FinanceData, month: string): MonthSummary {
  const rows = data.transactions.filter((t) => t.date.startsWith(`${month}-`));
  const income = sumSatang(
    rows.filter((t) => t.kind === "income").map((t) => t.amountSatang),
  );
  const expense = sumSatang(rows.map(expenseAmount));
  const food = sumSatang(
    rows
      .filter((t) => {
        const c = data.categories.find((c) => c.id === t.categoryId);
        return c?.isFood || rootCategory(data, t.categoryId)?.isFood;
      })
      .map(expenseAmount),
  );
  const categories = data.categories
    .filter((c) => c.kind === "expense" && !c.parentId)
    .map((c) => ({
      ...c,
      amount: sumSatang(
        rows
          .filter((t) => rootCategory(data, t.categoryId)?.id === c.id)
          .map(expenseAmount),
      ),
    }))
    .filter((c) => c.amount !== 0);
  return {
    key: month,
    name: monthLabel(month),
    short: shortMonth(month),
    income,
    expense,
    balance: income - expense,
    food,
    categories,
  };
}
export function foodMetrics(
  data: FinanceData,
  month: string,
  previous: string,
) {
  const current = summarize(data, month),
    before = summarize(data, previous);
  const share = percentage(current.food, current.income),
    previousShare = percentage(before.food, before.income);
  return {
    amount: current.food,
    incomeShare: share,
    expenseShare: percentage(current.food, current.expense),
    mom: percentChange(current.food, before.food),
    amountChange: current.food - before.food,
    pp: share === null || previousShare === null ? null : share - previousShare,
    newSpending: before.food === 0 && current.food > 0,
  };
}
export function budgetState(used: number, budget: number) {
  const ratio = percentage(used, budget);
  return {
    ratio,
    remaining: Math.max(0, budget - used),
    over: Math.max(0, used - budget),
    status:
      ratio === null
        ? "unset"
        : ratio > 100
          ? "exceeded"
          : ratio === 100
            ? "reached"
            : ratio >= 80
              ? "warning"
              : "normal",
  };
}
export function accountBalance(data: FinanceData, accountId: string) {
  const opening =
    data.accounts.find((a) => a.id === accountId)?.openingBalanceSatang ?? 0;
  const movements = data.transactions
    .filter((t) => t.accountId === accountId)
    .map((t) => (t.kind === "expense" ? -t.amountSatang : t.amountSatang));
  const transfers = data.transfers
    .filter(
      (t) =>
        t.sourceAccountId === accountId || t.destinationAccountId === accountId,
    )
    .map((t) =>
      t.sourceAccountId === accountId ? -t.amountSatang : t.amountSatang,
    );
  return sumSatang([opening, ...movements, ...transfers]);
}
