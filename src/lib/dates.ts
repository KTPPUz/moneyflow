export const TIMEZONE = "Asia/Bangkok";
export function localDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function shiftMonth(month: string, by: number) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + by);
  return date.toISOString().slice(0, 7);
}
export function monthsEnding(month: string, count = 12) {
  return Array.from({ length: count }, (_, i) =>
    shiftMonth(month, i - count + 1),
  );
}
export function monthLabel(month: string, short = false) {
  return new Date(`${month}-15T12:00:00Z`).toLocaleDateString("th-TH", {
    month: short ? "short" : "long",
    year: "numeric",
    timeZone: TIMEZONE,
  });
}
export function shortMonth(month: string) {
  return new Date(`${month}-15T12:00:00Z`).toLocaleDateString("th-TH", {
    month: "short",
    timeZone: TIMEZONE,
  });
}
export function dateLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: TIMEZONE,
  });
}
