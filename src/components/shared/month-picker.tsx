"use client";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useFinance } from "@/components/providers";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { Button } from "@/components/ui/button";
const names = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];
export function MonthPicker() {
  const { month, setMonth, data } = useFinance();
  const [year, number] = month.split("-");
  const years = Array.from(
    new Set([
      Number(year),
      ...data.transactions.map((t) => Number(t.date.slice(0, 4))),
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
    ]),
  ).sort((a, b) => a - b);
  return (
    <div className="month-picker" aria-label={monthLabel(month)}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="เดือนก่อนหน้า"
        onClick={() => setMonth(shiftMonth(month, -1))}
      >
        <ChevronLeft size={17} />
      </Button>
      <CalendarDays size={17} />
      <select
        aria-label="เลือกเดือน"
        value={number}
        onChange={(e) => setMonth(`${year}-${e.target.value}`)}
      >
        {names.map((name, i) => (
          <option key={name} value={String(i + 1).padStart(2, "0")}>
            {name}
          </option>
        ))}
      </select>
      <select
        aria-label="เลือกปี"
        value={year}
        onChange={(e) => setMonth(`${e.target.value}-${number}`)}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y + 543}
          </option>
        ))}
      </select>
      <Button
        variant="ghost"
        size="icon"
        aria-label="เดือนถัดไป"
        onClick={() => setMonth(shiftMonth(month, 1))}
      >
        <ChevronRight size={17} />
      </Button>
    </div>
  );
}
