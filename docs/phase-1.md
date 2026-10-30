> Update v0.3: ยกเลิกการโหลดชุดข้อมูลตัวอย่าง เริ่มด้วยข้อมูลว่าง และเปลี่ยนเป็น browser-local repository รายละเอียดการใช้งานล่าสุดอยู่ใน README

# Frontend Mock MVP — v0.2

เริ่มต้นเป็น Dashboard prototype โดยยังไม่ได้รับเอกสารต้นฉบับ ต่อมาผู้ใช้ส่ง PRD และ Design System 1.0 และขอปรับส่วนที่ขาด จึงปรับระยะ Frontend ให้ครบ P0 โดยยังไม่เริ่ม Backend

## ส่งมอบ

- อ่านและเก็บเอกสารผู้ใช้ใน docs/requirements.md และ docs/design-system.md
- Design System ตาม mockup: Sidebar, soft pastel KPI, charts, เพิ่มรายการ, mobile bottom nav, responsive bottom sheet, self-hosted Thai/Inter fonts
- ทุก route และฟีเจอร์หลัก P0 ใช้งานกับข้อมูลจำลองในเบราว์เซอร์
- Mock repository ใช้ domain types ชุดเดียว; รวมยอดจาก transactions ไม่เก็บ summary ที่แยกจากรายการ
- 13 เดือนรวมเดือนปัจจุบัน เลือกเดือน/ปีได้ เลือกดูเดือนว่างได้
- Form validation, confirmation, undo, success/error toast และ error/retry/reset flow
- Light/Dark, loading, empty state, accessible dialog และตารางข้อมูลประกอบกราฟ

รายละเอียดสถานะข้อกำหนดและงานที่ยังขาดอยู่ใน [gap-analysis.md](gap-analysis.md)

## ข้อจำกัดที่แสดงใน UI

ข้อมูลทดลองเก็บเฉพาะ localStorage ของเบราว์เซอร์นี้ ไม่ใช่ฐานข้อมูล MySQL ไม่มี login, server API, การสำรองข้อมูล หรือการเชื่อมธนาคารจริง /accounts เป็นหน้าอ่านข้อมูลตัวอย่างสำหรับ P1 เท่านั้น

ไม่มีการ deploy ในระยะนี้
