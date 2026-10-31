"use client";
import { useState, type FormEvent } from "react";
import { usePlanning } from "@/components/planning-provider";
import { useFinance } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { goalSchema, contributionSchema } from "@/lib/planning-validation";
import { moneyInput, parseMoney } from "@/lib/money";
import { saveErrorMessage } from "@/lib/save-error";
import type { SavingsGoal } from "@/types/planning";

export function GoalForm({
  goal,
  onClose,
}: {
  goal: SavingsGoal | null;
  onClose: () => void;
}) {
  const { update, today } = usePlanning();
  const { notify } = useFinance();
  const [name, setName] = useState(goal?.name ?? ""),
    [amount, setAmount] = useState(goal ? moneyInput(goal.targetSatang) : ""),
    [due, setDue] = useState(goal?.dueDate ?? ""),
    [opening, setOpening] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    try {
      const next = goalSchema.parse({
        id: goal?.id ?? crypto.randomUUID(),
        name,
        targetSatang: parseMoney(amount),
        dueDate: due,
      });
      const initial =
        !goal && opening.trim() && !/^0+(\.0{1,2})?$/.test(opening.trim())
          ? contributionSchema.parse({
              id: crypto.randomUUID(),
              goalId: next.id,
              amountSatang: parseMoney(opening),
              date: today,
              note: "ยอดออมตั้งต้น",
            })
          : null;
      setPending(true);
      const ok = await update((current) => {
        if (goal && !current.goals.some((g) => g.id === goal.id))
          throw new Error("เป้าหมายนี้ถูกลบจากอุปกรณ์อื่นแล้ว");
        return {
          ...current,
          goals: [...current.goals.filter((g) => g.id !== next.id), next],
          contributions: initial
            ? [...current.contributions, initial]
            : current.contributions,
        };
      }, setError);
      if (ok) {
        notify(goal ? "ปรับเป้าหมายแล้ว" : "สร้างเป้าหมายเงินออมแล้ว");
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
      title={goal ? "แก้ไขเป้าหมายเงินออม" : "สร้างเป้าหมายเงินออม"}
      description="กำหนดเงินที่อยากเก็บและวันที่ตั้งใจให้ถึงเป้าหมาย"
    >
      <form className="editor-form" onSubmit={save} noValidate>
        <label>
          ชื่อเป้าหมาย
          <input
            data-dialog-autofocus
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น เงินสำรองฉุกเฉิน"
          />
        </label>
        <label>
          ยอดเป้าหมาย (บาท)
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </label>
        <label>
          วันที่ตั้งเป้า
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        {!goal && (
          <label>
            ออมไว้แล้ว (บาท)
            <input
              inputMode="decimal"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              placeholder="0.00"
            />
          </label>
        )}
        <p className="form-note">
          ยอดออมเป็นการติดตามเป้าหมาย ไม่หักยอดบัญชีหรือสร้างรายจ่ายอัตโนมัติ
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
            {pending ? "กำลังบันทึก…" : "บันทึกเป้าหมาย"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function ContributionForm({
  goal,
  onClose,
}: {
  goal: SavingsGoal;
  onClose: () => void;
}) {
  const { update, today } = usePlanning();
  const { notify } = useFinance();
  const [amount, setAmount] = useState(""),
    [date, setDate] = useState(today),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    try {
      const contribution = contributionSchema.parse({
        id: crypto.randomUUID(),
        goalId: goal.id,
        amountSatang: parseMoney(amount),
        date,
        note,
      });
      setPending(true);
      const ok = await update((current) => {
        if (!current.goals.some((g) => g.id === goal.id))
          throw new Error("เป้าหมายนี้ถูกลบจากอุปกรณ์อื่นแล้ว");
        return {
          ...current,
          contributions: [...current.contributions, contribution],
        };
      }, setError);
      if (ok) {
        notify("บันทึกเงินออมแล้ว");
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
      title={`เพิ่มเงินออม · ${goal.name}`}
      description="บันทึกเงินที่เก็บเพิ่มเพื่อคำนวณยอดสะสม"
    >
      <form className="editor-form" onSubmit={save} noValidate>
        <label>
          จำนวนเงินออม (บาท)
          <input
            data-dialog-autofocus
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </label>
        <label>
          วันที่ออม
          <input
            type="date"
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          บันทึกช่วยจำ
          <input
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ไม่จำเป็นต้องระบุ"
          />
        </label>
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
            {pending ? "กำลังบันทึก…" : "บันทึกเงินออม"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
