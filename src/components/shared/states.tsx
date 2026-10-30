import { CircleAlert, SearchX, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
export function EmptyState({
  title = "ยังไม่มีข้อมูลในช่วงนี้",
  description = "ลองเปลี่ยนช่วงเวลาหรือเพิ่มรายการแรกของคุณ",
  onAdd,
}: {
  title?: string;
  description?: string;
  onAdd?: () => void;
}) {
  return (
    <div className="empty-state">
      <span>
        <SearchX size={26} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {onAdd && <Button onClick={onAdd}>เพิ่มรายการแรก</Button>}
    </div>
  );
}
export function LoadingState() {
  return (
    <div
      className="loading-screen"
      aria-busy="true"
      aria-label="กำลังโหลดข้อมูล"
    >
      <div className="loading-title">
        <Sparkles /> MoneyFlow
      </div>
      <div className="skeleton skeleton-heading" />
      <div className="stats-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
      <div className="skeleton skeleton-chart" />
      <p>กำลังเตรียมภาพรวมการเงินของคุณ…</p>
    </div>
  );
}
export function ErrorState({
  message,
  onRetry,
  onReset,
}: {
  message: string;
  onRetry: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <CircleAlert size={32} />
      <h1>โหลดข้อมูลไม่สำเร็จ</h1>
      <p>{message}</p>
      <div>
        <Button onClick={onRetry}>ลองอีกครั้ง</Button>
        {onReset && (
          <Button variant="outline" onClick={onReset}>
            ล้างข้อมูลในเบราว์เซอร์
          </Button>
        )}
      </div>
    </div>
  );
}
