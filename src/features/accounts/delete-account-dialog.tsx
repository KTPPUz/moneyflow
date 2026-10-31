"use client";
import { useState, type FormEvent } from "react";
import { useFinance } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { accountUsage, canReceiveAccount, removeAccount } from "@/lib/accounts";
import { formatMoney } from "@/lib/money";
import type { Account } from "@/types/finance";
export function DeleteAccountDialog({
  account,
  onClose,
}: {
  account: Account;
  onClose: () => void;
}) {
  const { data, update, notify } = useFinance();
  const [target, setTarget] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const usage = accountUsage(data, account.id);
  const alternatives = data.accounts.filter((a) => a.id !== account.id);
  const available = alternatives.filter((a) =>
    canReceiveAccount(data, account.id, a.id),
  );
  const current = data.accounts.find((a) => a.id === account.id) ?? account;
  async function remove(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const ok = await update(
      (fresh) => removeAccount(fresh, account.id, target),
      setError,
    );
    setPending(false);
    if (ok) {
      notify(target ? "ย้ายรายการและยอดยกมา พร้อมลบบัญชีแล้ว" : "ลบบัญชีแล้ว");
      onClose();
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title={`ลบบัญชี ${account.name}?`}
      description="ตรวจสอบรายการและยอดยกมาก่อนยืนยัน การลบนี้ย้อนกลับไม่ได้"
    >
      <form className="editor-form" onSubmit={remove} noValidate>
        <p>
          มีรายการรายรับ–รายจ่าย/คืนเงิน {usage.transactions} รายการ
          และรายการโอน {usage.transfers} รายการ · ยอดยกมา{" "}
          {formatMoney(current.openingBalanceSatang)}
        </p>
        {alternatives.length > 0 && (
          <label>
            บัญชีรับย้าย
            {usage.referenced ? " (จำเป็น)" : " (ถ้าต้องการเก็บยอดยกมา)"}
            <select
              data-dialog-autofocus
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">
                {usage.referenced
                  ? "เลือกบัญชีรับย้ายก่อนลบ"
                  : "ไม่ย้าย · ลบยอดยกมาของบัญชีนี้ด้วย"}
              </option>
              {alternatives.map((a) => (
                <option
                  key={a.id}
                  value={a.id}
                  disabled={!canReceiveAccount(data, account.id, a.id)}
                >
                  {a.name}
                  {!canReceiveAccount(data, account.id, a.id)
                    ? " · มีรายการโอนระหว่างกัน"
                    : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {usage.referenced && !available.length && (
          <p className="field-error" role="alert">
            ยังไม่มีบัญชีรับย้ายที่ใช้ได้ กรุณาเพิ่มบัญชีอื่นก่อนลบบัญชีนี้
          </p>
        )}
        <p className="form-note">
          {target
            ? "รายการทั้งหมดและยอดยกมาจะย้ายไปบัญชีที่เลือก ยอดบัญชีรวมและยอดรายรับ–รายจ่ายยังเท่าเดิม"
            : usage.referenced
              ? "ต้องย้ายรายการทั้งหมดก่อนลบ เพื่อเก็บประวัติและยอดรายรับ–รายจ่ายเดิมไว้"
              : `ยอดยกมา ${formatMoney(current.openingBalanceSatang)} ของบัญชีนี้จะถูกนำออกจากยอดบัญชีรวม`}
        </p>
        {usage.transfers > 0 && (
          <p className="form-note">
            บัญชีที่มีรายการโอนระหว่างกันไม่สามารถรับย้ายได้
            เพื่อรักษาประวัติการโอนโดยไม่เกิดการโอนเข้าบัญชีตัวเอง
          </p>
        )}
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
          <Button
            type="submit"
            variant="destructive"
            disabled={pending || (usage.referenced && !target)}
          >
            {pending ? "กำลังลบ…" : "ยืนยันลบบัญชี"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
