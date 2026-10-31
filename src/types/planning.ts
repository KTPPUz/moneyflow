export type SavingsGoal = {
  id: string;
  name: string;
  targetSatang: number;
  dueDate: string;
};
export type GoalContribution = {
  id: string;
  goalId: string;
  amountSatang: number;
  date: string;
  note: string;
};
export type BillReminder = {
  id: string;
  name: string;
  amountSatang: number;
  dueDate: string;
  remindDays: number;
  paidDate?: string;
};
export type PlanningData = {
  goals: SavingsGoal[];
  contributions: GoalContribution[];
  bills: BillReminder[];
  readAlertIds: string[];
};
export type PlanningSnapshot = { data: PlanningData; revision: number };
export const emptyPlanningData = (): PlanningData => ({
  goals: [],
  contributions: [],
  bills: [],
  readAlertIds: [],
});
export type PlanningAlert = {
  id: string;
  title: string;
  description: string;
  href: string;
  severity: "warning" | "danger";
  kind: "budget" | "bill";
};
