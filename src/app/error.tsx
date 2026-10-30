"use client";
import { ErrorState } from "@/components/shared/states";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      message="เกิดข้อผิดพลาดในการแสดงข้อมูล ลองโหลดหน้านี้อีกครั้ง"
      onRetry={reset}
    />
  );
}
