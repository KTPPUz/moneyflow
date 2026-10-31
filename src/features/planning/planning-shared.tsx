"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { usePlanning } from "@/components/planning-provider";
import { ErrorState } from "@/components/shared/states";
export function PlanningLoadState() {
  const { error, retry } = usePlanning();
  return error ? (
    <ErrorState message={error} onRetry={retry} />
  ) : (
    <div className="planning-loading" role="status">
      กำลังโหลดแผนของคุณ…
    </div>
  );
}
export function ConfirmPlanningDelete({
  title,
  description,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title={title}
      description={description}
    >
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button variant="outline" onClick={onClose} disabled={pending}>
          ยกเลิก
        </Button>
        <Button
          variant="destructive"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const ok = await onConfirm();
            setPending(false);
            if (ok) onClose();
            else setError("ลบไม่สำเร็จ กรุณาลองอีกครั้ง");
          }}
        >
          {pending ? "กำลังลบ…" : "ยืนยันลบ"}
        </Button>
      </div>
    </Modal>
  );
}
