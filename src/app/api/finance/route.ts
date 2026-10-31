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
import { RequestTiming } from "@/lib/request-timing";
const saveSchema = z.object({
  data: financeSchema,
  revision: z.number().int().min(0),
});
const fail = (message: string, status: number) =>
  NextResponse.json({ message }, { status });
function handle(work: (userId: string) => Promise<unknown>) {
  return async () => {
    const timing = new RequestTiming();
    const finish = (response: NextResponse) => {
      response.headers.set("Server-Timing", timing.header());
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set(
        "X-MoneyFlow-Region",
        process.env.VERCEL_REGION ?? "local",
      );
      if (process.env.MONEYFLOW_LOG_TIMINGS === "true") {
        console.info("[moneyflow-timing]", {
          status: response.status,
          timing: response.headers.get("Server-Timing"),
          region: process.env.VERCEL_REGION ?? "local",
        });
      }
      return response;
    };
    try {
      const user = await timing.measure("session", () => currentUser());
      if (!user) return finish(fail("กรุณาเข้าสู่ระบบ", 401));
      const result = await timing.measure("finance", () => work(user.id));
      return finish(NextResponse.json(result));
    } catch (error) {
      if (error instanceof RevisionConflictError)
        return finish(fail("ข้อมูลถูกแก้ไขจากที่อื่น", 409));
      if (error instanceof ZodError)
        return finish(
          fail(
            [...new Set(error.issues.map((issue) => issue.message))].join(
              " · ",
            ),
            400,
          ),
        );
      if (error instanceof ColumnLimitError)
        return finish(fail(error.message, 400));
      console.error(error);
      return finish(fail("เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง", 500));
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
