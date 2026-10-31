"use client";
import { useState } from "react";
import { Info, Pencil, Plus, Trash2 } from "lucide-react";
import { useFinance } from "@/components/providers";
import { PageHeading } from "@/components/shared/page-heading";
import { CategoryIcon } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/states";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { accountBalance } from "@/lib/finance";
import { formatMoney, sumSatang } from "@/lib/money";
import type { Account } from "@/types/finance";
import { AccountForm, accountLabels } from "./account-form";
import { DeleteAccountDialog } from "./delete-account-dialog";
export function AccountsScreen() {
  const { data } = useFinance();
  const [editing, setEditing] = useState<Account | null | undefined>(),
    [deleting, setDeleting] = useState<Account | null>(null);
  return (
    <>
      <PageHeading
        title="เงินของคุณ อยู่ที่ไหนบ้าง"
        description="จัดการบัญชีและติดตามยอดเงินจากรายการที่บันทึก"
        eyebrow="EVERY ACCOUNT, ONE CLEAR VIEW"
        showMonth={false}
        action={
          <Button onClick={() => setEditing(null)}>
            <Plus size={17} />
            เพิ่มบัญชี
          </Button>
        }
      />
      <div className="info-callout">
        <Info size={17} />
        <p>
          ข้อมูลเก็บในฐานข้อมูลภายใต้บัญชีของคุณ
          ไม่มีการเชื่อมต่อธนาคารอัตโนมัติ
          การโอนเงินระหว่างบัญชียังไม่เปิดใช้งาน
        </p>
      </div>
      <Card className="account-total">
        <span>ยอดบัญชีรวม</span>
        <strong>
          {formatMoney(
            sumSatang(data.accounts.map((a) => accountBalance(data, a.id))),
          )}
        </strong>
        <p>รวมยอดยกมา และรายการทุกเดือน · ต่างจากกระแสเงินสดสุทธิรายเดือน</p>
      </Card>
      {data.accounts.length ? (
        <div className="account-cards">
          {data.accounts.map((account) => (
            <Card key={account.id} className="account-card">
              <div className="account-card-heading">
                <CategoryIcon
                  icon={account.type === "credit" ? "credit" : "wallet"}
                />
                <span className="soft-label">
                  {accountLabels[account.type]}
                </span>
                <div className="account-card-actions">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`แก้ไขบัญชี ${account.name}`}
                    onClick={() => setEditing(account)}
                  >
                    <Pencil size={17} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`ลบบัญชี ${account.name}`}
                    onClick={() => setDeleting(account)}
                  >
                    <Trash2 size={17} />
                  </Button>
                </div>
              </div>
              <h2>{account.name}</h2>
              <strong>{formatMoney(accountBalance(data, account.id))}</strong>
              <p>ยอดยกมา {formatMoney(account.openingBalanceSatang)}</p>
              {account.type === "credit" && (
                <small>ยอดติดลบแสดงหนี้คงค้าง</small>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="ยังไม่มีบัญชี"
            description="เริ่มจากเพิ่มเงินสด บัญชีธนาคาร e-Wallet หรือบัตรเครดิตของคุณ"
          />
          <div className="empty-action">
            <Button onClick={() => setEditing(null)}>
              <Plus size={17} />
              เพิ่มบัญชีแรก
            </Button>
          </div>
        </Card>
      )}
      {editing !== undefined && (
        <AccountForm account={editing} onClose={() => setEditing(undefined)} />
      )}
      {deleting && (
        <DeleteAccountDialog
          account={deleting}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
