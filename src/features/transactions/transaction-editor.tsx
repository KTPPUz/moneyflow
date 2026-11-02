"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownLeft, ArrowUpRight, Check, Wallet } from "lucide-react";
import { useFinance } from "@/components/providers";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { localDate } from "@/lib/dates";
import { moneyInput, parseMoney } from "@/lib/money";
import { rootCategory } from "@/lib/finance";
import {
  transactionFormSchema,
  type TransactionFormValues,
} from "@/lib/validation";
import type { Transaction } from "@/types/finance";
import { ReceiptAttachment } from "./receipt-attachment";
import { uploadReceipt } from "@/lib/receipt-client";
export function TransactionEditor() {
  const { editor, setEditor, data } = useFinance();
  return (
    <Modal
      open={editor !== undefined}
      onOpenChange={(open) => {
        if (!open) setEditor(undefined);
      }}
      title={editor ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"}
      description="บันทึกเรื่องเงินของคุณ พร้อมแนบสลิปไว้กับรายการ"
    >
      {editor !== undefined &&
        (data.accounts.length && data.categories.some((c) => !c.archivedAt) ? (
          <TransactionForm key={editor?.id ?? "new"} initial={editor} />
        ) : (
          <div className="help-content">
            <p>ก่อนบันทึกรายการ กรุณาสร้างบัญชีและหมวดหมู่ของคุณก่อน</p>
            <div className="onboarding-links">
              {!data.accounts.length && (
                <Button asChild>
                  <Link href="/accounts" onClick={() => setEditor(undefined)}>
                    เพิ่มบัญชีแรก
                  </Link>
                </Button>
              )}
              {!data.categories.some((c) => !c.archivedAt) && (
                <Button asChild variant="outline">
                  <Link href="/categories" onClick={() => setEditor(undefined)}>
                    สร้างหมวดหมู่แรก
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ))}
    </Modal>
  );
}
function TransactionForm({ initial }: { initial: Transaction | null }) {
  const { data, update, setEditor, notify, month, setMonth } = useFinance();
  const [receiptId, setReceiptId] = useState(initial?.receiptId);
  const [receiptFile, setReceiptFile] = useState<File>();
  const [preparingReceipt, setPreparingReceipt] = useState(false);
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      kind: initial?.kind === "income" ? "income" : "expense",
      amount: initial ? moneyInput(initial.amountSatang) : "",
      date:
        initial?.date ??
        (month === localDate().slice(0, 7) ? localDate() : `${month}-01`),
      categoryId: initial?.categoryId ?? "",
      accountId: initial?.accountId ?? data.accounts[0]?.id ?? "",
      description: initial?.description ?? "",
      notes: initial?.notes ?? "",
      tags: initial?.tags?.join(", ") ?? "",
    },
  });
  const kind = useWatch({ control: form.control, name: "kind" }),
    categoryId = useWatch({ control: form.control, name: "categoryId" });
  const selectedParent = rootCategory(data, categoryId);
  const roots = data.categories
    .filter(
      (c) =>
        !c.parentId &&
        c.kind === kind &&
        (!c.archivedAt || c.id === selectedParent?.id),
    )
    .sort((a, b) => a.order - b.order);
  const children = data.categories
    .filter(
      (c) =>
        c.parentId === selectedParent?.id &&
        (!c.archivedAt || c.id === initial?.categoryId),
    )
    .sort((a, b) => a.order - b.order);
  const error = (name: keyof TransactionFormValues) =>
    form.formState.errors[name]?.message;
  const errorText = (name: keyof TransactionFormValues) =>
    error(name) ? (
      <span id={`error-${name}`} role="alert" className="field-error">
        {error(name)}
      </span>
    ) : null;
  async function submit(values: TransactionFormValues) {
    if (preparingReceipt) return;
    let attachedId = receiptId;
    if (receiptFile) {
      try {
        attachedId = await uploadReceipt(receiptFile);
        setReceiptId(attachedId);
        setReceiptFile(undefined);
      } catch (error) {
        form.setError("root", {
          message:
            error instanceof Error
              ? error.message
              : "อัปโหลดสลิปไม่สำเร็จ กรุณาลองอีกครั้ง",
        });
        return;
      }
    }
    const transaction: Transaction = {
      id: initial?.id ?? crypto.randomUUID(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      ...(attachedId ? { receiptId: attachedId } : {}),
      kind: values.kind,
      amountSatang: parseMoney(values.amount),
      date: values.date,
      accountId: values.accountId,
      categoryId: values.categoryId,
      description: values.description.trim(),
      notes: values.notes.trim(),
      tags: values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    const ok = await update(
      (current) => ({
        ...current,
        transactions: initial
          ? current.transactions.map((t) =>
              t.id === initial.id ? transaction : t,
            )
          : [...current.transactions, transaction],
      }),
      (message) => form.setError("root", { message }),
    );
    if (ok) {
      setMonth(values.date.slice(0, 7));
      setEditor(undefined);
      notify(
        initial ? "แก้ไขรายการแล้ว ทุกหน้าคำนวณใหม่แล้ว" : "เพิ่มรายการแล้ว",
      );
    }
  }
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(submit)}
      className="editor-form"
    >
      <div className="type-toggle" role="group" aria-label="ประเภทรายการ">
        {[
          { value: "expense", label: "รายจ่าย", Icon: ArrowUpRight },
          { value: "income", label: "รายรับ", Icon: ArrowDownLeft },
        ].map(({ value, label, Icon }) => (
          <button
            type="button"
            key={value}
            className={kind === value ? `selected ${value}` : ""}
            aria-pressed={kind === value}
            onClick={() => {
              form.setValue("kind", value as "expense" | "income");
              form.setValue("categoryId", "");
            }}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      <label className="amount-field">
        จำนวนเงิน (บาท)
        <div>
          <span>฿</span>
          <input
            data-dialog-autofocus
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            aria-invalid={!!error("amount")}
            aria-describedby={error("amount") ? "error-amount" : undefined}
            {...form.register("amount")}
          />
        </div>
        {errorText("amount")}
      </label>
      <div className="form-grid">
        <label>
          หมวดหมู่ <span className="required">*</span>
          <select
            value={selectedParent?.id ?? ""}
            aria-invalid={!!error("categoryId")}
            onChange={(e) =>
              form.setValue("categoryId", e.target.value, {
                shouldValidate: true,
              })
            }
          >
            <option value="">เลือกหมวดหมู่</option>
            {roots.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.archivedAt ? " (เก็บถาวร)" : ""}
              </option>
            ))}
          </select>
          {errorText("categoryId")}
        </label>
        <label>
          หมวดหมู่ย่อย <span className="optional">(ถ้ามี)</span>
          <select
            value={
              data.categories.find((c) => c.id === categoryId)?.parentId
                ? categoryId
                : ""
            }
            onChange={(e) =>
              form.setValue(
                "categoryId",
                e.target.value || selectedParent?.id || "",
              )
            }
            disabled={!children.length}
          >
            <option value="">ไม่ระบุหมวดหมู่ย่อย</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          บัญชี <span className="required">*</span>
          <select
            {...form.register("accountId")}
            aria-invalid={!!error("accountId")}
          >
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {errorText("accountId")}
        </label>
        <label>
          วันที่ <span className="required">*</span>
          <input
            type="date"
            {...form.register("date")}
            aria-invalid={!!error("date")}
          />
          {errorText("date")}
        </label>
      </div>
      <label>
        รายละเอียด <span className="optional">(ถ้ามี)</span>
        <input
          placeholder="เช่น ข้าวกลางวัน, เงินเดือน"
          {...form.register("description")}
          aria-invalid={!!error("description")}
        />
        {errorText("description")}
      </label>
      <label>
        แท็ก <span className="optional">(คั่นด้วยเครื่องหมาย ,)</span>
        <input placeholder="เช่น ประจำวัน, ทำงาน" {...form.register("tags")} />
        {errorText("tags")}
      </label>
      <label>
        บันทึกเพิ่มเติม <span className="optional">(ถ้ามี)</span>
        <textarea
          rows={2}
          placeholder="รายละเอียดที่อยากจำไว้..."
          {...form.register("notes")}
        />
        {errorText("notes")}
      </label>
      <ReceiptAttachment
        receiptId={receiptId}
        disabled={form.formState.isSubmitting}
        onBusyChange={setPreparingReceipt}
        onFile={setReceiptFile}
        onRemove={() => {
          setReceiptId(undefined);
          setReceiptFile(undefined);
        }}
      />
      {form.formState.errors.root && (
        <p role="alert" className="inline-error">
          {form.formState.errors.root.message}
        </p>
      )}
      <div className="form-note">
        <Wallet size={14} />
        รายการและสลิปบันทึกไว้ในบัญชีของคุณ
      </div>
      <div className="form-actions">
        <Button
          type="button"
          variant="outline"
          onClick={() => setEditor(undefined)}
        >
          ยกเลิก
        </Button>
        <Button
          type="submit"
          disabled={form.formState.isSubmitting || preparingReceipt}
        >
          <Check size={16} />
          {form.formState.isSubmitting ? "กำลังบันทึก…" : "บันทึกรายการ"}
        </Button>
      </div>
    </form>
  );
}
