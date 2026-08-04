/**
 * Tách từ pattern tải blob (URL.createObjectURL + thẻ <a> ẩn) đang lặp lại
 * trong admissionCandidateApi.ts, dùng chung cho mọi tính năng tải file (Excel, PDF...).
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
