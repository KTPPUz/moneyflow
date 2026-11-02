import { prisma } from "@/lib/db";
import { ReceiptValidationError, validateReceipt } from "@/lib/receipts";
import { readFinance } from "./finance-store";

export async function storeReceipt(
  userId: string,
  bytes: Uint8Array,
  mimeType: string,
  name: string,
) {
  const filename = validateReceipt(bytes, mimeType, name);
  await readFinance(userId);
  return prisma.$transaction(
    async (tx) => {
      // Share the finance lock: uploads and attaching/deleting transactions serialize.
      await tx.financeState.update({
        where: { userId },
        data: { revision: { increment: 0 } },
      });
      // Allow undo and failed-save retries for at least seven days. Only unused
      // uploads expire; a receipt attached to any transaction is always retained.
      await tx.receipt.deleteMany({
        where: {
          userId,
          createdAt: { lt: new Date(Date.now() - 7 * 86400000) },
          transactions: { none: {} },
        },
      });
      const usage = await tx.receipt.aggregate({
        where: { userId },
        _sum: { size: true },
      });
      if ((usage._sum.size ?? 0) + bytes.length > 50 * 1024 * 1024)
        throw new ReceiptValidationError(
          "พื้นที่สลิปเต็มแล้ว (50 MB) กรุณาใช้รูปที่มีขนาดเล็กลง",
        );
      return tx.receipt.create({
        data: {
          userId,
          id: crypto.randomUUID(),
          name: filename,
          mimeType,
          size: bytes.length,
          content: new Uint8Array(bytes),
        },
        select: { id: true, name: true, mimeType: true, size: true },
      });
    },
    { maxWait: 5000, timeout: 20000 },
  );
}
