import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { currentUser } from "@/lib/auth";
import { planningSchema } from "@/lib/planning-validation";
import { hasSameOrigin } from "@/lib/request-origin";
import {
  PlanningConflictError,
  readPlanning,
  savePlanning,
} from "@/data/server/planning-store";
const saveSchema = z.object({
  data: planningSchema,
  revision: z.number().int().nonnegative(),
});
async function handle(work: (userId: string) => Promise<unknown>) {
  const respond = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  try {
    const user = await currentUser();
    if (!user) return respond({ message: "กรุณาเข้าสู่ระบบ" }, 401);
    return respond(await work(user.id));
  } catch (error) {
    if (error instanceof PlanningConflictError)
      return respond({ message: error.message }, 409);
    if (error instanceof ZodError)
      return respond(
        {
          message: [
            ...new Set(error.issues.map((issue) => issue.message)),
          ].join(" · "),
        },
        400,
      );
    if (error instanceof SyntaxError)
      return respond({ message: "รูปแบบข้อมูลไม่ถูกต้อง" }, 400);
    console.error("[planning]", error);
    return respond(
      { message: "โหลดหรือบันทึกแผนไม่สำเร็จ กรุณาลองอีกครั้ง" },
      500,
    );
  }
}
export async function GET() {
  return handle(readPlanning);
}
export async function PUT(request: Request) {
  if (!hasSameOrigin(request))
    return NextResponse.json(
      { message: "คำขอไม่ได้มาจากเว็บไซต์นี้" },
      { status: 403 },
    );
  return handle(async (userId) => {
    const body = saveSchema.parse(await request.json());
    return savePlanning(userId, body.data, body.revision);
  });
}
