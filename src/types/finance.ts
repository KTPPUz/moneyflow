export type TransactionKind = "income" | "expense" | "refund";
export type Category = {
  id: string;
  name: string;
  kind: "income" | "expense";
  isFood: boolean;
  icon: string;
  color: string;
  parentId?: string;
  archivedAt?: string;
  order: number;
};
export type Account = {
  id: string;
  name: string;
  type: "cash" | "bank" | "ewallet" | "credit";
  openingBalanceSatang: number;
};
export type Transaction = {
  id: string;
  kind: TransactionKind;
  amountSatang: number;
  date: string;
  categoryId: string;
  accountId: string;
  description: string;
  notes?: string;
  tags?: string[];
  refundOf?: string;
  createdAt?: string;
  receiptId?: string;
};
export type Transfer = {
  id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amountSatang: number;
  date: string;
};
export type Budget = {
  id: string;
  month: string;
  categoryId: string | null;
  amountSatang: number;
};
export type FinanceData = {
  version: 2;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  budgets: Budget[];
  transfers: Transfer[];
};
export type CategoryTotal = Category & { amount: number };
export type MonthSummary = {
  key: string;
  name: string;
  short: string;
  income: number;
  expense: number;
  balance: number;
  food: number;
  categories: CategoryTotal[];
};
