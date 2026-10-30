import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { decimalToSatang, satangToDecimal } from "@/lib/money";
import { ensureDefaultCategories } from "@/data/local/default-categories";
import { emptyFinanceData } from "@/data/local/initial-data";
import type {
  Account,
  Budget,
  Category,
  FinanceData,
  Transaction,
  TransactionKind,
  Transfer,
} from "@/types/finance";
export class RevisionConflictError extends Error {}
export class ColumnLimitError extends Error {}
export type StoredFinance = { data: FinanceData; revision: number };
type Tx = Prisma.TransactionClient;
const TX_OPTIONS = { maxWait: 5000, timeout: 20000 };
const toDate = (date: string) => new Date(`${date}T00:00:00.000Z`);
const fromDate = (date: Date) => date.toISOString().slice(0, 10);
async function load(tx: Tx, userId: string): Promise<FinanceData> {
  const where = { userId };
  const [accounts, categories, transactions, budgets, transfers] =
    await Promise.all([
      tx.financeAccount.findMany({ where, orderBy: { position: "asc" } }),
      tx.category.findMany({ where, orderBy: { sortOrder: "asc" } }),
      tx.transaction.findMany({
        where,
        orderBy: { transactionDate: "desc" },
      }),
      tx.budget.findMany({ where }),
      tx.transfer.findMany({ where }),
    ]);
  return {
    version: 2,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type as Account["type"],
      openingBalanceSatang: decimalToSatang(a.openingBalance),
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind as Category["kind"],
      isFood: c.isFood,
      icon: c.icon,
      color: c.color,
      ...(c.parentId ? { parentId: c.parentId } : {}),
      ...(c.archivedAt ? { archivedAt: c.archivedAt } : {}),
      order: c.sortOrder,
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      kind: t.kind as TransactionKind,
      amountSatang: decimalToSatang(t.amount),
      date: fromDate(t.transactionDate),
      categoryId: t.categoryId,
      accountId: t.accountId,
      description: t.description,
      ...(t.notes !== null ? { notes: t.notes } : {}),
      ...(t.tags !== null ? { tags: t.tags as string[] } : {}),
      ...(t.refundOf ? { refundOf: t.refundOf } : {}),
    })),
    budgets: budgets.map((b) => ({
      id: b.id,
      month: b.month,
      categoryId: b.categoryId,
      amountSatang: decimalToSatang(b.amount),
    })),
    transfers: transfers.map((t) => ({
      id: t.id,
      sourceAccountId: t.sourceAccountId,
      destinationAccountId: t.destinationAccountId,
      amountSatang: decimalToSatang(t.amount),
      date: fromDate(t.transferDate),
    })),
  };
}
type PositionedAccount = Account & { position: number };
const positioned = (accounts: Account[]): PositionedAccount[] =>
  accounts.map((a, position) => ({ ...a, position }));
const accountRow = (a: PositionedAccount) => ({
  position: a.position,
  name: a.name,
  type: a.type,
  openingBalance: satangToDecimal(a.openingBalanceSatang),
});
// Nullable columns are always explicit so an update can clear a removed value.
const categoryRow = (c: Category) => ({
  name: c.name,
  kind: c.kind,
  isFood: c.isFood,
  icon: c.icon,
  color: c.color,
  parentId: c.parentId ?? null,
  archivedAt: c.archivedAt ?? null,
  sortOrder: c.order,
});
const transactionRow = (t: Transaction) => ({
  kind: t.kind,
  amount: satangToDecimal(t.amountSatang),
  transactionDate: toDate(t.date),
  categoryId: t.categoryId,
  accountId: t.accountId,
  description: t.description,
  notes: t.notes ?? null,
  tags: t.tags ?? Prisma.DbNull,
  refundOf: t.refundOf ?? null,
});
const budgetRow = (b: Budget) => ({
  month: b.month,
  categoryId: b.categoryId,
  scopeKey: b.categoryId ?? "",
  amount: satangToDecimal(b.amountSatang),
});
const transferRow = (t: Transfer) => ({
  sourceAccountId: t.sourceAccountId,
  destinationAccountId: t.destinationAccountId,
  amount: satangToDecimal(t.amountSatang),
  transferDate: toDate(t.date),
});
const canon = (value: object) =>
  JSON.stringify(value, Object.keys(value).sort());
