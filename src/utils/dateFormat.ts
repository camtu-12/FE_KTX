const VI_LOCALE = "vi-VN";

function parseDate(date: string | Date, dateOnly = false): Date {
  if (date instanceof Date) return date;

  // Chỉ khớp chuỗi THUẦN ngày "YYYY-MM-DD" (không có phần giờ theo sau) — tránh nhầm
  // với timestamp đầy đủ dạng "...T18:30:00.000000Z", vì cắt thẳng phần ngày từ chuỗi
  // UTC đó (bỏ qua quy đổi timezone) sẽ lùi mất 1 ngày với giờ VN 00:00-06:59 sáng.
  const dateOnlyMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})\s*$/);
  if (dateOnly && dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(date);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = parseDate(date, true);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(VI_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Trả về ngày hiện tại (giờ local máy) dạng "YYYY-MM-DD", dùng cho input type="date"
 * (value/min/max). KHÔNG dùng new Date().toISOString().slice(0,10) — toISOString() quy về
 * UTC, ở múi giờ VN (+7) trong khoảng 00:00-06:59 sáng sẽ trả về NGÀY HÔM QUA, khiến các ràng
 * buộc min="hôm nay" vẫn cho chọn được ngày hôm qua.
 */
export function getLocalDateValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = parseDate(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(VI_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
