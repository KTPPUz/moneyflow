"use client";
import { useState } from "react";
import { Database, Info, LogOut, RotateCcw, ShieldCheck } from "lucide-react";
import { useFinance } from "@/components/providers";
import { authClient } from "@/lib/auth-client";
import { PageHeading } from "@/components/shared/page-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
export function SettingsScreen() {
  const { data, reset } = useFinance();
  const [confirm, setConfirm] = useState(false),
    [pending, setPending] = useState(false);
  return (
    <>
      <PageHeading
        title="พื้นที่เล็ก ๆ ที่เป็นของคุณ"
        description="ดูแลข้อมูลและการตั้งค่าพื้นที่ส่วนตัวของคุณ"
        eyebrow="MAKE YOURSELF AT HOME"
        showMonth={false}
      />
      <div className="settings-grid">
        <Card className="settings-card">
          <span className="settings-icon">
            <ShieldCheck size={25} />
          </span>
          <h2>ข้อมูลของคุณ</h2>
          <p>
            รายการ หมวดหมู่ และงบประมาณบันทึกในฐานข้อมูลภายใต้บัญชีของคุณ
            เข้าสู่ระบบจากอุปกรณ์ใดก็เห็นข้อมูลชุดเดียวกัน
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              await authClient.signOut();
              window.location.assign("/login");
            }}
          >
            <LogOut size={16} />
            ออกจากระบบ
          </Button>
          <dl>
            <div>
              <dt>ภาษา / สกุลเงิน</dt>
              <dd>ไทย / THB (บาท)</dd>
            </div>
            <div>
              <dt>เขตเวลา</dt>
              <dd>Asia/Bangkok</dd>
            </div>
            <div>
              <dt>ธีม</dt>
              <dd>สลับจากปุ่มดวงอาทิตย์ / พระจันทร์ด้านบน</dd>
            </div>
            <div>
              <dt>ข้อมูล</dt>
              <dd>
                {data.transactions.length} รายการ · {data.categories.length}{" "}
                หมวดหมู่
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="settings-card">
          <span className="settings-icon">
            <Database size={25} />
          </span>
          <h2>ล้างข้อมูลในบัญชี</h2>
          <p>
            ล้างรายการ หมวดหมู่ บัญชี และงบประมาณของ MoneyFlow ในฐานข้อมูล
            หลังล้างจะเหลือเฉพาะหมวดหมู่มาตรฐาน ไม่มีรายการหรือยอดเงินตั้งต้น
          </p>
          <div className="info-callout">
            <Info size={17} />
            <p>การล้างมีผลกับทุกอุปกรณ์ที่ใช้บัญชีนี้</p>
          </div>
          <Button variant="outline" onClick={() => setConfirm(true)}>
            <RotateCcw size={16} />
            ล้างข้อมูลทั้งหมด
          </Button>
        </Card>
      </div>
      <Modal
        open={confirm}
        onOpenChange={(v) => {
          if (!pending) setConfirm(v);
        }}
        title="ล้างข้อมูลทั้งหมด?"
        description="รายการ บัญชี งบประมาณ และหมวดที่กำหนดเองจะถูกลบ แล้วคืนหมวดหมู่มาตรฐาน"
      >
        <div className="help-content">
          <p>
            การล้างครั้งนี้ย้อนกลับไม่ได้ กรุณาเก็บสำเนาข้อมูลที่ต้องการไว้ก่อน
          </p>
        </div>
        <div className="form-actions">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setConfirm(false)}
          >
            ยกเลิก
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              const ok = await reset();
              setPending(false);
              if (ok) setConfirm(false);
            }}
          >
            ยืนยันล้างข้อมูล
          </Button>
        </div>
      </Modal>
    </>
  );
}
