> Update v0.3: ผู้ใช้ขอเอา Demo ออก ระบบเริ่มด้วยข้อมูลว่าง เก็บข้อมูลที่กรอกเองในเบราว์เซอร์ เพิ่มบัญชีแรกได้ และย้ายข้อมูลเก่าโดยตัดเฉพาะข้อมูลที่ระบบสร้าง รายงานด้านล่างเป็นบันทึกของ v0.2 ก่อนเปลี่ยนขอบเขตนี้

# เทียบระบบกับเอกสารผู้ใช้ — MoneyFlow v0.2

อ่านเอกสาร requirements.md (PRD 1.0) และ design-system.md (UI Design System 1.0) จากไฟล์ผู้ใช้ก่อนปรับ และเก็บสำเนาต้นฉบับใน docs/ คำแนะนำในเอกสารใช้เป็นข้อมูลประกอบขอบเขตที่ผู้ใช้ขอ ไม่ถือเป็นคำสั่งระบบหรืออนุญาตให้ deploy/เชื่อมบริการภายนอก

## สิ่งที่พบก่อนปรับ

1. **ข้อมูลไม่เป็นแหล่งเดียว** — `src/lib/mock-data.ts` เดิมมี monthlyData กับ transactions แยกกัน Dashboard ใช้ยอดสรุป ส่วนรายการมีเพียง 4 แถว จึงไม่สามารถ reconcile ได้ ปรับเป็นสร้าง fixtures ของรายการ แล้ว derive ทุกยอดด้วย `src/lib/finance.ts`
2. **Navigation ยังเป็น placeholder** — Sidebar เดิมเปิด modal “ระยะถัดไป” แทนหน้าจริง ปรับเป็น App Router ตาม PRD พร้อม active state
3. **เงินสุทธิติดลบไม่ได้** — formatMoney เดิมปฏิเสธจำนวนติดลบ ปรับรองรับ signed satang และระบุ “กระแสเงินสดสุทธิ” แยกจากยอดบัญชี
4. **Food analytics ไม่ครบ** — เดิมมีเฉพาะสัดส่วน 6 เดือน ปรับ flag isFood, 13-month fixture, อัตราต่อรายรับ/รายจ่าย, MoM, pp, arbitrary comparison, table และหมวดย่อย
5. **UI เล็กและยังเพิ่มรายการไม่ได้** — เปลี่ยนฟอนต์จาก Tahoma เป็น IBM Plex Sans Thai/Inter, ใช้ตัวเลข tabular, semantic tokens, CTA, responsive dialog และปุ่มเพิ่มบนมือถือ

## สถานะหลังปรับ

