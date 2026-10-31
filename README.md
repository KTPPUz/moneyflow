# MoneyFlow — บันทึกเงิน เห็นภาพชีวิต

**v0.4:** มีหมวดมาตรฐาน 21 รายการ (รายรับ 5, รายจ่ายหลัก 12, หมวดย่อยอาหาร 4) สำหรับเริ่มใช้งาน ไม่มีรายการ บัญชี งบประมาณ หรือยอดเงินตัวอย่าง สร้างบัญชีของคุณแล้วเลือกหมวดเพื่อเพิ่มรายการได้ทันที ระบบรักษาหมวดและข้อมูลที่คุณแก้ไว้ และไม่เพิ่มหมวดซ้ำเมื่อรีเฟรช

Personal Finance Tracker ภาษาไทย อ้างอิง [PRD](docs/requirements.md) และ [Design System](docs/design-system.md) ที่ผู้ใช้ส่งมา

## ใช้งาน

Node.js >= 20.9

```sh
npm install
npm run dev
```

เปิด http://127.0.0.1:3001/dashboard

```sh
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm start
```

E2E ใช้ Chrome บน macOS ถ้ามี หรือ Playwright Chromium (`npx playwright install chromium`) ทดสอบที่ 390×844, 768×1024, 1024×900 และ 1440×1000px

Production build ใช้ Webpack เนื่องจาก Turbopack production worker มีข้อจำกัดพอร์ตใน environment ที่ใช้พัฒนา

## สิ่งที่ใช้งานได้ใน Frontend

- `/dashboard`: สรุปจากรายการที่คุณบันทึก เลือกเดือน/ปี กราฟ 6/12 เดือน และรายการล่าสุด 5 รายการ
- `/transactions`: เพิ่ม แก้ไข ลบ พร้อมยืนยันและเลิกทำ ค้นหา กรองเดือน/ประเภท/บัญชี/หมวด และเรียงตามวันที่/จำนวนเงิน
- `/analytics/food`: สัดส่วนต่อรายรับ/รายจ่าย, MoM, pp, เทียบสองเดือน, ช่วงข้อมูลสูงสุด 36 เดือน, ตารางและหมวดย่อยอาหาร
- `/analytics/monthly`: กราฟและตารางรายรับรายจ่ายย้อนหลัง 12 เดือน
- `/budgets`: ตั้งงบรวมและรายหมวดรายเดือน ดูยอดใช้/คงเหลือ/เกินงบ และสถานะ 80%/100%/>100%
- `/categories`: สร้าง เปลี่ยนชื่อ สี ไอคอน หมวดย่อย จัดลำดับ เก็บถาวร/นำกลับมาใช้โดยรักษาประวัติ
- `/accounts`: เพิ่มบัญชีเงินสด ธนาคาร e-Wallet และบัตรเครดิต พร้อมยอดยกมา ยังไม่มี flow โอนเงิน
- `/login`: สมัครและเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน
- `/settings`: ดูสถานะการเก็บข้อมูล ออกจากระบบ และล้างข้อมูลด้วยการยืนยัน
- Light/Dark Mode, loading skeleton, empty/error/retry, keyboard dialog และตารางข้อมูลประกอบกราฟ

## ข้อมูล

เริ่มด้วยหมวดหมู่มาตรฐานเท่านั้น ทุกยอดคำนวณจากรายการที่คุณกรอก ข้อมูลเก็บใน MySQL แยกตามบัญชีผู้ใช้ เข้าถึงผ่าน `/api/finance` ที่ตรวจ session และ validate ทุกครั้ง เงินเก็บเป็น `DECIMAL(15,2)` การบันทึกซ้อนจากหลายอุปกรณ์ตรวจด้วย revision แล้วนำการแก้ไขไปใช้ซ้ำบนข้อมูลล่าสุด

ครั้งแรกที่เข้าสู่ระบบ หากบัญชียังว่างและเบราว์เซอร์มีข้อมูลเดิมใน localStorage (`moneyflow-local-v1` หรือ `moneyflow-demo-v2`) ระบบจะนำเข้าบัญชีนั้นหนึ่งครั้ง และเก็บสำเนาในเบราว์เซอร์ไว้โดยไม่ลบ ข้อมูลเวอร์ชันเดิมจะตัดรายการตัวอย่างออกก่อนนำเข้า

## ตั้งค่าฐานข้อมูลและ Deploy บน Vercel

