import type { FinanceData } from "@/types/finance";
import { financeSchema } from "@/lib/validation";
import {
  LEGACY_STORAGE_KEY,
  localRepository,
  STORAGE_KEY,
  type FinanceRepository,
} from "@/data/local/repository";
// Marks this browser's local copy as handled; the copy itself is kept untouched.
export const LOCAL_IMPORT_KEY = "moneyflow-local-imported";
export class FinanceConflictError extends Error {}
let revision = 0;
async function request(init?: RequestInit): Promise<FinanceData> {
  let response: Response;
  try {
    response = await fetch("/api/finance", {
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    throw new Error(
      "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง",
    );
  }
  const body = await response.json().catch(() => null);
  if (response.status === 401) {
    window.location.assign("/login");
    throw new Error("กรุณาเข้าสู่ระบบ");
  }
  if (response.status === 409)
    throw new FinanceConflictError(body?.message ?? "ข้อมูลถูกแก้ไขจากที่อื่น");
  if (!response.ok)
    throw new Error(body?.message ?? "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
  // A slow read can finish after a newer save; never move the revision backwards.
  revision = Math.max(revision, body.revision);
  return financeSchema.parse(body.data);
}
const hasRecords = (data: FinanceData) =>
  data.transactions.length +
    data.accounts.length +
    data.budgets.length +
    data.transfers.length >
  0;
async function importLocalData(server: FinanceData) {
  if (
    hasRecords(server) ||
    localStorage.getItem(LOCAL_IMPORT_KEY) ||
    !(
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY)
    )
  )
    return server;
  let local: FinanceData;
  try {
    local = await localRepository.read();
  } catch {
    // Unreadable local data stays where it is and must not block the account.
    return server;
  }
  const saved = hasRecords(local) ? await remoteRepository.write(local) : server;
  localStorage.setItem(LOCAL_IMPORT_KEY, new Date().toISOString());
  return saved;
}
export const remoteRepository: FinanceRepository = {
  async read() {
    return importLocalData(await request());
  },
  async write(data) {
    return request({
      method: "PUT",
      body: JSON.stringify({ data: financeSchema.parse(data), revision }),
    });
  },
  async reset() {
    // A cleared account must not pull the old browser copy back in.
    localStorage.setItem(LOCAL_IMPORT_KEY, new Date().toISOString());
    return request({ method: "DELETE" });
  },
};
