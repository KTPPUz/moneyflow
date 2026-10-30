import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import {
  ColumnLimitError,
  readFinance,
  resetFinance,
  RevisionConflictError,
  saveFinance,
} from "@/data/server/finance-store";
import { currentUser } from "@/lib/auth";
import { financeSchema } from "@/lib/validation";
const saveSchema = z.object({
  data: financeSchema,
  revision: z.number().int().min(0),
});
const fail = (message: string, status: number) =>
  NextResponse.json({ message }, { status });
function handle(work: (userId: string) => Promise<unknown>) {
  return async () => {
    try {
      const user = await currentUser();
      if (!user) return fail("กรุณาเข้าสู่ระบบ", 401);
      return NextResponse.json(await work(user.id));
    } catch (error) {
      if (error instanceof RevisionConflictError)
        return fail("ข้อมูลถูกแก้ไขจากที่อื่น", 409);
      if (error instanceof ZodError)
        return fail(
          [...new Set(error.issues.map((issue) => issue.message))].join(" · "),
          400,
        );
      if (error instanceof ColumnLimitError) return fail(error.message, 400);
      console.error(error);
      return fail("เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง", 500);
    }
  };
}
export const GET = handle(readFinance);
export const DELETE = handle(resetFinance);
export async function PUT(request: Request) {
  return handle(async (userId) => {
    const body = saveSchema.parse(await request.json());
    return saveFinance(userId, body.data, body.revision);
  })();
}
