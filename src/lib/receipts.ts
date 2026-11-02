export const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;
export const MAX_SOURCE_RECEIPT_BYTES = 10 * 1024 * 1024;
export const RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export class ReceiptValidationError extends Error {}

export function validateReceipt(
  bytes: Uint8Array,
  mimeType: string,
  name: string,
) {
  if (!bytes.length || bytes.length > MAX_RECEIPT_BYTES)
    throw new ReceiptValidationError(
      "ไฟล์สลิปต้องมีขนาดไม่เกิน 2 MB หลังย่อรูป",
    );
  const matches =
    mimeType === "image/jpeg"
      ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : mimeType === "image/png"
        ? [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
        : mimeType === "image/webp"
          ? String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
            String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
          : false;
  if (!matches)
    throw new ReceiptValidationError(
      "กรุณาแนบรูป JPG, PNG หรือ WebP ที่ถูกต้อง",
    );
  const filename = name.split(/[\\/]/).at(-1)?.trim();
  if (!filename || filename.length > 180 || /[\x00-\x1f\x7f]/.test(filename))
    throw new ReceiptValidationError(
      "ชื่อไฟล์ไม่ถูกต้อง หรือยาวเกิน 180 ตัวอักษร",
    );
  return filename;
}

// Bound streamed bodies as well as Content-Length; never buffer an unlimited file.
export async function readReceiptBody(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_RECEIPT_BYTES)
    throw new ReceiptValidationError(
      "ไฟล์สลิปต้องมีขนาดไม่เกิน 2 MB หลังย่อรูป",
    );
  const reader = request.body?.getReader();
  if (!reader) throw new ReceiptValidationError("กรุณาเลือกไฟล์สลิป");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_RECEIPT_BYTES) {
        await reader.cancel();
        throw new ReceiptValidationError(
          "ไฟล์สลิปต้องมีขนาดไม่เกิน 2 MB หลังย่อรูป",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
