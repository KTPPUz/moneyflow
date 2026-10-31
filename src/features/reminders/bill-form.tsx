"use client";
import { useState, type FormEvent } from "react";
import { usePlanning } from "@/components/planning-provider";
import { useFinance } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { billSchema } from "@/lib/planning-validation";
import { moneyInput, parseMoney } from "@/lib/money";
import { saveErrorMessage } from "@/lib/save-error";
import type { BillReminder } from "@/types/planning";
export function BillForm({
  bill,
  onClose,
}: {
  bill: BillReminder | null;
  onClose: () => void;
}) {
  const { update, today } = usePlanning();
  const { notify } = useFinance();
  const [name, setName] = useState(bill?.name ?? ""),
    [amount, setAmount] = useState(bill ? moneyInput(bill.amountSatang) : ""),
    [dueDate, setDueDate] = useState(bill?.dueDate ?? today),
    [lead, setLead] = useState(String(bill?.remindDays ?? 7)),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    try {
      const next = billSchema.parse({
        ...bill,
        id: bill?.id ?? crypto.randomUUID(),
        name,
        amountSatang: parseMoney(amount),
        dueDate,
        remindDays: Number(lead),
      });
      setPending(true);
      const ok = await update((current) => {
        if (bill && !current.bills.some((b) => b.id === bill.id))
          throw new Error("บิลนี้ถูกลบจากอุปกรณ์อื่นแล้ว");
        return {
          ...current,
          bills: [...current.bills.filter((b) => b.id !== next.id), next],
        };
      }, setError);
      if (ok) {
        notify(bill ? "ปรับบิลแล้ว" : "เพิ่มบิลและกำหนดเตือนแล้ว");
        onClose();
      }
    } catch (error) {
      setError(saveErrorMessage(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title={bill ? "แก้ไขบิล" : "เพิ่มบิลที่ต้องจ่าย"}
      description="ตั้งกำหนดจ่ายและวันเริ่มแจ้งเตือนล่วงหน้า"
    >
      <form className="editor-form" onSubmit={save} noValidate>
        <label>
          ชื่อบิล
          <input
            data-dialog-autofocus
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น ค่าเช่า ค่าน้ำ ค่าไฟ"
          />
        </label>
        <label>
          ยอดที่ต้องจ่าย (บาท)
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </label>
        <label>
          วันที่ครบกำหนด
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
        <label>
          เริ่มเตือนล่วงหน้า
          <select value={lead} onChange={(e) => setLead(e.target.value)}>
            {[0, 1, 3, 7, 14, 30].map((days) => (
              <option key={days} value={days}>
                {days === 0 ? "วันครบกำหนด" : `${days} วัน`}
              </option>
            ))}
          </select>
        </label>
        <p className="form-note">
          บิลนี้เป็นแผนจ่ายครั้งเดียว
          การเตือนและสถานะชำระแล้วไม่สร้างรายจ่ายอัตโนมัติ
        </p>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onClose}
          >
            ยกเลิก
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "กำลังบันทึก…" : "บันทึกบิล"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
