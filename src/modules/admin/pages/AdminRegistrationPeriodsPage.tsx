import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent, ElementType, KeyboardEvent, ReactNode } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import type { AdminLayoutOutletContext, PeriodAutocompleteSuggestion } from "../../../layouts/AdminLayout";
import {
  AlertCircle,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  FileText,
  GraduationCap,
  Home,
  Info,
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
  getRegistrationPeriodCapacity,
  type DormCapacityByGender,
  type RegistrationPeriodData,
  type RegistrationPeriodPayload,
} from "../../../api/registrationApi";
import CapacityDetailsModal from "../components/CapacityDetailsModal";
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

// Bản gọn nhẹ của dashboardStatusClass (bỏ shadow) — dùng cho badge nhỏ trong dropdown search.
const compactStatusBadgeClass: Record<PeriodStatus, string> = {
  pending: "border border-slate-200 bg-slate-50 text-slate-600",
  active: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  closed: "border border-rose-200 bg-rose-50 text-rose-700",
  processing: "border border-amber-200 bg-amber-50 text-amber-700",
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

const admissionReservationBlockerTotal = (period: RegistrationPeriodData) =>
  (period.admission_submitted_count ?? 0)
  + (period.admission_waitlisted_count ?? 0)
  + (period.admission_awaiting_confirm_count ?? 0)
  + (period.admission_approved_count ?? 0);

const admissionReservationBlockerMessage = (period: RegistrationPeriodData) => {
  const submitted = period.admission_submitted_count ?? 0;
  const waitlisted = period.admission_waitlisted_count ?? 0;
  const awaitingConfirm = period.admission_awaiting_confirm_count ?? 0;
  const approved = period.admission_approved_count ?? 0;
  const total = submitted + waitlisted + awaitingConfirm + approved;

  return `Còn ${total} hồ sơ giữ chỗ tân sinh viên chưa hoàn tất trong đợt này: chờ xét ${submitted}, danh sách chờ ${waitlisted}, đã có gợi ý chờ xác nhận ${awaitingConfirm}, đã duyệt giữ chỗ nhưng chưa nhập học ${approved}. Hồ sơ "chờ xét" cần bấm Xếp hạng; "danh sách chờ" sẽ tự đôn khi có người hủy, không cần thao tác; "đã có gợi ý" chỉ cần bấm Xác nhận đề xuất (không liên quan nhập học); "chưa nhập học" cần nhập danh sách nhập học/MSSV. Bạn vẫn có thể tiếp tục xếp hạng ngay nếu muốn.`;
};

const admissionReservationBlockerStats = (period: RegistrationPeriodData) => {
  const submitted = period.admission_submitted_count ?? 0;
  const waitlisted = period.admission_waitlisted_count ?? 0;
  const awaitingConfirm = period.admission_awaiting_confirm_count ?? 0;
  const approved = period.admission_approved_count ?? 0;

  return {
    submitted,
    waitlisted,
    awaitingConfirm,
    approved,
    total: submitted + waitlisted + awaitingConfirm + approved,
  };
};

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
  initial_payment_due_days: null,
  round_number: null,
  // Không còn cho admin chỉnh 2 cờ này qua UI — luôn cố định true, "ai được đăng ký"
  // giờ xét thuần theo channel ở registrationPeriodTargetError() (BE). allow_admission_candidates
  // vẫn cần true vì được dùng để xác định đợt có nhận hồ sơ giữ chỗ tân sinh viên không
  // (DormReservationController, AutoCloseAdmissionPeriodsCommand...).
  allow_admission_candidates: true,
  requires_student_code: true,
};

type FormError = Partial<Record<keyof RegistrationPeriodPayload, string>>;
type PeriodDateField = "start_date" | "end_date" | "stay_start_date" | "stay_end_date";
type NumericPeriodField = "processing_days" | "bed_selection_days" | "initial_payment_due_days";

const periodModificationLockedMessage =
  "Không thể sửa hoặc xóa đợt đã mở/đã đóng. Vui lòng tạo đợt mới nếu cần thay đổi.";

const formFieldOrder: Array<keyof RegistrationPeriodPayload> = [
  "name",
  "channel",
  "school_year",
  "semester",
  "start_date",
  "end_date",
  "processing_days",
  "bed_selection_days",
  "initial_payment_due_days",
  "stay_start_date",
  "stay_end_date",
];

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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = startOfDay(date);
  next.setDate(next.getDate() + amount);
  return next;
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

function getStayStartMinDate(form: RegistrationPeriodPayload) {
  const endDate = dateInputToDate(form.end_date);
  if (!endDate) return null;

  const procDays = form.processing_days ?? 0;
  const bedDays = form.bed_selection_days ?? 0;
  const dueDays = form.initial_payment_due_days ?? 0;
  return addDays(endDate, procDays + bedDays + dueDays);
}

function schoolYearBounds(value?: string | null) {
  const match = String(value ?? "").trim().match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (endYear !== startYear + 1) return null;

  return { startYear, endYear };
}

function semesterEndDate(schoolYear: { startYear: number; endYear: number }, semester?: string | null) {
  switch (semester) {
    case "1":
      return new Date(schoolYear.startYear, 11, 31);
    case "2":
      return new Date(schoolYear.endYear, 4, 31);
    case "3":
      return new Date(schoolYear.endYear, 7, 31);
    default:
      return null;
  }
}

function isValidPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function canModifyPeriod(period: RegistrationPeriodData) {
  const startDate = dateInputToDate(period.start_date);
  return period.status === "pending" && startDate !== null && startDate > startOfDay(new Date());
}

/**
 * Rule 1 + Rule 2 gộp chung — kiểm tra kênh (channel) ngay khi đổi giá trị, không cần chờ
 * bấm "Tạo đợt" mới thấy lỗi (dùng lại y hệt logic ở validate(), tránh lệch nhau).
 */
