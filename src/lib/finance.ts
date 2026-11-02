import type { FinanceData, MonthSummary, Transaction } from "@/types/finance";
import { dateLabel, monthLabel, monthsEnding, shortMonth } from "./dates";
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
// Newest first: by date, then by the time the row was recorded.
export function compareNewest(a: Transaction, b: Transaction) {
  return (
    b.date.localeCompare(a.date) ||
    (b.createdAt ?? "").localeCompare(a.createdAt ?? "") ||
    b.id.localeCompare(a.id)
  );
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
// Daily spending uses the month's income as its percentage base, including
// days without income. A salary paid once a month still funds every day.
export function dailyFoodTimeline(data: FinanceData, from: string, to: string) {
  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(from) ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(to)
  )
    return [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const count = (ty - fy) * 12 + tm - fm + 1;
  if (count <= 0 || count > 36) return [];
  const foodCategoryIds = new Set(
    data.categories
      .filter((c) => c.isFood || rootCategory(data, c.id)?.isFood)
      .map((c) => c.id),
  );
  const byDate = new Map<string, number[]>();
  for (const t of data.transactions) {
    if (!foodCategoryIds.has(t.categoryId)) continue;
    const amounts = byDate.get(t.date) ?? [];
    amounts.push(expenseAmount(t));
    byDate.set(t.date, amounts);
  }
  return monthsEnding(to, count).flatMap((month) => {
    const { income } = summarize(data, month);
    const [year, monthNumber] = month.split("-").map(Number);
    const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    return Array.from({ length: days }, (_, i) => {
      const key = `${month}-${String(i + 1).padStart(2, "0")}`;
      return {
        key,
        name: dateLabel(key),
        short: `${i + 1}/${monthNumber}`,
        income,
        food: sumSatang(byDate.get(key) ?? []),
      };
    });
  });
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
// The monthly limit has one source: recorded income, never a saved overall budget.
export function monthlyBudget(
  summary: Pick<MonthSummary, "income" | "expense">,
) {
  const state = budgetState(summary.expense, summary.income);
  return {
    ...state,
    amountSatang: summary.income,
    status: summary.income === 0 && state.over > 0 ? "exceeded" : state.status,
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
