import { z } from "zod";
import { localDate, validDate } from "./dates";
import { MAX_AMOUNT } from "./money";
const id = z.string().min(1).max(64);
const date = z.string().refine(validDate, "วันที่ไม่ถูกต้อง");
const name = z
  .string()
  .trim()
  .min(1, "กรุณาระบุชื่อ")
  .max(100, "ชื่อไม่เกิน 100 ตัวอักษร");
const money = z.number().int().positive().max(MAX_AMOUNT);
export const goalSchema = z.object({
  id,
  name,
  targetSatang: money,
  dueDate: date,
});
export const contributionSchema = z.object({
  id,
  goalId: id,
  amountSatang: money,
  date: date.refine(
    (value) => value <= localDate(),
    "วันที่ออมต้องไม่เป็นอนาคต",
  ),
  note: z.string().trim().max(200),
});
export const billSchema = z.object({
  id,
  name,
  amountSatang: money,
  dueDate: date,
  remindDays: z.number().int().min(0).max(30),
  paidDate: date
    .refine((value) => value <= localDate(), "วันที่ชำระต้องไม่เป็นอนาคต")
    .optional(),
});
export const planningSchema = z
  .object({
    goals: z.array(goalSchema).max(500),
    contributions: z.array(contributionSchema).max(20000),
    bills: z.array(billSchema).max(2000),
    readAlertIds: z.array(z.string().min(1).max(240)).max(10000),
  })
  .superRefine((data, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    for (const rows of [data.goals, data.contributions, data.bills])
      if (new Set(rows.map((row) => row.id)).size !== rows.length)
        fail("รหัสข้อมูลซ้ำกัน");
    const goals = new Set(data.goals.map((goal) => goal.id));
    if (data.contributions.some((row) => !goals.has(row.goalId)))
      fail("ไม่พบเป้าหมายของรายการออม");
    const exposure = [
      ...data.goals.map((g) => g.targetSatang),
      ...data.contributions.map((c) => c.amountSatang),
      ...data.bills.map((b) => b.amountSatang),
    ].reduce((sum, value) => sum + BigInt(value), 0n);
    if (exposure > BigInt(Number.MAX_SAFE_INTEGER))
      fail("ยอดรวมเกินขอบเขตจำนวนเต็มที่ปลอดภัย");
  });
