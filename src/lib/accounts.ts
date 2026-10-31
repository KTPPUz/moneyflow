import type { Account, FinanceData } from "@/types/finance";
import { MAX_AMOUNT, parseMoney, sumSatang } from "./money";
import { expenseAmount } from "./finance";

export function paymentSummary(data: FinanceData) {
  const income = sumSatang(
    data.transactions
      .filter((t) => t.kind === "income")
      .map((t) => t.amountSatang),
  );
  const expense = sumSatang(data.transactions.map(expenseAmount));
  const opening = sumSatang(data.accounts.map((a) => a.openingBalanceSatang));
  return {
    income,
    expense,
    opening,
    balance: sumSatang([opening, income, -expense]),
  };
}
export function paymentChannel(data: FinanceData, accountId: string) {
  const rows = data.transactions.filter(
    (t) => t.accountId === accountId && t.kind !== "income",
  );
  return { expense: sumSatang(rows.map(expenseAmount)), count: rows.length };
}

export function parseOpeningBalance(value: string) {
  const input = value.trim();
  if (/^-?0+(\.0{1,2})?$/.test(input)) return 0;
  return input.startsWith("-")
    ? -parseMoney(input.slice(1))
    : parseMoney(input);
}

export function saveAccount(
  data: FinanceData,
  account: Account,
  editing: boolean,
): FinanceData {
  const next = { ...account, name: account.name.trim() };
  if (!next.name || next.name.length > 60)
    throw new Error("กรอกชื่อบัญชี 1–60 ตัวอักษร");
  if (editing && !data.accounts.some((a) => a.id === next.id))
    throw new Error("บัญชีนี้ถูกลบจากอุปกรณ์อื่นแล้ว กรุณาโหลดข้อมูลใหม่");
  if (
    data.accounts.some(
      (a) =>
        a.id !== next.id &&
        a.name.trim().toLowerCase() === next.name.toLowerCase(),
    )
  )
    throw new Error("มีชื่อบัญชีนี้แล้ว กรุณาใช้ชื่ออื่น");
  return {
    ...data,
    accounts: editing
      ? data.accounts.map((a) => (a.id === next.id ? next : a))
      : [...data.accounts, next],
  };
}

export function accountUsage(data: FinanceData, id: string) {
  const transactions = data.transactions.filter(
    (t) => t.accountId === id,
  ).length;
  const transfers = data.transfers.filter(
    (t) => t.sourceAccountId === id || t.destinationAccountId === id,
  ).length;
  return { transactions, transfers, referenced: transactions + transfers > 0 };
}

export function canReceiveAccount(
  data: FinanceData,
  sourceId: string,
  targetId: string,
) {
  return (
    sourceId !== targetId &&
    data.accounts.some((a) => a.id === targetId) &&
    !data.transfers.some(
      (t) =>
        (t.sourceAccountId === sourceId &&
          t.destinationAccountId === targetId) ||
        (t.destinationAccountId === sourceId && t.sourceAccountId === targetId),
    )
  );
}

// Reassign references before deletion; neither financial amounts nor refund links change.
export function removeAccount(
  data: FinanceData,
  sourceId: string,
  targetId = "",
): FinanceData {
  const source = data.accounts.find((a) => a.id === sourceId);
  if (!source) throw new Error("บัญชีนี้ถูกลบแล้ว กรุณาโหลดข้อมูลใหม่");
  if (!targetId) {
    if (accountUsage(data, sourceId).referenced)
      throw new Error("บัญชีนี้มีรายการใช้งาน กรุณาเลือกบัญชีรับย้ายก่อนลบ");
    return {
      ...data,
      accounts: data.accounts.filter((a) => a.id !== sourceId),
    };
  }
  if (!canReceiveAccount(data, sourceId, targetId))
    throw new Error(
      "บัญชีรับย้ายไม่ถูกต้อง หรือมีรายการโอนกับบัญชีที่จะลบ กรุณาเลือกบัญชีอื่น",
    );
  const target = data.accounts.find((a) => a.id === targetId)!;
  const openingBalanceSatang = sumSatang([
    target.openingBalanceSatang,
    source.openingBalanceSatang,
  ]);
  if (Math.abs(openingBalanceSatang) > MAX_AMOUNT)
    throw new Error("ยอดยกมารวมเกินขอบเขตของบัญชี กรุณาเลือกบัญชีอื่น");
  return {
    ...data,
    accounts: data.accounts
      .filter((a) => a.id !== sourceId)
      .map((a) => (a.id === targetId ? { ...a, openingBalanceSatang } : a)),
    transactions: data.transactions.map((t) =>
      t.accountId === sourceId ? { ...t, accountId: targetId } : t,
    ),
    transfers: data.transfers.map((t) => ({
      ...t,
      sourceAccountId:
        t.sourceAccountId === sourceId ? targetId : t.sourceAccountId,
      destinationAccountId:
        t.destinationAccountId === sourceId ? targetId : t.destinationAccountId,
    })),
  };
}
