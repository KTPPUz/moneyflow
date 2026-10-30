"use client";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Search, Trash2, X } from "lucide-react";
import { useFinance } from "@/components/providers";
import { PageHeading } from "@/components/shared/page-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/states";
import { TransactionRow } from "./transaction-row";
import { formatMoney, sumSatang } from "@/lib/money";
import { rootCategory } from "@/lib/finance";
import type { Transaction } from "@/types/finance";
export function TransactionsScreen() {
  const { data, month, update, notify, setEditor } = useFinance();
  const [search, setSearch] = useState(""),
    [kind, setKind] = useState("all"),
    [account, setAccount] = useState("all"),
    [category, setCategory] = useState("all"),
    [sort, setSort] = useState("date-desc"),
    [deleting, setDeleting] = useState<Transaction | null>(null),
    [pending, setPending] = useState(false);
  const monthRows = data.transactions.filter((t) =>
    t.date.startsWith(`${month}-`),
  );
  const rows = monthRows
    .filter(
      (t) =>
        (kind === "all" || t.kind === kind) &&
        (account === "all" || t.accountId === account) &&
        (category === "all" ||
          t.categoryId === category ||
          rootCategory(data, t.categoryId)?.id === category) &&
        t.description
          .toLocaleLowerCase("th")
          .includes(search.toLocaleLowerCase("th")),
    )
    .sort((a, b) =>
      sort === "amount-desc"
        ? b.amountSatang - a.amountSatang
        : sort === "amount-asc"
          ? a.amountSatang - b.amountSatang
          : sort === "date-asc"
            ? a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
            : b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
    );
  const hasFilter =
    search || kind !== "all" || account !== "all" || category !== "all";
  async function remove() {
    if (!deleting) return;
    setPending(true);
    const removed = deleting;
    const ok = await update((current) => ({
      ...current,
      transactions: current.transactions.filter((t) => t.id !== removed.id),
    }));
    setPending(false);
    if (ok) {
      setDeleting(null);
      notify("ลบรายการแล้ว", "success", () => {
        void update((current) => ({
          ...current,
          transactions: current.transactions.some((t) => t.id === removed.id)
            ? current.transactions
            : [...current.transactions, removed],
        })).then((restored) => {
          if (restored) notify("คืนรายการเรียบร้อยแล้ว");
        });
      });
    }
  }
  const hasRefund =
    deleting && data.transactions.some((t) => t.refundOf === deleting.id);
  return (
    <>
      <PageHeading
        title="รายการรายรับ – รายจ่าย"
        description="ทุกบาทมีที่มา ทุกการบันทึกช่วยให้เห็นภาพชัดขึ้น"
        eyebrow="THE LITTLE THINGS ADD UP"
      />
      <div className="mini-summary-grid">
        <Card>
          <span className="mini-summary-icon mint">
            <ArrowDownLeft size={20} />
          </span>
          <div>
            <p>รายรับในรายการที่แสดง</p>
            <b className="positive">
              {formatMoney(
                sumSatang(
                  rows
                    .filter((t) => t.kind === "income")
                    .map((t) => t.amountSatang),
                ),
              )}
            </b>
          </div>
        </Card>
        <Card>
          <span className="mini-summary-icon rose">
            <ArrowUpRight size={20} />
          </span>
          <div>
            <p>รายจ่ายสุทธิในรายการที่แสดง</p>
            <b className="negative">
              {formatMoney(
                sumSatang(
                  rows.map((t) =>
                    t.kind === "expense"
                      ? t.amountSatang
                      : t.kind === "refund"
                        ? -t.amountSatang
                        : 0,
                  ),
                ),
              )}
            </b>
          </div>
        </Card>
      </div>
      <Card className="transaction-page">
        <div className="list-toolbar">
          <div
            className="segmented-tabs"
            role="group"
            aria-label="กรองประเภทรายการ"
          >
            {[
              ["all", "ทั้งหมด"],
              ["income", "รายรับ"],
              ["expense", "รายจ่าย"],
              ["refund", "คืนเงิน"],
            ].map(([value, label]) => (
              <button
                key={value}
                aria-pressed={kind === value}
                className={kind === value ? "selected" : ""}
                onClick={() => setKind(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="result-count">{rows.length} รายการ</span>
        </div>
        <div className="filters">
          <label className="filter-search">
            <Search size={17} />
            <input
              id="transaction-search"
              aria-label="ค้นหารายละเอียดรายการ"
              placeholder="ค้นหารายการ เช่น กาแฟ, ข้าวกลางวัน..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button aria-label="ล้างคำค้น" onClick={() => setSearch("")}>
                <X size={15} />
              </button>
            )}
          </label>
          <label>
            <span className="sr-only">กรองบัญชี</span>
            <select
              aria-label="กรองบัญชี"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="all">ทุกบัญชี</option>
              {data.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">กรองหมวดหมู่</span>
            <select
              aria-label="กรองหมวดหมู่"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">ทุกหมวดหมู่</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? "↳ " : ""}
                  {c.name}
                  {c.archivedAt ? " (เก็บถาวร)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">เรียงลำดับ</span>
            <select
              aria-label="เรียงลำดับ"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="date-desc">วันที่ล่าสุด</option>
              <option value="date-asc">วันที่เก่าสุด</option>
              <option value="amount-desc">จำนวนเงินมากสุด</option>
              <option value="amount-asc">จำนวนเงินน้อยสุด</option>
            </select>
          </label>
        </div>
        {hasFilter && (
          <button
            className="clear-filters"
            onClick={() => {
              setSearch("");
              setKind("all");
              setAccount("all");
              setCategory("all");
            }}
          >
            <X size={13} />
            ล้างตัวกรอง
          </button>
        )}
        <div className="transaction-table-head">
          <span>รายการ / หมวดหมู่</span>
          <span>วันที่</span>
          <span>จำนวนเงิน</span>
          <span>จัดการ</span>
        </div>
        <div className="full-transaction-list">
          {rows.length ? (
            rows.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                onDelete={setDeleting}
              />
            ))
          ) : (
            <EmptyState
              title={
                hasFilter ? "ไม่พบรายการที่ค้นหา" : "เดือนนี้ยังไม่มีรายการ"
              }
              description={
                hasFilter
                  ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง"
                  : "เริ่มบันทึกเรื่องเงินเล็ก ๆ ของคุณวันนี้"
              }
              onAdd={() => setEditor(null)}
            />
          )}
        </div>
        <div className="list-footer">
          <span>
            แสดง {rows.length} จาก {monthRows.length} รายการในเดือนนี้
          </span>
          <span>จำนวนเงินเป็นบาท (THB)</span>
        </div>
      </Card>
      <Modal
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v && !pending) setDeleting(null);
        }}
        title="ลบรายการนี้?"
        description="ลบจากข้อมูลในเบราว์เซอร์ และสามารถกดเลิกทำหลังลบได้"
      >
        <div className="delete-preview">
          <Trash2 size={23} />
          <div>
            <b>{deleting?.description || "รายการ"}</b>
            <p>{deleting && formatMoney(deleting.amountSatang)}</p>
          </div>
        </div>
        {hasRefund && (
          <p role="alert" className="inline-error">
            รายการนี้มีการคืนเงินอ้างอิงอยู่ กรุณาลบรายการคืนเงินก่อน
            เพื่อรักษาประวัติให้สอดคล้องกัน
          </p>
        )}
        <div className="form-actions">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setDeleting(null)}
          >
            ยกเลิก
          </Button>
          <Button
            variant="destructive"
            disabled={pending || !!hasRefund}
            onClick={remove}
          >
            {pending ? "กำลังลบ…" : "ยืนยันลบรายการ"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
