// Monetary values remain safe integer satang, including signed net cash flow.
export const MAX_AMOUNT = 999999999999999;
export function assertSatang(value: number) {
  if (!Number.isSafeInteger(value))
    throw new Error("Amount must be safe integer satang");
  return value;
}
export function sumSatang(values: number[]) {
  return values.reduce(
    (sum, value) => assertSatang(sum + assertSatang(value)),
    0,
  );
}
export function parseMoney(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim()))
    throw new Error("กรอกจำนวนเงินให้ถูกต้อง ทศนิยมไม่เกิน 2 ตำแหน่ง");
  const [whole, fraction = ""] = value.trim().split(".");
  const satang = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (satang <= 0n || satang > BigInt(MAX_AMOUNT))
    throw new Error(
      "จำนวนเงินต้องมากกว่า 0 และไม่เกิน 9,999,999,999,999.99 บาท",
    );
  return Number(satang);
}
export function moneyInput(satang: number) {
  assertSatang(satang);
  return `${Math.trunc(satang / 100)}.${String(Math.abs(satang) % 100).padStart(2, "0")}`;
}
export function formatMoney(satang: number, decimals = false) {
  assertSatang(satang);
  const amount = Math.abs(satang);
  return `${satang < 0 ? "−" : ""}฿${Math.floor(amount / 100).toLocaleString("th-TH")}${decimals || amount % 100 ? `.${String(amount % 100).padStart(2, "0")}` : ""}`;
}
// Ratios are unrounded internally; round only at the presentation boundary.
export function percentage(part: number, total: number) {
  assertSatang(part);
  assertSatang(total);
  return total <= 0 ? null : (part / total) * 100;
}
export function percentChange(current: number, previous: number) {
  return previous <= 0 ? null : percentage(current - previous, previous);
}
export function percentLabel(
  value: number | null,
  signed = false,
  suffix = "%",
) {
  return value === null
    ? "N/A"
    : `${signed && value > 0 ? "+" : ""}${value.toFixed(2)}${suffix}`;
}
// DECIMAL(15,2) columns travel as strings so no value passes through a float.
export function satangToDecimal(satang: number) {
  assertSatang(satang);
  const amount = Math.abs(satang);
  return `${satang < 0 ? "-" : ""}${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
}
export function decimalToSatang(value: { toFixed(digits: number): string }) {
  return assertSatang(Number(value.toFixed(2).replace(".", "")));
}
