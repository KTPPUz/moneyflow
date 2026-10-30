import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/ibm-plex-sans-thai/400.css";
import "@fontsource/ibm-plex-sans-thai/500.css";
import "@fontsource/ibm-plex-sans-thai/600.css";
import "@fontsource/ibm-plex-sans-thai/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
export const metadata: Metadata = {
  title: "MoneyFlow — บันทึกเงิน เห็นภาพชีวิต",
  description:
    "แดชบอร์ดรายรับรายจ่ายส่วนบุคคล วางแผนเงินให้ใช้ชีวิตได้อย่างสบายใจ",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
