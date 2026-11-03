"use client";
import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { localDate, monthLabel } from "@/lib/dates";

const months = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export function MonthField({
  label,
  ariaLabel,
  value,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  value: string;
  onChange: (month: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = localDate().slice(0, 7);
  const [year, setYear] = useState(Number((value || today).slice(0, 4)));
  const selected = useRef<HTMLButtonElement>(null);
  const yearSelect = useRef<HTMLSelectElement>(null);
  function choose(month: string) {
    onChange(month);
    setOpen(false);
  }
  return (
    <div className="month-field">
      <span className="month-field-label">{label}</span>
      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          if (next) setYear(Number((value || today).slice(0, 4)));
          setOpen(next);
        }}
      >
        <Dialog.Trigger className="month-field-trigger" aria-label={ariaLabel}>
          <CalendarDays size={17} aria-hidden="true" />
          <span>{value ? monthLabel(value) : "เลือกเดือน"}</span>
          <ChevronDown size={15} aria-hidden="true" />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="month-select-overlay" />
          <Dialog.Content
            className="month-select-dialog"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              (selected.current ?? yearSelect.current)?.focus();
            }}
          >
            <div className="month-select-heading">
              <div>
                <span className="month-select-kicker">เลือกช่วงเวลาของคุณ</span>
                <Dialog.Title>{label}</Dialog.Title>
              </div>
              <Dialog.Close
                className="month-select-icon"
                aria-label="ปิดตัวเลือกเดือน"
              >
                <X size={18} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              เลือกปี พ.ศ. แล้วเลือกเดือนที่ต้องการ
            </Dialog.Description>
            <div className="month-select-year">
              <button
                type="button"
                className="month-select-icon"
                aria-label="ปีก่อนหน้า"
                disabled={year <= 1000}
                onClick={() => setYear(year - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              <label>
                <span>พ.ศ.</span>
                <select
                  ref={yearSelect}
                  aria-label={`เลือกปีสำหรับ${label}`}
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                >
                  {Array.from({ length: 21 }, (_, i) => year - 10 + i)
                    .filter((y) => y >= 1000 && y <= 9999)
                    .map((y) => (
                      <option key={y} value={y}>
                        {y + 543}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                className="month-select-icon"
                aria-label="ปีถัดไป"
                disabled={year >= 9999}
                onClick={() => setYear(year + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div
              className="month-select-grid"
              role="group"
              aria-label="เดือนในปีที่เลือก"
              onKeyDown={(event) => {
                const buttons = Array.from(
                  event.currentTarget.querySelectorAll("button"),
                );
                const index = buttons.indexOf(
                  event.target as HTMLButtonElement,
                );
                if (index < 0) return;
                const deltas: Record<string, number> = {
                  ArrowLeft: -1,
                  ArrowRight: 1,
                  ArrowUp: -3,
                  ArrowDown: 3,
                };
                const delta = deltas[event.key];
                if (
                  delta !== undefined ||
                  event.key === "Home" ||
                  event.key === "End"
                ) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? 11
                        : (index + delta! + 12) % 12;
                  buttons[next].focus();
                }
              }}
            >
              {months.map((name, index) => {
                const key = `${year}-${String(index + 1).padStart(2, "0")}`;
                return (
                  <button
                    type="button"
                    key={key}
                    ref={key === value ? selected : undefined}
                    aria-label={monthLabel(key)}
                    aria-pressed={key === value}
                    data-current={key === today || undefined}
                    onClick={() => choose(key)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <div className="month-select-footer">
              <span>
                {value
                  ? `เลือกอยู่: ${monthLabel(value)}`
                  : "เลือกเดือนที่ต้องการ"}
              </span>
              <button type="button" onClick={() => choose(today)}>
                เดือนนี้
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
