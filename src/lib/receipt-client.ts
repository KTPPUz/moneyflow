import {
  MAX_RECEIPT_BYTES,
  MAX_SOURCE_RECEIPT_BYTES,
  RECEIPT_MIME_TYPES,
} from "./receipts";

export async function prepareReceipt(file: File): Promise<File> {
  if (!RECEIPT_MIME_TYPES.some((mime) => mime === file.type))
    throw new Error("กรุณาเลือกรูป JPG, PNG หรือ WebP");
  if (!file.size || file.size > MAX_SOURCE_RECEIPT_BYTES)
    throw new Error("กรุณาเลือกรูปที่มีขนาดไม่เกิน 10 MB");
  if (file.size <= MAX_RECEIPT_BYTES) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("เปิดรูปไม่ได้ กรุณาเลือกรูปใหม่");
  }
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("ย่อรูปไม่ได้ กรุณาใช้รูปขนาดไม่เกิน 2 MB");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.5]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= MAX_RECEIPT_BYTES)
        return new File(
          [blob],
          `${file.name.replace(/\.[^.]*$/, "").slice(0, 170)}.jpg`,
          { type: "image/jpeg" },
        );
    }
    throw new Error("รูปยังมีขนาดใหญ่เกินไป กรุณาใช้รูปขนาดเล็กลง");
  } finally {
    bitmap.close();
  }
}

export async function uploadReceipt(file: File): Promise<string> {
  const response = await fetch("/api/receipts", {
    method: "POST",
    headers: {
      "Content-Type": file.type,
      "X-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(body?.message ?? "อัปโหลดสลิปไม่สำเร็จ กรุณาลองอีกครั้ง");
  return body.id;
}
