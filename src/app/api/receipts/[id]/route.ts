import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
  try {
    const user = await currentUser();
    if (!user)
      return Response.json(
        { message: "กรุณาเข้าสู่ระบบ" },
        { status: 401, headers },
      );
    const { id } = await params;
    const receipt = await prisma.receipt.findUnique({
      where: { userId_id: { userId: user.id, id } },
    });
    if (!receipt)
      return Response.json({ message: "ไม่พบสลิป" }, { status: 404, headers });
    const filename = encodeURIComponent(receipt.name).replace(
      /['()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    return new Response(new Uint8Array(receipt.content), {
      headers: {
        ...headers,
        "Content-Type": receipt.mimeType,
        "Content-Length": String(receipt.size),
        "Content-Disposition": `inline; filename*=UTF-8''${filename}`,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { message: "เปิดสลิปไม่สำเร็จ กรุณาลองอีกครั้ง" },
      { status: 500, headers },
    );
  }
}