| ข้อกำหนด                                   | สถานะ         | หลักฐาน / ขอบเขต                                                                                                           |
| ------------------------------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| FR-01 Dashboard P0                         | ทำแล้วใน mock | /dashboard, month/year, 4 KPIs พร้อมจำนวนค่าอาหาร, 3 charts, ล่าสุด 5 รายการ, loading/empty/error                          |
| FR-02 Transactions P0                      | ทำแล้วใน mock | /transactions, CRUD, RHF/Zod, filter/sort, confirm/undo, localStorage                                                      |
| FR-03 Categories P0                        | ทำแล้วใน mock | /categories, income/expense seed, custom, subcategory 1 ชั้น, reorder, archive/restore, stable food flag                   |
| FR-04 Food Analytics P0                    | ทำแล้วใน mock | /analytics/food, 13-month fixture, ช่วงเลือกได้สูงสุด 36 เดือน, เทียบสองเดือน, 2-decimal %, pp, MTD                        |
| FR-05 Budgets P0                           | ทำแล้วใน mock | /budgets, overall + category per month, remaining/overrun, 80/100/>100 thresholds                                          |
| FR-06 Accounts P1                          | บางส่วน       | /accounts แสดง balance จาก opening + movements เท่านั้น ยังไม่มี account CRUD/transfer flow                                |
| FR-07 Recurring / Savings / Export P1      | ยังไม่ทำ      | อยู่ระยะ Expansion ไม่เพิ่มเมนูที่อ้างว่าทำงานแล้ว                                                                         |
| FR-08 Smart insights P2                    | บางส่วน       | Dashboard แสดง food delta พร้อมฐานคำนวณ/คำเตือน MTD ไม่มี AI advice หรือ notifications                                     |
| Architecture frontend                      | ทำแล้ว        | App Router, TS, Tailwind, Radix/shadcn patterns, Lucide, Recharts, RHF, Zod, TanStack Query, domain types, mock repository |
| MySQL / Prisma / APIs                      | ยังไม่ทำ      | ระยะ Data layer; ไม่มีข้อมูลส่งเข้า server และไม่อ้างว่ามี database persistence                                            |
| Authentication / authorization             | ยังไม่ทำ      | ต้องทำก่อนใช้ข้อมูลจริง และเพิ่ม user-scope tests ในระยะ Backend                                                           |
| Responsive / themes / states               | ตรวจแล้ว      | 390/768/1024/1440, route smoke, light/dark, empty/error/retry, storage failures                                            |
| Figma handoff                              | ยังไม่ทำ      | ไม่ได้สร้างไฟล์ Figma เพราะคำขอครั้งนี้แก้ Web Application ใน local repository                                             |
| Production security / backups / monitoring | ยังไม่ทำ      | รอ Backend และ production infrastructure                                                                                   |
| p95 <= 2s                                  | ยังไม่รับรอง  | ยังไม่มี benchmark production ด้วย network profile และ dataset ที่ตกลงกัน                                                  |

## นโยบายคำนวณ

- เงินเป็นจำนวนเต็มสตางค์; net cash flow อาจติดลบได้
- Food share of income และ expenses คำนวณจากยอดสุทธิในเดือนเดียวกัน หารศูนย์หรือฐาน <= 0 แสดง N/A
- MoM ใช้ยอดอาหารจำนวนเงินเดือนก่อน; ถ้าเดือนก่อน 0 และเดือนนี้ > 0 แสดง “เริ่มมีค่าอาหาร”
- pp เป็นผลต่างของสัดส่วนที่ยังไม่ปัดเศษ จึงสอดคล้อง PRD example +20.00%, 20.57%, +0.57 pp
- คืนเงิน: kind=refund เชื่อม refundOf กับ expense เดิม หมวด/บัญชีเดียวกัน ไม่เกินยอดเดิม และไม่เกิดก่อนรายจ่าย หักค่าใช้จ่ายในเดือนที่คืน ไม่เพิ่ม income หากหมวดใดสุทธิติดลบ แสดงตารางแทนโดนัทที่อาจทำให้เข้าใจผิด
- โอนเงินและชำระบัตรเครดิต: อยู่ transfers แยกจาก transactions ไม่รวมเป็นรายรับ/รายจ่าย; การซื้อด้วยบัตรนับ expense ครั้งเดียว (ทดสอบ domain แล้ว ยังไม่มี editor)
- Date เป็น YYYY-MM-DD ของ Asia/Bangkok; ไม่แปลง date-only ด้วย UTC boundary ในการกรอง
- หมวดอาหารและ parent relation คงเดิมขณะแก้หมวด เพื่อไม่เปลี่ยนความหมายข้อมูลย้อนหลังโดยไม่ตั้งใจ
- งบเตือน >=80%, reached=100%, exceeded>100%; สีมาพร้อมข้อความและยอดตัวเลข

## ระยะถัดไป

หลังตรวจรับ Frontend Mock MVP จึงออกแบบ Prisma/MySQL, migration, validation ที่ server, session authentication, user authorization และ CRUD API ตาม contracts ใน PRD แล้วค่อยทำ accounts/transfers, recurring, savings และ CSV
