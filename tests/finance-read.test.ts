import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../src/generated/prisma/client";
// No network/database writes: every Prisma operation used by readFinance is mocked.
test("existing finance reads use one scoped state query inside the data snapshot", async () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "mysql://stub:placeholder@127.0.0.1:9/unused";
  try {
    const { readFinance } = await import("../src/data/server/finance-store");
    let stateReads = 0;
    const tables: string[] = [];
    const scoped =
      (table: string) =>
      async ({ where }: { where: { userId: string } }) => {
        assert.equal(where.userId, "user-a");
        tables.push(table);
        return [];
      };
    const tx = {
      financeState: {
        findUnique: async ({ where }: { where: { userId: string } }) => {
          assert.equal(where.userId, "user-a");
          stateReads++;
          return { revision: 7, userId: "user-a" };
        },
      },
      financeAccount: { findMany: scoped("accounts") },
      category: { findMany: scoped("categories") },
      transaction: { findMany: scoped("transactions") },
      budget: { findMany: scoped("budgets") },
      transfer: { findMany: scoped("transfers") },
    };
    const result = await readFinance("user-a", {
      $transaction: async (work) =>
        work(tx as unknown as Prisma.TransactionClient),
    });
    assert.equal(result.revision, 7);
    assert.deepEqual(result.data.transactions, []);
    assert.equal(stateReads, 1);
    assert.deepEqual(tables.sort(), [
      "accounts",
      "budgets",
      "categories",
      "transactions",
      "transfers",
    ]);
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});