function diff<T extends { id: string }>(current: T[], next: T[]) {
  const before = new Map(current.map((row) => [row.id, canon(row)]));
  const after = new Set(next.map((row) => row.id));
  return {
    created: next.filter((row) => !before.has(row.id)),
    updated: next.filter(
      (row) => before.has(row.id) && before.get(row.id) !== canon(row),
    ),
    deleted: current.filter((row) => !after.has(row.id)).map((row) => row.id),
  };
}
// Writes only what changed. References can move away from a row being deleted
// in the same save, so upserts run parents-first and deletes run children-first.
async function persist(
  tx: Tx,
  userId: string,
  current: FinanceData,
  next: FinanceData,
) {
  const key = (id: string) => ({ userId_id: { userId, id } });
  const isRoot = (c: Category) => !c.parentId;
  const isRefund = (t: Transaction) => t.kind === "refund";
  const accounts = diff(
    positioned(current.accounts),
    positioned(next.accounts),
  );
  const categories = diff(current.categories, next.categories);
  const transactions = diff(current.transactions, next.transactions);
  const budgets = diff(current.budgets, next.budgets);
  const transfers = diff(current.transfers, next.transfers);
  // Budgets go first: a replacement may reuse the month and category of a deleted row.
  if (budgets.deleted.length)
    await tx.budget.deleteMany({
      where: { userId, id: { in: budgets.deleted } },
    });
  if (accounts.created.length)
    await tx.financeAccount.createMany({
      data: accounts.created.map((a) => ({
        userId,
        id: a.id,
        ...accountRow(a),
      })),
    });
  for (const a of accounts.updated)
    await tx.financeAccount.update({ where: key(a.id), data: accountRow(a) });
  for (const group of [isRoot, (c: Category) => !isRoot(c)]) {
    const created = categories.created.filter(group);
    if (created.length)
      await tx.category.createMany({
        data: created.map((c) => ({ userId, id: c.id, ...categoryRow(c) })),
      });
    for (const c of categories.updated.filter(group))
      await tx.category.update({
        where: key(c.id),
        data: categoryRow(c),
      });
  }
  for (const group of [(t: Transaction) => !isRefund(t), isRefund]) {
    const created = transactions.created.filter(group);
    if (created.length)
      await tx.transaction.createMany({
        data: created.map((t) => ({ userId, id: t.id, ...transactionRow(t) })),
      });
    for (const t of transactions.updated.filter(group))
      await tx.transaction.update({
        where: key(t.id),
        data: transactionRow(t),
      });
  }
  if (budgets.created.length)
    await tx.budget.createMany({
      data: budgets.created.map((b) => ({
        userId,
        id: b.id,
        ...budgetRow(b),
      })),
    });
  for (const b of budgets.updated)
    await tx.budget.update({ where: key(b.id), data: budgetRow(b) });
  if (transfers.created.length)
    await tx.transfer.createMany({
      data: transfers.created.map((t) => ({
        userId,
        id: t.id,
        ...transferRow(t),
      })),
    });
  for (const t of transfers.updated)
    await tx.transfer.update({ where: key(t.id), data: transferRow(t) });
  if (transfers.deleted.length)
    await tx.transfer.deleteMany({
      where: { userId, id: { in: transfers.deleted } },
    });
  const removed = new Set(transactions.deleted);
  const refundIds = current.transactions
    .filter((t) => removed.has(t.id) && isRefund(t))
    .map((t) => t.id);
  if (refundIds.length)
    await tx.transaction.deleteMany({
      where: { userId, id: { in: refundIds } },
    });
  if (transactions.deleted.length)
    await tx.transaction.deleteMany({
      where: { userId, id: { in: transactions.deleted } },
    });
  const removedCategories = new Set(categories.deleted);
  const childIds = current.categories
    .filter((c) => removedCategories.has(c.id) && !isRoot(c))
    .map((c) => c.id);
  if (childIds.length)
    await tx.category.deleteMany({ where: { userId, id: { in: childIds } } });
  if (categories.deleted.length)
    await tx.category.deleteMany({
      where: { userId, id: { in: categories.deleted } },
    });
  if (accounts.deleted.length)
    await tx.financeAccount.deleteMany({
      where: { userId, id: { in: accounts.deleted } },
    });
}
// The shared client schema has no length caps on some fields; the columns do.
export function assertColumnLimits(data: FinanceData) {
  const ids = [
    data.accounts,
    data.categories,
    data.transactions,
    data.budgets,
    data.transfers,
  ].flat();
  if (
    ids.some((row) => row.id.length > 64) ||
    data.accounts.some((a) => a.name.length > 120) ||
    data.categories.some(
      (c) => c.icon.length > 64 || (c.archivedAt?.length ?? 0) > 40,
    )
  )
    throw new ColumnLimitError("ข้อมูลบางช่องยาวเกินกว่าที่บันทึกได้");
}
export async function readFinance(userId: string): Promise<StoredFinance> {
  const state = await prisma.financeState.findUnique({ where: { userId } });
  if (!state) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.financeState.create({ data: { userId } });
        const data = ensureDefaultCategories(emptyFinanceData());
        await persist(tx, userId, emptyFinanceData(), data);
        return { data: await load(tx, userId), revision: 0 };
      }, TX_OPTIONS);
    } catch (error) {
      // A parallel first request created the state; fall through to reading it.
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      )
        throw error;
    }
  }
  return prisma.$transaction(async (tx) => {
    const current = await tx.financeState.findUniqueOrThrow({
      where: { userId },
    });
    return { data: await load(tx, userId), revision: current.revision };
  }, TX_OPTIONS);
}
export async function saveFinance(
  userId: string,
  data: FinanceData,
  revision: number,
): Promise<StoredFinance> {
  assertColumnLimits(data);
  return prisma.$transaction(async (tx) => {
    // The conditional update also locks the row, serializing saves per user.
    const claimed = await tx.financeState.updateMany({
      where: { userId, revision },
      data: { revision: { increment: 1 } },
    });
    if (claimed.count !== 1) throw new RevisionConflictError();
    await persist(tx, userId, await load(tx, userId), data);
    return { data: await load(tx, userId), revision: revision + 1 };
  }, TX_OPTIONS);
}
export async function resetFinance(userId: string): Promise<StoredFinance> {
  await readFinance(userId);
  return prisma.$transaction(async (tx) => {
    const state = await tx.financeState.update({
      where: { userId },
      data: { revision: { increment: 1 } },
    });
    await persist(
      tx,
      userId,
      await load(tx, userId),
      ensureDefaultCategories(emptyFinanceData()),
    );
    return { data: await load(tx, userId), revision: state.revision };
  }, TX_OPTIONS);
}
