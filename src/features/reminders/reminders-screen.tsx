"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarClock,
  Check,
  CheckCheck,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { usePlanning } from "@/components/planning-provider";
import { useFinance } from "@/components/providers";
import { PageHeading } from "@/components/shared/page-heading";
import { EmptyState } from "@/components/shared/states";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { billTiming } from "@/lib/planning";
import { dateLabel } from "@/lib/dates";
import { formatMoney, sumSatang } from "@/lib/money";
import type { BillReminder } from "@/types/planning";
import {
  PlanningLoadState,
  ConfirmPlanningDelete,
} from "../planning/planning-shared";
import { AlertList, usePlanningAlerts } from "./alert-list";
import { BillForm } from "./bill-form";
export function RemindersScreen() {
  const { data, today, update } = usePlanning();
  const { notify } = useFinance();
  const { alerts, unread, markRead } = usePlanningAlerts();
  const [editing, setEditing] = useState<BillReminder | null | undefined>(),
    [deleting, setDeleting] = useState<BillReminder | null>(null),
    [filter, setFilter] = useState("unpaid"),
    [pending, setPending] = useState<string | null>(null);
  if (!data) return <PlanningLoadState />;
  const unpaid = data.bills.filter((b) => !b.paidDate);
  const visible = [...data.bills]
    .filter(
      (b) =>
        filter === "all" || (filter === "paid" ? !!b.paidDate : !b.paidDate),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  async function togglePaid(bill: BillReminder) {
    if (pending) return;
    setPending(bill.id);
    const ok = await update((current) => {
      if (!current.bills.some((b) => b.id === bill.id))
        throw new Error("บิลนี้ถูกลบจากอุปกรณ์อื่นแล้ว");
      return {
        ...current,
        bills: current.bills.map((b) => {
          if (b.id !== bill.id) return b;
          const next = { ...b };
          if (bill.paidDate) delete next.paidDate;
          else next.paidDate = today;
          return next;
        }),
      };
    });
    setPending(null);
    if (ok)
      notify(
        bill.paidDate
          ? "เปลี่ยนเป็นยังไม่ชำระแล้ว"
          : "ทำเครื่องหมายชำระแล้ว · ยังไม่สร้างรายจ่าย",
      );
  }
  return (
    <>
      <PageHeading
        title="รู้ก่อนจ่าย วางแผนได้ทัน"
        description="ติดตามงบเดือนปัจจุบันและบิลที่ยังไม่ชำระ เพื่อเตรียมเงินก่อนถึงกำหนด"
        eyebrow="A LITTLE HEADS-UP GOES A LONG WAY"
        showMonth={false}
        action={
          <Button onClick={() => setEditing(null)}>
            <Plus size={17} />
            เพิ่มบิล
          </Button>
        }
      />
      <div className="planning-summary">
        <Card>
          <span className="planning-kpi-icon">
            <Bell size={22} />
          </span>
          <span>แจ้งเตือนที่ยังไม่อ่าน</span>
          <strong>
            {unread.length}
            <em> รายการ</em>
          </strong>
          <small>งบเดือนนี้และกำหนดจ่าย</small>
        </Card>
        <Card>
          <span className="planning-kpi-icon violet">
            <ReceiptText size={22} />
          </span>
          <span>บิลที่ยังไม่ชำระ</span>
          <strong>
            {unpaid.length}
            <em> บิล</em>
          </strong>
          <small>รวมทุกกำหนดจ่าย</small>
        </Card>
        <Card>
          <span className="planning-kpi-icon">
            <CalendarClock size={22} />
          </span>
          <span>ยอดที่ควรเตรียมใน 7 วัน</span>
          <strong>
            {formatMoney(
              sumSatang(
                unpaid
                  .filter((b) => billTiming(b, today).days <= 7)
                  .map((b) => b.amountSatang),
              ),
            )}
          </strong>
          <small>รวมบิลที่เลยกำหนดและครบกำหนดภายใน 7 วัน</small>
        </Card>
      </div>
      <Card className="planning-alert-section">
        <div className="section-heading">
          <div>
            <h2>สิ่งที่ควรดูแลตอนนี้</h2>
            <p>งบใกล้หมดที่ 80% · ถึงงบ 100% · เกินงบ · บิลใกล้ถึงกำหนด</p>
          </div>
          {unread.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void markRead(unread.map((a) => a.id));
              }}
            >
              <CheckCheck size={15} />
              อ่านทั้งหมดแล้ว
            </Button>
          )}
        </div>
        {alerts.length ? (
          <AlertList alerts={alerts} />
        ) : (
          <p className="planning-calm">
            <Check size={18} />
            ตอนนี้ยังไม่มีรายการที่ต้องแจ้งเตือน
          </p>
        )}
      </Card>
      <div className="section-heading">
        <div>
          <h2>บิลและกำหนดจ่าย</h2>
          <p>
            กดชำระแล้วเพื่อหยุดเตือน และ{" "}
            <Link className="planning-inline-link" href="/transactions">
              บันทึกรายจ่ายจริงในหน้ารายการ
            </Link>
          </p>
        </div>
      </div>
      <div className="planning-toolbar">
        <div className="planning-tabs" aria-label="กรองบิล">
          {[
            ["unpaid", "ยังไม่ชำระ"],
            ["paid", "ชำระแล้ว"],
            ["all", "ทั้งหมด"],
          ].map(([value, label]) => (
            <Button
              key={value}
              aria-pressed={filter === value}
              variant={filter === value ? "default" : "ghost"}
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <span className="soft-label">{visible.length} บิล</span>
      </div>
      {visible.length ? (
        <div className="bill-list">
          {visible.map((bill) => {
            const timing = billTiming(bill, today);
            return (
              <Card className="bill-card" key={bill.id}>
                <span
                  className={`bill-symbol ${!bill.paidDate && timing.days <= 0 ? "danger" : ""}`}
                >
                  <ReceiptText size={23} />
                </span>
                <div className="bill-description">
                  <h3>{bill.name}</h3>
                  <p>
                    กำหนด {dateLabel(bill.dueDate)} ·{" "}
                    {bill.paidDate
                      ? `ชำระ ${dateLabel(bill.paidDate)}`
                      : `เริ่มเตือน ${bill.remindDays} วันก่อนจ่าย`}
                  </p>
                  <span
                    className={`planning-badge ${!bill.paidDate && timing.days <= 0 ? "danger" : ""}`}
                  >
                    {timing.label}
                  </span>
                </div>
                <strong className="bill-amount">
                  {formatMoney(bill.amountSatang)}
                </strong>
                <div className="bill-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending !== null}
                    onClick={() => {
                      void togglePaid(bill);
                    }}
                  >
                    {bill.paidDate ? (
                      <RotateCcw size={14} />
                    ) : (
                      <Check size={14} />
                    )}
                    {pending === bill.id
                      ? "กำลังบันทึก…"
                      : bill.paidDate
                        ? "เปลี่ยนเป็นยังไม่ชำระ"
                        : "ชำระแล้ว"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`แก้ไขบิล ${bill.name}`}
                    onClick={() => setEditing(bill)}
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`ลบบิล ${bill.name}`}
                    onClick={() => setDeleting(bill)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="ยังไม่มีบิลในกลุ่มนี้"
            description="เพิ่มกำหนดจ่ายที่อยากให้ MoneyFlow ช่วยเตือน"
          />
          <div className="planning-empty-action">
            <Button onClick={() => setEditing(null)}>เพิ่มบิลแรก</Button>
          </div>
        </Card>
      )}
      <p className="planning-footnote">
        แจ้งเตือนภายในแอปเมื่อเปิดใช้งาน อ้างอิงวันที่ประเทศไทย ·
        ยังไม่มีการส่งข้อความหรือแจ้งเตือนขณะปิดแอป
      </p>
      {editing !== undefined && (
        <BillForm bill={editing} onClose={() => setEditing(undefined)} />
      )}
      {deleting && (
        <ConfirmPlanningDelete
          title={`ลบบิล ${deleting.name}?`}
          description="กำหนดจ่ายและการแจ้งเตือนของบิลนี้จะถูกลบ โดยไม่เปลี่ยนรายจ่ายที่เคยบันทึก"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const ok = await update((current) => ({
              ...current,
              bills: current.bills.filter((b) => b.id !== deleting.id),
            }));
            if (ok) notify("ลบบิลแล้ว");
            return ok;
          }}
        />
      )}
    </>
  );
}
