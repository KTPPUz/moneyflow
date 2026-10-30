"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/shared/states";
import { formatMoney, percentage, percentLabel } from "@/lib/money";
import type { MonthSummary } from "@/types/finance";
const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--foreground)",
  fontSize: 12,
};
export function CashFlowChart({ data }: { data: MonthSummary[] }) {
  return (
    <>
      <div
        className="cash-chart"
        aria-label="กราฟรายรับ รายจ่าย และกระแสเงินสดสุทธิ"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart
            data={data}
            barGap={4}
            margin={{ top: 10, right: 0, bottom: 0, left: -14 }}
          >
            <defs>
              {[
                ["income", "var(--chart-income)"],
                ["expense", "var(--chart-expense)"],
                ["balance", "var(--chart-balance)"],
              ].map(([id, color]) => (
                <linearGradient
                  id={`bar-${id}`}
                  key={id}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--chart-grid)"
              strokeDasharray="3 4"
            />
            <XAxis
              dataKey="short"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              dy={8}
            />
            <YAxis
              tickFormatter={(v) => (v === 0 ? "0" : `${v / 100000}k`)}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              width={47}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "var(--muted)" }}
              formatter={(value) => formatMoney(Number(value))}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""}
            />
            <Bar
              name="รายรับ"
              dataKey="income"
              fill="url(#bar-income)"
              radius={[4, 4, 0, 0]}
              maxBarSize={17}
            />
            <Bar
              name="รายจ่าย"
              dataKey="expense"
              fill="url(#bar-expense)"
              radius={[4, 4, 0, 0]}
              maxBarSize={17}
            />
            <Bar
              name="กระแสเงินสดสุทธิ"
              dataKey="balance"
              fill="url(#bar-balance)"
              radius={[4, 4, 0, 0]}
              maxBarSize={17}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data">
        <summary>ดูข้อมูลกราฟแบบตาราง</summary>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">รายรับรายจ่ายย้อนหลัง</caption>
            <thead>
              <tr>
                <th>เดือน</th>
                <th>รายรับ</th>
                <th>รายจ่าย</th>
                <th>สุทธิ</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.key}>
                  <th>{m.name}</th>
                  <td>{formatMoney(m.income)}</td>
                  <td>{formatMoney(m.expense)}</td>
                  <td>{formatMoney(m.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
export function SpendingChart({ month }: { month: MonthSummary }) {
  const positive = month.categories.filter((c) => c.amount > 0);
  return (
    <div className="spending-content">
      {month.categories.some((c) => c.amount < 0) ? (
        <p className="chart-refund-note">
          มีเงินคืนสุทธิบางหมวด แสดงยอดจริงในตารางแทนกราฟโดนัท
        </p>
      ) : positive.length ? (
        <div
          className="donut-wrap"
          aria-label={`รายจ่ายสุทธิ ${formatMoney(month.expense)}`}
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={positive}
                dataKey="amount"
                nameKey="name"
                innerRadius="68%"
                outerRadius="96%"
                startAngle={90}
                endAngle={-270}
                stroke="var(--card)"
                strokeWidth={2}
              >
                {positive.map((c) => (
                  <Cell key={c.id} fill={c.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => formatMoney(Number(v))}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center">
            <small>รายจ่ายทั้งหมด</small>
            <strong>{formatMoney(month.expense)}</strong>
            <span>ในเดือนที่เลือก</span>
          </div>
        </div>
      ) : (
        <EmptyState
          title="ยังไม่มีรายจ่าย"
          description="รายการใหม่จะแสดงที่นี่"
        />
      )}
      <div className="category-legend">
        {month.categories.map((c) => (
          <div key={c.id}>
            <i className="legend-dot" style={{ background: c.color }} />
            <span>{c.name}</span>
            <small>{percentLabel(percentage(c.amount, month.expense))}</small>
            <b>{formatMoney(c.amount)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
export function FoodChart({
  data,
  mode = "share",
}: {
  data: MonthSummary[];
  mode?: "share" | "amount";
}) {
  const points = data.map((m) => ({
    ...m,
    value: mode === "share" ? percentage(m.food, m.income) : m.food,
  }));
  return (
    <>
      <div
        className={`food-chart ${mode === "amount" ? "large-chart" : ""}`}
        aria-label={
          mode === "share"
            ? "กราฟสัดส่วนค่าอาหารต่อรายรับ"
            : "กราฟจำนวนเงินค่าอาหาร"
        }
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart
            data={points}
            margin={{ top: 18, right: 12, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient
                id={`food-fill-${mode}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--chart-food)"
                  stopOpacity={0.18}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-food)"
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--chart-grid)"
              strokeDasharray="3 4"
            />
            <XAxis
              dataKey="short"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              dy={8}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, "auto"]}
              tickFormatter={(v) =>
                mode === "share" ? `${v}%` : `${v / 100000}k`
              }
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              width={49}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""}
              formatter={(v) => [
                mode === "share"
                  ? percentLabel(Number(v))
                  : formatMoney(Number(v)),
                mode === "share" ? "ค่าอาหาร / รายรับ" : "ค่าอาหาร",
              ]}
            />
            <Area
              type="linear"
              dataKey="value"
              stroke="var(--chart-food)"
              strokeWidth={2.5}
              fill={`url(#food-fill-${mode})`}
              connectNulls={false}
              dot={{
                r: 3.5,
                fill: "var(--chart-food)",
                stroke: "var(--card)",
                strokeWidth: 2,
              }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data">
        <summary>ดูข้อมูลกราฟแบบตาราง</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>เดือน</th>
                <th>ค่าอาหาร</th>
                <th>ต่อรายรับ</th>
              </tr>
            </thead>
            <tbody>
              {points.map((m) => (
                <tr key={m.key}>
                  <th>{m.name}</th>
                  <td>{formatMoney(m.food)}</td>
                  <td>{percentLabel(percentage(m.food, m.income))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