function computeChannelError(
  channel: PeriodChannel | undefined,
  schoolYear: string | undefined,
  periods: RegistrationPeriodData[],
  editingId: number | null,
): string | undefined {
  // Chỉ check khi năm học đã nhập ĐỦ đúng định dạng YYYY-YYYY — tránh báo lỗi khi
  // người dùng còn đang gõ dở (VD "2026-").
  if (!schoolYear || !schoolYearBounds(schoolYear)) return undefined;

  if (channel === "main") {
    const duplicate = periods.find(
      (p) => p.channel === "main" && p.school_year === schoolYear.trim() && p.id !== editingId,
    );
    if (duplicate) return `Năm học ${schoolYear} đã có đợt chính rồi, không thể tạo thêm.`;
  }

  if (channel === "rolling") {
    const mainPeriod = periods.find(
      (p) => p.channel === "main" && p.school_year === schoolYear.trim(),
    );
    if (!mainPeriod) return `Năm học ${schoolYear} chưa có Đợt chính. Vui lòng tạo Đợt chính trước khi mở Quanh năm.`;
    if (mainPeriod.status !== "closed") return "Kênh quanh năm chỉ được mở sau khi đợt chính đã đóng.";
  }

  return undefined;
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
  const today = startOfDay(new Date());

  if (!form.name.trim()) errors.name = "Vui lòng nhập tên đợt.";

  if (!form.channel || !["main", "rolling"].includes(form.channel))
    errors.channel = "Vui lòng chọn kênh.";

  let schoolYear = null as ReturnType<typeof schoolYearBounds>;
  if (!form.school_year?.trim()) {
    errors.school_year = "Vui lòng nhập năm học.";
  } else {
    schoolYear = schoolYearBounds(form.school_year);
    if (!schoolYear) {
      errors.school_year = "Năm học phải có định dạng YYYY-YYYY.";
    } else if (new Date(schoolYear.endYear, 7, 31) < today) {
      errors.school_year = "Không thể tạo hoặc sửa đợt đăng ký cho năm học đã kết thúc.";
    }
  }

  if (!errors.school_year) {
    if (!form.semester || !["1", "2", "3"].includes(form.semester)) {
      errors.semester = "Vui lòng chọn học kỳ.";
    } else if (schoolYear) {
      const endOfSemester = semesterEndDate(schoolYear, form.semester);
      if (endOfSemester && endOfSemester < today)
        errors.semester = "Không thể tạo hoặc sửa đợt đăng ký cho học kỳ đã kết thúc.";
    }
  }

  if (!form.start_date) errors.start_date = "Vui lòng chọn ngày bắt đầu.";
  else if (startDate === null) errors.start_date = "Vui lòng nhập ngày theo định dạng dd/mm/yyyy.";
  if (!form.end_date) errors.end_date = "Vui lòng chọn ngày kết thúc.";
  else if (endDate === null) errors.end_date = "Vui lòng nhập ngày theo định dạng dd/mm/yyyy.";
  if (!form.stay_start_date) errors.stay_start_date = "Vui lòng chọn ngày bắt đầu.";
  else if (stayStartDate === null) errors.stay_start_date = "Vui lòng nhập ngày theo định dạng dd/mm/yyyy.";
  if (!form.stay_end_date) errors.stay_end_date = "Vui lòng chọn ngày kết thúc.";
  else if (stayEndDate === null) errors.stay_end_date = "Vui lòng nhập ngày theo định dạng dd/mm/yyyy.";
  if (startDate && endDate && endDate < startDate)
    errors.end_date = "Ngày kết thúc phải sau ngày bắt đầu.";
  if (stayStartDate && stayEndDate && stayEndDate <= stayStartDate)
    errors.stay_end_date = "Ngày kết thúc phải sau ngày bắt đầu.";

  if (form.processing_days == null) errors.processing_days = "Vui lòng nhập số ngày xử lý.";
  else if (!isValidPositiveInteger(form.processing_days)) errors.processing_days = "Số ngày phải lớn hơn hoặc bằng 1.";
  if (form.bed_selection_days == null) errors.bed_selection_days = "Vui lòng nhập số ngày chọn giường.";
  else if (!isValidPositiveInteger(form.bed_selection_days)) errors.bed_selection_days = "Số ngày phải lớn hơn hoặc bằng 1.";
  if (form.initial_payment_due_days == null)
    errors.initial_payment_due_days = "Vui lòng nhập số ngày thanh toán.";
  else if (!isValidPositiveInteger(form.initial_payment_due_days))
    errors.initial_payment_due_days = "Số ngày phải lớn hơn hoặc bằng 1.";

  // Rule 1 + Rule 2: ràng buộc theo kênh (mỗi năm học chỉ 1 đợt chính; quanh năm chỉ mở
  // sau khi đợt chính đã đóng) — dùng chung computeChannelError() để khớp với kiểm tra
  // live khi đổi kênh/năm học (xem useEffect ở component).
  if (!errors.school_year) {
    const channelError = computeChannelError(form.channel, form.school_year, periods, editingId);
    if (channelError) errors.channel = channelError;

    if (form.channel === "rolling" && !channelError) {
      const mainPeriod = periods.find(
        (p) => p.channel === "main" && p.school_year === form.school_year?.trim(),
      );
      if (mainPeriod && !normalizePeriodDate(mainPeriod.stay_end_date))
        errors.stay_end_date = "Đợt chính chưa có ngày kết thúc lưu trú, vui lòng cập nhật đợt chính trước.";
    }
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

  // Rule 4: stay_start_date >= end_date + processing_days + bed_selection_days + initial_payment_due_days
  if (
    stayStartDate &&
    endDate &&
    !errors.end_date &&
    !errors.stay_start_date &&
    !errors.processing_days &&
    !errors.bed_selection_days &&
    !errors.initial_payment_due_days
  ) {
    const procDays = form.processing_days ?? 0;
    const bedDays = form.bed_selection_days ?? 0;
    const dueDays = form.initial_payment_due_days ?? 0;
    const minDate = getStayStartMinDate(form);
    const minDateStr = minDate ? dateToInputValue(minDate) : null;
    if (minDateStr && stayStartDate < minDateStr) {
      const minFormatted = formatDate(minDateStr);
      errors.stay_start_date =
        `Ngày bắt đầu lưu trú tối thiểu phải là ${minFormatted} ` +
        `(sau ${procDays} ngày xử lý + ${bedDays} ngày chọn giường + ${dueDays} ngày thanh toán).`;
    }
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
    free_beds_by_gender: { male: number; female: number };
    approved: number;
    waitlist: number;
    promoted_from_waitlist?: number;
    capacity_by_gender?: DormCapacityByGender;
  } | null>(null);
  const [periodCapacity, setPeriodCapacity] = useState<Record<number, DormCapacityByGender | null>>({});
  const [periodCapacityLoading, setPeriodCapacityLoading] = useState<Record<number, boolean>>({});
  const [periodCapacityError, setPeriodCapacityError] = useState<Record<number, string | null>>({});
  const [capacityDetailsPeriodId, setCapacityDetailsPeriodId] = useState<number | null>(null);
  const [confirmBatchId, setConfirmBatchId] = useState<number | null>(null);
  const [confirmingBatchId, setConfirmingBatchId] = useState<number | null>(null);
  const [confirmRankId, setConfirmRankId] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [highlightedPeriodId, setHighlightedPeriodId] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [priorityNotice, setPriorityNotice] = useState<{ message: string; periodId: number; channel: string } | null>(null);
  const [admissionBlockerNotice, setAdmissionBlockerNotice] = useState<{
    message: string;
    periodName: string;
    stats: ReturnType<typeof admissionReservationBlockerStats>;
    onProceed: () => void;
    actionLabel: string;
  } | null>(null);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { headerSearchValue, setPeriodAutocomplete } = useOutletContext<AdminLayoutOutletContext>();
  const periodCardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const formFieldRefs = useRef<Partial<Record<keyof RegistrationPeriodPayload, HTMLDivElement | null>>>({});

  const setFieldRef = (key: keyof RegistrationPeriodPayload) => (node: HTMLDivElement | null) => {
    formFieldRefs.current[key] = node;
  };

  const focusFirstError = (errors: FormError) => {
    const firstKey = formFieldOrder.find((key) => Boolean(errors[key]));
    if (!firstKey) return;

    const node = formFieldRefs.current[firstKey];
    if (!node) return;

    node.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      const focusable = node.querySelector<HTMLElement>("input, select, button, [tabindex]");
      focusable?.focus();
    }, 180);
  };

  const handleSelectPeriod = (suggestion: PeriodAutocompleteSuggestion) => {
    setPeriodAutocomplete(null);
    periodCardRefs.current[suggestion.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedPeriodId(suggestion.id);
    window.setTimeout(() => {
      setHighlightedPeriodId((current) => (current === suggestion.id ? null : current));
    }, 1800);
  };

  // Search chung ở Header — tìm theo đợt đăng ký (năm học/học kỳ), chỉ áp dụng ở trang này.
  useEffect(() => {
    const trimmed = headerSearchValue.trim();
    if (!trimmed) {
      setPeriodAutocomplete(null);
      return;
    }

    const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);

    const matches = periods.filter((period) => {
      const haystack = [
        period.school_year ?? "",
        period.semester ?? "",
        `hk${period.semester ?? ""}`,
        `học kỳ ${period.semester ?? ""}`,
      ]
        .join(" ")
        .toLowerCase();

      return tokens.every((token) => haystack.includes(token));
    });

    const suggestions: PeriodAutocompleteSuggestion[] = matches.slice(0, 8).map((period) => {
      const periodStatus = period.status as PeriodStatus;
      return {
        id: period.id,
        school_year: period.school_year ?? "",
        semester: period.semester ?? "",
        statusLabel: statusLabel[periodStatus] ?? period.status ?? "",
        statusBadgeClassName: compactStatusBadgeClass[periodStatus] ?? "",
        dateRangeLabel: `${formatDate(period.start_date)} - ${formatDate(period.end_date)}`,
      };
    });

    setPeriodAutocomplete({
      suggestions,
      isSearching: false,
      onSelect: handleSelectPeriod,
      onDismiss: () => setPeriodAutocomplete(null),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerSearchValue, periods]);

  // Dọn dropdown khi rời trang
  useEffect(() => {
    return () => setPeriodAutocomplete(null);
  }, [setPeriodAutocomplete]);

  const loadCapacityForPeriod = async (period: RegistrationPeriodData) => {
    const proposedApprovedCountMale = period.approve_proposal_count_male ?? 0;
    const proposedApprovedCountFemale = period.approve_proposal_count_female ?? 0;
    setPeriodCapacityLoading((prev) => ({ ...prev, [period.id]: true }));
    setPeriodCapacityError((prev) => ({ ...prev, [period.id]: null }));

    try {
      const capacity = await getRegistrationPeriodCapacity(period.id, proposedApprovedCountMale, proposedApprovedCountFemale);
      setPeriodCapacity((prev) => ({ ...prev, [period.id]: capacity }));
    } catch {
      setPeriodCapacity((prev) => ({ ...prev, [period.id]: null }));
      setPeriodCapacityError((prev) => ({
        ...prev,
        [period.id]: "Không thể tải thông tin sức chứa. Vui lòng làm mới và thử lại.",
      }));
    } finally {
      setPeriodCapacityLoading((prev) => ({ ...prev, [period.id]: false }));
    }
  };

  const handleConfirmBatch = async (id: number) => {
    setConfirmingBatchId(id);
    setApiError(null);
    try {
      const result = await confirmBatch(id);
      setProcessResult({ message: `Đã xác nhận ${result.confirmed} đơn.`, free_beds_by_gender: { male: 0, female: 0 }, approved: result.confirmed, waitlist: result.skipped_review + result.skipped_null });
      await load(false);
      const period = periods.find((p) => p.id === id);
      if (period) void loadCapacityForPeriod({ ...period, status: "closed", approve_proposal_count: 0, approve_proposal_count_male: 0, approve_proposal_count_female: 0 });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Xác nhận không thành công.";
      setApiError(msg);
    } finally {
      setConfirmingBatchId(null);
      setConfirmBatchId(null);
    }
  };

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getRegistrationPeriods();
      setPeriods(data);
      data
        .filter((period) => period.status === "processing")
        .forEach((period) => void loadCapacityForPeriod(period));
    } catch {
      setApiError("Không thể tải danh sách đợt đăng ký.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const highlightId = Number(searchParams.get("highlight"));
    if (!highlightId || periods.length === 0) return;
    if (!periods.some((p) => p.id === highlightId)) return;

    periodCardRefs.current[highlightId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedPeriodId(highlightId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("highlight");
      return next;
    }, { replace: true });
    window.setTimeout(() => {
      setHighlightedPeriodId((current) => (current === highlightId ? null : current));
    }, 1800);
  }, [periods, searchParams, setSearchParams]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  /** Hạn cuối THẬT (không phải dự kiến) — LUÔN là 17:00 của end_date, dùng chung công thức FE/BE. */
  function admissionDeadline(endDate: string | null | undefined): Date | null {
    if (!endDate) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(endDate);
    if (!match) return null;
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), 17, 0, 0);
  }

  /** Chỉ gọi khi chưa qua deadline. */
  function formatCountdown(deadline: Date, reference: Date): string {
    const diffMinutesTotal = Math.floor((deadline.getTime() - reference.getTime()) / 60000);
    const days = Math.floor(diffMinutesTotal / (24 * 60));
    const hours = Math.floor((diffMinutesTotal % (24 * 60)) / 60);
    const minutes = diffMinutesTotal % 60;

    if (days === 0) {
      return `Còn ${hours} giờ ${minutes} phút đến hạn xác nhận nhập học.`;
    }
    return `Còn ${days} ngày ${hours} giờ đến hạn xác nhận nhập học lúc 17:00 ngày ${formatDate(deadline)}.`;
  }

  // Đợt "quanh năm" luôn theo đúng mốc kết thúc lưu trú của đợt "chính" cùng năm học
  // (chu kỳ lưu trú theo năm học, không tự chọn riêng) — tự điền và khoá field này.
  useEffect(() => {
    if (form.channel !== "rolling") return;
    const mainPeriod = periods.find(
      (p) => p.channel === "main" && p.school_year === form.school_year?.trim(),
    );
    const mainStayEnd = toDateInputValue(mainPeriod?.stay_end_date) || "";
    if (mainStayEnd !== (toDateInputValue(form.stay_end_date) || "")) {
      setForm((prev) => ({ ...prev, stay_end_date: mainStayEnd }));
      setFormErrors((prev) => ({ ...prev, stay_end_date: undefined }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.channel, form.school_year, periods]);

  // Báo lỗi kênh/năm học NGAY khi đổi dropdown "Kênh" hoặc gõ "Năm học" — không cần đợi
  // bấm "Tạo đợt" mới thấy (VD chọn "Quanh năm" cho năm học chưa có Đợt chính).
  useEffect(() => {
    const channelError = computeChannelError(form.channel, form.school_year, periods, editingId);
    setFormErrors((prev) => (prev.channel === channelError ? prev : { ...prev, channel: channelError }));
  }, [form.channel, form.school_year, periods, editingId]);

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
    if (!canModifyPeriod(period)) {
      setApiError(periodModificationLockedMessage);
      return;
    }

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
      initial_payment_due_days: period.initial_payment_due_days ?? null,
      round_number: period.round_number ?? null,
      // Cố định true — xem ghi chú ở defaultForm.
      allow_admission_candidates: true,
      requires_student_code: true,
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
      setApiError(null);
      setFormErrors(errors);
      focusFirstError(errors);
      return;
    }
    setSaving(true);
    setApiError(null);
    setFormErrors({});
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
        setApiError(null);
        setFormErrors(mapped);
        window.setTimeout(() => focusFirstError(mapped), 0);
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
    if (period && !canModifyPeriod(period)) {
      setApiError(periodModificationLockedMessage);
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
      if (result.capacity_by_gender) {
        setPeriodCapacity((prev) => ({ ...prev, [id]: result.capacity_by_gender ?? null }));
        setPeriodCapacityError((prev) => ({ ...prev, [id]: null }));
      }
      setPeriods((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "processing" } : p)),
      );
      await load(false);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; pending_priority_count?: number } } })?.response?.data;
      const period = periods.find((p) => p.id === id);
      if (typeof data?.pending_priority_count === "number" && data.pending_priority_count > 0) {
        setPriorityNotice({
          message: data.message ?? `Còn ${data.pending_priority_count} minh chứng ưu tiên chưa được xác minh. Vui lòng xác minh tất cả minh chứng trước khi xếp hạng.`,
          periodId: id,
          channel: period?.channel ?? "main",
        });
      } else {
        setApiError(data?.message ?? "Xếp hạng không thành công.");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const today = startOfDay(new Date());
  const startDateMinDate = today;
  const endDateMinDate = (() => {
    const startDate = dateInputToDate(form.start_date);
    return startDate ?? today;
  })();
  const calculatedStayStartMinDate = getStayStartMinDate(form);
  const stayStartMinDate = calculatedStayStartMinDate ?? today;
  const stayEndMinDate = (() => {
    const stayStartDate = dateInputToDate(form.stay_start_date);
    return stayStartDate ? addDays(stayStartDate, 1) : today;
  })();

  const inputClass = (key: keyof RegistrationPeriodPayload) =>
    `w-full rounded-xl border px-3 py-1.5 text-sm text-[#1f3152] focus:outline-none ${
      formErrors[key]
        ? "border-rose-400 bg-rose-50 focus:border-rose-500"
        : "border-[#cfdcf0] bg-[#f7faff] focus:border-[#244cb8]"
    }`;

  const dateInputClass = (key: keyof RegistrationPeriodPayload) =>
    `flex w-full items-center rounded-xl border text-sm text-[#1f3152] transition ${
      formErrors[key]
        ? "border-rose-400 bg-rose-50 focus-within:border-rose-500"
        : "border-[#cfdcf0] bg-[#f7faff] focus-within:border-[#244cb8]"
    }`;

  const selectClass = (key: keyof RegistrationPeriodPayload) =>
    `w-full appearance-none rounded-xl border px-3 py-1.5 pr-7 text-sm text-[#1f3152] focus:outline-none ${
      formErrors[key]
        ? "border-rose-400 bg-rose-50 focus:border-rose-500"
        : "border-[#cfdcf0] bg-[#f7faff] focus:border-[#244cb8]"
    }`;

  const preventInvalidNumberKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-", ".", ","].includes(event.key)) {
      event.preventDefault();
    }
  };

  const preventInvalidNumberPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (!/^\d+$/.test(event.clipboardData.getData("text"))) {
      event.preventDefault();
    }
  };

  const handleNumberChange = (key: NumericPeriodField, value: string) => {
    if (value !== "" && !/^\d+$/.test(value)) return;

    const nextValue = value === "" ? null : Number(value);
    setForm((prev) => ({ ...prev, [key]: nextValue }));
    if (isValidPositiveInteger(nextValue)) {
      setFormErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const field = (key: keyof RegistrationPeriodPayload, label: string, type = "text", extra?: React.InputHTMLAttributes<HTMLInputElement>, minDate?: Date) => {
    const isDateField = type === "date" && isPeriodDateField(key);
    const dateValue = isDateField ? toDateInputValue(form[key] as string) || "" : "";
    const dateText = isDateField ? getDateFieldText(form[key] as string) : "";
    const selectedDate = isDateField ? dateInputToDate(dateValue) : null;
    const isCalendarOpen = isDateField && openDateField === key;
    const calendarDates = isDateField ? getCalendarDates(calendarMonth) : [];
    const minDay = minDate ? startOfDay(minDate) : null;
    const shouldOpenCalendarBelow = key === "start_date" || key === "end_date";

    return (
      <div ref={setFieldRef(key)}>
        <label className="mb-1 block text-xs font-semibold text-[#324B76]">{label}</label>
        {isDateField ? (
          <div className="relative">
            <div className={dateInputClass(key)}>
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
                            ? "text-[#c7d1e1] line-through disabled:pointer-events-none"
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
            className={inputClass(key)}
            {...extra}
          />
        )}
        {formErrors[key] && <p className="mt-1 text-xs text-rose-600">{formErrors[key]}</p>}
      </div>
    );
  };

  const capacityDetailsPeriod = capacityDetailsPeriodId == null
    ? null
    : periods.find((period) => period.id === capacityDetailsPeriodId) ?? null;

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

      <CapacityDetailsModal
        open={capacityDetailsPeriodId !== null}
        onClose={() => setCapacityDetailsPeriodId(null)}
        capacity={capacityDetailsPeriod ? periodCapacity[capacityDetailsPeriod.id] ?? null : null}
        loading={capacityDetailsPeriod ? periodCapacityLoading[capacityDetailsPeriod.id] ?? false : false}
        error={capacityDetailsPeriod ? periodCapacityError[capacityDetailsPeriod.id] ?? null : null}
      />

      {/* Process result toast */}
      {processResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <strong>Xếp hạng xong.</strong> Suất cho đơn đăng ký (Nam: {processResult.free_beds_by_gender.male} · Nữ: {processResult.free_beds_by_gender.female}) —{" "}
          Duyệt: {processResult.approved} — Từ chối: {processResult.waitlist}
          {(processResult.promoted_from_waitlist ?? 0) > 0
            ? ` — Đôn thêm ${processResult.promoted_from_waitlist} hồ sơ giữ chỗ từ danh sách chờ (còn suất dư)`
            : ""}
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
            const isModifiable = canModifyPeriod(period);
            const admissionBlockerTotal = period.allow_admission_candidates
              ? admissionReservationBlockerTotal(period)
              : 0;
            const hasAdmissionBlockers = admissionBlockerTotal > 0;
            const admissionBlockerMessage = admissionReservationBlockerMessage(period);
            const admissionBlockerStats = admissionReservationBlockerStats(period);
            // status 'active'/'processing' không phân biệt được "còn nhận đơn thật" khỏi "đã
            // quá hạn 17:00 nhưng chưa xử lý xong" — badge xanh "Đang mở" gây hiểu nhầm là
            // còn nhận đơn mới trong khi cửa nhận đơn đã khóa từ lâu (báo cáo 27/07). Chỉ
            // tính cho đợt kênh chính, vì đợt quanh năm không có khái niệm hạn 17:00 này —
            // admin tự xác nhận/đóng bất cứ lúc nào, không cần chờ gì.
            const periodDeadline = periodChannel === "main" ? admissionDeadline(period.end_date) : null;
            const isOverdueUnprocessed =
              periodDeadline !== null &&
              now.getTime() > periodDeadline.getTime() &&
              (periodStatus === "active" || periodStatus === "processing");
            // Còn minh chứng ưu tiên pending → hệ thống THẬT SỰ không tự xử lý được, cần admin
            // can thiệp tay. Không còn minh chứng → không có gì chặn, chỉ đang chờ tới lượt
            // lệnh lập lịch chạy (hoặc admin bấm tay cho nhanh) — 2 tình huống khác hẳn nhau,
            // không nên dùng chung 1 câu "vui lòng xử lý" mập mờ.
            const isOverdueBlocked = isOverdueUnprocessed && (period.pending_criteria_count ?? 0) > 0;

            return (
            <motion.div
              key={period.id}
              ref={(node) => {
                periodCardRefs.current[period.id] = node;
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
              className={`rounded-[20px] border bg-white p-4 shadow-[0_12px_28px_rgba(36,76,184,0.09)] transition-all duration-500 sm:p-5 ${
                highlightedPeriodId === period.id
                  ? "border-[#244cb8] ring-4 ring-[#244cb8]/20"
                  : "border-[#d6e2f1]"
              }`}
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
                  <button
                    type="button"
                    onClick={() => {
                      setCapacityDetailsPeriodId(period.id);
                      if (periodCapacity[period.id] === undefined && !periodCapacityLoading[period.id]) {
                        void loadCapacityForPeriod(period);
                      }
                    }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-3.5 text-sm font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.09)] transition hover:-translate-y-0.5 hover:border-[#9eb9e6]"
                  >
                    <Info className="h-4 w-4" /> Sức chứa
                  </button>
                  <span
                    className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-bold uppercase tracking-normal ${
                      isOverdueBlocked
                        ? "border-rose-200 bg-rose-50 text-rose-700 shadow-[0_12px_28px_rgba(225,29,72,0.14)]"
                        : isOverdueUnprocessed
                          ? "border-orange-200 bg-orange-50 text-orange-700 shadow-[0_12px_28px_rgba(234,88,12,0.16)]"
                          : dashboardStatusClass[periodStatus] ?? ""
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isOverdueBlocked
                          ? "bg-rose-500"
                          : isOverdueUnprocessed
                            ? "bg-orange-500"
                            : dashboardStatusDotClass[periodStatus] ?? ""
                      }`}
                    />
                    {isOverdueBlocked
                      ? "Quá hạn, cần xử lý"
                      : isOverdueUnprocessed
                        ? "Quá hạn, chờ hệ thống xử lý"
                        : statusLabel[periodStatus] ?? period.status}
                  </span>
                </div>
              </div>

              {/* Thông tin từng dòng */}
              <div className="mt-4 grid items-stretch gap-2.5 sm:grid-cols-2">
                <DashboardTile icon={GraduationCap} label="Học kỳ - Năm học">
                  Học kỳ {period.semester} - Năm học {period.school_year}
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
                <DashboardTile icon={CalendarDays} label="Hạn thanh toán hóa đơn đầu">
                  {formatDayCount(period.initial_payment_due_days)}
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
                  {((period.approved_count ?? 0) + (period.rejected_count ?? 0)) > 0 && (
                    <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                      Đã xử lý xong: <strong className="text-base">{(period.approved_count ?? 0) + (period.rejected_count ?? 0)}</strong>
                    </span>
                  )}
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
                  {(period.cancelled_count ?? 0) > 0 && (
                    <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                      SV tự hủy: <strong className="text-base">{period.cancelled_count}</strong>
                    </span>
                  )}
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
                  {(period.cancelled_count ?? 0) > 0 && (
                    <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                      SV tự hủy: <strong className="text-base">{period.cancelled_count}</strong>
                    </span>
                  )}
                </div>
              )}

              {period.allow_admission_candidates && period.status !== "closed" && periodChannel === "main" && (() => {
                const deadline = periodDeadline;
                if (!deadline) return null;
                const isOverdue = now.getTime() > deadline.getTime();
                return (
                  <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                    isOverdueBlocked
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : isOverdue
                        ? "border-orange-200 bg-orange-50 text-orange-700"
                        : "border-sky-200 bg-sky-50 text-sky-700"
                  }`}>
                    {isOverdue ? (
                      <>
                        <p>Đợt đã kết thúc lúc 17:00 ngày {formatDate(deadline)}.</p>
                        <p className="mt-1 text-xs font-medium">
                          {isOverdueBlocked
                            ? `Còn ${period.pending_criteria_count} minh chứng ưu tiên chưa xác minh — cần bạn xác minh trước, hệ thống không tự xếp hạng được.`
                            : period.status === "processing"
                              ? 'Không còn gì chặn — hệ thống sẽ tự xác nhận khi lệnh lập lịch chạy tới, hoặc bấm "Xác nhận tất cả" để xử lý ngay.'
                              : 'Không còn gì chặn — hệ thống sẽ tự xếp hạng và xác nhận khi lệnh lập lịch chạy tới, hoặc bấm "Xếp hạng" để xử lý ngay.'}
                        </p>
                        <p className="mt-1 text-xs font-medium">
                          Đã duyệt chưa nhập học: {period.admission_approved_count ?? 0} · Chờ xét: {period.admission_submitted_count ?? 0} · Danh sách chờ: {period.admission_waitlisted_count ?? 0} · Chờ xác nhận đề xuất: {period.admission_awaiting_confirm_count ?? 0}
                        </p>
                      </>
                    ) : (
                      <p>{formatCountdown(deadline, now)}</p>
                    )}
                  </div>
                );
              })()}

              {/* Nút hành động theo trạng thái */}
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 border-t border-[#eef3fb] pt-3.5">
                {isModifiable && (
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
                    <Link to={`/admin/registrations?period=${period.id}&channel=${period.channel}`} className={secondaryActionClass}>
                      Xem đơn
                    </Link>
                    {period.channel === "main" && (() => {
                      const noRegs = totalRegistrations === 0;
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const endDay = new Date(period.end_date ?? ""); endDay.setHours(0, 0, 0, 0);
                      const notEnded = today < endDay;
                      const rankDisabled = processingId === period.id || noRegs;
                      const rankTitle = noRegs
                          ? "Không có đơn nào để xếp hạng"
                          : undefined;
                      return (
                        <span title={rankTitle} className="inline-flex">
                          <button
                            type="button"
                            disabled={rankDisabled}
                            onClick={() => {
                              const proceed = () => {
                                if (notEnded) setConfirmRankId(period.id);
                                else void handleProcess(period.id);
                              };
                              if (hasAdmissionBlockers) {
                                setAdmissionBlockerNotice({ message: admissionBlockerMessage, periodName: period.name ?? "đợt này", stats: admissionBlockerStats, onProceed: proceed, actionLabel: "Tiếp tục xếp hạng" });
                                return;
                              }
                              proceed();
                            }}
                            className={warningActionClass}
                          >
                            {processingId === period.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Xếp hạng
                          </button>
                        </span>
                      );
                    })()}
                  </>
                )}
                {period.status === "processing" && (
                  <>
                    <Link to={`/admin/registrations?period=${period.id}&channel=${period.channel}`} className={secondaryActionClass}>
                      Xem kết quả
                    </Link>
                    {(() => {
                      const reRankDisabled = processingId === period.id;
                      return (
                        <span title={hasAdmissionBlockers ? admissionBlockerMessage : undefined} className="inline-flex">
                          <button
                            type="button"
                            disabled={reRankDisabled}
                            onClick={() => {
                              if (hasAdmissionBlockers) {
                                setAdmissionBlockerNotice({ message: admissionBlockerMessage, periodName: period.name ?? "đợt này", stats: admissionBlockerStats, onProceed: () => void handleProcess(period.id), actionLabel: "Tiếp tục xếp hạng" });
                                return;
                              }
                              void handleProcess(period.id);
                            }}
                            className={warningActionClass}
                          >
                            {processingId === period.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Xếp hạng lại
                          </button>
                        </span>
                      );
                    })()}
                    {(() => {
                      const deadline = period.channel === "main" ? admissionDeadline(period.end_date) : null;
                      const isBeforeDeadline = deadline ? now.getTime() < deadline.getTime() : false;
                      const capacityExceededMale = periodCapacity[period.id]?.male?.capacity_exceeded ?? false;
                      const capacityExceededFemale = periodCapacity[period.id]?.female?.capacity_exceeded ?? false;
                      const capacityExceeded = capacityExceededMale || capacityExceededFemale;
                      return (
                        <button type="button"
                          disabled={
                            confirmingBatchId === period.id ||
                            (periodCapacityLoading[period.id] ?? false) ||
                            Boolean(periodCapacityError[period.id]) ||
                            capacityExceeded ||
                            isBeforeDeadline
                          }
                          title={isBeforeDeadline
                            ? `Chưa tới hạn 17:00 ngày ${deadline ? formatDate(deadline) : ""} — chưa thể xác nhận đóng đợt.`
                            : capacityExceeded
                              ? `Không thể xác nhận vì số hồ sơ đang chọn duyệt vượt quá sức chứa hiện tại (${capacityExceededMale ? "nam" : ""}${capacityExceededMale && capacityExceededFemale ? " và " : ""}${capacityExceededFemale ? "nữ" : ""}).`
                              : hasAdmissionBlockers
                                ? admissionBlockerMessage
                                : undefined}
                          onClick={() => {
                            if (hasAdmissionBlockers) {
                              setAdmissionBlockerNotice({ message: admissionBlockerMessage, periodName: period.name ?? "đợt này", stats: admissionBlockerStats, onProceed: () => setConfirmBatchId(period.id), actionLabel: "Tiếp tục xác nhận" });
                              return;
                            }
                            setConfirmBatchId(period.id);
                          }}
                          className={primaryActionClass}>
                          {confirmingBatchId === period.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Xác nhận tất cả
                        </button>
                      );
                    })()}
                  </>
                )}
                {period.status === "closed" && period.channel === "main" && (
                  <Link to={`/admin/registrations?period=${period.id}&channel=${period.channel}`} className={secondaryActionClass}>
                    Xem kết quả
                  </Link>
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
          >
            <div className="flex h-full items-center justify-center p-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex max-h-[calc(100dvh-7rem)] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-[#c1d6f4] bg-white shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
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
                    <div ref={setFieldRef("channel")}>
                      <label className="mb-1 block text-xs font-semibold text-[#324B76]">Kênh</label>
                      <div className="relative">
                        <select
                          value={form.channel}
                          onChange={(e) => {
                            setForm((prev) => ({ ...prev, channel: e.target.value as PeriodChannel }));
                            setFormErrors((prev) => ({ ...prev, channel: undefined }));
                          }}
                          className={selectClass("channel")}
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
                      {field("school_year", "Năm học")}
                      <div ref={setFieldRef("semester")}>
                        <label className="mb-1 block text-xs font-semibold text-[#324B76]">Học kỳ</label>
                        <div className="relative">
                          <select
                            value={form.semester}
                            onChange={(e) => {
                              setForm((prev) => ({ ...prev, semester: e.target.value }));
                              setFormErrors((prev) => ({ ...prev, semester: undefined }));
                            }}
                            className={selectClass("semester")}
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
                  {field("start_date", "Ngày bắt đầu nhận đơn", "date", undefined, startDateMinDate)}
                  {field("end_date", "Ngày kết thúc nhận đơn", "date", undefined, endDateMinDate)}
                </div>

                {/* Processing days, stay dates, bed selection */}
                <>
                    {/* Processing days */}
                    <div ref={setFieldRef("processing_days")}>
                      <label className="mb-1 block text-xs font-semibold text-[#324B76]">Số ngày xử lý đơn & phân phòng</label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={form.processing_days ?? ""}
                        onKeyDown={preventInvalidNumberKey}
                        onPaste={preventInvalidNumberPaste}
                        onChange={(e) => handleNumberChange("processing_days", e.target.value)}
                        className={inputClass("processing_days")}
                        placeholder="Nhập số ngày"
                      />
                      {formErrors.processing_days && <p className="mt-1 text-xs text-rose-600">{formErrors.processing_days}</p>}
                    </div>

                    {/* Bed selection days */}
                    <div ref={setFieldRef("bed_selection_days")}>
                      <label className="mb-1 block text-xs font-semibold text-[#324B76]">Số ngày chọn giường</label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={form.bed_selection_days ?? ""}
                        onKeyDown={preventInvalidNumberKey}
                        onPaste={preventInvalidNumberPaste}
                        onChange={(e) => handleNumberChange("bed_selection_days", e.target.value)}
                        className={inputClass("bed_selection_days")}
                        placeholder="Nhập số ngày"
                      />
                      {formErrors.bed_selection_days && <p className="mt-1 text-xs text-rose-600">{formErrors.bed_selection_days}</p>}
                    </div>

                    {/* Initial payment due days */}
                    <div ref={setFieldRef("initial_payment_due_days")}>
                      <label className="mb-1 block text-xs font-semibold text-[#324B76]">Số ngày thanh toán hóa đơn đầu</label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={form.initial_payment_due_days ?? ""}
                        onKeyDown={preventInvalidNumberKey}
                        onPaste={preventInvalidNumberPaste}
                        onChange={(e) => handleNumberChange("initial_payment_due_days", e.target.value)}
                        className={inputClass("initial_payment_due_days")}
                        placeholder="Nhập số ngày"
                      />
                      {formErrors.initial_payment_due_days && (
                        <p className="mt-1 text-xs text-rose-600">{formErrors.initial_payment_due_days}</p>
                      )}
                    </div>

                    {/* Stay dates */}
                    <div className="rounded-xl border border-[#cfdcf0] bg-[#f7faff] p-2.5">
                      <p className="mb-2 text-xs font-semibold text-[#324B76]">Thời gian lưu trú</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {field("stay_start_date", "Bắt đầu lưu trú", "date", undefined, stayStartMinDate)}
                        {form.channel === "rolling" ? (
                          <div ref={setFieldRef("stay_end_date")}>
                            <label className="mb-1 block text-xs font-semibold text-[#324B76]">Kết thúc lưu trú</label>
                            <div className={`w-full cursor-not-allowed rounded-xl border px-3 py-1.5 text-sm text-[#5d7299] ${
                              formErrors.stay_end_date ? "border-rose-400 bg-rose-50" : "border-[#cfdcf0] bg-[#eef2f8]"
                            }`}>
                              {form.stay_end_date
                                ? getDateFieldText(form.stay_end_date)
                                : periods.some((p) => p.channel === "main" && p.school_year === form.school_year?.trim())
                                  ? "Chưa xác định (đợt chính chưa có ngày kết thúc)"
                                  : "Chưa xác định (năm học này chưa có đợt chính)"}
                            </div>
                            <p className="mt-1 text-[11px] text-[#8598bd]">Tự động theo đợt chính cùng năm học, không thể chỉnh sửa.</p>
                            {formErrors.stay_end_date && <p className="mt-1 text-xs text-rose-600">{formErrors.stay_end_date}</p>}
                          </div>
                        ) : (
                          field("stay_end_date", "Kết thúc lưu trú", "date", undefined, stayEndMinDate)
                        )}
                      </div>
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
        {priorityNotice && (
          <motion.div
            key="priority-notice-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setPriorityNotice(null)}
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
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-[#1a2d52]">Cần xác minh minh chứng</h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-[#5d7299]">{priorityNotice.message}</p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setPriorityNotice(null)}
                  className="rounded-xl border border-[#d6e2f1] bg-white px-4 py-2 text-sm font-semibold text-[#5d7299] transition hover:bg-[#f5f9ff]">
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const { periodId, channel } = priorityNotice;
                    setPriorityNotice(null);
                    navigate(`/admin/registrations?period=${periodId}&channel=${channel}&filter=review`);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#31b7d4_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(36,76,184,0.22)] transition hover:brightness-110"
                >
                  Xem danh sách chờ xác minh
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {admissionBlockerNotice && (
          (() => {
            const onlyApprovedUnconverted =
              admissionBlockerNotice.stats.approved > 0
              && admissionBlockerNotice.stats.submitted === 0
              && admissionBlockerNotice.stats.waitlisted === 0
              && admissionBlockerNotice.stats.awaitingConfirm === 0;
            const targetPath = onlyApprovedUnconverted ? "/admin/admission-candidates" : "/admin/dorm-reservations";
            const targetLabel = onlyApprovedUnconverted ? "Hồ sơ trúng tuyển" : "Hồ sơ giữ chỗ";

            return (
          <motion.div
            key="admission-blocker-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setAdmissionBlockerNotice(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-2xl rounded-[24px] border border-amber-200 bg-white p-6 shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-[#1a2d52]">Còn hồ sơ giữ chỗ chưa hoàn tất</h2>
                  <p className="mt-1 text-sm font-semibold text-[#7c8fb5]">{admissionBlockerNotice.periodName}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-amber-700">Chờ xét</p>
                  <p className="mt-1 text-3xl font-bold text-amber-800">{admissionBlockerNotice.stats.submitted}</p>
                  <p className="mt-1 text-[11px] font-medium text-amber-700">Cần bấm Xếp hạng</p>
                </div>
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-sky-700">Danh sách chờ</p>
                  <p className="mt-1 text-3xl font-bold text-sky-800">{admissionBlockerNotice.stats.waitlisted}</p>
                  <p className="mt-1 text-[11px] font-medium text-sky-700">Tự đôn khi có người hủy, không cần bấm gì</p>
                </div>
                <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
                  <p className="whitespace-nowrap text-xs font-semibold uppercase text-violet-700">Đã có gợi ý</p>
                  <p className="mt-1 text-3xl font-bold text-violet-800">{admissionBlockerNotice.stats.awaitingConfirm}</p>
                  <p className="mt-1 text-[11px] font-medium text-violet-700">Cần bấm Xác nhận đề xuất</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="whitespace-nowrap text-xs font-semibold uppercase text-emerald-700">Chưa nhập học</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-800">{admissionBlockerNotice.stats.approved}</p>
                  <p className="mt-1 text-[11px] font-medium text-emerald-700">Cần nhập danh sách nhập học/MSSV</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-[#5d7299]">
                Tổng cộng <strong className="text-[#1a2d52]">{admissionBlockerNotice.stats.total}</strong> hồ sơ giữ chỗ chưa xử lý xong trong đợt này — mỗi nhóm cần hành động khác nhau (xem ghi chú dưới mỗi ô). Bạn vẫn có thể {admissionBlockerNotice.actionLabel.toLowerCase()} ngay nếu muốn.
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => setAdmissionBlockerNotice(null)}
                  className="rounded-xl border border-[#d6e2f1] bg-white px-4 py-2 text-sm font-semibold text-[#5d7299] transition hover:bg-[#f5f9ff]">
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdmissionBlockerNotice(null);
                    navigate(targetPath);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                >
                  {targetLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const proceed = admissionBlockerNotice.onProceed;
                    setAdmissionBlockerNotice(null);
                    proceed();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(245,158,11,0.22)] transition hover:brightness-110"
                >
                  {admissionBlockerNotice.actionLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
            );
          })()
        )}
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
