"use client";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanning } from "@/components/planning-provider";
import { AlertList, usePlanningAlerts } from "./alert-list";
export function NotificationCenter({
  open,
  onToggle,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { data, loading, error, retry } = usePlanning();
  const { alerts, unread, markRead } = usePlanningAlerts();
  return (
    <div className="notification-wrap">
      <Button
        variant="ghost"
        size="icon"
        aria-label="การแจ้งเตือน"
        aria-expanded={open}
        onClick={onToggle}
      >
        <Bell size={19} />
        {unread.length > 0 && (
          <span className="notification-count">
            {unread.length > 99 ? "99+" : unread.length}
            <span className="sr-only"> รายการยังไม่อ่าน</span>
          </span>
        )}
      </Button>
      {open && (
        <div
          className="notification-popover planning-notifications"
          role="dialog"
          aria-label="รายการแจ้งเตือน"
        >
          <div className="planning-notification-heading">
            <b>การแจ้งเตือน</b>
            <span className="soft-label">{unread.length} ใหม่</span>
          </div>
          {loading && <p role="status">กำลังโหลดกำหนดจ่าย…</p>}
          {error && (
            <div role="alert">
              <p>โหลดกำหนดจ่ายไม่สำเร็จ</p>
              <Button variant="outline" size="sm" onClick={retry}>
                ลองอีกครั้ง
              </Button>
            </div>
          )}
          {data && unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void markRead(unread.map((a) => a.id));
              }}
            >
              <CheckCheck size={14} />
              อ่านทั้งหมดแล้ว
            </Button>
          )}
          {alerts.length ? (
            <AlertList alerts={alerts.slice(0, 6)} onNavigate={onClose} />
          ) : (
            !loading &&
            !error && <p>ยังไม่มีงบใกล้หมดหรือบิลที่ต้องดูแลตอนนี้</p>
          )}
          <Link
            className="planning-view-all"
            href="/reminders"
            onClick={onClose}
          >
            ดูทั้งหมดและจัดการบิล →
          </Link>
        </div>
      )}
    </div>
  );
}
