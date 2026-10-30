import type { FinanceData, Transaction } from "@/types/finance";
import { createSeed } from "../legacy-seed";
import { localDate } from "@/lib/dates";
const generatedId =
  /^(\d{4}-(?:0[1-9]|1[0-2]))-(?:salary|meal-[1-8]|coffee-[1-4]|delivery|groceries|home|travel|shopping|health|fun|education|other)$/;
function signature(t: Transaction) {
  return JSON.stringify([
    t.kind,
    t.amountSatang,
    t.date,
    t.categoryId,
    t.accountId,
    t.description,
    t.notes ?? "",
    t.tags ?? [],
  ]);
}
// Remove only identifiable, unchanged generated records. Keep user-created and edited data.
export function migrateLegacyData(legacy: FinanceData): FinanceData {
  const anchor =
    legacy.transactions
      .map((t) => t.id.match(generatedId)?.[1])
      .filter((m): m is string => !!m)
      .sort()
      .at(-1) ?? localDate().slice(0, 7);
  const [year, month] = anchor.split("-").map(Number);
  const days = new Date(year, month, 0).getDate();
  const variants = Array.from({ length: days }, (_, i) =>
    createSeed(`${anchor}-${String(i + 1).padStart(2, "0")}`),
  );
  const signatures = new Map<string, Set<string>>();
  for (const fixture of variants)
    for (const t of fixture.transactions) {
      const values = signatures.get(t.id) ?? new Set<string>();
      values.add(signature(t));
      signatures.set(t.id, values);
    }
  const baseline = variants[days - 1];
  const transactions = legacy.transactions.filter(
    (t) => !signatures.get(t.id)?.has(signature(t)),
  );
  // Keep original expenses needed by user-entered refund records.
  for (const refund of [...transactions].filter((t) => t.kind === "refund")) {
    const original = legacy.transactions.find((t) => t.id === refund.refundOf);
    if (original && !transactions.some((t) => t.id === original.id))
      transactions.push(original);
  }
  const budgets = legacy.budgets.filter(
    (b) =>
      !baseline.budgets.some(
        (original) =>
          original.id === b.id &&
          original.month === b.month &&
          original.categoryId === b.categoryId &&
          original.amountSatang === b.amountSatang,
      ),
  );
  const keepCategory = new Set([
    ...transactions.map((t) => t.categoryId),
    ...budgets.map((b) => b.categoryId).filter((id): id is string => !!id),
  ]);
  for (const c of legacy.categories) {
    const original = baseline.categories.find((o) => o.id === c.id);
    const fields = (value: typeof c) =>
      JSON.stringify([
        value.id,
        value.name,
        value.kind,
        value.isFood,
        value.icon,
        value.color,
        value.parentId ?? null,
        value.archivedAt ?? null,
        value.order,
      ]);
    if (!original || fields(c) !== fields(original)) keepCategory.add(c.id);
  }
  for (const c of legacy.categories)
    if (keepCategory.has(c.id) && c.parentId) keepCategory.add(c.parentId);
  const keepAccount = new Set([
    ...transactions.map((t) => t.accountId),
    ...legacy.transfers.flatMap((t) => [
      t.sourceAccountId,
      t.destinationAccountId,
    ]),
  ]);
  const isGeneratedAccount = (account: FinanceData["accounts"][number]) =>
    baseline.accounts.some(
      (original) =>
        original.id === account.id &&
        original.name === account.name &&
        original.type === account.type &&
        (original.openingBalanceSatang === account.openingBalanceSatang ||
          (account.id === "cash" && account.openingBalanceSatang === 1000000)),
    );
  const accounts = legacy.accounts
    .filter((a) => keepAccount.has(a.id) || !isGeneratedAccount(a))
    .map((a) =>
      isGeneratedAccount(a) ? { ...a, openingBalanceSatang: 0 } : a,
    );
  return {
    ...legacy,
    transactions,
    budgets,
    accounts,
    categories: legacy.categories.filter((c) => keepCategory.has(c.id)),
  };
}
