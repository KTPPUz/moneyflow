import type { FinanceData } from "@/types/finance";
export function emptyFinanceData(): FinanceData {
  return {
    version: 2,
    transactions: [],
    categories: [],
    accounts: [],
    budgets: [],
    transfers: [],
  };
}
