import { z } from "zod";
import { planningSchema } from "@/lib/planning-validation";
import type { PlanningData, PlanningSnapshot } from "@/types/planning";
export class PlanningConflictError extends Error {}
const snapshotSchema = z.object({
  data: planningSchema,
  revision: z.number().int().nonnegative(),
});
async function request(init?: RequestInit): Promise<PlanningSnapshot> {
  const response = await fetch("/api/planning", {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  const body = await response.json().catch(() => null);
  if (response.status === 409)
    throw new PlanningConflictError("ข้อมูลถูกแก้ไขจากที่อื่น");
  if (!response.ok)
    throw new Error(
      body?.message ?? "เชื่อมต่อข้อมูลแผนไม่สำเร็จ กรุณาลองอีกครั้ง",
    );
  return snapshotSchema.parse(body);
}
export const planningRepository = {
  read: () => request(),
  write: (data: PlanningData, revision: number) =>
    request({
      method: "PUT",
      body: JSON.stringify({ data: planningSchema.parse(data), revision }),
    }),
};