1. สร้าง MySQL ที่เข้าถึงจากอินเทอร์เน็ตได้ เช่น TiDB Cloud (region Singapore) หรือ Aiven แล้วคัดลอก connection string โดยเติม `?sslaccept=strict`
2. ใน Vercel > Settings > Environment Variables ตั้งค่าตาม [.env.example](.env.example): `DATABASE_URL`, `BETTER_AUTH_SECRET` (สร้างด้วย `openssl rand -base64 32`) และ `BETTER_AUTH_URL` (URL จริงของเว็บ)
3. Deploy ได้เลย สคริปต์ `vercel-build` จะรัน `prisma migrate deploy` ให้ตารางตรงกับ [prisma/migrations](prisma/migrations)
4. สมัครบัญชีของคุณที่ `/login` แล้วตั้ง `AUTH_DISABLE_SIGNUP=true` และ redeploy เพื่อปิดรับสมัครคนอื่น

### TiDB และเวลาโหลด API

โปรเจกต์นี้กำหนด Vercel Function region เป็น Singapore (`sin1`) ใน `vercel.json` ให้ตรงกับฐานข้อมูลที่ใช้อยู่ หากย้ายฐานข้อมูลไป region อื่นให้เปลี่ยนตามด้วย

URL ของ TiDB Cloud จะเปิด TLS และตรวจใบรับรองให้อัตโนมัติทั้ง Prisma migrations และ runtime แม้ไม่ได้ใส่ `sslaccept` ส่วน MySQL cloud provider อื่นให้ตั้ง `sslaccept=strict` ตามคำแนะนำ provider

หลัง deploy ตรวจ `/api/finance` ใน DevTools > Network > Headers:

- `X-MoneyFlow-Region` ระบุ region ที่ Function ทำงานจริง
- `Server-Timing`: `session` คือเวลาตรวจ session, `finance` คือเวลาโหลด/บันทึกข้อมูลรวม validation และ transaction, `total` คือเวลาที่ API handler ใช้ (หน่วย ms) ไม่รวม cold start ก่อนเริ่ม handlerหรือการเดินทางจากเบราว์เซอร์
- ตั้ง `MONEYFLOW_LOG_TIMINGS=true` ใน Vercel เพื่อให้ Runtime Logs แสดงเวลาและ region โดยไม่ log ข้อมูลการเงิน

ดูหลักฐานก่อน/หลังและข้อจำกัดการวัดใน [บันทึก TiDB latency](docs/postmortems/tidb-connection-latency.md)

Preview deployment ใช้ `DATABASE_URL` ที่ตั้งให้ environment นั้น และรัน migration กับฐานข้อมูลนั้นด้วย จึงควรแยกฐานข้อมูลของ Preview ออกจาก Production

ในเครื่อง: คัดลอก `.env.example` เป็น `.env`, ใส่ค่าฐานข้อมูล MySQL 8 (ไม่ต้องใช้ `sslaccept` ถ้าเป็น local) แล้วรัน `npm run db:migrate` และ `npm run dev`

การล้างข้อมูลในหน้าตั้งค่าต้องยืนยันและกลับเป็นข้อมูลว่างพร้อมหมวดหมู่มาตรฐาน ไม่มีปุ่มสร้าง Demo ใหม่ Fixture เดิมใช้เฉพาะการทดสอบและระบุรายการเก่าระหว่าง migration เท่านั้น

## โครงสร้าง

```text
src/app/                    # Next.js App Router
src/components/ui/          # shadcn/ui patterns + Radix dialogs
src/components/layout/      # Sidebar, topbar, mobile navigation
src/components/shared/      # Month picker, headings, states, icons
src/features/               # Dashboard, transactions, analytics, budgets, categories, accounts, settings
src/data/local/             # ข้อมูลเดิมใน browser, initial state และ migration
src/data/remote/            # Repository ฝั่ง browser ที่เรียก /api/finance
src/data/server/            # อ่าน/เขียน MySQL แยกตามผู้ใช้
prisma/                     # Schema และ migrations
src/types/                  # Domain types ที่ใช้ร่วมกัน
src/lib/                    # สูตรการเงิน วัน/เขตเวลา validation ธีม
```

Stack: Next.js, TypeScript, Tailwind CSS, shadcn/ui conventions, Radix, Lucide, Recharts, React Hook Form, Zod และ TanStack Query ฟอนต์ IBM Plex Sans Thai และ Inter ติดตั้งในโปรเจกต์ ไม่เรียก Google Fonts ตอน runtime

จำนวนเงินเป็น integer satang; parse decimal input ด้วย BigInt, รวมด้วย safe integers และปฏิเสธยอดที่ทำให้ aggregate ไม่ปลอดภัย สัดส่วนไม่ปัดระหว่างคำนวณ ปัดที่การแสดงผลสองตำแหน่ง

## ยังไม่ทำในระยะนี้

Transfer editor, recurring, savings, CSV export, notifications, รีเซ็ตรหัสผ่านทางอีเมล และยืนยันอีเมล ไม่มีการเชื่อมบัญชีธนาคารจริง

ดู [รายงานเทียบเอกสาร](docs/gap-analysis.md), [ขอบเขตระยะนี้](docs/phase-1.md), [ผลตรวจสอบ](docs/validation.md)
