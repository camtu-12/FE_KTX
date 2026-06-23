import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { ElementType, ReactNode } from "react";
import {
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  FileText,
  GraduationCap,
  Home,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  getRegistrationPeriods,
  createRegistrationPeriod,
  updateRegistrationPeriod,
  deleteRegistrationPeriod,
  processRegistrationPeriod,
  confirmBatch,
  type RegistrationPeriodData,
  type RegistrationPeriodPayload,
} from "../../../api/registrationApi";
import { formatDate } from "../../../utils/dateFormat";

type PeriodStatus = "pending" | "active" | "closed" | "processing";
type PeriodChannel = "main" | "rolling";



const statusLabel: Record<PeriodStatus, string> = {
  pending: "Chưa mở",
  active: "Đang mở",
  closed: "Đã đóng",
  processing: "Đang xử lý",
};

const dashboardStatusClass: Record<PeriodStatus, string> = {
  pending: "border-slate-200 bg-slate-50 text-slate-600 shadow-[0_12px_28px_rgba(100,116,139,0.14)]",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_12px_28px_rgba(16,185,129,0.18)]",
  closed: "border-rose-200 bg-rose-50 text-rose-700 shadow-[0_12px_28px_rgba(225,29,72,0.14)]",
  processing: "border-amber-200 bg-amber-50 text-amber-700 shadow-[0_12px_28px_rgba(245,158,11,0.16)]",
};

const dashboardStatusDotClass: Record<PeriodStatus, string> = {
  pending: "bg-slate-400",
  active: "bg-emerald-500",
  closed: "bg-rose-500",
  processing: "bg-amber-500",
};

const channelLabel: Record<PeriodChannel, string> = {
  main: "Đợt chính",
  rolling: "Quanh năm",
};

const channelClass: Record<PeriodChannel, string> = {
  main: "border border-blue-200 bg-blue-50 text-blue-700",
  rolling: "border border-violet-200 bg-violet-50 text-violet-700",
};

const primaryActionClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_45%,#31b7d4_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(36,76,184,0.20)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryActionClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 text-sm font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.09)] transition hover:-translate-y-0.5 hover:border-[#9eb9e6] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50";

const dangerActionClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 shadow-[0_8px_18px_rgba(225,29,72,0.09)] transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50";

const warningActionClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(245,158,11,0.20)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

type DashboardTileProps = {
  icon: ElementType;
  label: string;
  children: ReactNode;
};

function DashboardTile({ icon: Icon, label, children }: DashboardTileProps) {
  return (
    <div className="h-full min-h-[78px] rounded-xl border border-[#dce7f6] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-3 shadow-[0_6px_14px_rgba(36,76,184,0.05)]">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#cbdcf2] bg-[#eef6ff] text-[#244cb8]">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-[14px] font-semibold text-[#5d7299]">{label}</p>
      </div>
      <div className="text-[16px] font-semibold leading-snug text-[#1f3152]">{children}</div>
    </div>
  );
}

const formatDayCount = (value?: number | null) => `${value ?? "--"} ngày`;

const emptyForm: RegistrationPeriodPayload = {
  name: "",
  channel: "main",
  status: "pending",
  school_year: "",
  semester: "",
  start_date: "",
  end_date: "",
  stay_start_date: "",
  stay_end_date: "",
  bed_selection_days: null,
  processing_days: null,
};

type FormError = Partial<Record<keyof RegistrationPeriodPayload, string>>;
type PeriodDateField = "start_date" | "end_date" | "stay_start_date" | "stay_end_date";

const periodDateFields = new Set<keyof RegistrationPeriodPayload>([
  "start_date",
  "end_date",
  "stay_start_date",
  "stay_end_date",
]);

function isPeriodDateField(key: keyof RegistrationPeriodPayload): key is PeriodDateField {
  return periodDateFields.has(key);
}

function isRealDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function toDateInputValue(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";

  const apiMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
  if (apiMatch) {
    const [, rawYear, rawMonth, rawDay] = apiMatch;
    const year = Number(rawYear);
    const month = Number(rawMonth);
    const day = Number(rawDay);
    return isRealDate(year, month, day) ? `${rawYear}-${rawMonth}-${rawDay}` : null;
  }

  const displayMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!displayMatch) return null;

  const [, day, month, year] = displayMatch.map(Number);
  if (!isRealDate(year, month, day)) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizePeriodDate(value?: string | null) {
  return toDateInputValue(value);
}

function getDateFieldText(value?: string | null) {
  const normalized = toDateInputValue(value);
  return normalized ? formatDate(normalized) : String(value ?? "");
}

