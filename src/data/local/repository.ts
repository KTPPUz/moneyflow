import type { FinanceData } from "@/types/finance";
import { financeSchema } from "@/lib/validation";
import { emptyFinanceData } from "./initial-data";
import { migrateLegacyData } from "./migrate-legacy";
import { ensureDefaultCategories } from "./default-categories";
export const STORAGE_KEY = "moneyflow-local-v1";
export const LEGACY_STORAGE_KEY = "moneyflow-demo-v2";
export interface FinanceRepository {
  read(): Promise<FinanceData>;
  write(data: FinanceData): Promise<FinanceData>;
  reset(): Promise<FinanceData>;
}
export const localRepository: FinanceRepository = {
  async read() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      let checked: FinanceData;
      try {
        checked = financeSchema.parse(JSON.parse(raw));
      } catch {
        throw new Error(
          "ข้อมูลในเบราว์เซอร์ไม่ถูกต้อง ลองโหลดอีกครั้ง หรือล้างข้อมูลหลังตรวจสอบสำเนาของคุณ",
        );
      }
      const initialized = ensureDefaultCategories(checked);
      return initialized === checked ? checked : this.write(initialized);
    }
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      let checked: FinanceData;
      try {
        checked = financeSchema.parse(JSON.parse(legacy));
      } catch {
        throw new Error(
          "ข้อมูลเดิมในเบราว์เซอร์ไม่ถูกต้อง จึงยังไม่เปลี่ยนหรือลบข้อมูลเดิม",
        );
      }
      return this.write(ensureDefaultCategories(migrateLegacyData(checked)));
    }
    return this.write(ensureDefaultCategories(emptyFinanceData()));
  },
  async write(data) {
    const checked = financeSchema.parse(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {
      throw new Error(
        "บันทึกในเบราว์เซอร์ไม่สำเร็จ พื้นที่อาจเต็มหรือถูกปิดกั้น ข้อมูลในฟอร์มยังอยู่",
      );
    }
    return checked;
  },
  async reset() {
    return this.write(ensureDefaultCategories(emptyFinanceData()));
  },
};
