import { currentUser } from "@/lib/auth";
import { hasSameOrigin } from "@/lib/request-origin";
import { readReceiptBody, ReceiptValidationError } from "@/lib/receipts";
import { storeReceipt } from "@/data/server/receipt-store";

export async function POST(request: Request) {
  if (!hasSameOrigin(request))
    return Response.json(
      { message: "ไม่อนุญาตคำขอจากเว็บไซต์อื่น" },
      { status: 403 },
    );
  try {
    const user = await currentUser();
    if (!user)
      return Response.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    let name: string;
    try {
      name = decodeURIComponent(request.headers.get("x-file-name") ?? "");
    } catch {
      throw new ReceiptValidationError("ชื่อไฟล์ไม่ถูกต้อง");
    }
    const receipt = await storeReceipt(
      user.id,
      await readReceiptBody(request),
      request.headers.get("content-type") ?? "",
      name,
    );
    return Response.json(receipt, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof ReceiptValidationError)
      return Response.json({ message: error.message }, { status: 400 });
    console.error(error);
    return Response.json(
      { message: "อัปโหลดสลิปไม่สำเร็จ กรุณาลองอีกครั้ง" },
      { status: 500 },
    );
  }
}
