"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prepareReceipt } from "@/lib/receipt-client";

export function ReceiptAttachment({
  receiptId,
  disabled,
  onFile,
  onRemove,
  onBusyChange,
}: {
  receiptId?: string;
  disabled: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [preview, setPreview] = useState<string>();
  const [filename, setFilename] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const source =
    preview ?? (receiptId ? `/api/receipts/${receiptId}` : undefined);
  return (
    <div className="receipt-attachment">
      <label htmlFor="transaction-receipt">
        <Paperclip size={15} /> แนบสลิป{" "}
        <span className="optional">(ถ้ามี)</span>
      </label>
      <input
        id="transaction-receipt"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || busy}
        aria-describedby="receipt-help"
        aria-invalid={!!error}
        onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          setError(undefined);
          setBusy(true);
          onBusyChange(true);
          try {
            const prepared = await prepareReceipt(file);
            setPreview(URL.createObjectURL(prepared));
            setFilename(file.name);
            onFile(prepared);
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "เปิดรูปไม่ได้ กรุณาลองอีกครั้ง",
            );
          } finally {
            setBusy(false);
            onBusyChange(false);
          }
        }}
      />
      <small id="receipt-help">
        JPG, PNG หรือ WebP · ไม่เกิน 10 MB · รูปใหญ่จะถูกย่อก่อนบันทึก
      </small>
      {busy && <p role="status">กำลังเตรียมรูป…</p>}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {source && (
        <div className="receipt-preview">
          {/* Authenticated images must be fetched directly with the user's cookie. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={source} alt="สลิปที่แนบกับรายการ" />
          <div>
            <span>{filename ?? "สลิปที่แนบไว้"}</span>
            <div className="receipt-actions">
              <a href={source} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> ดูรูปเต็ม
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || busy}
                onClick={() => {
                  setPreview(undefined);
                  setFilename(undefined);
                  setError(undefined);
                  onRemove();
                }}
              >
                <Trash2 size={14} /> นำสลิปออก
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
