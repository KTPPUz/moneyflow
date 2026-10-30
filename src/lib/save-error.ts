import { ZodError } from "zod";

export function saveErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return [...new Set(error.issues.map((issue) => issue.message))].join(" · ");
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง ข้อมูลที่กรอกยังอยู่ในฟอร์ม";
}
