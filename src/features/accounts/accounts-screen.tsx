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
import { paymentSummary, paymentChannel } from "@/lib/accounts";
import { formatMoney } from "@/lib/money";
import type { Account } from "@/types/finance";
import { AccountForm, accountLabels } from "./account-form";
import { DeleteAccountDialog } from "./delete-account-dialog";
export function AccountsScreen() {
  const { data } = useFinance();
  const [editing, setEditing] = useState<Account | null | undefined>(),
    [deleting, setDeleting] = useState<Account | null>(null),
    [view, setView] = useState<"spending" | "balances">("spending");
  const summary = paymentSummary(data);
  return (
    <>
      <PageHeading
        title="เงินของคุณ อยู่ที่ไหนบ้าง"
        description="ใช้รายรับก้อนเดียวกัน แล้วแยกดูว่าจ่ายผ่านเงินสด ธนาคาร หรือ e-Wallet เท่าไร"
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
          เงินสดและเงินโอนหักจากรายรับรวมก้อนเดียวกัน
          การเลือกช่องทางจ่ายช่วยแยกยอดใช้จ่าย
          โดยไม่ต้องแบ่งรายรับให้แต่ละช่องทาง
        </p>
      </div>
      <Card className="account-total">
        <span>เงินคงเหลือรวมทุกช่องทาง</span>
        <strong>{formatMoney(summary.balance)}</strong>
        <p className="account-pool-formula">
          {summary.opening !== 0 && (
            <span>ยอดยกมารวม {formatMoney(summary.opening)} + </span>
          )}
          <span>รายรับรวม {formatMoney(summary.income)}</span>
          <span> − รายจ่ายสุทธิทุกช่องทาง {formatMoney(summary.expense)}</span>
        </p>
        <p>รวมรายการทุกเดือน · เงินโอนระหว่างบัญชีไม่เพิ่มรายรับหรือรายจ่าย</p>
      </Card>
      <div className="account-view-toolbar">
        <div className="planning-tabs" aria-label="มุมมองช่องทางใช้จ่าย">
          <Button
            variant={view === "spending" ? "default" : "ghost"}
            aria-pressed={view === "spending"}
            onClick={() => setView("spending")}
          >
            ใช้จ่ายตามช่องทาง
          </Button>
          <Button
            variant={view === "balances" ? "default" : "ghost"}
            aria-pressed={view === "balances"}
            onClick={() => setView("balances")}
          >
            ยอดแยกบัญชี
          </Button>
        </div>
        <p>
          {view === "spending"
            ? "ยอดใช้จ่ายด้านล่างถูกหักในเงินคงเหลือรวมแล้ว"
            : "ยอดแยกบัญชีขึ้นกับเงินเข้า–ออกและยอดยกมาของแต่ละบัญชี จึงอาจติดลบหากไม่ได้บันทึกการแบ่งเงินหรือการโอน"}
        </p>
      </div>
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
              <p className="account-value-label">
                {view === "spending"
                  ? "รายจ่ายสุทธิผ่านช่องทางนี้"
                  : "ยอดคงเหลือแยกบัญชี"}
              </p>
              <strong>
                {formatMoney(
                  view === "spending"
                    ? paymentChannel(data, account.id).expense
                    : accountBalance(data, account.id),
                )}
              </strong>
              <p>
                {view === "spending"
                  ? `${paymentChannel(data, account.id).count} รายการจ่าย/คืนเงิน · หักจากรายรับรวมแล้ว`
                  : `ยอดยกมา ${formatMoney(account.openingBalanceSatang)}`}
              </p>
              {view === "balances" && account.type === "credit" && (
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
      <p className="account-view-footnote">
        ยอดคำนวณจากข้อมูลที่คุณบันทึก ยังไม่ซิงค์กับธนาคารอัตโนมัติ
      </p>
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
