import { z } from "zod";
import { validDate } from "./dates";
import { MAX_AMOUNT, parseMoney } from "./money";
const amount = z.number().int().positive().max(MAX_AMOUNT);
export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  kind: z.enum(["income", "expense"]),
  isFood: z.boolean(),
  icon: z.string(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  parentId: z.string().optional(),
  archivedAt: z.string().optional(),
  order: z.number().int(),
});
export const transactionSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["income", "expense", "refund"]),
  amountSatang: amount,
  date: z.string().refine(validDate, "วันที่ไม่ถูกต้อง"),
  categoryId: z.string().min(1),
  accountId: z.string().min(1),
  description: z.string().max(200),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(40)).max(10).optional(),
  refundOf: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  receiptId: z.string().uuid().optional(),
});
export const financeSchema = z
  .object({
    version: z.literal(2),
    categories: z.array(categorySchema),
    transactions: z.array(transactionSchema),
    accounts: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(["cash", "bank", "ewallet", "credit"]),
        openingBalanceSatang: z.number().int().min(-MAX_AMOUNT).max(MAX_AMOUNT),
      }),
    ),
    budgets: z.array(
      z.object({
        id: z.string(),
        month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
        categoryId: z.string().nullable(),
        amountSatang: amount,
      }),
    ),
    transfers: z.array(
      z.object({
        id: z.string(),
        sourceAccountId: z.string(),
        destinationAccountId: z.string(),
        date: z.string().refine(validDate),
        amountSatang: amount,
      }),
    ),
  })
  .superRefine((data, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    for (const rows of [
      data.transactions,
      data.categories,
      data.accounts,
      data.budgets,
      data.transfers,
    ])
      if (new Set(rows.map((r) => r.id)).size !== rows.length)
        fail("ข้อมูลมีรหัสซ้ำ");
    // A conservative aggregate cap guarantees every client-side money sum stays exact.
    const exposure = [
      ...data.transactions.map((t) => t.amountSatang),
      ...data.transfers.map((t) => t.amountSatang),
      ...data.accounts.map((a) => Math.abs(a.openingBalanceSatang)),
    ].reduce((total, amount) => total + BigInt(amount), 0n);
    if (exposure > BigInt(Number.MAX_SAFE_INTEGER))
      fail("ยอดรวมข้อมูลเกินขอบเขตจำนวนเต็มที่ปลอดภัย");
    const keys = data.budgets.map((b) => `${b.month}-${b.categoryId}`);
    if (new Set(keys).size !== keys.length) fail("งบประมาณเดือนและหมวดซ้ำกัน");
    for (const c of data.categories) {
      if (c.parentId) {
        const parent = data.categories.find((p) => p.id === c.parentId);
        if (
          !parent ||
          parent.parentId ||
          parent.id === c.id ||
          parent.kind !== c.kind ||
          parent.isFood !== c.isFood
        )
          fail("หมวดหมู่ย่อยไม่สอดคล้องกับหมวดหลัก");
      }
    }
    for (const t of data.transactions) {
      const category = data.categories.find((c) => c.id === t.categoryId);
      if (
        !category ||
        category.kind !== (t.kind === "income" ? "income" : "expense") ||
        !data.accounts.some((a) => a.id === t.accountId)
      )
        fail("รายการอ้างอิงหมวดหรือบัญชีไม่ถูกต้อง");
      if (t.kind === "refund") {
        const original = data.transactions.find((o) => o.id === t.refundOf);
        if (
          !original ||
          original.kind !== "expense" ||
          original.categoryId !== t.categoryId ||
          original.accountId !== t.accountId ||
          t.date < original.date
        )
          fail(
            "การคืนเงินต้องอ้างอิงรายจ่ายเดิม หมวด บัญชี และวันที่อย่างถูกต้อง",
          );
      }
    }
    for (const original of data.transactions.filter(
      (t) => t.kind === "expense",
    )) {
      const refunded = data.transactions
        .filter((t) => t.kind === "refund" && t.refundOf === original.id)
        .reduce((s, t) => s + t.amountSatang, 0);
      if (refunded > original.amountSatang) fail("ยอดคืนเงินเกินรายจ่ายเดิม");
    }
    for (const b of data.budgets)
      if (
        b.categoryId &&
        !data.categories.some(
          (c) => c.id === b.categoryId && c.kind === "expense" && !c.parentId,
        )
      )
        fail("งบประมาณต้องเป็นหมวดรายจ่ายหลัก");
    for (const t of data.transfers)
      if (
        t.sourceAccountId === t.destinationAccountId ||
        ![t.sourceAccountId, t.destinationAccountId].every((id) =>
          data.accounts.some((a) => a.id === id),
        )
      )
        fail("บัญชีโอนเงินไม่ถูกต้อง");
  });
export const transactionFormSchema = z.object({
  kind: z.enum(["income", "expense"]),
  amount: z.string().superRefine((value, ctx) => {
    try {
      parseMoney(value);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: (e as Error).message });
    }
  }),
  date: z.string().refine(validDate, "กรุณาเลือกวันที่ที่ถูกต้อง"),
  accountId: z.string().min(1, "กรุณาเลือกบัญชี"),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  description: z.string().max(200, "รายละเอียดไม่เกิน 200 ตัวอักษร"),
  notes: z.string().max(1000),
  tags: z
    .string()
    .refine(
      (s) =>
        s.split(",").filter((t) => t.trim()).length <= 10 &&
        s.split(",").every((t) => t.trim().length <= 40),
      "ไม่เกิน 10 แท็ก แท็กละ 40 ตัวอักษร",
    ),
});
export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
