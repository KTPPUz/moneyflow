"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Coffee, Info, Utensils } from "lucide-react";
import { useFinance } from "@/components/providers";
import { PageHeading } from "@/components/shared/page-heading";
import { CategoryIcon } from "@/components/shared/category-icon";
import { Card } from "@/components/ui/card";
import { CashFlowChart, FoodChart } from "@/components/dashboard/charts";
import {
  expenseAmount,
  dailyFoodTimeline,
  foodMetrics,
  rootCategory,
  summarize,
} from "@/lib/finance";
import { formatMoney, percentage, percentLabel, sumSatang } from "@/lib/money";
import { localDate, monthLabel, monthsEnding, shiftMonth } from "@/lib/dates";
function AnalyticsNav({ monthly = false }: { monthly?: boolean }) {
  return (
    <nav className="analytics-tabs" aria-label="ส่วนวิเคราะห์">
      <Link
        className={!monthly ? "active" : ""}
        aria-current={!monthly ? "page" : undefined}
        href="/analytics/food"
      >
        <Utensils size={16} />
        วิเคราะห์ค่าอาหาร
      </Link>
      <Link
        className={monthly ? "active" : ""}
        aria-current={monthly ? "page" : undefined}
        href="/analytics/monthly"
      >
        ภาพรวมรายเดือน
        <ArrowUpRight size={15} />
      </Link>
    </nav>
  );
}
export function FoodAnalyticsScreen() {
  const { data, month } = useFinance();
  const metrics = foodMetrics(data, month, shiftMonth(month, -1));
  const [mode, setMode] = useState<"amount" | "share">("amount");
  const [period, setPeriod] = useState<"daily" | "monthly">("monthly");
  const [from, setFrom] = useState(shiftMonth(month, -11)),
    [to, setTo] = useState(month);
  const [compareFrom, setCompareFrom] = useState(shiftMonth(month, -1)),
    [compareTo, setCompareTo] = useState(month);
  const [fy, fm] = from.split("-").map(Number),
    [ty, tm] = to.split("-").map(Number);
  const count = (ty - fy) * 12 + tm - fm + 1;
  const valid = !!from && !!to && count > 0 && count <= 36;
  const timeline = valid
    ? monthsEnding(to, count).map((m) => summarize(data, m))
    : [];
  const chartTimeline =
    period === "daily" && valid ? dailyFoodTimeline(data, from, to) : timeline;
  const comparison = foodMetrics(
    data,
    compareTo || month,
    compareFrom || shiftMonth(month, -1),
  );
  const stats = [
    {
      label: "ค่าอาหารเดือนนี้",
      value: formatMoney(metrics.amount),
      tone: "mint",
      detail: "รวมหมวดอาหารและหมวดย่อย",
    },
    {
      label: "สัดส่วนต่อรายรับ",
      value: percentLabel(metrics.incomeShare),
      tone: "violet",
      detail: "ค่าอาหาร ÷ รายรับทั้งหมด",
    },
    {
      label: "สัดส่วนต่อรายจ่าย",
      value: percentLabel(metrics.expenseShare),
      tone: "blue",
      detail: "ค่าอาหาร ÷ รายจ่ายสุทธิ",
    },
    {
      label: "ค่าอาหารเทียบเดือนก่อน",
      value: metrics.newSpending
        ? "เริ่มมีค่าอาหาร"
        : percentLabel(metrics.mom, true),
      tone: "rose",
      detail: `ผลต่าง ${formatMoney(metrics.amountChange)}`,
    },
  ];
  const foodCategories = data.categories
    .filter((c) => c.isFood || rootCategory(data, c.id)?.isFood)
    .map((c) => ({
      ...c,
      amount: sumSatang(
        data.transactions
          .filter(
            (t) => t.date.startsWith(`${month}-`) && t.categoryId === c.id,
          )
          .map(expenseAmount),
      ),
    }))
    .filter((c) => c.amount !== 0);
  return (
    <>
      <PageHeading
        title="อร่อยได้ เข้าใจค่าใช้จ่ายด้วย"
        description="มองให้เห็นทุกมื้อ ทุกแก้ว และพฤติกรรมการใช้จ่ายของคุณ"
        eyebrow="GOOD FOOD, BETTER MONEY HABITS"
      />
      <AnalyticsNav />
      {month === localDate().slice(0, 7) && (
        <div className="info-callout">
          <Info size={17} />
          <p>
            เดือนปัจจุบัน · ยอดถึงวันนี้ ({localDate()})
            เปรียบเทียบกับเดือนก่อนทั้งเดือน
            การเปรียบเทียบอาจยังไม่เท่ากันด้านจำนวนวัน
          </p>
        </div>
      )}
      <div className="stats-grid analytics-stats">
        {stats.map((s) => (
          <Card key={s.label} className={`stat-card ${s.tone}`}>
            <div className="stat-copy">
              <p>{s.label}</p>
              <strong className="stat-value">{s.value}</strong>
              <small>{s.detail}</small>
            </div>
          </Card>
        ))}
      </div>
      <div className="analytics-main-grid">
        <Card className="analytics-trend">
          <div className="panel-heading">
            <div>
              <h2>แนวโน้มค่าอาหาร</h2>
              <p>เลือกดูเป็นจำนวนเงิน หรือสัดส่วนต่อรายรับ</p>
            </div>
            <div className="segmented-tabs compact">
              <button
                className={mode === "amount" ? "selected" : ""}
                onClick={() => setMode("amount")}
              >
                จำนวนเงิน
              </button>
              <button
                className={mode === "share" ? "selected" : ""}
                onClick={() => setMode("share")}
              >
                % รายรับ
              </button>
            </div>
          </div>
          <div
            className="segmented-tabs compact"
            role="group"
            aria-label="ความละเอียดกราฟค่าอาหาร"
          >
            <button
              aria-pressed={period === "daily"}
              className={period === "daily" ? "selected" : ""}
              onClick={() => setPeriod("daily")}
            >
              รายวัน
            </button>
            <button
              aria-pressed={period === "monthly"}
              className={period === "monthly" ? "selected" : ""}
              onClick={() => setPeriod("monthly")}
            >
              รายเดือน
            </button>
          </div>
          <p className="table-footnote">
            {period === "daily"
              ? "แสดงค่าอาหารแยกแต่ละวัน · % คิดจากค่าอาหารวันนั้น ÷ รายรับรวมของเดือนนั้น"
              : "แสดงค่าอาหารรวมแต่ละเดือน · % คิดจากค่าอาหารเดือนนั้น ÷ รายรับรวมของเดือนนั้น"}
          </p>
          <div className="date-range">
            <label>
              จากเดือน
              <input
                type="month"
                aria-label="ช่วงวิเคราะห์จากเดือน"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <span>—</span>
            <label>
              ถึงเดือน
              <input
                type="month"
                aria-label="ช่วงวิเคราะห์ถึงเดือน"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
          {valid ? (
            <FoodChart data={chartTimeline} mode={mode} period={period} />
          ) : (
            <p role="alert" className="inline-error">
              เลือกเดือนเริ่มต้นก่อนเดือนสิ้นสุด และช่วงไม่เกิน 36 เดือน
            </p>
          )}
        </Card>
        <Card className="food-breakdown">
          <div className="panel-heading">
            <div>
              <h2>รายละเอียดในแต่ละมื้อ</h2>
              <p>{monthLabel(month)} · ค่าอาหารแยกหมวดย่อย</p>
            </div>
            <Coffee size={19} className="subtle-icon" />
          </div>
          {foodCategories.length ? (
            foodCategories.map((c) => (
              <div className="breakdown-row" key={c.id}>
                <CategoryIcon icon={c.icon} color={c.color} />
                <div>
                  <b>{c.name}</b>
                  <div className="budget-track">
                    <span
                      style={{
                        width: `${Math.min(100, Math.max(0, percentage(c.amount, metrics.amount) ?? 0))}%`,
                      }}
                    />
                  </div>
                </div>
                <span>
                  <b>{formatMoney(c.amount)}</b>
                  <small>
                    {percentLabel(percentage(c.amount, metrics.amount))}
                  </small>
                </span>
              </div>
            ))
          ) : (
            <p className="empty-text">ยังไม่มีค่าอาหารในเดือนนี้</p>
          )}
          <div className="food-breakdown-total">
            <span>ค่าอาหารสุทธิ</span>
            <strong>{formatMoney(metrics.amount)}</strong>
          </div>
        </Card>
      </div>
      <Card className="comparison-card">
        <div className="panel-heading">
          <div>
            <h2>สองเดือนที่คุณอยากเปรียบเทียบ</h2>
            <p>
              เลือกเดือนได้อิสระ · ผลต่างของสัดส่วนแสดงเป็นจุดเปอร์เซ็นต์ (pp)
            </p>
          </div>
        </div>
        <div className="comparison-content">
          <div className="date-range">
            <label>
              เดือนฐาน
              <input
                type="month"
                aria-label="เดือนฐานเปรียบเทียบ"
                value={compareFrom}
                onChange={(e) => setCompareFrom(e.target.value)}
              />
            </label>
            <span>→</span>
            <label>
              เดือนที่เปรียบเทียบ
              <input
                type="month"
                aria-label="เดือนที่เปรียบเทียบ"
                value={compareTo}
                onChange={(e) => setCompareTo(e.target.value)}
              />
            </label>
          </div>
          <div className="comparison-result">
            <div>
              <span>ค่าอาหารเปลี่ยนแปลง</span>
              <strong>
                {comparison.newSpending
                  ? "เริ่มมีค่าอาหาร"
                  : percentLabel(comparison.mom, true)}
              </strong>
              <small>{formatMoney(comparison.amountChange)}</small>
            </div>
            <div>
              <span>สัดส่วนต่อรายรับเปลี่ยนแปลง</span>
              <strong>{percentLabel(comparison.pp, true, " pp")}</strong>
              <small>
                สัดส่วนเดือนที่เลือก {percentLabel(comparison.incomeShare)}
              </small>
            </div>
          </div>
        </div>
      </Card>
      <Card className="data-table-card">
        <div className="panel-heading">
          <div>
            <h2>มองย้อนกลับ เพื่อวางแผนต่อ</h2>
            <p>
              ค่าอาหาร รายรับ และการเปลี่ยนแปลงรายเดือน · {valid ? count : 0}{" "}
              เดือน
            </p>
          </div>
        </div>
        <div className="table-scroll">
          <table className="analysis-table">
            <caption className="sr-only">เปรียบเทียบค่าอาหารรายเดือน</caption>
            <thead>
              <tr>
                <th>เดือน</th>
                <th>รายรับ</th>
                <th>ค่าอาหาร</th>
                <th>% ต่อรายรับ</th>
                <th>% ต่อรายจ่าย</th>
                <th>เทียบเดือนก่อน</th>
                <th>ผลต่างสัดส่วน (pp)</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((m) => {
                const f = foodMetrics(data, m.key, shiftMonth(m.key, -1));
                return (
                  <tr key={m.key}>
                    <th>
                      {m.name}
                      {m.key === localDate().slice(0, 7) && (
                        <small>ถึงวันนี้</small>
                      )}
                    </th>
                    <td>{formatMoney(m.income)}</td>
                    <td>{formatMoney(m.food)}</td>
                    <td>{percentLabel(f.incomeShare)}</td>
                    <td>{percentLabel(f.expenseShare)}</td>
                    <td
                      className={
                        f.mom !== null && f.mom > 0 ? "negative" : "positive"
                      }
                    >
                      {f.newSpending
                        ? "เริ่มมีค่าอาหาร"
                        : percentLabel(f.mom, true)}
                    </td>
                    <td>{percentLabel(f.pp, true, " pp")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="table-footnote">
          N/A = ไม่มีฐานรายรับ / รายจ่าย หรือค่าอาหารเดือนก่อนเป็นศูนย์ ·
          ไม่แสดงเปอร์เซ็นต์อนันต์
        </p>
      </Card>
    </>
  );
}
export function MonthlyAnalyticsScreen() {
  const { data, month } = useFinance();
  const timeline = monthsEnding(month, 12).map((m) => summarize(data, m));
  return (
    <>
      <PageHeading
        title="ภาพรวมเงิน ตลอดทั้งปี"
        description="อ่านแนวโน้มรายรับ รายจ่าย และกระแสเงินสดสุทธิของคุณ"
        eyebrow="SEE THE BIGGER PICTURE"
      />
      <AnalyticsNav monthly />
      <Card className="monthly-chart-card">
        <div className="panel-heading">
          <div>
            <h2>รายรับ – รายจ่ายย้อนหลัง 12 เดือน</h2>
            <p>กระแสเงินสดสุทธิ = รายรับ − รายจ่าย · ไม่ใช่ยอดบัญชี</p>
          </div>
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
            สุทธิ
          </span>
        </div>
        <CashFlowChart data={timeline} />
      </Card>
      <Card className="data-table-card">
        <div className="panel-heading">
          <h2>รายละเอียดรายเดือน</h2>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>เดือน</th>
                <th>รายรับ</th>
                <th>รายจ่ายสุทธิ</th>
                <th>กระแสเงินสดสุทธิ</th>
                <th>ค่าอาหาร</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((m) => (
                <tr key={m.key}>
                  <th>{m.name}</th>
                  <td className="positive">{formatMoney(m.income)}</td>
                  <td>{formatMoney(m.expense)}</td>
                  <td className={m.balance < 0 ? "negative" : "positive"}>
                    {formatMoney(m.balance)}
                  </td>
                  <td>{formatMoney(m.food)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
