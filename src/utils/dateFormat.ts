const VI_LOCALE = "vi-VN";

function parseDate(date: string | Date, dateOnly = false): Date {
  if (date instanceof Date) return date;

  const dateOnlyMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
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
