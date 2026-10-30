"use client";
import { useState } from "react";
import { CircleAlert, Pencil, Plus, ShieldCheck, Wallet } from "lucide-react";
import { useFinance } from "@/components/providers";
import { PageHeading } from "@/components/shared/page-heading";
import { CategoryIcon } from "@/components/shared/category-icon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { budgetState, summarize } from "@/lib/finance";
import { formatMoney, moneyInput, parseMoney, percentLabel } from "@/lib/money";
import { monthLabel } from "@/lib/dates";
export function BudgetsScreen() {
  const { data, month, update, notify } = useFinance();
  const [editing, setEditing] = useState<string | null | undefined>(undefined),
    [amount, setAmount] = useState(""),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const summary = summarize(data, month);
  const budgets = data.budgets.filter((b) => b.month === month);
  const overall = budgets.find((b) => b.categoryId === null);
  const overallState = budgetState(summary.expense, overall?.amountSatang ?? 0);
  const categories = data.categories
    .filter(
      (c) =>
        c.kind === "expense" &&
        !c.parentId &&
        (!c.archivedAt || summary.categories.some((s) => s.id === c.id)),
    )
    .sort((a, b) => a.order - b.order);
  function edit(categoryId: string | null) {
    setEditing(categoryId);
    const existing = budgets.find((b) => b.categoryId === categoryId);
    setAmount(existing ? moneyInput(existing.amountSatang) : "");
    setError("");
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    let satang: number;
    try {
      satang = parseMoney(amount);
    } catch (error) {
      setError((error as Error).message);
      return;
    }
    setPending(true);
    const id = `${month}-${editing ?? "overall"}`;
    const ok = await update((current) => ({
      ...current,
      budgets: [
        ...current.budgets.filter(
          (b) => !(b.month === month && b.categoryId === editing),
        ),
        { id, month, categoryId: editing ?? null, amountSatang: satang },
      ],
    }));
    setPending(false);
    if (ok) {
      setEditing(undefined);
      notify("ปรับงบประมาณแล้ว โดยไม่เปลี่ยนรายการย้อนหลัง");
    } else setError("บันทึกไม่สำเร็จ ลองอีกครั้งได้โดยไม่ต้องกรอกใหม่");
  }
  return (
    <>
      <PageHeading
        title="วางแผนเงิน ให้พอดีกับชีวิต"
        description="กำหนดงบที่สบายใจ แล้วค่อย ๆ ดูแลให้เป็นไปตามแผน"
        eyebrow="A LITTLE PLAN GOES A LONG WAY"
        action={
          <Button onClick={() => edit(null)}>
            <Pencil size={16} />
            ปรับงบรวม
          </Button>
        }
      />
      <Card className={`overall-budget ${overallState.status}`}>
        <div className="overall-top">
          <div>
            <span className="eyebrow">
              MONTHLY BUDGET · {monthLabel(month)}
            </span>
            <h2>งบประมาณประจำเดือน</h2>
            <strong>
              {overall ? formatMoney(overall.amountSatang) : "ยังไม่ได้กำหนด"}
            </strong>
          </div>
          <span className="overall-wallet">
            <Wallet size={34} />
          </span>
        </div>
        <div className="overall-progress">
          <div className="budget-track">
            <span
              style={{
                width: `${Math.max(0, Math.min(overallState.ratio ?? 0, 100))}%`,
              }}
            />
          </div>
          <span>{percentLabel(overallState.ratio)} ใช้แล้ว</span>
        </div>
        <div className="overall-metrics">
          <div>
            <span>รายจ่ายสุทธิ</span>
            <b>{formatMoney(summary.expense)}</b>
          </div>
          <div>
            <span>งบคงเหลือ</span>
            <b>{overall ? formatMoney(overallState.remaining) : "N/A"}</b>
          </div>
          <div>
            <span>เกินงบประมาณ</span>
            <b className={overallState.over ? "negative" : ""}>
              {formatMoney(overallState.over)}
            </b>
          </div>
        </div>
      </Card>
      <div className="section-heading">
        <div>
          <h2>งบประมาณรายหมวด</h2>
          <p>
            แจ้งเตือนเมื่อใช้ถึง 80% · ถึงงบที่ 100% · เกินงบเมื่อมากกว่า 100%
          </p>
        </div>
        <span className="soft-label">{categories.length} หมวดหมู่</span>
      </div>
      <div className="budget-cards">
        {categories.map((c) => {
          const budget = budgets.find((b) => b.categoryId === c.id);
          const used =
            summary.categories.find((row) => row.id === c.id)?.amount ?? 0;
          const state = budgetState(used, budget?.amountSatang ?? 0);
          const status = {
            normal: "อยู่ในงบ",
            warning: "ใกล้ถึงงบ",
            reached: "ใช้ครบงบแล้ว",
            exceeded: "เกินงบประมาณ",
            unset: "ยังไม่ตั้งงบ",
          }[state.status];
          return (
            <Card className={`category-budget ${state.status}`} key={c.id}>
              <div className="budget-card-heading">
                <CategoryIcon icon={c.icon} color={c.color} />
                <div>
                  <h3>{c.name}</h3>
                  <span className="budget-status">
                    {state.status === "normal" ? (
                      <ShieldCheck size={12} />
                    ) : (
                      <CircleAlert size={12} />
                    )}{" "}
                    {status}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`แก้งบ ${c.name}`}
                  onClick={() => edit(c.id)}
                >
                  {budget ? <Pencil size={16} /> : <Plus size={16} />}
                </Button>
              </div>
              <div className="budget-card-amount">
                <strong>{formatMoney(used)}</strong>
                <span>
                  / {budget ? formatMoney(budget.amountSatang) : "ยังไม่ระบุ"}
                </span>
              </div>
              <div className="budget-track">
                <span
                  style={{
                    width: `${Math.max(0, Math.min(state.ratio ?? 0, 100))}%`,
                  }}
                />
              </div>
              <div className="budget-card-footer">
                <span>
                  {budget
                    ? state.over
                      ? `เกินงบ ${formatMoney(state.over)}`
                      : `เหลือ ${formatMoney(state.remaining)}`
                    : "กำหนดงบเพื่อเริ่มติดตาม"}
                </span>
                <b>{percentLabel(state.ratio)}</b>
              </div>
            </Card>
          );
        })}
      </div>
      <Modal
        open={editing !== undefined}
        onOpenChange={(v) => {
          if (!v && !pending) setEditing(undefined);
        }}
        title={
          editing === null
            ? "ปรับงบประมาณรวม"
            : `งบ${data.categories.find((c) => c.id === editing)?.name ?? "หมวดหมู่"}`
        }
        description={`สำหรับ${monthLabel(month)} · เปลี่ยนเฉพาะงบของเดือนนี้`}
      >
        <form onSubmit={save} className="editor-form" noValidate>
          <label>
            จำนวนงบประมาณ (บาท)
            <input
              data-dialog-autofocus
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!error}
            />
          </label>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-note">
            รายการรายรับ–รายจ่ายเดิมจะไม่ถูกเปลี่ยนแปลง
          </div>
          <div className="form-actions">
            <Button
              variant="outline"
              type="button"
              disabled={pending}
              onClick={() => setEditing(undefined)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "กำลังบันทึก…" : "บันทึกงบประมาณ"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
