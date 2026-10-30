"use client";
import { useState } from "react";
import { Info, Plus } from "lucide-react";
import { useFinance } from "@/components/providers";
import { PageHeading } from "@/components/shared/page-heading";
import { CategoryIcon } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/states";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { accountBalance } from "@/lib/finance";
import { formatMoney, parseMoney, sumSatang } from "@/lib/money";
import type { Account } from "@/types/finance";
const labels = {
  cash: "เงินสด",
  bank: "บัญชีธนาคาร",
  ewallet: "e-Wallet",
  credit: "บัตรเครดิต",
};
export function AccountsScreen() {
  const { data, update, notify } = useFinance();
  const [open, setOpen] = useState(false),
    [name, setName] = useState(""),
    [type, setType] = useState<Account["type"]>("cash"),
    [opening, setOpening] = useState("0"),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  function start() {
    setName("");
    setType("cash");
    setOpening("0");
    setError("");
    setOpen(true);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim() || name.trim().length > 60) {
      setError("กรอกชื่อบัญชี 1–60 ตัวอักษร");
      return;
    }
    if (data.accounts.some((a) => a.name === name.trim())) {
      setError("มีชื่อบัญชีนี้แล้ว กรุณาใช้ชื่ออื่น");
      return;
    }
    let amount: number;
    try {
      amount = /^0+(\.0{1,2})?$/.test(opening.trim()) ? 0 : parseMoney(opening);
    } catch (error) {
      setError((error as Error).message);
      return;
    }
    setPending(true);
    const ok = await update((current) => ({
      ...current,
      accounts: [
        ...current.accounts,
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          type,
          openingBalanceSatang: type === "credit" ? -amount : amount,
        },
      ],
    }));
    setPending(false);
    if (ok) {
      setOpen(false);
      notify("เพิ่มบัญชีแล้ว เลือกใช้ในรายการได้ทันที");
    } else setError("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
  }
  return (
    <>
      <PageHeading
        title="เงินของคุณ อยู่ที่ไหนบ้าง"
        description="เพิ่มบัญชีของคุณ แล้วเริ่มติดตามยอดเงินจากรายการที่บันทึก"
        eyebrow="EVERY ACCOUNT, ONE CLEAR VIEW"
        showMonth={false}
        action={
          <Button onClick={start}>
            <Plus size={17} />
            เพิ่มบัญชี
          </Button>
        }
      />
      <div className="info-callout">
        <Info size={17} />
        <p>
          ข้อมูลบันทึกเฉพาะในเบราว์เซอร์นี้ ไม่มีการเชื่อมต่อธนาคารอัตโนมัติ
          การโอนเงินระหว่างบัญชียังไม่เปิดใช้งาน
        </p>
      </div>
      <Card className="account-total">
        <span>ยอดบัญชีรวม</span>
        <strong>
          {formatMoney(
            sumSatang(data.accounts.map((a) => accountBalance(data, a.id))),
          )}
        </strong>
        <p>รวมยอดยกมา และรายการทุกเดือน · ต่างจากกระแสเงินสดสุทธิรายเดือน</p>
      </Card>
      {data.accounts.length ? (
        <div className="account-cards">
          {data.accounts.map((a) => (
            <Card key={a.id} className="account-card">
              <div>
                <CategoryIcon
                  icon={a.type === "credit" ? "credit" : "wallet"}
                />
                <span className="soft-label">{labels[a.type]}</span>
              </div>
              <h2>{a.name}</h2>
              <strong>{formatMoney(accountBalance(data, a.id))}</strong>
              <p>ยอดยกมา {formatMoney(a.openingBalanceSatang)}</p>
              {a.type === "credit" && <small>ยอดติดลบแสดงหนี้คงค้าง</small>}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="ยังไม่มีบัญชี"
            description="เริ่มจากเพิ่มเงินสด บัญชีธนาคาร e-Wallet หรือบัตรเครดิตของคุณ"
          />
          <div className="empty-action">
            <Button onClick={start}>
              <Plus size={17} />
              เพิ่มบัญชีแรก
            </Button>
          </div>
        </Card>
      )}
      <Modal
        open={open}
        onOpenChange={(v) => {
          if (!pending) setOpen(v);
        }}
        title="เพิ่มบัญชี"
        description="ระบุบัญชีที่คุณใช้บันทึกเงิน ไม่ใช่การเชื่อมต่อธนาคาร"
      >
        <form className="editor-form" onSubmit={save} noValidate>
          <label>
            ชื่อบัญชี
            <input
              data-dialog-autofocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น เงินสดส่วนตัว"
              maxLength={60}
            />
          </label>
          <label>
            ประเภทบัญชี
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Account["type"])}
            >
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {type === "credit" ? "ยอดหนี้ตั้งต้น (บาท)" : "ยอดยกมา (บาท)"}
            <input
              inputMode="decimal"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
          </label>
          <p className="form-note">ยอดยกมาไม่ถือเป็นรายรับหรือรายจ่าย</p>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
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
    </>
  );
}
