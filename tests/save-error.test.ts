import test from "node:test";
import assert from "node:assert/strict";
import { ZodError } from "zod";
import { saveErrorMessage } from "../src/lib/save-error";
test("saving errors retain their cause and deduplicate validation messages", () => {
  assert.equal(
    saveErrorMessage(new Error("ข้อมูลยังไม่พร้อม")),
    "ข้อมูลยังไม่พร้อม",
  );
  assert.equal(
    saveErrorMessage(new Error("บันทึกในเบราว์เซอร์ไม่สำเร็จ")),
    "บันทึกในเบราว์เซอร์ไม่สำเร็จ",
  );
  const error = new ZodError([
    {
      code: "custom",
      path: [],
      message: "รายการอ้างอิงหมวดหรือบัญชีไม่ถูกต้อง",
    },
    {
      code: "custom",
      path: [],
      message: "รายการอ้างอิงหมวดหรือบัญชีไม่ถูกต้อง",
    },
  ]);
  assert.equal(saveErrorMessage(error), "รายการอ้างอิงหมวดหรือบัญชีไม่ถูกต้อง");
  assert.ok(saveErrorMessage(null).includes("ข้อมูลที่กรอกยังอยู่ในฟอร์ม"));
});
