"use client";
import { Paperclip, Pencil, Trash2 } from "lucide-react";
import { useFinance } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/shared/category-icon";
import { dateLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { Transaction } from "@/types/finance";
export function TransactionRow({
  transaction: t,
  onDelete,
  compact = false,
}: {
  transaction: Transaction;
  onDelete?: (t: Transaction) => void;
  compact?: boolean;
}) {
  const { data, setEditor } = useFinance();
  const category = data.categories.find((c) => c.id === t.categoryId);
  const account = data.accounts.find((a) => a.id === t.accountId);
  return (
    <div className={`transaction ${compact ? "compact" : ""}`}>
      <CategoryIcon icon={category?.icon} color={category?.color} />
      <div className="transaction-name">
        <b>{t.description || category?.name || "รายการ"}</b>
        <small>
          {category?.name} <span>· {account?.name}</span>
        </small>
        {t.receiptId && (
          <a
            className="transaction-receipt"
            href={`/api/receipts/${t.receiptId}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`ดูสลิป ${t.description || category?.name || "รายการ"}`}
          >
            <Paperclip size={12} /> ดูสลิป
          </a>
        )}
      </div>
      {!compact && (
        <span className="transaction-date">{dateLabel(t.date)}</span>
      )}
      <div className="transaction-amount">
        <b className={t.kind === "expense" ? "negative" : "positive"}>
          {t.kind === "expense" ? "−" : "+"}
          {formatMoney(t.amountSatang)}
        </b>
        {compact && <small>{dateLabel(t.date)}</small>}
        {t.kind === "refund" && <small>คืนเงิน</small>}
      </div>
      {onDelete && (
        <div className="row-actions">
          {t.kind !== "refund" && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`แก้ไข ${t.description || category?.name}`}
              onClick={() => setEditor(t)}
            >
              <Pencil size={16} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={`ลบ ${t.description || category?.name}`}
            onClick={() => onDelete(t)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
