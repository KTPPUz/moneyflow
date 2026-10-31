"use client";
import { useState, type FormEvent } from "react";
import { useFinance } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { parseOpeningBalance, saveAccount } from "@/lib/accounts";
import { moneyInput } from "@/lib/money";
import { saveErrorMessage } from "@/lib/save-error";
import type { Account } from "@/types/finance";
export const accountLabels = {
  cash: "เงินสด",
  bank: "บัญชีธนาคาร",
  ewallet: "e-Wallet",
  credit: "บัตรเครดิต",
};
export function AccountForm({
  account,
  onClose,
}: {
  account: Account | null;
  onClose: () => void;
}) {
  const { update, notify } = useFinance();
  const [name, setName] = useState(account?.name ?? ""),
    [type, setType] = useState<Account["type"]>(account?.type ?? "cash"),
    [opening, setOpening] = useState(
      account ? moneyInput(account.openingBalanceSatang) : "0",
    ),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    try {
      const next: Account = {
        id: account?.id ?? crypto.randomUUID(),
        name,
        type,
        openingBalanceSatang: parseOpeningBalance(opening),
      };
      setPending(true);
      const ok = await update(
        (current) => saveAccount(current, next, !!account),
        setError,
      );
      if (ok) {
        notify(
          account
            ? "แก้ไขบัญชีแล้ว"
            : "เพิ่มบัญชีแล้ว เลือกใช้ในรายการได้ทันที",
        );
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
      title={account ? "แก้ไขบัญชี" : "เพิ่มบัญชี"}
      description="ระบุบัญชีที่คุณใช้บันทึกเงิน ไม่ใช่การเชื่อมต่อธนาคาร"
    >
      <form className="editor-form" onSubmit={save} noValidate>
        <label>
          ชื่อบัญชี
          <input
            data-dialog-autofocus
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น เงินสดส่วนตัว"
          />
        </label>
        <label>
          ประเภทบัญชี
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Account["type"])}
          >
            {Object.entries(accountLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          ยอดยกมา (บาท)
          <input
            inputMode="text"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
            placeholder={
              type === "credit" ? "เช่น -5000.00 สำหรับยอดหนี้" : "0.00"
            }
          />
        </label>
        <p className="form-note">
          ยอดยกมาไม่ถือเป็นรายรับหรือรายจ่าย · ใช้เครื่องหมายลบ (-)
          หากเป็นยอดหนี้หรือยอดติดลบ
          {account &&
            " · การแก้ไขยอดยกมาจะคำนวณยอดบัญชีใหม่ แต่ไม่เปลี่ยนรายการเดิม"}
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
            onClick={onClose}
            disabled={pending}
          >
            ยกเลิก
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "กำลังบันทึก…" : "บันทึกบัญชี"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
