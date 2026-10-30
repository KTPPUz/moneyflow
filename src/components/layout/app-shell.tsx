"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleHelp,
  Ellipsis,
  Grid2X2,
  House,
  Leaf,
  Moon,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Wallet,
  WalletCards,
  X,
} from "lucide-react";
import { useFinance } from "@/components/providers";
import { useTheme } from "@/lib/use-theme";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { TransactionEditor } from "@/features/transactions/transaction-editor";
export const routes = [
  { href: "/dashboard", label: "ภาพรวม", icon: House },
  { href: "/transactions", label: "รายการ", icon: WalletCards },
  { href: "/analytics/food", label: "วิเคราะห์", icon: ChartNoAxesCombined },
  { href: "/budgets", label: "งบประมาณ", icon: Wallet },
  { href: "/categories", label: "หมวดหมู่", icon: Grid2X2 },
  { href: "/accounts", label: "บัญชี", icon: WalletCards },
  { href: "/settings", label: "ตั้งค่า", icon: Settings2 },
];
export function Brand() {
  return (
    <Link href="/dashboard" className="brand" aria-label="MoneyFlow หน้าหลัก">
      <span className="brand-mark">
        <Leaf size={25} />
      </span>
      <span>
        Money<span className="brand-flow">Flow</span>
        <small>MAKE ROOM FOR YOUR LIFE</small>
      </span>
    </Link>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(),
    router = useRouter();
  const { setEditor, notice, clearNotice } = useFinance();
  const { dark, toggleTheme } = useTheme();
  const [more, setMore] = useState(false),
    [help, setHelp] = useState(false),
    [bell, setBell] = useState(false);
  const current =
    routes.find(
      (r) =>
        r.href === pathname ||
        (r.href === "/analytics/food" && pathname.startsWith("/analytics")),
    ) ?? routes[0];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/transactions");
        requestAnimationFrame(() =>
          document
            .querySelector<HTMLInputElement>("#transaction-search")
            ?.focus(),
        );
      }
      if (e.key === "Escape") setBell(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        ข้ามไปเนื้อหาหลัก
      </a>
      <aside className="sidebar">
        <div>
          <Brand />
          <div className="sidebar-label">จัดการเงินในแบบของคุณ</div>
          <nav aria-label="เมนูหลัก">
            {routes.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                title={label}
                aria-current={current.href === href ? "page" : undefined}
                className={`nav-item ${current.href === href ? "active" : ""}`}
              >
                <Icon size={19} />
                <span>{label}</span>
                {current.href === href && <i className="active-dot" />}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <div className="saving-promo">
            <div className="promo-art">
              <div className="art-card art-card-back" />
              <div className="art-card art-card-front">
                <span>MoneyFlow</span>
                <Sparkles size={23} />
                <i />
              </div>
              <span className="art-coin">฿</span>
              <span className="art-spark">✦</span>
            </div>
            <h3>
              เริ่มจากเข้าใจเงิน
              <br />
              ไปถึงชีวิตที่ตั้งใจ
            </h3>
            <p>
              ทุกการบันทึกเล็ก ๆ วันนี้
              <br />
              ช่วยให้คุณเห็นภาพวันข้างหน้า
            </p>
            <Link href="/budgets" className="promo-link">
              วางแผนงบประมาณ <ArrowUpRight size={16} />
            </Link>
          </div>
          <button className="help-link" onClick={() => setHelp(true)}>
            <CircleHelp size={17} />
            <span>คู่มือการใช้งาน</span>
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-footer">
            <span className="status-dot" /> พื้นที่ส่วนตัว <span>v0.3</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            พื้นที่ส่วนตัว <span>/</span>
            <b>{current.label}</b>
          </div>
          <div className="mobile-brand">
            <Brand />
          </div>
          <div className="topbar-actions">
            <Link href="/transactions" className="search-shortcut">
              <Search size={16} />
              <span>ค้นหารายการ...</span>
              <kbd>⌘ K</kbd>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={
                dark ? "เปลี่ยนเป็น Light Mode" : "เปลี่ยนเป็น Dark Mode"
              }
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </Button>
            <div className="notification-wrap">
              <Button
                variant="ghost"
                size="icon"
                aria-label="การแจ้งเตือน"
                aria-expanded={bell}
                onClick={() => setBell(!bell)}
              >
                <Bell size={19} />
                <i className="notification-dot" />
              </Button>
              {bell && (
                <div className="notification-popover">
                  <b>พื้นที่ของคุณ</b>
                  <p>
                    ข้อมูลเก็บในฐานข้อมูลภายใต้บัญชีของคุณ
                    ยังไม่เชื่อมต่อธนาคารหรือบัญชีจริง
                  </p>
                  <Link href="/settings" onClick={() => setBell(false)}>
                    จัดการข้อมูล →
                  </Link>
                </div>
              )}
            </div>
            <span className="topbar-divider" />
            <Link className="profile" href="/settings">
              <span className="avatar">ฉ</span>
              <span>
                พื้นที่ของฉัน<small>บัญชีส่วนบุคคล</small>
              </span>
              <ChevronDown size={14} />
            </Link>
          </div>
        </header>
        <main id="main-content">
          {children}
          <footer className="main-footer">
            <span>© 2026 MoneyFlow · บันทึกเงิน เห็นภาพชีวิต</span>
            <span>
              <i className="status-dot" /> บันทึกในฐานข้อมูลแล้ว
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="เมนูมือถือ">
        {routes.slice(0, 4).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={current.href === href ? "active" : ""}
            aria-current={current.href === href ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
        <button onClick={() => setMore(true)}>
          <Ellipsis size={21} />
          <span>เพิ่มเติม</span>
        </button>
      </nav>
      <button
        className="mobile-add"
        onClick={() => setEditor(null)}
        aria-label="เพิ่มรายการใหม่"
      >
        <Plus size={25} />
      </button>
      <TransactionEditor />
      <Modal
        open={more}
        onOpenChange={setMore}
        title="พื้นที่ของคุณ"
        description="จัดการหมวดหมู่ บัญชี และการตั้งค่า"
      >
        <div className="more-links">
          {routes.slice(4).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMore(false)}>
              <Icon size={20} />
              {label}
              <ArrowUpRight size={17} />
            </Link>
          ))}
        </div>
      </Modal>
      <Modal
        open={help}
        onOpenChange={setHelp}
        title="เริ่มต้นกับ MoneyFlow"
        description="เริ่มบันทึกและจัดการข้อมูลการเงินของคุณ"
      >
        <div className="help-content">
          <p>
            1. กด “เพิ่มรายการ” เลือกประเภทรายการ จำนวนเงิน หมวดหมู่ บัญชี
            และวันที่
          </p>
          <p>2. ดูยอดและกราฟคำนวณใหม่ทันทีในหน้าภาพรวมและวิเคราะห์</p>
          <p>3. ปรับงบประมาณหรือสร้างหมวดหมู่ของคุณเองได้</p>
          <p>
            ข้อมูลบันทึกในฐานข้อมูลภายใต้บัญชีของคุณ
            เข้าสู่ระบบจากอุปกรณ์อื่นก็เห็นข้อมูลชุดเดียวกัน
          </p>
        </div>
      </Modal>
      {notice && (
        <div
          className={`toast ${notice.tone}`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          <span className="toast-symbol">
            {notice.tone === "success" ? (
              <Check size={18} />
            ) : (
              <CircleHelp size={18} />
            )}
          </span>
          <span>{notice.message}</span>
          {notice.undo && (
            <button
              onClick={() => {
                const undo = notice.undo;
                clearNotice();
                undo?.();
              }}
            >
              เลิกทำ
            </button>
          )}
          <button onClick={clearNotice} aria-label="ปิดข้อความ">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