function formatDateTyping(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function dateInputToDate(value?: string | null) {
  const normalized = toDateInputValue(value);
  if (!normalized) return null;
  const [year, month, day] = normalized.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateToInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarDates(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function validate(
  form: RegistrationPeriodPayload,
  periods: RegistrationPeriodData[],
  editingId: number | null,
): FormError {
  const errors: FormError = {};
  const startDate = normalizePeriodDate(form.start_date);
  const endDate = normalizePeriodDate(form.end_date);
  const stayStartDate = normalizePeriodDate(form.stay_start_date);
  const stayEndDate = normalizePeriodDate(form.stay_end_date);

  if (!form.name.trim()) errors.name = "Vui lòng nhập tên đợt.";

  if (!form.school_year?.trim()) {
    errors.school_year = "Vui lòng nhập năm học.";
  } else {
    const syMatch = form.school_year.trim().match(/^(\d{4})-(\d{4})$/);
    if (!syMatch || Number(syMatch[2]) !== Number(syMatch[1]) + 1)
      errors.school_year = "Năm học không hợp lệ. Ví dụ: 2025-2026";
  }

  if (!form.semester || !["1", "2", "3"].includes(form.semester))
    errors.semester = "Vui lòng chọn học kỳ.";

  if (!form.start_date) errors.start_date = "Vui lòng chọn ngày bắt đầu.";
  else if (startDate === null) errors.start_date = "Vui lòng nhập ngày theo định dạng dd/mm/yyyy.";
  if (!form.end_date) errors.end_date = "Vui lòng chọn ngày kết thúc.";
  else if (endDate === null) errors.end_date = "Vui lòng nhập ngày theo định dạng dd/mm/yyyy.";
  if (form.stay_start_date && stayStartDate === null) errors.stay_start_date = "Vui lòng nhập ngày theo định dạng dd/mm/yyyy.";
  if (form.stay_end_date && stayEndDate === null) errors.stay_end_date = "Vui lòng nhập ngày theo định dạng dd/mm/yyyy.";
  if (startDate && endDate && endDate < startDate)
    errors.end_date = "Ngày kết thúc phải sau ngày bắt đầu.";
  if (stayStartDate && stayEndDate && stayEndDate < stayStartDate)
    errors.stay_end_date = "Ngày kết thúc lưu trú phải sau ngày bắt đầu.";

  // Rule 1: Mỗi năm học chỉ được có 1 đợt chính
  if (form.channel === "main" && !errors.school_year) {
    const duplicate = periods.find(
      (p) => p.channel === "main" && p.school_year === form.school_year?.trim() && p.id !== editingId,
    );
    if (duplicate)
      errors.channel = `Năm học ${form.school_year} đã có đợt chính rồi, không thể tạo thêm.`;
  }

  // Rule 2: Kênh quanh năm chỉ được mở sau khi đợt chính đã đóng
  if (form.channel === "rolling" && !errors.school_year) {
    const mainClosed = periods.some(
      (p) => p.channel === "main" && p.school_year === form.school_year?.trim() && p.status === "closed",
    );
    if (!mainClosed)
      errors.channel = "Kênh quanh năm chỉ được mở sau khi đợt chính đã đóng.";
  }

  // Rule 3: Thời gian nhận đơn không được trùng
  if (startDate && endDate && !errors.start_date && !errors.end_date) {
    const overlap = periods.find((p) => {
      if (p.id === editingId) return false;
      if (!["active", "pending"].includes(p.status as string)) return false;
      const pStart = normalizePeriodDate(p.start_date);
      const pEnd = normalizePeriodDate(p.end_date);
      if (!pStart || !pEnd) return false;
      return startDate <= pEnd && endDate >= pStart;
    });
    if (overlap)
      errors.start_date = `Thời gian nhận đơn trùng với đợt '${overlap.name}' đang hoạt động.`;
  }

  return errors;
}

export default function AdminRegistrationPeriodsPage() {
  const [periods, setPeriods] = useState<RegistrationPeriodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RegistrationPeriodPayload>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormError>({});
  const [openDateField, setOpenDateField] = useState<PeriodDateField | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [processResult, setProcessResult] = useState<{
    message: string;
    free_beds: number;
    approved: number;
    waitlist: number;
  } | null>(null);
  const [confirmBatchId, setConfirmBatchId] = useState<number | null>(null);
  const [confirmingBatchId, setConfirmingBatchId] = useState<number | null>(null);
  const [confirmRankId, setConfirmRankId] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleConfirmBatch = async (id: number) => {
    setConfirmingBatchId(id);
    setApiError(null);
    try {
      const result = await confirmBatch(id);
      setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, status: "closed" } : p)));
      setProcessResult({ message: `Đã xác nhận ${result.confirmed} đơn.`, free_beds: 0, approved: result.confirmed, waitlist: result.skipped_review + result.skipped_null });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Xác nhận không thành công.";
      setApiError(msg);
    } finally {
      setConfirmingBatchId(null);
      setConfirmBatchId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await getRegistrationPeriods();
      setPeriods(data);
    } catch {
      setApiError("Không thể tải danh sách đợt đăng ký.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setApiError(null);
    setOpenDateField(null);
    setCalendarMonth(new Date());
    setShowForm(true);
  };

  const openEdit = (period: RegistrationPeriodData) => {
    const initialStartDate = toDateInputValue(period.start_date) || "";
    setEditingId(period.id);
    setForm({
      name: period.name,
      channel: (period.channel as PeriodChannel) ?? "main",
      status: period.status as PeriodStatus,
      school_year: period.school_year ?? "",
      semester: period.semester ?? "",
      start_date: initialStartDate,
      end_date: toDateInputValue(period.end_date) || "",
      stay_start_date: toDateInputValue(period.stay_start_date) || "",
      stay_end_date: toDateInputValue(period.stay_end_date) || "",
      bed_selection_days: period.bed_selection_days ?? null,
      processing_days: period.processing_days ?? null,
    });
    setFormErrors({});
    setApiError(null);
    setOpenDateField(null);
    setCalendarMonth(dateInputToDate(initialStartDate) ?? new Date());
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setOpenDateField(null);
  };

  const handleSave = async () => {
    const errors = validate(form, periods, editingId);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setSaving(true);
    setApiError(null);
    try {
      const payload: RegistrationPeriodPayload = {
        ...form,
        start_date: normalizePeriodDate(form.start_date) || "",
        end_date: normalizePeriodDate(form.end_date) || "",
        stay_start_date: normalizePeriodDate(form.stay_start_date) || null,
        stay_end_date: normalizePeriodDate(form.stay_end_date) || null,
      };
      if (editingId !== null) {
        const updated = await updateRegistrationPeriod(editingId, payload);
        setPeriods((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...updated } : p)));
      } else {
        const created = await createRegistrationPeriod(payload);
        setPeriods((prev) => [created, ...prev]);
      }
      closeForm();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      const apiFieldErrors = data?.errors;
      if (apiFieldErrors && Object.keys(apiFieldErrors).length > 0) {
        const mapped: FormError = {};
        for (const [key, msgs] of Object.entries(apiFieldErrors)) {
          mapped[key as keyof RegistrationPeriodPayload] = Array.isArray(msgs) ? msgs[0] : String(msgs);
        }
        setFormErrors((prev) => ({ ...prev, ...mapped }));
      } else {
        setApiError(data?.message ?? "Lưu không thành công.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const period = periods.find((p) => p.id === id);
    if ((period?.registrations_count ?? 0) > 0) {
      setApiError("Không thể xóa đợt này vì đã có đơn đăng ký. Vui lòng xử lý hết đơn trước khi xóa.");
      return;
    }
    setDeletingId(id);
    setApiError(null);
    try {
      await deleteRegistrationPeriod(id);
      setPeriods((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Xóa không thành công.";
      setApiError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleProcess = async (id: number) => {
    setProcessingId(id);
    setProcessResult(null);
    setApiError(null);
    try {
      const result = await processRegistrationPeriod(id);
      setProcessResult(result);
      setPeriods((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "processing" } : p)),
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Xếp hạng không thành công.";
      setApiError(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const field = (key: keyof RegistrationPeriodPayload, label: string, type = "text", extra?: React.InputHTMLAttributes<HTMLInputElement>, minDate?: Date) => {
    const isDateField = type === "date" && isPeriodDateField(key);
    const dateValue = isDateField ? toDateInputValue(form[key] as string) || "" : "";
    const dateText = isDateField ? getDateFieldText(form[key] as string) : "";
    const selectedDate = isDateField ? dateInputToDate(dateValue) : null;
    const isCalendarOpen = isDateField && openDateField === key;
    const calendarDates = isDateField ? getCalendarDates(calendarMonth) : [];
    const minDay = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : null;
    const shouldOpenCalendarBelow = key === "start_date" || key === "end_date";

    return (
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#324B76]">{label}</label>
        {isDateField ? (
          <div className="relative">
            <div className="flex w-full items-center rounded-xl border border-[#cfdcf0] bg-[#f7faff] text-sm text-[#1f3152] transition focus-within:border-[#244cb8]">
              <input
                type="text"
                inputMode="numeric"
                value={dateText}
                onChange={(e) => {
                  const value = formatDateTyping(e.target.value);
                  const normalized = toDateInputValue(value);
                  setForm((prev) => ({ ...prev, [key]: value }));
                  setFormErrors((prev) => ({ ...prev, [key]: undefined }));
                  if (normalized) {
                    setCalendarMonth(dateInputToDate(normalized) ?? calendarMonth);
                  }
                }}
                placeholder="dd/MM/yyyy"
                className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-sm text-[#1f3152] placeholder:text-[#9aaac4] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setOpenDateField((current) => (current === key ? null : key));
                  setCalendarMonth(selectedDate ?? new Date());
                }}
                className="inline-flex h-8 w-10 shrink-0 items-center justify-center border-l border-[#cfdcf0] text-[#7c8fb5] transition hover:text-[#244cb8]"
                aria-label={`Mở lịch ${label}`}
              >
                <CalendarDays className="h-4 w-4" />
              </button>
            </div>
            {isCalendarOpen ? (
              <div
                className={`absolute z-[90] w-[18rem] rounded-2xl border border-[#cfdcf0] bg-white p-3 shadow-[0_18px_36px_rgba(15,23,42,0.16)] ${
                  shouldOpenCalendarBelow ? "top-full mt-2" : "bottom-full mb-2"
                } ${
                  key === "end_date" || key === "stay_end_date" ? "right-0" : "left-0"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCalendarMonth((current) => addMonths(current, -1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#d6e2f1] text-sm font-semibold text-[#244cb8] hover:bg-[#f5f9ff]"
                  >
                    ‹
                  </button>
                  <div className="flex items-center gap-2">
                    <select
                      value={calendarMonth.getMonth()}
                      onChange={(e) => setCalendarMonth((current) => new Date(current.getFullYear(), Number(e.target.value), 1))}
                      className="rounded-lg border border-[#d6e2f1] bg-white px-2 py-1 text-xs font-semibold text-[#1a2d52] focus:border-[#244cb8] focus:outline-none"
                    >
                      {Array.from({ length: 12 }, (_, index) => (
                        <option key={index} value={index}>Tháng {String(index + 1).padStart(2, "0")}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={calendarMonth.getFullYear()}
                      onChange={(e) => {
                        const year = Number(e.target.value);
                        if (Number.isFinite(year) && e.target.value.length <= 4) {
                          setCalendarMonth((current) => new Date(year, current.getMonth(), 1));
                        }
                      }}
                      className="w-20 rounded-lg border border-[#d6e2f1] bg-white px-2 py-1 text-xs font-semibold text-[#1a2d52] focus:border-[#244cb8] focus:outline-none"
                    />
                  </div>                  <button
                    type="button"
                    onClick={() => setCalendarMonth((current) => addMonths(current, 1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#d6e2f1] text-sm font-semibold text-[#244cb8] hover:bg-[#f5f9ff]"
                  >
                    ›
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#7c8fb5]">
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
                    <span key={day} className="py-1">{day}</span>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {calendarDates.map((date) => {
                    const value = dateToInputValue(date);
                    const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                    const isSelected = value === dateValue;
                    const isBeforeMin = minDay !== null && date < minDay;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={isBeforeMin}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, [key]: value }));
                          setFormErrors((prev) => ({ ...prev, [key]: undefined }));
                          setOpenDateField(null);
                        }}
                        className={`inline-flex h-8 items-center justify-center rounded-lg text-xs font-semibold transition ${
                          isBeforeMin
                            ? "cursor-not-allowed text-[#cdd6e4] line-through"
                            : isSelected
                              ? "bg-[#244cb8] text-white shadow-[0_8px_16px_rgba(36,76,184,0.22)]"
                              : isCurrentMonth
                                ? "text-[#1f3152] hover:bg-[#edf4ff]"
                                : "text-[#b3bfd4] hover:bg-[#f5f9ff]"
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <input
            type={type}
            value={(form[key] as string) ?? ""}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, [key]: e.target.value }));
              setFormErrors((prev) => ({ ...prev, [key]: undefined }));
            }}
            className="w-full rounded-xl border border-[#cfdcf0] bg-[#f7faff] px-3 py-1.5 text-sm text-[#1f3152] focus:border-[#244cb8] focus:outline-none"
            {...extra}
          />
        )}
        {formErrors[key] && <p className="mt-1 text-xs text-rose-600">{formErrors[key]}</p>}
      </div>
    );
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      {/* Header */}
      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">
              Quản lý đợt đăng ký
            </h1>
            <p className="mt-1 text-[13px] leading-6 text-[#62789f] sm:text-sm">
              Tạo và quản lý các đợt nhận đơn đăng ký ký túc xá (kênh chính & quanh năm).
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#fff_0%,#f5f9ff_100%)] px-4 py-2.5 text-sm font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.09)] transition hover:-translate-y-0.5 disabled:opacity-50"
              title="Tải lại danh sách"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Làm mới
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.22)] transition hover:-translate-y-0.5 hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              Tạo đợt mới
            </button>
          </div>
        </div>
      </div>

      {/* Global error */}
      {apiError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {apiError}
        </div>
      )}

      {/* Process result toast */}
      {processResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <strong>Xếp hạng xong.</strong> Giường trống: {processResult.free_beds} — Gợi ý duyệt:{" "}
          {processResult.approved} — Danh sách chờ: {processResult.waitlist}
          <button
            type="button"
            onClick={() => setProcessResult(null)}
            className="ml-3 text-emerald-600 hover:text-emerald-800"
          >
            <X className="inline h-4 w-4" />
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#244cb8]" />
        </div>
      ) : periods.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#7c8fb5]">
          <CalendarDays className="mb-3 h-12 w-12 opacity-40" />
          <p className="text-sm">Chưa có đợt đăng ký nào. Tạo đợt đầu tiên!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {periods.map((period, index) => {
            const periodStatus = period.status as PeriodStatus;
            const periodChannel = period.channel as PeriodChannel;
            const totalRegistrations = period.registrations_count ?? 0;

            return (
            <motion.div
              key={period.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
              className="rounded-[20px] border border-[#d6e2f1] bg-white p-4 shadow-[0_12px_28px_rgba(36,76,184,0.09)] sm:p-5"
            >
              {/* Row 1: tên + badge trạng thái */}
              <div className="flex flex-col gap-2.5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-[20px] font-bold leading-tight text-[#1a2d52] sm:text-[22px]">
                    {period.name}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 xl:justify-end">
                  <span
                    className={`inline-flex min-h-9 items-center rounded-xl border px-3.5 text-sm font-semibold ${
                      channelClass[periodChannel] ?? ""
                    }`}
                  >
                    {channelLabel[periodChannel] ?? period.channel}
                  </span>
                  <span
                    className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-bold uppercase tracking-normal ${
                      dashboardStatusClass[periodStatus] ?? ""
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${dashboardStatusDotClass[periodStatus] ?? ""}`} />
                    {statusLabel[periodStatus] ?? period.status}
                  </span>
                </div>
              </div>

              {/* Thông tin từng dòng */}
              <div className="mt-4 grid items-stretch gap-2.5 sm:grid-cols-2">
                <DashboardTile icon={GraduationCap} label="Năm học - Học kỳ">
                  {period.school_year} - HK {period.semester}
                </DashboardTile>
                <DashboardTile icon={FileText} label="Tổng số đơn">
                  {totalRegistrations} đơn
                </DashboardTile>
                <DashboardTile icon={CalendarRange} label="Thời gian nhận đơn">
                  {formatDate(period.start_date)} - {formatDate(period.end_date)}
                </DashboardTile>
                <DashboardTile icon={Home} label="Thời gian lưu trú">
                  {period.stay_start_date || period.stay_end_date
                    ? `${formatDate(period.stay_start_date)} - ${formatDate(period.stay_end_date)}`
                    : "Chưa thiết lập"}
                </DashboardTile>
                <DashboardTile icon={CalendarDays} label="Số ngày xử lý đơn">
                  {formatDayCount(period.processing_days)}
                </DashboardTile>
                <DashboardTile icon={CheckCircle2} label="Số ngày chọn giường">
                  {formatDayCount(period.bed_selection_days)}
                </DashboardTile>
              </div>

              {/* Thông tin thêm theo trạng thái */}
              {period.status === "pending" && (() => {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const start = new Date(period.start_date); start.setHours(0, 0, 0, 0);
                const daysUntil = Math.ceil((start.getTime() - today.getTime()) / 86400000);
                return (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm font-semibold text-slate-600">
                    <CalendarDays className="h-4 w-4" />
                    Chưa mở nhận đơn — còn <strong className="text-[15px]">{daysUntil} ngày nữa</strong>
                  </div>
                );
              })()}
              {period.status === "active" && (() => {
                const now = new Date();
                const end = new Date(period.end_date);
                // Nếu backend trả date-only (UTC midnight), treat là cuối ngày giờ local
                if (end.getUTCHours() === 0 && end.getUTCMinutes() === 0 && end.getUTCSeconds() === 0) {
                  end.setHours(23, 59, 59, 999);
                }
                const diffMs = end.getTime() - now.getTime();
                if (diffMs > 0) {
                  const totalHours = Math.floor(diffMs / 3600000);
                  const minutes = Math.floor((diffMs % 3600000) / 60000);
                  const days = Math.floor(totalHours / 24);
                  const hours = totalHours % 24;
                  const label = days > 0
                    ? `${days} ngày`
                    : hours > 0
                      ? `${hours} giờ ${minutes} phút`
                      : `${minutes} phút`;
                  return (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Đang nhận đơn — còn <strong className="text-[15px]">{label.trim()}</strong>
                    </div>
                  );
                } else {
                  return (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm font-semibold text-slate-500">
                      <CalendarDays className="h-4 w-4" />
                      Đã hết hạn nhận đơn, chờ hệ thống cập nhật
                    </div>
                  );
                }
              })()}
              {period.status === "processing" && (
                <div className="mt-3 flex flex-wrap gap-2.5 text-sm font-semibold">
                  <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                    Duyệt: <strong className="text-base">{period.approve_proposal_count ?? 0}</strong>
                  </span>
                  <span className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-600">
                    Từ chối: <strong className="text-base">{period.reject_proposal_count ?? 0}</strong>
                  </span>
                  <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                    Cần xem lại: <strong className="text-base">{period.review_count ?? 0}</strong>
                  </span>
                </div>
              )}
              {period.status === "closed" && period.channel === "main" && (
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                  <span className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700">
                    Tổng đơn: <strong className="text-base">{totalRegistrations}</strong>
                  </span>
                  <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                    Đã duyệt: <strong className="text-base">{period.approved_count ?? 0}</strong>
                  </span>
                  <span className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-600">
                    Đã từ chối: <strong className="text-base">{period.rejected_count ?? 0}</strong>
                  </span>
                  {(period.review_count ?? 0) > 0 && (
                    <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                      Cần xem lại: <strong className="text-base">{period.review_count}</strong>
                    </span>
                  )}
                </div>
              )}
              {period.channel === "rolling" && (
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                  <span className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700">
                    Tổng đơn: <strong className="text-base">{totalRegistrations}</strong>
                  </span>
                  <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                    Đã duyệt: <strong className="text-base">{period.approved_count ?? 0}</strong>
                  </span>
                  <span className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-600">
                    Đã từ chối: <strong className="text-base">{period.rejected_count ?? 0}</strong>
                  </span>
                </div>
              )}

              {/* Nút hành động theo trạng thái */}
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 border-t border-[#eef3fb] pt-3.5">
                {period.status === "pending" && (
                  <>
                    <button type="button" onClick={() => openEdit(period)}
                      className={secondaryActionClass}>
                      Sửa
                    </button>
                    <button type="button"
                      disabled={deletingId === period.id}
                      onClick={() => void handleDelete(period.id)}
                      className={dangerActionClass}>
                      {deletingId === period.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Xóa
                    </button>
                  </>
                )}
                {period.status === "active" && (
                  <>
                    {period.channel === "main" && (() => {
                      const noRegs = totalRegistrations === 0;
                      const pendingCriteria = period.pending_criteria_count ?? 0;
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const endDay = new Date(period.end_date ?? ""); endDay.setHours(0, 0, 0, 0);
                      const notEnded = today < endDay;
                      const rankDisabled = processingId === period.id || noRegs || pendingCriteria > 0;
                      const rankTitle = noRegs
                        ? "Không có đơn nào để xếp hạng"
                        : pendingCriteria > 0
                          ? `Còn ${pendingCriteria} minh chứng chưa xác minh. Vui lòng xác minh hết trước khi xếp hạng.`
                          : undefined;
                      return (
                        <span title={rankTitle} className="inline-flex">
                          <button
                            type="button"
                            disabled={rankDisabled}
                            onClick={() => notEnded ? setConfirmRankId(period.id) : void handleProcess(period.id)}
                            className={warningActionClass}
                          >
                            {processingId === period.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Xếp hạng
                          </button>
                        </span>
                      );
                    })()}
                    <button type="button" onClick={() => openEdit(period)}
                      className={secondaryActionClass}>
                      Sửa
                    </button>
                    <button type="button"
                      disabled={deletingId === period.id}
                      onClick={() => void handleDelete(period.id)}
                      className={dangerActionClass}>
                      {deletingId === period.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Xóa
                    </button>
                  </>
                )}
                {period.status === "processing" && (
                  <>
                    <Link to="/admin/registrations" className={secondaryActionClass}>
                      Xem kết quả
                    </Link>
                    {(() => {
                      const pendingCriteria = period.pending_criteria_count ?? 0;
                      const reRankDisabled = processingId === period.id || pendingCriteria > 0;
                      const reRankTitle = pendingCriteria > 0
                        ? `Còn ${pendingCriteria} minh chứng chưa xác minh. Vui lòng xác minh hết trước khi xếp hạng.`
                        : undefined;
                      return (
                        <span title={reRankTitle} className="inline-flex">
                          <button
                            type="button"
                            disabled={reRankDisabled}
                            onClick={() => void handleProcess(period.id)}
                            className={warningActionClass}
                          >
                            {processingId === period.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Xếp hạng lại
                          </button>
                        </span>
                      );
                    })()}
                    <button type="button" disabled={confirmingBatchId === period.id} onClick={() => setConfirmBatchId(period.id)}
                      className={primaryActionClass}>
                      {confirmingBatchId === period.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Xác nhận tất cả
                    </button>
                    <button type="button" onClick={() => openEdit(period)}
                      className={secondaryActionClass}>
                      Sửa
                    </button>
                  </>
                )}
                {period.status === "closed" && period.channel === "main" && (
                  <Link to="/admin/registrations" className={secondaryActionClass}>
                    Xem kết quả
                  </Link>
                )}
                {period.status === "closed" && period.channel === "rolling" && (
                  <>
                    <button type="button" onClick={() => openEdit(period)}
                      className={secondaryActionClass}>
                      Sửa
                    </button>
                    <button type="button"
                      disabled={deletingId === period.id}
                      onClick={() => void handleDelete(period.id)}
                      className={dangerActionClass}>
                      {deletingId === period.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Xóa
                    </button>
                  </>
                )}
              </div>
            </motion.div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="period-form-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 bottom-0 top-20 z-[70] bg-black/40"
            onClick={closeForm}
          >
            <div className="flex h-full items-center justify-center p-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex max-h-[calc(100dvh-7rem)] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-[#c1d6f4] bg-white shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[#eef3fb] px-5 py-3">
                <h2 className="text-[18px] font-bold text-[#1a2d52]">
                  {editingId !== null ? "Sửa đợt đăng ký" : "Tạo đợt đăng ký mới"}
                </h2>
                <button type="button" onClick={closeForm} className="text-[#7c8fb5] hover:text-[#1a2d52]">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 [scrollbar-gutter:stable]">
              {apiError && (
                <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {apiError}
                </div>
              )}

              <div className="space-y-2.5">
                {field("name", "Tên đợt")}

                <>
                    {/* Channel */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#324B76]">Kênh</label>
                      <div className="relative">
                        <select
                          value={form.channel}
                          onChange={(e) => setForm((prev) => ({ ...prev, channel: e.target.value as PeriodChannel }))}
                          className="w-full appearance-none rounded-xl border border-[#cfdcf0] bg-[#f7faff] px-3 py-1.5 pr-7 text-sm text-[#1f3152] focus:border-[#244cb8] focus:outline-none"
                        >
                          <option value="main">Đợt chính</option>
                          <option value="rolling">Quanh năm</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7c8fb5]" />
                      </div>
                      {formErrors.channel && <p className="mt-1 text-xs text-rose-600">{formErrors.channel}</p>}
                    </div>

                    {/* School year & Semester */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {field("school_year", "Năm học (vd: 2025-2026)")}
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[#324B76]">Học kỳ</label>
                        <div className="relative">
                          <select
                            value={form.semester}
                            onChange={(e) => {
                              setForm((prev) => ({ ...prev, semester: e.target.value }));
                              setFormErrors((prev) => ({ ...prev, semester: undefined }));
                            }}
                            className="w-full appearance-none rounded-xl border border-[#cfdcf0] bg-[#f7faff] px-3 py-1.5 pr-7 text-sm text-[#1f3152] focus:border-[#244cb8] focus:outline-none"
                          >
                            <option value="">Chọn học kỳ</option>
                            <option value="1">Học kỳ 1</option>
                            <option value="2">Học kỳ 2</option>
                            <option value="3">Học kỳ 3</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7c8fb5]" />
                        </div>
                        {formErrors.semester && <p className="mt-1 text-xs text-rose-600">{formErrors.semester}</p>}
                      </div>
                    </div>
                  </>

                {/* Intake dates */}
                <div className="grid grid-cols-2 gap-2.5">
                  {field("start_date", "Ngày bắt đầu nhận đơn", "date", undefined, (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })())}
                  {field("end_date", "Ngày kết thúc nhận đơn", "date", undefined, (() => {
                    const startVal = toDateInputValue(form.start_date);
                    if (startVal) { const d = new Date(startVal); d.setDate(d.getDate() + 1); return d; }
                    const d = new Date(); d.setHours(0,0,0,0); return d;
                  })())}
                </div>

                {/* Processing days, stay dates, bed selection */}
                <>
                    {/* Processing days */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#324B76]">Số ngày xử lý đơn & phân phòng</label>
                      <input
                        type="number"
                        min={1}
                        value={form.processing_days ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            processing_days: e.target.value === "" ? null : Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-xl border border-[#cfdcf0] bg-[#f7faff] px-3 py-1.5 text-sm text-[#1f3152] focus:border-[#244cb8] focus:outline-none"
                        placeholder="Nhập số ngày"
                      />
                      {formErrors.processing_days && <p className="mt-1 text-xs text-rose-600">{formErrors.processing_days}</p>}
                    </div>

                    {/* Stay dates */}
                    <div className="rounded-xl border border-[#cfdcf0] bg-[#f7faff] p-2.5">
                      <p className="mb-2 text-xs font-semibold text-[#324B76]">Thời gian lưu trú (tuỳ chọn)</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {field("stay_start_date", "Bắt đầu lưu trú", "date", undefined, (() => {
                          const endVal = toDateInputValue(form.end_date);
                          const gap = form.processing_days ?? 0;
                          if (endVal && gap > 0) { const d = new Date(endVal); d.setDate(d.getDate() + gap); return d; }
                          if (endVal) { const d = new Date(endVal); d.setDate(d.getDate() + 1); return d; }
                          const d = new Date(); d.setHours(0,0,0,0); return d;
                        })())}
                        {field("stay_end_date", "Kết thúc lưu trú", "date", undefined, (() => {
                          const stayStartVal = toDateInputValue(form.stay_start_date);
                          if (stayStartVal) { const d = new Date(stayStartVal); d.setDate(d.getDate() + 1); return d; }
                          const d = new Date(); d.setHours(0,0,0,0); return d;
                        })())}
                      </div>
                    </div>

                    {/* Bed selection days */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#324B76]">Số ngày chọn giường (tuỳ chọn)</label>
                      <input
                        type="number"
                        min={0}
                        value={form.bed_selection_days ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            bed_selection_days: e.target.value === "" ? null : Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-xl border border-[#cfdcf0] bg-[#f7faff] px-3 py-1.5 text-sm text-[#1f3152] focus:border-[#244cb8] focus:outline-none"
                        placeholder="Để trống nếu không giới hạn"
                      />
                    </div>
                  </>
              </div>

              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-[#eef3fb] px-5 py-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-[#d6e2f1] bg-white px-4 py-1.5 text-sm font-semibold text-[#5d7299] transition hover:bg-[#f5f9ff]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#31b7d4_100%)] px-5 py-1.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(36,76,184,0.22)] transition hover:brightness-110 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId !== null ? "Lưu thay đổi" : "Tạo đợt"}
                </button>
              </div>
            </motion.div>
            </div>
          </motion.div>
        )}
        {confirmRankId !== null && (() => {
          const p = periods.find((x) => x.id === confirmRankId);
          return (
            <motion.div
              key="confirm-rank-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => setConfirmRankId(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="w-full max-w-md rounded-[24px] border border-amber-200 bg-white p-6 shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-2xl">⚠️</span>
                  <div>
                    <h2 className="text-[18px] font-bold text-[#1a2d52]">Đợt đăng ký chưa kết thúc</h2>
                    <p className="mt-2 text-sm text-[#5d7299]">
                      Đợt này còn nhận đơn đến <strong>{formatDate(p?.end_date)}</strong>.
                      Vẫn còn có thể có thêm đơn mới được nộp.
                    </p>
                    <p className="mt-1 text-sm text-[#5d7299]">
                      Bạn có chắc muốn xếp hạng ngay bây giờ không?
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setConfirmRankId(null)}
                    className="rounded-xl border border-[#d6e2f1] bg-white px-4 py-2 text-sm font-semibold text-[#5d7299] transition hover:bg-[#f5f9ff]">
                    Hủy
                  </button>
                  <button type="button" disabled={processingId === confirmRankId}
                    onClick={() => { setConfirmRankId(null); void handleProcess(confirmRankId); }}
                    className={warningActionClass}>
                    {processingId === confirmRankId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Xếp hạng ngay
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
        {confirmBatchId !== null && (
          <motion.div
            key="confirm-batch-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setConfirmBatchId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-md rounded-[24px] border border-[#c1d6f4] bg-white p-6 shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-[18px] font-bold text-[#1a2d52]">Xác nhận tất cả đơn?</h2>
              {(() => {
                const p = periods.find((x) => x.id === confirmBatchId);
                return (
                  <p className="mt-2 text-sm text-[#5d7299]">
                    Duyệt <strong>{p?.approve_proposal_count ?? 0}</strong> đơn và từ chối <strong>{p?.reject_proposal_count ?? 0}</strong> đơn trong đợt <em>{p?.name}</em>. Đợt sẽ chuyển sang trạng thái <strong>Đã đóng</strong>.
                  </p>
                );
              })()}
              <p className="mt-1 text-xs text-rose-600">Hành động này không thể hoàn tác.</p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmBatchId(null)}
                  className="rounded-xl border border-[#d6e2f1] bg-white px-4 py-2 text-sm font-semibold text-[#5d7299] transition hover:bg-[#f5f9ff]">
                  Hủy
                </button>
                <button type="button" disabled={confirmingBatchId !== null}
                  onClick={() => void handleConfirmBatch(confirmBatchId)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(36,76,184,0.22)] transition hover:brightness-110 disabled:opacity-50">
                  {confirmingBatchId !== null && <Loader2 className="h-4 w-4 animate-spin" />}
                  OK, xác nhận
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
