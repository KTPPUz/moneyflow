# Save-error investigation — 31 October 2026

- User report: housing expense THB 4,400, category home, cash account, date 2026-10-30, description ค่าหอพัก, from Dashboard in dark theme.
- Exact-input reproduction on the current source passed in desktop and mobile browser contexts using a personal cash account and standard categories. The failure in the user's existing tab has not been reproduced or assigned a confirmed root cause.
- Trace: TransactionForm -> FinanceProvider.update -> shared FINANCE_QUERY_KEY -> localRepository.write -> financeSchema -> localStorage -> cache refresh. Current read and write use the same key.
- Confirmed separate reporting defect: rejected saves showed a generic form error while the actual cause only appeared in a temporary toast. Storage-quota rejection reproduces this consistently.
- Change: update accepts an optional error callback; the transaction form retains the actual message inline. Zod issues are reduced to unique messages rather than dumping JSON. Entered values stay in the form.
- Validation: 13 unit groups passed; targeted browser suite 5 passed / 1 mobile storage test intentionally skipped; lint and production build with TypeScript passed.
- User's browser data was not accessed, reset or changed. Asked whether reload resolves the existing-tab failure and requested the actual error text if it persists. This record does not claim the user's original failure is resolved.

# Category setup update — v0.4

- Standard reference data: 5 income, 12 root expense and 4 food subcategories; no financial records or opening balances.
- Pure initializer tested for repeat insertion without duplication, existing name/ID matching, preserved edits/archive/order, reused custom parent IDs and stable isFood inheritance.
- Runtime read inserts only missing categories into browser-local storage for both existing and new users; reset returns standard categories with no financial records.
- React Query read/write/invalidate/reset now share FINANCE_QUERY_KEY to prevent cache-key drift. CRUD/browser regression tests exercise this path.
- Unit tests: 12 groups passed. Prior records below describe earlier milestones.

# Validation update — v0.3 removal of demo data

- Fresh local repository starts with no transactions, accounts, categories, budgets or opening balances.
- Removed Demo labels, sample profile wording and demo reset behavior. Reset now clears active data after explicit confirmation.
- Legacy migration removes unchanged generated records and keeps user-created/edited entries, custom budgets/categories/accounts and required refund relationships. It does not touch theme preferences or other apps.
- First-account creation, first-category creation and first transaction verified on desktop and mobile, including persistence after reload.
- `npm test`: 9 groups passed (6 finance + 3 migration).
- `npm run test:e2e`: 13 cases passed; 15 intentionally skipped by viewport selection. Regression suites explicitly inject fixtures; production never initializes them.
- `npm run lint` and Webpack production build (including TypeScript): passed.
- Active storage key: moneyflow-local-v1. Legacy key is read only for one-time migration when the active key is absent; an existing valid active key takes precedence, including after reset.

The v0.2 validation record below describes the previous milestone.

# Validation — MoneyFlow Frontend Mock MVP v0.2

## ผ่านแล้ว

- `npm run lint`: ESLint Next.js core-web-vitals และ TypeScript ไม่มี error/warning
- `npm run typecheck`: TypeScript strict ผ่าน
- `npm test`: 6 unit-test groups ผ่าน
- `npm run test:e2e`: 10 cases ผ่าน, 10 skipped ตาม project selection ไม่มี failure
- `npm run build`: Webpack production build ผ่าน รวม /dashboard, /transactions, /analytics/food, /analytics/monthly, /budgets, /categories, /accounts, /settings

## ขอบเขตทดสอบ

Unit tests ใน tests/finance.test.ts:

1. decimal input → integer satang, เศษสตางค์, signed net, zero/negative/invalid/over-limit input และ overflow
2. PRD acceptance example (+20.00%, 20.57%, +0.57 pp), ฐานศูนย์ และ new spending
3. reconcile category totals กับ transaction ledger ทุกเดือน, เปลี่ยนชื่ออาหาร และแก้รายการย้อนหลัง
4. คืนเงินหักค่าใช้จ่าย ไม่ใช่รายรับ, โอนเงิน/ชำระบัตรไม่เพิ่มค่าใช้จ่าย และปฏิเสธคืนเงินเกินยอดเดิม
5. Bangkok midnight/month/year boundaries, วันที่ไม่มีจริง และ leap year
6. งบ 79/80/100/101%, งบไม่กำหนด, archive preserving history และ validation หมวด/วันที่/จำนวนเงิน

Browser tests ใน tests/browser/dashboard.spec.ts:

