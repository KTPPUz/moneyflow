import type { FinanceData } from "@/types/finance";
import type {
  PlanningData,
  PlanningAlert,
  SavingsGoal,
  BillReminder,
} from "@/types/planning";
import { dateLabel } from "./dates";
import { budgetState, monthlyBudget, summarize } from "./finance";
import { formatMoney, percentage, percentLabel, sumSatang } from "./money";

export function savingsProgress(
  goal: SavingsGoal,
  data: PlanningData,
  today: string,
) {
  const saved = sumSatang(
    data.contributions
      .filter((c) => c.goalId === goal.id && c.date <= today)
      .map((c) => c.amountSatang),
  );
  const remaining = Math.max(0, goal.targetSatang - saved);
  const [year, month] = today.split("-").map(Number);
  const [dueYear, dueMonth] = goal.dueDate.split("-").map(Number);
  // Include the current month; after the deadline the remaining amount is due now.
  const months = Math.max(1, (dueYear - year) * 12 + dueMonth - month + 1);
  const monthly = Number(
    (BigInt(remaining) + BigInt(months) - 1n) / BigInt(months),
  );
  return {
    saved,
    remaining,
    monthly,
    months,
    ratio: percentage(saved, goal.targetSatang)!,
    complete: remaining === 0,
    overdue: remaining > 0 && goal.dueDate < today,
  };
}
export function daysUntil(date: string, today: string) {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86400000,
  );
}
export function billTiming(bill: BillReminder, today: string) {
  const days = daysUntil(bill.dueDate, today);
  return {
    days,
    label: bill.paidDate
      ? "ชำระแล้ว"
      : days < 0
        ? `เลยกำหนด ${-days} วัน`
        : days === 0
          ? "ครบกำหนดวันนี้"
          : `อีก ${days} วัน`,
    needsAlert: !bill.paidDate && days <= bill.remindDays,
  };
}
export function planningAlerts(
  finance: FinanceData,
  planning: PlanningData,
  today: string,
): PlanningAlert[] {
  const month = today.slice(0, 7);
  const summary = summarize(finance, month);
  const alerts: PlanningAlert[] = [];
  function addBudget(scope: string, name: string, used: number, limit: number) {
    const state = budgetState(used, limit);
    if (state.ratio === null || state.ratio < 80) return;
    const level =
      state.ratio > 100
        ? "exceeded"
        : state.ratio === 100
          ? "reached"
          : "warning";
    alerts.push({
      id: `budget:${month}:${scope}:${level}`,
      title: `${name}${level === "exceeded" ? "เกินงบแล้ว" : level === "reached" ? "ใช้ครบงบแล้ว" : "ใกล้เต็มงบ"}`,
      description: `${percentLabel(state.ratio)} · ใช้ ${formatMoney(used)} จาก ${formatMoney(limit)}${state.over ? ` · เกิน ${formatMoney(state.over)}` : ` · เหลือ ${formatMoney(state.remaining)}`}`,
      href: "/budgets",
      severity: level === "warning" ? "warning" : "danger",
      kind: "budget",
    });
  }
  const overall = monthlyBudget(summary);
  addBudget("overall", "งบรวมเดือนนี้", summary.expense, overall.amountSatang);
  if (overall.amountSatang === 0 && summary.expense > 0)
    alerts.push({
      id: `budget:${month}:overall:no-income`,
      title: "เดือนนี้มีรายจ่าย แต่ยังไม่มีรายรับ",
      description: `รายจ่าย ${formatMoney(summary.expense)} · งบรวมคำนวณจากรายรับที่บันทึกในเดือนนี้`,
      href: "/budgets",
      severity: "danger",
      kind: "budget",
    });
  for (const budget of finance.budgets.filter(
    (b) => b.month === month && b.categoryId,
  )) {
    const category = finance.categories.find((c) => c.id === budget.categoryId);
    if (category)
      addBudget(
        category.id,
        category.name,
        summary.categories.find((c) => c.id === category.id)?.amount ?? 0,
        budget.amountSatang,
      );
  }
  for (const bill of [...planning.bills].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  )) {
    const timing = billTiming(bill, today);
    if (!timing.needsAlert) continue;
    const stage =
      timing.days < 0 ? "overdue" : timing.days === 0 ? "today" : "upcoming";
    alerts.push({
      id: `bill:${bill.id}:${bill.dueDate}:${bill.amountSatang}:${stage}`,
      title: `${bill.name} · ${timing.label}`,
      description: `${formatMoney(bill.amountSatang)} · กำหนด ${dateLabel(bill.dueDate)}`,
      href: "/reminders",
      severity: timing.days <= 0 ? "danger" : "warning",
      kind: "bill",
    });
  }
  return alerts.sort(
    (a, b) => Number(b.severity === "danger") - Number(a.severity === "danger"),
  );
}
