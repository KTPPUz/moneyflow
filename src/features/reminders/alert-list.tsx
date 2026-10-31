"use client";
import Link from "next/link";
import { Bell, Check, CircleAlert } from "lucide-react";
import { useFinance } from "@/components/providers";
import { usePlanning } from "@/components/planning-provider";
import { Button } from "@/components/ui/button";
import { planningAlerts } from "@/lib/planning";
import { emptyPlanningData } from "@/types/planning";
import type { PlanningAlert } from "@/types/planning";
export function usePlanningAlerts() {
  const { data: finance } = useFinance();
  const { data, today, update } = usePlanning();
  const alerts = planningAlerts(finance, data ?? emptyPlanningData(), today);
  const unread = alerts.filter(
    (alert) => !data?.readAlertIds.includes(alert.id),
  );
  const markRead = (ids: string[]) =>
    update((current) => ({
      ...current,
      readAlertIds: [...new Set([...current.readAlertIds, ...ids])].slice(
        -10000,
      ),
    }));
  return { alerts, unread, markRead };
}
export function AlertList({
  alerts,
  onNavigate,
}: {
  alerts: PlanningAlert[];
  onNavigate?: () => void;
}) {
  const { data, today } = usePlanning();
  const { setMonth } = useFinance();
  const { markRead } = usePlanningAlerts();
  return (
    <div className="planning-alert-list">
      {alerts.map((alert) => {
        const read = data?.readAlertIds.includes(alert.id);
        return (
          <article
            key={alert.id}
            className={`planning-alert ${alert.severity} ${read ? "read" : ""}`}
          >
            <span className="planning-alert-icon">
              {alert.severity === "danger" ? (
                <CircleAlert size={18} />
              ) : (
                <Bell size={18} />
              )}
            </span>
            <Link
              href={alert.href}
              onClick={() => {
                if (alert.kind === "budget") setMonth(today.slice(0, 7));
                if (data) void markRead([alert.id]);
                onNavigate?.();
              }}
            >
              <b>{alert.title}</b>
              <p>{alert.description}</p>
              {read && <small>อ่านแล้ว</small>}
            </Link>
            {!read && data && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`ทำเครื่องหมายอ่านแล้ว ${alert.title}`}
                onClick={() => {
                  void markRead([alert.id]);
                }}
              >
                <Check size={16} />
              </Button>
            )}
          </article>
        );
      })}
    </div>
  );
}