- กำหนดเวลา 30 ต.ค. 2569 เพื่อให้ fixture และผลตรวจ deterministic
- Route smoke, ยอด Dashboard, เลือกเดือน/ปีว่าง, 5 recent transactions, Light/Dark และจำธีมหลัง reload ทั้ง 390×844, 768×1024, 1024×900, 1440×1000
- ตรวจ horizontal overflow ด้วย scrollWidth เทียบ documentElement.clientWidth (ไม่ใช้ window.innerWidth ที่อาจขยายบน mobile)
- CRUD → refresh → dashboard recalculation, zero amount validation, delete confirmation/undo และ account filter บน desktop/mobile
- Budget warning/overrun, custom food category, archive preserving transaction และ food analytics recalculation บน desktop/mobile
- Corrupted localStorage → error/retry → reset with confirmation บน desktop
- Storage quota failure → ไม่มี false success, คงค่าฟอร์มเดิมและแสดง error บน desktop
- ดัก uncaught pageerror ระหว่าง route/theme smoke ไม่มี error

Cases ที่ skip คือ CRUD/budget ที่ไม่ทำซ้ำบน tablet/1024 และ storage-error tests ที่รันเฉพาะ desktop ไม่ใช่การข้ามข้อผิดพลาด

ตรวจ screenshot Light/Dark ที่ 390/768/1024/1440 แล้ว ภาพทดสอบอยู่ใน test-results/ (gitignored) ข้อจำกัด: ใช้ Chrome/Chromium จำลอง viewport ยังไม่ได้ตรวจ Safari จริง, screen reader จริง หรือรับรอง WCAG ทั้งระบบ

## บันทึกปัญหาที่แก้ระหว่าง QA

### Mobile budget edit ถูกเมนูทับ

**Summary:** flow แก้งบใน mobile หยุดที่ปุ่ม “แก้งบ อาหารและเครื่องดื่ม” เพราะ header action ล้นจอ แก้ flex wrapping และพื้นที่ scroll สำหรับ controls แล้ว

**Reproduction:** `npm run test:e2e -- --project=mobile --grep 'budgets and custom'` ก่อนแก้ timeout ที่ button click โดย `<nav class="mobile-nav">` intercepts pointer events

**Root cause:** src/app/globals.css จัด `.heading-actions` เป็นแถวเดียว ขนาด month picker รวมปุ่มปรับงบเกิน 390px ทำ layout viewport ขยาย: documentElement.clientWidth=390 แต่ innerWidth=414 และ scrollWidth=414 เมนู fixed อิง viewport ที่ขยาย ขณะ pointer อยู่ใน visual viewport ทำให้ปุ่มถูกเมนูทับหลัง scroll

**Fix:** `.heading-actions` บน mobile wrap ได้ และวาง month picker เต็มแถวเมื่อมี custom action เพิ่ม scroll-padding/scroll-margin เพื่อเว้น fixed bottom navigation ไม่ใช้ overflow:hidden เพื่อซ่อนต้นเหตุ และแก้ overflow assertion ให้เทียบ clientWidth

**Debug evidence:** การวัดด้วย getBoundingClientRect/elementFromPoint พบปุ่ม header ด้านขวา x=413.94 และ budget edit ถูก mobile-nav hit-test; scroll จัดกลางทำให้ปุ่มกดได้ จึงแยกปัญหาออกจาก event handler/ฟอร์ม ไม่พบ server exception ที่เกี่ยวข้อง

**Why it slipped through:** assertion เดิมใช้ innerWidth จึงเทียบ 414 กับ 414 แล้วผ่าน แม้จอจริง 390 การ smoke route อย่างเดียวไม่ได้คลิกแก้งบบน mobile

**Validation:** focused failing repro ผ่าน และ full suite ผ่าน 10 cases รวม mobile CRUD/budget/archive และ overflow ที่เทียบ clientWidth

**Follow-up:** คง regression test และ clientWidth assertion ไว้ใน suite เดิม ไม่ได้สร้าง external ticket หรือ PR ใน session นี้

### Production Turbopack worker restriction

`next build` แบบ Turbopack เคย panic ที่ globals.css → PostCSS worker → binding internal port → EPERM ทั้ง sandbox และรันขอสิทธิ์เพิ่ม ในขณะที่ dev render ผ่านและ `next build --webpack` ผ่าน จึงใช้ Webpack สำหรับ production build ยังไม่ได้แยกสาเหตุ cache/worker restriction ภายใน Turbopack อย่างสมบูรณ์ ไม่อ้างว่าเป็น defect ของ application

## ยังไม่รับรอง

- Authentication/user authorization tests รอ Backend
- ความทนทานหรือความปลอดภัยของฐานข้อมูลจริง: ยังไม่มี MySQL/Prisma/API
- Production p95 benchmark: ยังไม่ได้กำหนด network profile กับผู้ใช้
- Browser-local demo persistence ไม่ทดแทน backup/restore ของ production
