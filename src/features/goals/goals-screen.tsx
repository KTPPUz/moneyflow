"use client";
import { useState } from "react";
import {
  CalendarDays,
  Check,
  History,
  Pencil,
  PiggyBank,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { usePlanning } from "@/components/planning-provider";
import { useFinance } from "@/components/providers";
import { PageHeading } from "@/components/shared/page-heading";
import { EmptyState } from "@/components/shared/states";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { dateLabel } from "@/lib/dates";
import { savingsProgress } from "@/lib/planning";
import { formatMoney, percentLabel, sumSatang } from "@/lib/money";
import type { SavingsGoal, GoalContribution } from "@/types/planning";
import { GoalForm, ContributionForm } from "./goal-forms";
import {
  PlanningLoadState,
  ConfirmPlanningDelete,
} from "../planning/planning-shared";

export function GoalsScreen() {
  const { data, today, update } = usePlanning();
  const { notify } = useFinance();
  const [editing, setEditing] = useState<SavingsGoal | null | undefined>(),
    [adding, setAdding] = useState<SavingsGoal | null>(null),
    [history, setHistory] = useState<SavingsGoal | null>(null),
    [deleting, setDeleting] = useState<SavingsGoal | null>(null),
    [removeContribution, setRemoveContribution] =
      useState<GoalContribution | null>(null),
    [filter, setFilter] = useState("active");
  if (!data) return <PlanningLoadState />;
  const goals = data.goals.map((goal) => ({
    goal,
    progress: savingsProgress(goal, data, today),
  }));
  const visible = goals.filter(
    ({ progress }) =>
      filter === "all" ||
      (filter === "complete" ? progress.complete : !progress.complete),
  );
  return (
    <>
      <PageHeading
        title="เก็บทีละนิด ให้ถึงสิ่งที่ตั้งใจ"
        description="เห็นยอดสะสมและจำนวนที่ควรออมต่อเดือน เพื่อเดินเข้าใกล้เป้าหมายของคุณ"
        eyebrow="SMALL STEPS, BIG POSSIBILITIES"
        showMonth={false}
        action={
          <Button onClick={() => setEditing(null)}>
            <Plus size={17} />
            สร้างเป้าหมาย
          </Button>
        }
      />
      <div className="planning-summary">
        <Card>
          <span className="planning-kpi-icon">
            <PiggyBank size={22} />
          </span>
          <span>ยอดออมสะสมทุกเป้าหมาย</span>
          <strong>
            {formatMoney(sumSatang(goals.map((g) => g.progress.saved)))}
          </strong>
          <small>จากประวัติการออมที่บันทึก</small>
        </Card>
        <Card>
          <span className="planning-kpi-icon violet">
            <Target size={22} />
          </span>
          <span>ควรออมรวมต่อเดือน</span>
          <strong>
            {formatMoney(sumSatang(goals.map((g) => g.progress.monthly)))}
          </strong>
          <small>รวมเดือนปัจจุบันถึงเดือนเป้าหมาย</small>
        </Card>
        <Card>
          <span className="planning-kpi-icon">
            <Check size={22} />
          </span>
          <span>เป้าหมายที่สำเร็จ</span>
          <strong>
            {goals.filter((g) => g.progress.complete).length}
            <em> / {goals.length}</em>
          </strong>
          <small>ทุกก้าวเล็ก ๆ มีความหมาย</small>
        </Card>
      </div>
      <div className="planning-toolbar">
        <div className="planning-tabs" aria-label="กรองเป้าหมาย">
          {[
            ["active", "กำลังออม"],
            ["complete", "สำเร็จแล้ว"],
            ["all", "ทั้งหมด"],
          ].map(([value, label]) => (
            <Button
              key={value}
              variant={filter === value ? "default" : "ghost"}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <span className="soft-label">{visible.length} เป้าหมาย</span>
      </div>
      {!visible.length ? (
        <Card>
          <EmptyState
            title={
              goals.length
                ? "ยังไม่มีเป้าหมายในกลุ่มนี้"
                : "เริ่มจากสิ่งที่คุณอยากเก็บเงินให้"
            }
            description="สร้างเป้าหมาย แล้วบันทึกเงินออมเพื่อดูความคืบหน้า"
          />
          <div className="planning-empty-action">
            <Button onClick={() => setEditing(null)}>
              <Plus size={16} />
              สร้างเป้าหมายแรก
            </Button>
          </div>
        </Card>
      ) : (
        <div className="goal-grid">
          {visible.map(({ goal, progress }) => (
            <Card
              className={`goal-card ${progress.complete ? "complete" : ""}`}
              key={goal.id}
            >
              <div className="goal-card-top">
                <span className="goal-symbol">
                  <PiggyBank size={25} />
                </span>
                <span
                  className={`planning-badge ${progress.overdue ? "danger" : ""}`}
                >
                  {progress.complete
                    ? "สำเร็จแล้ว"
                    : progress.overdue
                      ? "เลยวันเป้าหมาย"
                      : "กำลังออม"}
                </span>
                <div className="planning-icon-actions">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`แก้ไขเป้าหมาย ${goal.name}`}
                    onClick={() => setEditing(goal)}
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`ลบเป้าหมาย ${goal.name}`}
                    onClick={() => setDeleting(goal)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              <h2>{goal.name}</h2>
              <p className="planning-date">
                <CalendarDays size={14} />
                ตั้งเป้า {dateLabel(goal.dueDate)}
              </p>
              <div className="goal-amount">
                <strong>{formatMoney(progress.saved)}</strong>
                <span>จาก {formatMoney(goal.targetSatang)}</span>
              </div>
              <div
                className="budget-track"
                role="progressbar"
                aria-label={`ความคืบหน้า ${goal.name}`}
                aria-valuenow={Math.round(Math.min(progress.ratio, 100))}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${Math.min(progress.ratio, 100)}%` }} />
              </div>
              <div className="goal-progress-label">
                <span>เหลืออีก {formatMoney(progress.remaining)}</span>
                <b>{percentLabel(progress.ratio)}</b>
              </div>
              <div className="goal-monthly">
                <span>
                  {progress.complete
                    ? "เก็บเงินถึงเป้าหมายแล้ว"
                    : progress.overdue
                      ? "ยอดที่ยังขาด · ควรเติมให้ครบ"
                      : `ควรออมต่อเดือน · อีก ${progress.months} เดือนรวมเดือนนี้`}
                </span>
                <strong>
                  {progress.complete
                    ? "ยินดีด้วย!"
                    : formatMoney(progress.monthly)}
                </strong>
              </div>
              <div className="goal-actions">
                <Button variant="outline" onClick={() => setHistory(goal)}>
                  <History size={15} />
                  ประวัติ
                </Button>
                <Button onClick={() => setAdding(goal)}>
                  <Plus size={16} />
                  เพิ่มเงินออม
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="planning-footnote">
        ยอดออมไม่ใช่รายจ่าย และไม่หักเงินจากบัญชีอัตโนมัติ ·
        แผนรายเดือนปัดขึ้นเป็นสตางค์และคำนวณใหม่ตามยอดที่ยังขาด
      </p>
      {editing !== undefined && (
        <GoalForm goal={editing} onClose={() => setEditing(undefined)} />
      )}
      {adding && (
        <ContributionForm goal={adding} onClose={() => setAdding(null)} />
      )}
      {deleting && (
        <ConfirmPlanningDelete
          title={`ลบเป้าหมาย ${deleting.name}?`}
          description="ประวัติเงินออมของเป้าหมายนี้จะถูกลบด้วย โดยไม่เปลี่ยนรายการรายรับ–รายจ่าย"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const ok = await update((current) => ({
              ...current,
              goals: current.goals.filter((g) => g.id !== deleting.id),
              contributions: current.contributions.filter(
                (c) => c.goalId !== deleting.id,
              ),
            }));
            if (ok) notify("ลบเป้าหมายแล้ว");
            return ok;
          }}
        />
      )}
      {history && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) setHistory(null);
          }}
          title={`ประวัติเงินออม · ${history.name}`}
          description="ยอดสะสมคำนวณจากรายการออมเหล่านี้"
        >
          <div className="contribution-history">
            {data.contributions
              .filter((c) => c.goalId === history.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((c) => (
                <div key={c.id}>
                  <div>
                    <strong>{formatMoney(c.amountSatang)}</strong>
                    <p>
                      {dateLabel(c.date)}
                      {c.note ? ` · ${c.note}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`ลบเงินออม ${formatMoney(c.amountSatang)}`}
                    onClick={() => {
                      setHistory(null);
                      setRemoveContribution(c);
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            {!data.contributions.some((c) => c.goalId === history.id) && (
              <p>ยังไม่มีประวัติการออม</p>
            )}
          </div>
        </Modal>
      )}
      {removeContribution && (
        <ConfirmPlanningDelete
          title="ลบรายการออมนี้?"
          description="ยอดสะสมและแผนรายเดือนจะคำนวณใหม่"
          onClose={() => setRemoveContribution(null)}
          onConfirm={async () => {
            const ok = await update((current) => ({
              ...current,
              contributions: current.contributions.filter(
                (c) => c.id !== removeContribution.id,
              ),
            }));
            if (ok) notify("ลบรายการออมแล้ว");
            return ok;
          }}
        />
      )}
    </>
  );
}
