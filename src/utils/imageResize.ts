const DEFAULT_MAX_WIDTH = 1280;
const DEFAULT_QUALITY = 0.8;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không thể đọc ảnh."));
    image.src = url;
  });
}

/**
 * Resize ảnh về tối đa `maxWidth` (giữ tỷ lệ khung hình, không phóng to ảnh nhỏ hơn)
 * rồi export sang JPEG chất lượng `quality`, để tránh lỗi 413/422 khi tải ảnh
 * độ phân giải cao lên server (avatar thẻ/ảnh gốc từ máy có thể vài chục MB).
 */
export async function resizeImageToJpeg(
  source: Blob | string,
  { maxWidth = DEFAULT_MAX_WIDTH, quality = DEFAULT_QUALITY }: { maxWidth?: number; quality?: number } = {},
): Promise<Blob> {
  const objectUrl = typeof source === "string" ? null : URL.createObjectURL(source);

  try {
    const image = await loadImage(objectUrl ?? (source as string));
    const scale = image.naturalWidth > maxWidth ? maxWidth / image.naturalWidth : 1;
    const targetWidth = Math.round(image.naturalWidth * scale);
    const targetHeight = Math.round(image.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Không thể tạo canvas để xử lý ảnh.");
    }
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Không thể nén ảnh."))),
        "image/jpeg",
        quality,
      );
    });
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
