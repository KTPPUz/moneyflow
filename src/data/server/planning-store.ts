import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { decimalToSatang, satangToDecimal } from "@/lib/money";
import {
  emptyPlanningData,
  type PlanningData,
  type PlanningSnapshot,
  type SavingsGoal,
  type GoalContribution,
  type BillReminder,
} from "@/types/planning";
type Tx = Prisma.TransactionClient;
const OPTIONS = { maxWait: 5000, timeout: 20000 };
type Database = {
  $transaction<T>(
    work: (tx: Tx) => Promise<T>,
    options: typeof OPTIONS,
  ): Promise<T>;
};
export class PlanningConflictError extends Error {}
const toDate = (value: string) => new Date(`${value}T00:00:00Z`);
const fromDate = (value: Date) => value.toISOString().slice(0, 10);
async function load(
  tx: Tx,
  userId: string,
  readAlertIds: Prisma.JsonValue,
): Promise<PlanningData> {
  const where = { userId };
  const [goals, contributions, bills] = await Promise.all([
    tx.savingsGoal.findMany({ where, orderBy: { dueDate: "asc" } }),
    tx.goalContribution.findMany({
      where,
      orderBy: { contributionDate: "desc" },
    }),
    tx.billReminder.findMany({ where, orderBy: { dueDate: "asc" } }),
  ]);
  return {
    goals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetSatang: decimalToSatang(g.target),
      dueDate: fromDate(g.dueDate),
    })),
    contributions: contributions.map((c) => ({
      id: c.id,
      goalId: c.goalId,
      amountSatang: decimalToSatang(c.amount),
      date: fromDate(c.contributionDate),
      note: c.note,
    })),
    bills: bills.map((b) => ({
      id: b.id,
      name: b.name,
      amountSatang: decimalToSatang(b.amount),
      dueDate: fromDate(b.dueDate),
      remindDays: b.remindDays,
      ...(b.paidDate ? { paidDate: fromDate(b.paidDate) } : {}),
    })),
    readAlertIds: Array.isArray(readAlertIds)
      ? readAlertIds.filter((id): id is string => typeof id === "string")
      : [],
  };
}
export async function readPlanning(
  userId: string,
  database: Database = prisma,
): Promise<PlanningSnapshot> {
  return database.$transaction(async (tx) => {
    const state = await tx.planningState.findUnique({ where: { userId } });
    return state
      ? {
          data: await load(tx, userId, state.readAlertIds),
          revision: state.revision,
        }
      : { data: emptyPlanningData(), revision: 0 };
  }, OPTIONS);
}
function changes<T extends { id: string }>(current: T[], next: T[]) {
  const canon = (row: T) => JSON.stringify(row, Object.keys(row).sort());
  const before = new Map(current.map((row) => [row.id, canon(row)]));
  const ids = new Set(next.map((row) => row.id));
  return {
    upserts: next.filter((row) => before.get(row.id) !== canon(row)),
    deleted: current.filter((row) => !ids.has(row.id)).map((row) => row.id),
  };
}
const goalRow = (g: SavingsGoal) => ({
  name: g.name,
  target: satangToDecimal(g.targetSatang),
  dueDate: toDate(g.dueDate),
});
const contributionRow = (c: GoalContribution) => ({
  goalId: c.goalId,
  amount: satangToDecimal(c.amountSatang),
  contributionDate: toDate(c.date),
  note: c.note,
});
const billRow = (b: BillReminder) => ({
  name: b.name,
  amount: satangToDecimal(b.amountSatang),
  dueDate: toDate(b.dueDate),
  remindDays: b.remindDays,
  paidDate: b.paidDate ? toDate(b.paidDate) : null,
});
export async function savePlanning(
  userId: string,
  data: PlanningData,
  revision: number,
  database: Database = prisma,
): Promise<PlanningSnapshot> {
  try {
    return await database.$transaction(async (tx) => {
      await tx.planningState.upsert({
        where: { userId },
        create: { userId, revision: 0, readAlertIds: [] },
        update: {},
      });
      const claimed = await tx.planningState.updateMany({
        where: { userId, revision },
        data: { revision: { increment: 1 }, readAlertIds: data.readAlertIds },
      });
      if (claimed.count !== 1)
        throw new PlanningConflictError(
          "ข้อมูลแผนถูกแก้ไขจากอุปกรณ์อื่น กรุณาลองอีกครั้ง",
        );
      const current = await load(tx, userId, []);
      const goals = changes(current.goals, data.goals);
      const contributions = changes(current.contributions, data.contributions);
      const bills = changes(current.bills, data.bills);
      const key = (id: string) => ({ userId_id: { userId, id } });
      for (const g of goals.upserts)
        await tx.savingsGoal.upsert({
          where: key(g.id),
          create: { userId, id: g.id, ...goalRow(g) },
          update: goalRow(g),
        });
      for (const c of contributions.upserts)
        await tx.goalContribution.upsert({
          where: key(c.id),
          create: { userId, id: c.id, ...contributionRow(c) },
          update: contributionRow(c),
        });
      for (const b of bills.upserts)
        await tx.billReminder.upsert({
          where: key(b.id),
          create: { userId, id: b.id, ...billRow(b) },
          update: billRow(b),
        });
      if (contributions.deleted.length)
        await tx.goalContribution.deleteMany({
          where: { userId, id: { in: contributions.deleted } },
        });
      if (goals.deleted.length)
        await tx.savingsGoal.deleteMany({
          where: { userId, id: { in: goals.deleted } },
        });
      if (bills.deleted.length)
        await tx.billReminder.deleteMany({
          where: { userId, id: { in: bills.deleted } },
        });
      return {
        data: await load(tx, userId, data.readAlertIds),
        revision: revision + 1,
      };
    }, OPTIONS);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new PlanningConflictError(
        "ข้อมูลแผนถูกแก้ไขจากอุปกรณ์อื่น กรุณาลองอีกครั้ง",
      );
    throw error;
  }
}
// Called inside the existing finance reset transaction, so resets stay atomic.
export async function clearPlanning(tx: Tx, userId: string) {
  await tx.planningState.upsert({
    where: { userId },
    create: { userId, revision: 1, readAlertIds: [] },
    update: { revision: { increment: 1 }, readAlertIds: [] },
  });
  await tx.savingsGoal.deleteMany({ where: { userId } });
  await tx.billReminder.deleteMany({ where: { userId } });
}
