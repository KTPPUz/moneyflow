"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  CircleHelp,
  Sparkles,
  Utensils,
  Wallet,
} from "lucide-react";
import { useFinance } from "@/components/providers";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/shared/page-heading";
import { CategoryIcon } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/states";
import {
  CashFlowChart,
  FoodChart,
  SpendingChart,
} from "@/components/dashboard/charts";
import { TransactionRow } from "@/features/transactions/transaction-row";
import { foodMetrics, summarize, budgetState } from "@/lib/finance";
import { formatMoney, percentChange, percentLabel } from "@/lib/money";
import { localDate, monthsEnding, monthLabel, shiftMonth } from "@/lib/dates";
export function RangeSelect({
  value,
  onChange,
  label = "ช่วงเวลาของกราฟ",
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <select
      className="range-select"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      <option value={6}>6 เดือนล่าสุด</option>
      <option value={12}>12 เดือนล่าสุด</option>
    </select>
  );
}
export function DashboardScreen() {
  const { data, month, setEditor } = useFinance();
  const [range, setRange] = useState(6);
  const current = summarize(data, month),
    previous = summarize(data, shiftMonth(month, -1)),
    metrics = foodMetrics(data, month, shiftMonth(month, -1));
  const timeline = monthsEnding(month, range).map((m) => summarize(data, m));
  const recent = data.transactions
    .filter((t) => t.date.startsWith(`${month}-`))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 5);
  const budgets = data.budgets
    .filter((b) => b.month === month && b.categoryId)
    .slice(0, 4);
  const stats = [
    {
      label: "รายรับทั้งหมด",
      value: formatMoney(current.income),
      Icon: ArrowDownLeft,
      tone: "mint",
      change: percentChange(current.income, previous.income),
      hint: "จากเดือนก่อน",
    },
    {
      label: "รายจ่ายทั้งหมด",
      value: formatMoney(current.expense),
      Icon: ArrowUpRight,
      tone: "rose",
      change: percentChange(current.expense, previous.expense),
      hint: "จากเดือนก่อน",
    },
    {
      label: "กระแสเงินสดสุทธิ",
      value: formatMoney(current.balance),
      Icon: Wallet,
      tone: "blue",
      change: null,
      hint: "รายรับ − รายจ่าย",
      detail: "ต่างจากยอดเงินรวมทุกบัญชี",
    },
    {
      label: "ค่าอาหาร / รายรับ",
      value: percentLabel(metrics.incomeShare),
      Icon: Utensils,
      tone: "violet",
      change: metrics.pp,
      hint: "จากเดือนก่อน",
      unit: " pp",
      detail: `ค่าอาหาร ${formatMoney(current.food)}`,
    },
  ];
  return (
    <div className="dashboard-content">
      <PageHeading
        title="ภาพรวมการเงิน"
        description="สวัสดี 👋 วันนี้เป็นอีกวันที่ดีในการดูแลเงิน ให้ทุกเป้าหมายใกล้ขึ้นอีกนิด"
      />
      <div className="section-kicker">
        <span>
          ภาพรวมการเงิน <b>{monthLabel(month)}</b>
        </span>
        {month === localDate().slice(0, 7) && (
          <span className="mtd-tag">เดือนปัจจุบัน · ถึงวันนี้</span>
        )}
      </div>
      <div className="stats-grid">
        {stats.map(
          ({ label, value, Icon, tone, change, hint, detail, unit }) => (
            <Card key={label} className={`stat-card ${tone}`}>
              <span className="stat-icon">
                <Icon size={20} />
              </span>
              <div className="stat-copy">
                <p>{label}</p>
                <strong className="stat-value">{value}</strong>
                <div className="stat-change">
                  {change !== null ? (
                    <>
                      <span>
                        {change < 0 ? (
                          <ArrowDown size={12} />
                        ) : (
                          <ArrowUp size={12} />
                        )}{" "}
                        {Math.abs(change).toFixed(2)}
                        {unit ?? "%"}
                      </span>{" "}
                      {hint}
                    </>
                  ) : (
                    <span>
                      {tone === "blue" ? hint : "ไม่มีฐานเปรียบเทียบ"}
                    </span>
                  )}
                </div>
              </div>
              {detail && <small className="stat-detail">{detail}</small>}
            </Card>
          ),
        )}
      </div>
      <div className="main-grid">
        <Card className="cash-panel">
          <div className="panel-heading">
            <div>
              <h2>ภาพรวมรายรับ – รายจ่าย</h2>
              <p>มองเห็นเงินเข้าออก เพื่อวางแผนได้ดีกว่าเดิม</p>
            </div>
            <RangeSelect value={range} onChange={setRange} />
          </div>
          <div className="chart-legend">
            <span>
              <i className="income-dot" />
              รายรับ
            </span>
            <span>
              <i className="expense-dot" />
              รายจ่าย
            </span>
            <span>
              <i className="balance-dot" />
              กระแสเงินสดสุทธิ
            </span>
          </div>
          {data.transactions.some((t) =>
            timeline.some((m) => t.date.startsWith(`${m.key}-`)),
          ) ? (
            <CashFlowChart data={timeline} />
          ) : (
            <EmptyState
              title="ยังไม่มีข้อมูลรายรับ – รายจ่าย"
              description="กราฟจะแสดงเมื่อคุณเริ่มบันทึกรายการ"
              onAdd={() => setEditor(null)}
            />
          )}
        </Card>
        <Card className="spending-panel">
          <div className="panel-heading">
            <div>
              <h2>สัดส่วนรายจ่าย</h2>
              <p>เงินของคุณไปไหนบ้างในเดือนนี้</p>
            </div>
            <span className="soft-label">{monthLabel(month, true)}</span>
          </div>
          <SpendingChart month={current} />
        </Card>
      </div>
      <div className="bottom-grid">
        <Card className="food-panel">
          <div className="panel-heading">
            <div>
              <h2>มื้ออร่อย ในงบที่ใช่</h2>
              <p>ค่าอาหารคิดเป็นกี่เปอร์เซ็นต์ของรายรับ</p>
            </div>
            <span className="subtle-icon">
              <Utensils size={18} />
            </span>
          </div>
          <div className="food-summary">
            <strong>{percentLabel(metrics.incomeShare)}</strong>
            <span
              className={`change-pill ${metrics.mom !== null && metrics.mom > 0 ? "up" : ""}`}
            >
              {metrics.mom === null ? (
                metrics.newSpending ? (
                  "เริ่มมีค่าอาหาร"
                ) : (
                  "N/A"
                )
              ) : (
                <>
                  {metrics.mom <= 0 ? (
                    <ArrowDown size={12} />
                  ) : (
                    <ArrowUp size={12} />
                  )}{" "}
                  {Math.abs(metrics.mom).toFixed(2)}%
                </>
              )}
            </span>
          </div>
          <small className="comparison-label">
            ค่าอาหารเทียบเดือนก่อน · {formatMoney(metrics.amountChange)}
          </small>
          {timeline.some((m) => m.food !== 0) ? (
            <FoodChart data={timeline} />
          ) : (
            <EmptyState
              title="ยังไม่มีค่าอาหาร"
              description="บันทึกหมวดอาหารเพื่อเริ่มดูแนวโน้ม"
            />
          )}
          <Link href="/analytics/food" className="panel-link">
            ดูวิเคราะห์ค่าอาหาร <ArrowRight size={14} />
          </Link>
        </Card>
        <Card className="transactions-panel">
          <div className="panel-heading">
            <div>
              <h2>รายการล่าสุด</h2>
              <p>ทุกการใช้จ่ายมีเรื่องราว</p>
            </div>
            <span className="soft-label">5 รายการล่าสุด</span>
          </div>
          <div className="transaction-list">
            {recent.length ? (
              recent.map((t) => (
                <TransactionRow transaction={t} key={t.id} compact />
              ))
            ) : (
              <EmptyState onAdd={() => setEditor(null)} />
            )}
          </div>
          <Link className="panel-link" href="/transactions">
            ดูรายการทั้งหมด <ArrowRight size={14} />
          </Link>
        </Card>
        <Card className="budget-panel">
          <div className="panel-heading">
            <div>
              <h2>งบประมาณรายหมวด</h2>
              <p>ใช้ได้อย่างสบายใจ ในงบที่ตั้งไว้</p>
            </div>
            <CircleHelp size={17} className="subtle-icon" />
          </div>
          <div className="budget-list">
            {budgets.length ? (
              budgets.map((b) => {
                const c = data.categories.find((c) => c.id === b.categoryId)!;
                const used =
                  current.categories.find((c) => c.id === b.categoryId)
                    ?.amount ?? 0;
                const state = budgetState(used, b.amountSatang);
                return (
                  <div className={`budget-row ${state.status}`} key={b.id}>
                    <CategoryIcon icon={c.icon} color={c.color} size={16} />
                    <div>
                      <div className="budget-label">
                        <b>{c.name}</b>
                        <span>
                          {formatMoney(used)}{" "}
                          <small>/ {formatMoney(b.amountSatang)}</small>
                        </span>
                      </div>
                      <div className="budget-track">
                        <span
                          style={{
                            width: `${Math.max(0, Math.min(state.ratio ?? 0, 100))}%`,
                          }}
                        />
                      </div>
                      <small className="budget-remaining">
                        {state.over
                          ? `เกินงบ ${formatMoney(state.over)}`
                          : `เหลือ ${formatMoney(state.remaining)}`}
                      </small>
                    </div>
                    <small className="budget-percent">
                      {percentLabel(state.ratio)}
                    </small>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="ยังไม่ได้ตั้งงบ"
                description="เริ่มวางแผนได้ที่หน้างบประมาณ"
              />
            )}
          </div>
          <Link className="panel-link" href="/budgets">
            ดูงบประมาณทั้งหมด <ArrowRight size={14} />
          </Link>
        </Card>
      </div>
      <div className="insight-strip">
        <span className="insight-icon">
          <Sparkles size={20} />
        </span>
        <div>
          <b>บันทึกวันนี้ เข้าใจตัวเองมากขึ้นในวันพรุ่งนี้</b>
          <p>
            {metrics.mom === null
              ? "เพิ่มรายการอาหารเพื่อเริ่มติดตามแนวโน้มการใช้จ่ายของคุณ"
              : `ค่าอาหารเดือนนี้ ${formatMoney(current.food)} ${metrics.mom <= 0 ? "ลดลง" : "เพิ่มขึ้น"} ${Math.abs(metrics.mom).toFixed(2)}% เทียบเดือนก่อน${month === localDate().slice(0, 7) ? " · เดือนนี้ยังไม่สิ้นสุด การเปรียบเทียบใช้ยอดถึงวันนี้กับเดือนก่อนทั้งเดือน" : ""}`}
          </p>
        </div>
        <span className="insight-tag">YOUR MONEY STORY</span>
      </div>
    </div>
  );
}
