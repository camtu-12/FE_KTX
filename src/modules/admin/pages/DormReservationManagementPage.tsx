import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Eye,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  Shuffle,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  confirmRankedDormReservations,
  getAdminDormReservation,
  getAdminDormReservationHistory,
  getAdminDormReservations,
  patchReservationAutoDecision,
  rankDormReservations,
  rejectReservationPriority,
  verifyReservationPriority,
  type DormReservation,
  type DormReservationAutoDecision,
  type DormCapacityByGender,
  type ReservationPriority,
  type ReservationStatus,
} from "../../../api/dormReservationApi";
import { getRegistrationPeriodCapacity, getRegistrationPeriods } from "../../../api/registrationApi";
import CapacityDetailsModal from "../components/CapacityDetailsModal";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import { createPortal } from "react-dom";

const API_ORIGIN = ((import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000")
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

const resolveUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return `${API_ORIGIN}${url}`;
};

const primaryBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_45%,#31b7d4_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(36,76,184,0.20)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#c8d8ef] bg-white px-4 text-sm font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.09)] transition hover:-translate-y-0.5 disabled:opacity-50";
const dangerBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5 disabled:opacity-50";
const warningBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:-translate-y-0.5 disabled:opacity-50";
const inputCls =
  "w-full rounded-xl border border-[#cfdcf0] bg-[#f7faff] px-3 py-1.5 text-sm text-[#1f3152] focus:border-[#244cb8] focus:outline-none";
const detailSectionTitle =
  "text-lg font-semibold uppercase tracking-[0.14em] text-[#087a5a]";
const detailInfoCard =
  "min-h-[92px] rounded-2xl border border-[#d8e6f6] bg-[#f7faff] px-4 py-3.5";
const detailLabel =
  "text-[0.92rem] font-medium text-[#62789f]";
const detailValue =
  "mt-2 break-words text-base font-medium leading-6 text-[#1f3152]";
const detailImagePlaceholder =
  "flex w-full items-center justify-center rounded-2xl border border-dashed border-[#cfdcf0] bg-[#f5f9ff] text-sm font-semibold text-[#9aaac4]";

const STATUS_LABELS: Record<ReservationStatus, string> = {
  submitted: "Đã nộp hồ sơ",
  approved: "Đã duyệt giữ chỗ",
  rejected: "Không được duyệt",
  waitlisted: "Danh sách chờ",
  converted: "Đã chuyển thành đơn nội trú",
  expired: "Đã hết hạn",
};
const STATUS_COLORS: Record<ReservationStatus, string> = {
  submitted: "border-blue-200 bg-blue-50 text-blue-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  waitlisted: "border-amber-200 bg-amber-50 text-amber-700",
  converted: "border-teal-200 bg-teal-50 text-teal-700",
  expired: "border-slate-200 bg-slate-50 text-slate-600",
};

const STATUS_TOOLTIPS: Record<ReservationStatus, string> = {
  submitted: "Hồ sơ giữ chỗ đã được nộp và đang chờ xử lý.",
  approved: "Hồ sơ giữ chỗ đã được duyệt nhưng chưa chuyển thành đơn đăng ký nội trú chính thức.",
  rejected: "Hồ sơ giữ chỗ không được duyệt.",
  waitlisted: "Hồ sơ đang nằm trong danh sách chờ.",
  converted: "Hồ sơ giữ chỗ đã được chuyển thành đơn đăng ký nội trú chính thức.",
  expired: "Hồ sơ giữ chỗ đã hết hạn.",
};

type EffectiveReservationStatus = ReservationStatus | "registration_cancelled" | "self_cancelled";

// Cùng quy ước với ReservationProgressCard.tsx (trang public) — status 'rejected' dùng chung
// cho cả "bị admin từ chối" lẫn "sinh viên tự hủy" (xem DormReservationCancellationService),
// phân biệt qua tiền tố "Tự hủy:" trong rejectionReason.
const SELF_CANCEL_REASON_PREFIX = "Tự hủy:";
type ReservationStatusFilter =
  | "all"
  | "submitted"
  | "waitlisted"
  | "approved"
  | "rejected"
  | "self_cancelled"
  | "converted"
  | "approved_not_converted"
  | "expired_waitlisted";

type AutoDecisionFilter = "" | DormReservationAutoDecision;

const EFFECTIVE_STATUS_LABELS: Record<EffectiveReservationStatus, string> = {
  ...STATUS_LABELS,
  registration_cancelled: "Đơn nội trú đã hủy",
  self_cancelled: "SV tự hủy giữ chỗ",
};

const EFFECTIVE_STATUS_COLORS: Record<EffectiveReservationStatus, string> = {
  ...STATUS_COLORS,
  registration_cancelled: "border-rose-200 bg-rose-50 text-rose-700",
  self_cancelled: "border-slate-200 bg-slate-50 text-slate-600",
};

const EFFECTIVE_STATUS_TOOLTIPS: Record<EffectiveReservationStatus, string> = {
  ...STATUS_TOOLTIPS,
  registration_cancelled: "Hồ sơ giữ chỗ đã được chuyển thành đơn nội trú, sau đó đơn nội trú đã bị hủy.",
  self_cancelled: "Sinh viên/thí sinh tự hủy hồ sơ giữ chỗ — không phải do Ban quản lý từ chối.",
};

const isConvertedRegistrationCancelled = (reservation: DormReservation | null | undefined): boolean =>
  reservation?.status === "converted" && reservation.convertedRegistration?.status === "cancelled";

const isSelfCancelledReservation = (reservation: DormReservation | null | undefined): boolean =>
  reservation?.status === "rejected" && Boolean(reservation.rejectionReason?.startsWith(SELF_CANCEL_REASON_PREFIX));

const effectiveReservationStatus = (reservation: DormReservation): EffectiveReservationStatus => {
  if (isConvertedRegistrationCancelled(reservation)) return "registration_cancelled";
  if (isSelfCancelledReservation(reservation)) return "self_cancelled";
  return reservation.status;
};

const effectiveStatusLabel = (reservation: DormReservation): string =>
  EFFECTIVE_STATUS_LABELS[effectiveReservationStatus(reservation)];

const effectiveStatusClass = (reservation: DormReservation): string =>
  EFFECTIVE_STATUS_COLORS[effectiveReservationStatus(reservation)];

const effectiveStatusTooltip = (reservation: DormReservation): string =>
  EFFECTIVE_STATUS_TOOLTIPS[effectiveReservationStatus(reservation)];

const PRIORITY_EVIDENCE_BADGE: Record<"pending" | "verified" | "rejected", { label: string; className: string }> = {
  pending: { label: "Chờ xác minh", className: "border-amber-200 bg-amber-50 text-amber-700" },
  verified: { label: "Đã xác minh", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  rejected: { label: "Minh chứng không hợp lệ", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

const AUTO_DECISION_BADGE: Record<DormReservationAutoDecision, { label: string; className: string }> = {
  approve: { label: "Gợi ý duyệt", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  waitlist: { label: "Gợi ý danh sách chờ", className: "border-sky-200 bg-sky-50 text-sky-700" },
  reject: { label: "Gợi ý từ chối", className: "border-rose-200 bg-rose-50 text-rose-700" },
  review: { label: "Cần xem lại", className: "border-amber-200 bg-amber-50 text-amber-700" },
};

type Period = { id: number; name: string; status: string; allowAdmissionCandidates: boolean; endDate: string | null };
type PreviewImage = { url: string; label: string };

const RESERVATION_STATUS_FILTERS: Array<{ key: ReservationStatusFilter; label: string }> = [
  { key: "all", label: "Tất cả trạng thái" },
  { key: "approved", label: "Đã duyệt giữ chỗ" },
  { key: "rejected", label: "Không được duyệt" },
  { key: "self_cancelled", label: "SV tự hủy giữ chỗ" },
  { key: "converted", label: "Đã tạo đơn nội trú" },
  { key: "waitlisted", label: "Danh sách chờ" },
  { key: "approved_not_converted", label: "Hết hạn - chưa nhập học" },
  { key: "expired_waitlisted", label: "Hết hạn - danh sách chờ" },
];

const AUTO_DECISION_FILTERS: Array<{ key: AutoDecisionFilter; label: string }> = [
  { key: "", label: "Tất cả gợi ý" },
  { key: "approve", label: "Gợi ý duyệt" },
  { key: "waitlist", label: "Gợi ý danh sách chờ" },
  { key: "reject", label: "Gợi ý từ chối" },
  { key: "review", label: "Cần xem lại" },
];

const getPeriodEndDate = (value: string | null): Date | null => {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatListDate = (value: string | null | undefined): string => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const hasPendingReservationPriority = (reservation: DormReservation | null | undefined): boolean =>
  (reservation?.reservationPriorities ?? []).some((priority) => priority.status === "pending");

// Ưu tiên field has/priorityEvidenceStatus đã tổng hợp sẵn từ API (không N+1); fallback
// đọc reservationPriorities nếu FE có sẵn (trang chi tiết) để không bỏ sót dữ liệu cũ.
const hasRejectedReservationPriority = (reservation: DormReservation | null | undefined): boolean =>
  reservation?.priorityEvidenceStatus === "rejected"
  || (reservation?.reservationPriorities ?? []).some((priority) => priority.status === "rejected");

const summarizePriorityEvidenceStatus = (
  priorities: ReservationPriority[] | undefined,
  fallback: DormReservation["priorityEvidenceStatus"],
): DormReservation["priorityEvidenceStatus"] => {
  if (!priorities || priorities.length === 0) return fallback;
  if (priorities.some((priority) => priority.status === "rejected")) return "rejected";
  if (priorities.some((priority) => priority.status === "pending")) return "pending";
  return "verified";
};

const applyPriorityUpdate = (
  reservation: DormReservation,
  updatedPriority: ReservationPriority,
): DormReservation => {
  const priorities = reservation.reservationPriorities?.map((priority) =>
    priority.id === updatedPriority.id ? updatedPriority : priority
  );
  const priorityEvidenceStatus = summarizePriorityEvidenceStatus(priorities, updatedPriority.status);
  const shouldRejectReservation = priorityEvidenceStatus === "rejected"
    && !["converted", "expired"].includes(reservation.status);

  return {
    ...reservation,
    status: shouldRejectReservation ? "rejected" : reservation.status,
    rejectionReason: shouldRejectReservation
      ? reservation.rejectionReason ?? "Minh chứng ưu tiên không hợp lệ."
      : reservation.rejectionReason,
    reservationPriorities: priorities,
    hasPriorityEvidence: true,
    priorityEvidenceStatus,
  };
};

/** Hạn cuối THẬT — LUÔN 17:00 của period.endDate, dùng cùng công thức các nơi khác trong FE. */
const formatAdmissionDeadlineLabel = (endDate: string | null | undefined): string | null => {
  if (!endDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(endDate);
  if (!match) return null;
  const [, year, month, day] = match;
  return `17:00 ngày ${day}/${month}/${year}`;
};

const EXPIRATION_REASON_LABEL: Record<string, string> = {
  approved_not_converted: "Hết hạn - chưa nhập học",
  period_closed_while_waitlisted: "Hết hạn - danh sách chờ",
};

const EXPIRATION_REASON_DESCRIPTION: Record<string, string> = {
  approved_not_converted: "Hồ sơ đã được duyệt giữ chỗ nhưng chưa nhập học/chưa chuyển thành đơn nội trú trước khi đợt kết thúc.",
  period_closed_while_waitlisted: "Hồ sơ hết hiệu lực khi đợt đăng ký kết thúc trong lúc còn ở danh sách chờ.",
};

export default function DormReservationManagementPage() {
  const { headerSearchValue: search } = useOutletContext<AdminLayoutOutletContext>();

  const [reservations, setReservations] = useState<DormReservation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<number | "">("");
  const [statusFilter, setStatusFilter] = useState<ReservationStatusFilter>("all");
  const [autoDecisionFilter, setAutoDecisionFilter] = useState<AutoDecisionFilter>("");
  const [priorityEvidenceFilter, setPriorityEvidenceFilter] = useState<"" | "pending" | "verified" | "rejected">("");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodsLoaded, setPeriodsLoaded] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // detail modal
  const [detail, setDetail] = useState<DormReservation | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "history">("info");
  const [detailHistory, setDetailHistory] = useState<DormReservation[]>([]);
  const [detailHistoryLoading, setDetailHistoryLoading] = useState(false);
  const [detailFromHistory, setDetailFromHistory] = useState(false);

  // action loading
  const [actionId, setActionId] = useState<number | null>(null);

  // detail loading (for full detail with priorities)
  const [detailLoading, setDetailLoading] = useState(false);

  // ranking panel — dùng đợt tân sinh viên đang mở/mới nhất, không bắt admin chọn tay trên màn này.
  const [rankLoading, setRankLoading] = useState(false);
  const [rankResult, setRankResult] = useState<{ approved: number; waitlist: number; freeBedsByGender: { male: number; female: number }; capacity?: DormCapacityByGender } | null>(null);
  const [rankCapacity, setRankCapacity] = useState<DormCapacityByGender | null>(null);
  const [rankCapacityLoading, setRankCapacityLoading] = useState(false);
  const [rankCapacityError, setRankCapacityError] = useState<string | null>(null);
  const [rankableReservationCount, setRankableReservationCount] = useState(0);
  const [confirmRankedLoading, setConfirmRankedLoading] = useState(false);
  const [showCapacityDetails, setShowCapacityDetails] = useState(false);
  const [rankConfirmPeriod, setRankConfirmPeriod] = useState<Period | null>(null);
  const [proposalRejectTarget, setProposalRejectTarget] = useState<DormReservation | null>(null);
  const [proposalRejectReason, setProposalRejectReason] = useState("");
  // Key gồm cả variant ("list"/"detail") + id — không chỉ id, vì cùng 1 reservation có thể
  // được render đồng thời ở dòng danh sách LẪN modal chi tiết; chỉ dùng id sẽ khiến mở dropdown
  // ở chỗ này cũng "mở ké" luôn dropdown của chỗ kia (bị che phía sau modal).
  const [openDecisionDropdownKey, setOpenDecisionDropdownKey] = useState<string | null>(null);
  const decisionDropdownRef = useRef<HTMLDivElement | null>(null);
  const [priorityNotice, setPriorityNotice] = useState<{ message: string } | null>(null);

  // priority action loading in detail modal
  const [priorityActionId, setPriorityActionId] = useState<number | null>(null);

  // image lightbox
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadRankCapacity = useCallback(async (periodId: number, proposedApprovedCountByGender?: { male: number; female: number }) => {
    setRankCapacityLoading(true);
    setRankCapacityError(null);
    setRankCapacity(null);
    try {
      const approvedProposalCountByGender = proposedApprovedCountByGender ?? {
        male: (
          await getAdminDormReservations({
            registration_period_id: periodId,
            statuses: ["submitted", "waitlisted"],
            auto_decision: "approve",
            gender: "male",
            page: 1,
          })
        ).total,
        female: (
          await getAdminDormReservations({
            registration_period_id: periodId,
            statuses: ["submitted", "waitlisted"],
            auto_decision: "approve",
            gender: "female",
            page: 1,
          })
        ).total,
      };
      const capacity = await getRegistrationPeriodCapacity(periodId, approvedProposalCountByGender.male, approvedProposalCountByGender.female);
      setRankCapacity(capacity);
    } catch {
      setRankCapacityError("Không thể tải thông tin sức chứa. Vui lòng làm mới và thử lại.");
    } finally {
      setRankCapacityLoading(false);
    }
  }, []);

  const loadRankableReservationCount = useCallback(async (periodId: number) => {
    try {
      const res = await getAdminDormReservations({
        registration_period_id: periodId,
        status: "submitted",
        auto_decision_empty: true,
        page: 1,
      });
      setRankableReservationCount(res.total);
    } catch {
      setRankableReservationCount(0);
    }
  }, []);

  useEffect(() => {
    setRankResult(null);
    setShowCapacityDetails(false);

    if (!periodFilter) {
      setRankCapacity(null);
      setRankCapacityError(null);
      setRankCapacityLoading(false);
      setRankableReservationCount(0);
      return;
    }

    void loadRankCapacity(Number(periodFilter));
    void loadRankableReservationCount(Number(periodFilter));
  }, [loadRankCapacity, loadRankableReservationCount, periodFilter]);

  const copyReservationCode = async (code: string | null | undefined) => {
    const value = code?.trim();
    if (!value) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      showToast("success", "Đã sao chép mã giữ chỗ.");
    } catch {
      showToast("error", "Không thể sao chép mã giữ chỗ.");
    }
  };

  useEffect(() => {
    getRegistrationPeriods()
      .then((data: Array<{ id: number; name: string; status?: string; end_date?: string | null; application_end_date?: string | null; allow_admission_candidates?: boolean }>) =>
        setPeriods(
          data.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status ?? "",
            endDate: p.application_end_date ?? p.end_date ?? null,
            allowAdmissionCandidates: Boolean((p as unknown as { allow_admission_candidates?: boolean }).allow_admission_candidates),
          }))
        )
      )
      .catch(() => null)
      .finally(() => setPeriodsLoaded(true));
  }, []);

  useEffect(() => {
    if (periodFilter || periods.length === 0) return;

    const admissionPeriods = periods.filter((p) => p.allowAdmissionCandidates);
    const currentPeriod =
      admissionPeriods.find((p) => p.status === "active")
      ?? admissionPeriods.find((p) => p.status === "processing")
      ?? admissionPeriods.find((p) => p.status === "pending")
      ?? admissionPeriods[0];

    if (currentPeriod) {
      setPeriodFilter(currentPeriod.id);
    }
  }, [periodFilter, periods]);

  const buildReservationFilterParams = useCallback((): Parameters<typeof getAdminDormReservations>[0] => {
    switch (statusFilter) {
      case "all":
        return {};
      case "submitted":
      case "waitlisted":
      case "approved":
        return { status: statusFilter };
      case "rejected":
        return { status: "rejected", self_cancelled: "no" };
      case "self_cancelled":
        return { status: "rejected", self_cancelled: "yes" };
      case "converted":
        return { status: "converted" };
      case "approved_not_converted":
        return { status: "expired", expiration_reason: "approved_not_converted" };
      case "expired_waitlisted":
        return { status: "expired", expiration_reason: "period_closed_while_waitlisted" };
    }
  }, [statusFilter]);

  const load = useCallback(async (page = 1) => {
    if (!periodsLoaded || !periodFilter) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setApiError(null);
    try {
      const res = await getAdminDormReservations({
        ...buildReservationFilterParams(),
        search: search || undefined,
        registration_period_id: periodFilter || undefined,
        auto_decision: autoDecisionFilter || undefined,
        priority_evidence_status: priorityEvidenceFilter || undefined,
        page,
      });
      setReservations(res.data);
      setCurrentPage(res.current_page);
      setLastPage(res.last_page);
    } catch {
      setApiError("Không thể tải danh sách hồ sơ giữ chỗ.");
    } finally {
      setLoading(false);
    }
  }, [autoDecisionFilter, buildReservationFilterParams, search, periodFilter, periodsLoaded, priorityEvidenceFilter]);

  useEffect(() => { void load(1); }, [load]);

  useEffect(() => {
    if (openDecisionDropdownKey == null) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!decisionDropdownRef.current?.contains(event.target as Node)) {
        setOpenDecisionDropdownKey(null);
      }
    };

    window.addEventListener("mousedown", closeOnOutsideClick);
    return () => window.removeEventListener("mousedown", closeOnOutsideClick);
  }, [openDecisionDropdownKey]);

  const patch = (updated: DormReservation) => {
    setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (detail?.id === updated.id) setDetail(updated);
  };

  const syncReservationAfterPriorityUpdate = async (baseDetail: DormReservation, updatedPriority: ReservationPriority) => {
    const optimisticDetail = applyPriorityUpdate(baseDetail, updatedPriority);
    patch(optimisticDetail);

    try {
      const full = await getAdminDormReservation(baseDetail.id);
      patch(full);
    } catch {
      // optimistic state is already applied; list refresh below will retry the latest server state
    } finally {
      void load(currentPage);
      if (periodFilter) {
        void loadRankCapacity(Number(periodFilter));
        void loadRankableReservationCount(Number(periodFilter));
      }
    }
  };

  const handlePatchAutoDecision = async (r: DormReservation, decision: DormReservationAutoDecision, reason?: string) => {
    setActionId(r.id);
    try {
      const res = await patchReservationAutoDecision(r.id, decision, reason);
      patch(res.reservation);
      setRankResult(null);
      if (periodFilter) {
        void loadRankCapacity(Number(periodFilter));
        void loadRankableReservationCount(Number(periodFilter));
      }
      showToast("success", "Đã cập nhật đề xuất hồ sơ.");
    } catch (err: unknown) {
      showToast("error", (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Thao tác thất bại.");
    } finally {
      setActionId(null);
    }
  };

  const handleConfirmProposalReject = async () => {
    if (!proposalRejectTarget || !proposalRejectReason.trim()) return;
    const target = proposalRejectTarget;
    await handlePatchAutoDecision(target, "reject", proposalRejectReason.trim());
    setProposalRejectTarget(null);
    setProposalRejectReason("");
  };

  const handleConfirmRanked = async () => {
    if (!periodFilter) return;
    setConfirmRankedLoading(true);
    try {
      const res = await confirmRankedDormReservations(Number(periodFilter));
      showToast("success", `Đã xác nhận: ${res.approved} duyệt, ${res.waitlisted} danh sách chờ, ${res.rejected} từ chối.`);
      setRankResult(null);
      void load(1);
      void loadRankCapacity(Number(periodFilter), { male: 0, female: 0 });
      void loadRankableReservationCount(Number(periodFilter));
    } catch (err: unknown) {
      showToast("error", (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Xác nhận đề xuất thất bại.");
    } finally {
      setConfirmRankedLoading(false);
    }
  };

  const handleOpenDetail = async (r: DormReservation) => {
    setDetail(r);
    setDetailTab("info");
    setDetailHistory([]);
    setDetailFromHistory(false);
    setDetailLoading(true);
    try {
      const full = await getAdminDormReservation(r.id);
      setDetail(full);
    } catch {
      // keep the list version
    } finally {
      setDetailLoading(false);
    }
  };

  // Xem chi tiết 1 lần nộp cũ ngay từ tab Lịch sử — giữ nguyên danh sách lịch sử đã tải
  // (cùng 1 thí sinh) và đánh dấu detailFromHistory để nút Đóng/X quay lại tab Lịch sử
  // thay vì đóng hẳn modal.
  const handleViewHistoryItem = async (h: DormReservation) => {
    setDetailFromHistory(true);
    setDetail(h);
    setDetailTab("info");
    setDetailLoading(true);
    try {
      const full = await getAdminDormReservation(h.id);
      setDetail(full);
    } catch {
      // keep the list version
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    if (detailFromHistory) {
      setDetailTab("history");
      setDetailFromHistory(false);
      return;
    }
    setDetail(null);
  };

  const handleOpenDetailTab = async (tab: "info" | "history") => {
    setDetailTab(tab);
    if (tab !== "history" || !detail || detailHistory.length > 0) return;
    setDetailHistoryLoading(true);
    try {
      const items = await getAdminDormReservationHistory(detail.id);
      setDetailHistory(items);
    } catch {
      showToast("error", "Không thể tải lịch sử hồ sơ.");
    } finally {
      setDetailHistoryLoading(false);
    }
  };

  const runRank = async (periodId: number) => {
    setRankLoading(true);
    setRankResult(null);
    try {
      const res = await rankDormReservations(periodId);
      setRankResult({ approved: res.approved, waitlist: res.waitlist, freeBedsByGender: res.free_beds_by_gender, capacity: res.capacity_by_gender });
      setRankCapacity(res.capacity_by_gender ?? null);
      showToast("success", `Đã tạo đề xuất: ${res.approved} gợi ý duyệt, ${res.waitlist} gợi ý danh sách chờ.`);
      void load(1);
      void loadRankableReservationCount(periodId);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; pending_priority_count?: number } } })?.response?.data;
      if (typeof data?.pending_priority_count === "number" && data.pending_priority_count > 0) {
        setPriorityNotice({
          message: data.message ?? `Còn ${data.pending_priority_count} minh chứng ưu tiên chưa xác minh. Vui lòng xác minh tất cả minh chứng trước khi xếp hạng.`,
        });
      } else {
        showToast("error", data?.message ?? "Xếp hạng thất bại.");
      }
    } finally {
      setRankLoading(false);
    }
  };

  const handleRank = async () => {
    if (!periodFilter) return;

    const period = periods.find((p) => p.id === Number(periodFilter));
    const endDate = getPeriodEndDate(period?.endDate ?? null);
    if (period && endDate && endDate > new Date()) {
      setRankConfirmPeriod(period);
      return;
    }

    await runRank(Number(periodFilter));
  };

  const handleVerifyPriority = async (priorityId: number) => {
    setPriorityActionId(priorityId);
    try {
      const res = await verifyReservationPriority(priorityId);
      if (detail) {
        await syncReservationAfterPriorityUpdate(detail, res.priority);
      }
      showToast("success", "Đã đánh dấu minh chứng hợp lệ.");
    } catch {
      showToast("error", "Cập nhật minh chứng thất bại.");
    } finally {
      setPriorityActionId(null);
    }
  };

  const handleRejectPriority = async (priorityId: number) => {
    setPriorityActionId(priorityId);
    try {
      const res = await rejectReservationPriority(priorityId);
      if (detail) {
        await syncReservationAfterPriorityUpdate(detail, res.priority);
      }
    } catch {
      showToast("error", "Cập nhật minh chứng thất bại.");
    } finally {
      setPriorityActionId(null);
    }
  };

  const previewImages = useMemo<PreviewImage[]>(() => {
    if (!detail) return [];

    const images: PreviewImage[] = [
      { url: resolveUrl(detail.avatarUrl), label: "Ảnh đại diện" },
      { url: resolveUrl(detail.cccdFrontUrl), label: "CCCD mặt trước" },
      { url: resolveUrl(detail.cccdBackUrl), label: "CCCD mặt sau" },
    ].filter((image) => image.url);

    detail.reservationPriorities?.forEach((priority) => {
      priority.evidences?.forEach((evidence) => {
        const fileUrl = resolveUrl(evidence.fileUrl);
        const isPdf = evidence.mimeType === "application/pdf" || evidence.fileUrl.endsWith(".pdf");
        if (!fileUrl || isPdf) return;
        images.push({
          url: fileUrl,
          label: evidence.originalName ?? priority.criteria?.name ?? "Minh chứng",
        });
      });
    });

    return images;
  }, [detail]);

  const previewImg = previewIndex == null ? null : previewImages[previewIndex] ?? null;
  const openPreviewImage = (url: string, label: string) => {
    const index = previewImages.findIndex((image) => image.url === url && image.label === label);
    setPreviewIndex(index >= 0 ? index : 0);
  };
  const showPreviousPreview = () => setPreviewIndex((current) => {
    if (current == null || previewImages.length === 0) return current;
    return (current - 1 + previewImages.length) % previewImages.length;
  });
  const showNextPreview = () => setPreviewIndex((current) => {
    if (current == null || previewImages.length === 0) return current;
    return (current + 1) % previewImages.length;
  });

  const hasActiveFilters = statusFilter !== "all" || autoDecisionFilter !== "" || priorityEvidenceFilter !== "";

  const resetFilters = () => {
    setStatusFilter("all");
    setAutoDecisionFilter("");
    setPriorityEvidenceFilter("");
  };

  const rankPanelCapacity = rankResult?.capacity ?? rankCapacity;
  const selectedPeriodAllowsAdmission = periodFilter
    ? Boolean(periods.find((p) => p.id === Number(periodFilter))?.allowAdmissionCandidates)
    : false;
  const hasRankableReservations = rankableReservationCount > 0;
  const rankDisabled =
    !periodFilter
    || !selectedPeriodAllowsAdmission
    || !hasRankableReservations
    || rankLoading
    || rankCapacityLoading
    || Boolean(rankCapacityError);
  const rankButtonTitle =
    !periodFilter || !selectedPeriodAllowsAdmission
      ? "Không tìm thấy đợt đăng ký tân sinh viên đang mở."
      : !hasRankableReservations
        ? "Đợt này không còn hồ sơ chờ xử lý mới để xếp hạng."
        : rankCapacityError
          ? "Không thể tải sức chứa. Vui lòng làm mới trước khi xếp hạng."
          : undefined;

  const renderDecisionDropdown = (r: DormReservation, variant: "list" | "detail" = "list") => {
    if ((r.status !== "submitted" && r.status !== "waitlisted") || hasRejectedReservationPriority(r)) return null;

    const dropdownKey = `${variant}-${r.id}`;
    const isOpen = openDecisionDropdownKey === dropdownKey;
    const isPendingPriority = hasPendingReservationPriority(r);
    const buttonClassName = variant === "detail"
      ? `${secondaryBtn} h-11 min-w-[148px] px-5 text-sm`
      : `${secondaryBtn} h-10 min-w-[132px] px-4 text-[13px]`;
    const optionClassName =
      "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold transition hover:bg-[#f7faff] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white";

    const chooseDecision = (decision: DormReservationAutoDecision) => {
      setOpenDecisionDropdownKey(null);
      void handlePatchAutoDecision(r, decision);
    };

    return (
      <div ref={isOpen ? decisionDropdownRef : undefined} className="relative">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setOpenDecisionDropdownKey(isOpen ? null : dropdownKey);
          }}
          disabled={actionId === r.id}
          className={buttonClassName}
        >
          {actionId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {r.autoDecision ? "Đổi đề xuất" : "Xử lý đơn"}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>

        {isOpen && (
          <div
            className={`absolute right-0 z-[80] w-48 overflow-hidden rounded-xl border border-[#d6e2f1] bg-white py-1 shadow-[0_18px_36px_rgba(31,49,82,0.16)] ${
              variant === "detail" ? "bottom-full mb-2" : "top-full mt-2"
            }`}
          >
            <button
              type="button"
              disabled={isPendingPriority || actionId === r.id}
              title={isPendingPriority ? "Cần xác minh hoặc từ chối tất cả minh chứng trước khi đề xuất duyệt." : undefined}
              onClick={() => chooseDecision("approve")}
              className={`${optionClassName} text-emerald-700`}
            >
              Duyệt
            </button>
            <button
              type="button"
              disabled={isPendingPriority || actionId === r.id}
              title={isPendingPriority ? "Cần xác minh hoặc từ chối tất cả minh chứng trước khi đưa vào danh sách chờ." : undefined}
              onClick={() => chooseDecision("waitlist")}
              className={`${optionClassName} text-sky-700`}
            >
              Danh sách chờ
            </button>
            <button
              type="button"
              disabled={actionId === r.id}
              onClick={() => {
                setOpenDecisionDropdownKey(null);
                setProposalRejectTarget(r);
                setProposalRejectReason(r.autoDecision === "reject" ? r.autoDecisionReason ?? "" : "");
              }}
              className={`${optionClassName} text-rose-600`}
            >
              Từ chối
            </button>
            <button
              type="button"
              disabled={actionId === r.id}
              onClick={() => chooseDecision("review")}
              className={`${optionClassName} text-amber-700`}
            >
              Cần xem lại
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div key="toast" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className={`fixed right-4 top-20 z-[200] flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
              toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
            }`}>
            {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <CapacityDetailsModal
        open={showCapacityDetails}
        onClose={() => setShowCapacityDetails(false)}
        capacity={rankPanelCapacity}
        loading={rankCapacityLoading}
        error={rankCapacityError}
      />

      {/* Header */}
      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1a2d52]">Hồ sơ giữ chỗ KTX tân sinh viên</h1>
          </div>
          <button type="button" onClick={() => void load(1)} disabled={loading} className={secondaryBtn}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Làm mới
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 items-end gap-3 lg:grid-cols-[minmax(170px,1fr)_minmax(190px,1fr)_minmax(190px,1fr)_auto]">
          <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-[#62789f]">
            Gợi ý
            <select
              value={autoDecisionFilter}
              aria-label="Gợi ý"
              onChange={(e) => setAutoDecisionFilter(e.target.value as AutoDecisionFilter)}
              className="w-full rounded-xl border border-[#cfdcf0] bg-white px-3 py-2 text-xs font-semibold text-[#1f3152] focus:border-[#244cb8] focus:outline-none"
            >
              {AUTO_DECISION_FILTERS.map((option) => (
                <option key={option.key || "all"} value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-[#62789f]">
            Trạng thái
            <select
              value={statusFilter}
              aria-label="Trạng thái"
              onChange={(e) => setStatusFilter(e.target.value as ReservationStatusFilter)}
              className="w-full rounded-xl border border-[#cfdcf0] bg-white px-3 py-2 text-xs font-semibold text-[#1f3152] focus:border-[#244cb8] focus:outline-none"
            >
              {RESERVATION_STATUS_FILTERS.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-[#62789f]">
            Minh chứng ưu tiên
            <select
              value={priorityEvidenceFilter}
              aria-label="Minh chứng ưu tiên"
              onChange={(e) => setPriorityEvidenceFilter(e.target.value as typeof priorityEvidenceFilter)}
              className="w-full rounded-xl border border-[#cfdcf0] bg-white px-3 py-2 text-xs font-semibold text-[#1f3152] focus:border-[#244cb8] focus:outline-none"
            >
              <option value="">Tất cả</option>
              <option value="pending">Chờ xác minh</option>
              <option value="verified">Đã xác minh</option>
              <option value="rejected">Không hợp lệ</option>
            </select>
          </label>
          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
            <button
              type="button"
              disabled={rankDisabled}
              onClick={() => void handleRank()}
              title={rankButtonTitle}
              className={`${primaryBtn} h-[38px] min-w-[118px] shrink-0 gap-1.5 whitespace-nowrap px-3 text-xs`}
            >
              {rankLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shuffle className="h-3.5 w-3.5" />}
              Xếp hạng
            </button>
            {(rankResult || (rankPanelCapacity?.male.proposed_approved_count ?? 0) > 0 || (rankPanelCapacity?.female.proposed_approved_count ?? 0) > 0) && (
              <button
                type="button"
                disabled={!periodFilter || confirmRankedLoading}
                onClick={() => void handleConfirmRanked()}
                title={!periodFilter ? "Vui lòng chọn đợt đăng ký cụ thể trước khi xác nhận đề xuất." : "Xác nhận các đề xuất đã xếp hạng trong đợt này"}
                className={`${warningBtn} h-[38px] min-w-[112px] shrink-0 gap-1.5 whitespace-nowrap px-3 text-xs`}
              >
                {confirmRankedLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Xác nhận
              </button>
            )}
            <button
              type="button"
              disabled={!periodFilter || rankCapacityLoading || Boolean(rankCapacityError)}
              onClick={() => setShowCapacityDetails(true)}
              title={!periodFilter ? "Vui lòng chọn đợt đăng ký cụ thể để xem sức chứa." : "Xem chi tiết sức chứa"}
              className={`${secondaryBtn} h-[38px] min-w-[106px] shrink-0 gap-1.5 whitespace-nowrap px-3 text-xs`}
            >
              <Info className="h-3.5 w-3.5" />
              Sức chứa
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-[38px] min-w-[104px] shrink-0 items-center justify-center rounded-xl border border-[#cfdcf0] bg-white px-3 py-2 text-xs font-semibold whitespace-nowrap text-[#244cb8] transition hover:border-[#244cb8] hover:bg-[#f7faff]"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {periodFilter && !rankCapacityLoading && !rankCapacityError && rankPanelCapacity && (
          <p className="mt-2 text-xs font-semibold text-[#244cb8]">
            Nam —{" "}
            {rankPanelCapacity.male.proposed_approved_count > 0
              ? `Gợi ý duyệt: ${rankPanelCapacity.male.proposed_approved_count} — Còn lại sau xác nhận: ${rankPanelCapacity.male.remaining_after_proposals} suất.`
              : `Suất còn lại hiện tại: ${rankPanelCapacity.male.available_approval_slots} suất.`}
            {" · "}Nữ —{" "}
            {rankPanelCapacity.female.proposed_approved_count > 0
              ? `Gợi ý duyệt: ${rankPanelCapacity.female.proposed_approved_count} — Còn lại sau xác nhận: ${rankPanelCapacity.female.remaining_after_proposals} suất.`
              : `Suất còn lại hiện tại: ${rankPanelCapacity.female.available_approval_slots} suất.`}
          </p>
        )}

        {(rankPanelCapacity?.male.capacity_exceeded || rankPanelCapacity?.female.capacity_exceeded) && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {rankPanelCapacity?.male.capacity_exceeded && `Đang chọn duyệt vượt sức chứa nam ${rankPanelCapacity.male.over_capacity_count} suất. `}
            {rankPanelCapacity?.female.capacity_exceeded && `Đang chọn duyệt vượt sức chứa nữ ${rankPanelCapacity.female.over_capacity_count} suất.`}
          </div>
        )}
      </div>

      {apiError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{apiError}</div>}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#244cb8]" /></div>
      ) : reservations.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-[#7c8fb5]">
          <ClipboardList className="mb-3 h-12 w-12 opacity-40" />
          <p className="text-sm">Không có hồ sơ nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex min-h-[96px] flex-wrap items-center gap-4 rounded-2xl border border-[#d6e2f1] bg-white px-5 py-4 shadow-[0_8px_18px_rgba(36,76,184,0.07)]">
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[18px] font-semibold leading-tight text-[#1f3152] sm:text-[20px]">{r.candidate?.fullName ?? "—"}</span>
                    {r.period && (
                      <span className="inline-flex rounded-full border border-[#c8d8ef] bg-[#f2f7ff] px-3 py-1.5 text-xs font-bold text-[#244cb8]">
                        {r.period.name}
                      </span>
                    )}
                    {r.status !== "submitted" && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${effectiveStatusClass(r)}`}
                        title={effectiveStatusTooltip(r)}
                      >
                        {effectiveStatusLabel(r)}
                      </span>
                    )}
                    {(r.status === "submitted" || r.status === "waitlisted") && r.autoDecision && (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${AUTO_DECISION_BADGE[r.autoDecision].className}`}>
                        {AUTO_DECISION_BADGE[r.autoDecision].label}
                      </span>
                    )}
                    {r.hasPriorityEvidence && r.priorityEvidenceStatus && r.priorityEvidenceStatus !== "verified" && (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${PRIORITY_EVIDENCE_BADGE[r.priorityEvidenceStatus].className}`}>
                        {PRIORITY_EVIDENCE_BADGE[r.priorityEvidenceStatus].label}
                      </span>
                    )}
                    {r.candidate?.status === "enrolled" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                        Đã nhập học
                      </span>
                    )}
                    {r.expirationReason === "approved_not_converted" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                        Hết hạn - chưa nhập học
                      </span>
                    )}
                    {r.expirationReason === "period_closed_while_waitlisted" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
                        Hết hạn - danh sách chờ
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-[#6b7f9f]">
                    {r.expirationReason === "approved_not_converted" && r.candidate?.admissionCode && (
                      <span>Mã trúng tuyển: <strong className="text-[#1f3152]">{r.candidate.admissionCode}</strong></span>
                    )}
                    {r.expirationReason === "approved_not_converted" && r.reservationCode && (
                      <span>Mã giữ chỗ: <strong className="text-[#1f3152]">{r.reservationCode}</strong></span>
                    )}
                    {r.submittedAt && <span>Nộp: <strong className="text-[#1f3152]">{formatListDate(r.submittedAt)}</strong></span>}
                    {r.expirationReason === "approved_not_converted" && r.approvedAt && (
                      <span>Duyệt giữ chỗ: <strong className="text-[#1f3152]">{formatListDate(r.approvedAt)}</strong></span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5">
                  <button type="button" onClick={() => void handleOpenDetail(r)} className={`${secondaryBtn} h-10 min-w-[132px] px-4 text-[13px]`}>Chi tiết</button>
                  {renderDecisionDropdown(r)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
            <button key={p} type="button" onClick={() => void load(p)}
              className={`h-9 w-9 rounded-xl border text-sm font-semibold transition ${p === currentPage ? "border-[#244cb8] bg-[#244cb8] text-white" : "border-[#cfdcf0] bg-white text-[#62789f] hover:border-[#244cb8]"}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── Detail Modal ── */}
      {createPortal(
        <AnimatePresence>
          {detail && (
            <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-3"
              onClick={handleCloseDetail}>
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
                className="flex max-h-[90vh] w-full max-w-[1060px] flex-col overflow-hidden rounded-[28px] border border-[#c1d6f4] bg-white shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
                onClick={(e) => e.stopPropagation()}>
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#eef3fb] px-8 py-6">
                <h2 className="text-[30px] font-bold leading-tight text-[#1a2d52]">Chi tiết hồ sơ giữ chỗ</h2>
                <button type="button" onClick={handleCloseDetail} className="rounded-full p-2 text-[#7c8fb5] transition hover:bg-[#f0f5ff] hover:text-[#1a2d52]"><X className="h-6 w-6" /></button>
              </div>
              <div className="flex shrink-0 items-center gap-1 border-b border-[#eef3fb] px-8 pt-4">
                {(["info", "history"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => void handleOpenDetailTab(t)}
                    className={`rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
                      detailTab === t
                        ? "border border-b-0 border-[#dce7f6] bg-white text-[#244cb8]"
                        : "text-[#7c8fb5] hover:text-[#244cb8]"
                    }`}
                  >
                    {t === "info" ? "Thông tin đơn" : "Lịch sử"}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-8 py-7 [scrollbar-gutter:stable]">
                {detailTab === "history" ? (
                  detailHistoryLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#62789f]">
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang tải lịch sử...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detailHistory.map((h, idx) => (
                        <div key={h.id} className="rounded-2xl border border-[#dce7f6] bg-[#f8fafd] px-5 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[#1a2d52]">Lần nộp {idx + 1}{h.period?.name ? ` — ${h.period.name}` : ""}</p>
                            <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${effectiveStatusClass(h)}`}>
                              {effectiveStatusLabel(h)}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-[#62789f]">Mã giữ chỗ: <span className="font-mono font-semibold text-[#244cb8]">{h.reservationCode}</span></p>
                          {h.submittedAt && <p className="mt-1 text-xs text-[#62789f]">Nộp lúc: {formatListDate(h.submittedAt)}</p>}
                          {h.rejectionReason && <p className="mt-1 text-xs text-rose-600">Lý do từ chối: {h.rejectionReason}</p>}
                          <button
                            type="button"
                            onClick={() => (h.id === detail.id ? setDetailTab("info") : void handleViewHistoryItem(h))}
                            className="mt-3 inline-flex rounded-xl border border-[#c8d8ef] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#244cb8] transition hover:-translate-y-0.5"
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                <>
                <section>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <p className={detailSectionTitle}>Thông tin thí sinh</p>
                    <span
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold ${effectiveStatusClass(detail)}`}
                      title={effectiveStatusTooltip(detail)}
                    >
                      {effectiveStatusLabel(detail)}
                    </span>
                  </div>
                  <div className="mb-6 rounded-2xl border border-[#dce7f6] bg-[#f5f9ff] p-5">
                    <p className={detailLabel}>Mã giữ chỗ</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-xl border border-[#d8e6f6] bg-white px-4 py-2 font-mono text-xl font-bold text-[#244cb8]">
                        {detail.reservationCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyReservationCode(detail.reservationCode)}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#c8d8ef] bg-white px-4 text-sm font-semibold text-[#244cb8] transition hover:-translate-y-0.5 hover:border-[#a9c0ea]"
                      >
                        <Copy className="h-4 w-4" />
                        Copy mã
                      </button>
                    </div>
                    {detail.status === "approved" && (
                      <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-700">
                        Hồ sơ giữ chỗ đã được duyệt nhưng chưa chuyển thành đơn đăng ký nội trú chính thức.
                      </p>
                    )}
                    {detail.status === "converted" && !isConvertedRegistrationCancelled(detail) && (
                      <p className="mt-4 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-semibold leading-6 text-teal-700">
                        Hồ sơ đã được chuyển thành đơn đăng ký nội trú chính thức.
                      </p>
                    )}
                    {detail.status === "expired" && detail.expirationReason && EXPIRATION_REASON_DESCRIPTION[detail.expirationReason] && (
                      <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                        <p className="font-bold">{EXPIRATION_REASON_LABEL[detail.expirationReason]}</p>
                        <p className="mt-1">{EXPIRATION_REASON_DESCRIPTION[detail.expirationReason]}</p>
                        {detail.expirationReason === "approved_not_converted" && (
                          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {detail.approvedAt && (
                              <div><dt className="text-xs font-semibold text-amber-600">Ngày duyệt giữ chỗ</dt><dd className="font-semibold text-amber-900">{formatListDate(detail.approvedAt)}</dd></div>
                            )}
                            {formatAdmissionDeadlineLabel(detail.period?.endDate) && (
                              <div><dt className="text-xs font-semibold text-amber-600">Hạn cuối của đợt</dt><dd className="font-semibold text-amber-900">{formatAdmissionDeadlineLabel(detail.period?.endDate)}</dd></div>
                            )}
                            {detail.period?.name && (
                              <div><dt className="text-xs font-semibold text-amber-600">Đợt đăng ký</dt><dd className="font-semibold text-amber-900">{detail.period.name}</dd></div>
                            )}
                          </dl>
                        )}
                      </div>
                    )}
                  </div>
                  <dl className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <div className={detailInfoCard}><dt className={detailLabel}>Họ tên</dt><dd className={detailValue}>{detail.candidate?.fullName}</dd></div>
                    <div className={detailInfoCard}><dt className={detailLabel}>Mã hồ sơ</dt><dd className={`${detailValue} font-mono`}>{detail.candidate?.admissionCode}</dd></div>
                    <div className={detailInfoCard}><dt className={detailLabel}>Ngày sinh</dt><dd className={detailValue}>{detail.candidate?.dateOfBirth}</dd></div>
                    <div className={detailInfoCard}><dt className={detailLabel}>CCCD</dt><dd className={detailValue}>{detail.candidate?.cccd ?? "—"}</dd></div>
                    <div className={detailInfoCard}><dt className={detailLabel}>SĐT</dt><dd className={detailValue}>{detail.candidate?.phone ?? "—"}</dd></div>
                    <div className={detailInfoCard}><dt className={detailLabel}>Email</dt><dd className={detailValue}>{detail.candidate?.email ?? "—"}</dd></div>
                    <div className={detailInfoCard}><dt className={detailLabel}>Ngành</dt><dd className={detailValue}>{detail.candidate?.majorName ?? "—"}</dd></div>
                    <div className={detailInfoCard}><dt className={detailLabel}>Trạng thái thí sinh</dt>
                      <dd className="mt-2">
                        <span className={`inline-flex rounded-lg border px-2.5 py-1 text-sm font-semibold ${
                          detail.candidate?.status === "enrolled" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700"
                        }`}>{detail.candidate?.status === "enrolled" ? "Đã nhập học" : "Trúng tuyển"}</span>
                      </dd>
                    </div>
                    {detail.studentCode && <div className={detailInfoCard}><dt className={detailLabel}>MSSV</dt><dd className={`${detailValue} font-bold text-emerald-700`}>{detail.studentCode}</dd></div>}
                  </dl>
                </section>

                {detail.period && (
                  <section>
                    <p className={detailSectionTitle}>Đợt đăng ký</p>
                    <dl className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                      <div className={detailInfoCard}>
                        <dt className={detailLabel}>Tên đợt</dt>
                        <dd className={detailValue}>{detail.period.name}</dd>
                      </div>
                      <div className={detailInfoCard}>
                        <dt className={detailLabel}>Năm học</dt>
                        <dd className={detailValue}>{detail.period.schoolYear ?? "—"}</dd>
                      </div>
                      <div className={detailInfoCard}>
                        <dt className={detailLabel}>Học kỳ</dt>
                        <dd className={detailValue}>{detail.period.semester ?? "—"}</dd>
                      </div>
                    </dl>
                  </section>
                )}

                {detail.rejectionReason && (
                  <div className={`rounded-2xl border px-5 py-4 ${
                    isSelfCancelledReservation(detail) ? "border-slate-200 bg-slate-50" : "border-rose-200 bg-rose-50"
                  }`}>
                    <p className={`mb-2 text-base font-semibold ${isSelfCancelledReservation(detail) ? "text-slate-600" : "text-rose-600"}`}>
                      {isSelfCancelledReservation(detail) ? "Lý do tự hủy (thí sinh)" : "Lý do từ chối"}
                    </p>
                    <p className={`text-base font-medium leading-6 ${isSelfCancelledReservation(detail) ? "text-slate-800" : "text-rose-800"}`}>
                      {isSelfCancelledReservation(detail)
                        ? detail.rejectionReason.replace(SELF_CANCEL_REASON_PREFIX, "").trim()
                        : detail.rejectionReason}
                    </p>
                  </div>
                )}
                {detail.status === "converted" && detail.convertedRegistration?.status === "cancelled" && (
                  <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                    <p className={detailSectionTitle}>Đơn đăng ký nội trú đã hủy</p>
                    <p className="mt-2 text-sm font-medium text-amber-700">
                      Hồ sơ từng được chuyển thành đơn nội trú, sau đó đơn đã bị hủy.
                    </p>
                    <dl className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="rounded-2xl border border-amber-100 bg-white/75 px-4 py-3.5">
                        <dt className={detailLabel}>Trạng thái</dt>
                        <dd className={detailValue}>Đã hủy</dd>
                      </div>
                      {detail.convertedRegistration.cancellationReason && (
                        <div className="rounded-2xl border border-amber-100 bg-white/75 px-4 py-3.5 sm:col-span-2">
                          <dt className={detailLabel}>Lý do hủy</dt>
                          <dd className={detailValue}>{detail.convertedRegistration.cancellationReason}</dd>
                        </div>
                      )}
                      {detail.convertedRegistration.cancelledAt && (
                        <div className="rounded-2xl border border-amber-100 bg-white/75 px-4 py-3.5">
                          <dt className={detailLabel}>Thời gian hủy</dt>
                          <dd className={detailValue}>{formatListDate(detail.convertedRegistration.cancelledAt)}</dd>
                        </div>
                      )}
                      {detail.convertedRegistration.cancelledBy && (
                        <div className="rounded-2xl border border-amber-100 bg-white/75 px-4 py-3.5">
                          <dt className={detailLabel}>Người hủy</dt>
                          <dd className={detailValue}>{detail.convertedRegistration.cancelledBy === "candidate" ? "Thí sinh/sinh viên tự hủy" : detail.convertedRegistration.cancelledBy}</dd>
                        </div>
                      )}
                    </dl>
                  </section>
                )}
                {detail.status === "converted" && detail.convertedRegistrationId && (
                  <Link to={`/admin/registrations/${detail.convertedRegistrationId}`}
                    className={`flex items-center gap-2 rounded-2xl border px-5 py-4 text-base font-semibold ${detail.convertedRegistration?.status === "cancelled" ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100" : "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"}`}
                    onClick={() => setDetail(null)}>
                    <ArrowRight className="h-4 w-4" /> Xem đơn KTX #{detail.convertedRegistrationId}
                    {detail.convertedRegistration?.status === "cancelled" && " (đã hủy)"}
                  </Link>
                )}

                <section>
                  <p className={detailSectionTitle}>Ảnh</p>
                  <div className="mt-5 flex justify-center">
                    {detail.avatarUrl ? (
                    <button
                      type="button"
                      onClick={() => openPreviewImage(resolveUrl(detail.avatarUrl), "Ảnh đại diện")}
                      className="group relative h-[220px] w-[220px] overflow-hidden rounded-2xl border border-[#dce7f6] bg-[#f5f9ff]"
                    >
                      <img src={resolveUrl(detail.avatarUrl)} alt="Ảnh đại diện" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                        <Eye className="h-6 w-6 text-white opacity-0 transition group-hover:opacity-100" />
                      </div>
                    </button>
                    ) : (
                      <div className={`${detailImagePlaceholder} h-[220px] w-[220px]`}>
                        Chưa tải
                      </div>
                    )}
                  </div>
                </section>

                <section>
                    <p className={detailSectionTitle}>CCCD</p>
                    <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                      {(
                        [
                          { key: "cccdFrontUrl", label: "CCCD mặt trước" },
                          { key: "cccdBackUrl", label: "CCCD mặt sau" },
                        ] as { key: "cccdFrontUrl" | "cccdBackUrl"; label: string }[]
                      ).map(({ key, label }) => {
                        const url = resolveUrl(detail[key]);
                        return (
                          <div key={key} className="flex flex-col gap-3">
                            <p className={detailLabel}>{label}</p>
                            {url ? (
                              <button
                                type="button"
                                onClick={() => openPreviewImage(url, label)}
                                className="group relative mx-auto h-[210px] w-full max-w-[320px] overflow-hidden rounded-2xl border border-[#dce7f6] bg-[#f5f9ff]"
                              >
                                <img src={url} alt={label} className="h-full w-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                                  <Eye className="h-6 w-6 text-white opacity-0 transition group-hover:opacity-100" />
                                </div>
                              </button>
                            ) : (
                              <div className={`${detailImagePlaceholder} h-[210px]`}>
                                Chưa tải
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                </section>

                {/* Tiêu chí ưu tiên */}
                {detail.priorityNote && (
                  <div className="rounded-2xl border border-[#d8e6f6] bg-[#f7faff] px-5 py-4">
                    <p className="mb-2 text-base font-semibold text-[#62789f]">Ghi chú ưu tiên</p>
                    <p className="text-base font-medium leading-6 text-[#1f3152]">{detail.priorityNote}</p>
                  </div>
                )}
                {detailLoading && (
                  <div className="flex items-center gap-2 text-sm font-medium text-[#7c8fb5]">
                    <Loader2 className="h-4 w-4 animate-spin" /> Đang tải tiêu chí ưu tiên...
                  </div>
                )}
                {!detailLoading && detail.reservationPriorities && detail.reservationPriorities.length > 0 && (
                  <section>
                    <p className={`${detailSectionTitle} flex items-center gap-2`}>
                      <Award className="h-4 w-4" /> Tiêu chí ưu tiên
                    </p>
                    <div className="mt-5 space-y-4">
                      {detail.reservationPriorities.map((p) => (
                        <div key={p.id} className={`rounded-2xl border px-5 py-4 ${
                          p.status === "verified" ? "border-emerald-200 bg-emerald-50"
                          : p.status === "rejected" ? "border-rose-200 bg-rose-50"
                          : "border-[#dce7f6] bg-[#f8fafd]"
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-semibold text-[#1a2d52]">{p.criteria?.name ?? `#${p.priorityCriteriaId}`}</p>
                              {p.evidences && p.evidences.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-3">
                                  {p.evidences.map((ev) => {
                                    const evUrl = resolveUrl(ev.fileUrl);
                                    const isPdf = ev.mimeType === "application/pdf" || ev.fileUrl.endsWith(".pdf");
                                    return isPdf ? (
                                      <a key={ev.id} href={evUrl} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-1.5 rounded-xl border border-[#dce7f6] bg-[#f5f9ff] px-3 py-2 text-sm font-semibold text-[#244cb8] hover:bg-[#e8f0fd]">
                                        <FileText className="h-3 w-3" />
                                        {ev.originalName ?? "File PDF"}
                                      </a>
                                    ) : (
                                      <button key={ev.id} type="button"
                                        onClick={() => openPreviewImage(evUrl, ev.originalName ?? "Minh chứng")}
                                        className="group relative h-24 w-24 overflow-hidden rounded-xl border border-[#dce7f6] bg-[#f5f9ff]">
                                        <img src={evUrl} alt={ev.originalName ?? ""} className="h-full w-full object-cover" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                                          <Eye className="h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                                p.status === "verified" ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                                : p.status === "rejected" ? "border-rose-200 bg-rose-100 text-rose-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                              }`}>
                                {p.status === "verified" ? "Hợp lệ" : p.status === "rejected" ? "Không hợp lệ" : "Chờ xác minh"}
                              </span>
                              {p.status === "pending" && (
                                <>
                                  <button type="button" disabled={priorityActionId === p.id}
                                    onClick={() => void handleVerifyPriority(p.id)}
                                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                                    {priorityActionId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Hợp lệ"}
                                  </button>
                                  <button type="button" disabled={priorityActionId === p.id}
                                    onClick={() => void handleRejectPriority(p.id)}
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                                    Không hợp lệ
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                </>
                )}
              </div>

              {/* Footer actions — chỉ hiện ở tab "Thông tin đơn"; tab "Lịch sử" chỉ để xem,
                  không có hành động đổi trạng thái nào. Ẩn hoàn toàn nếu minh chứng ưu tiên
                  không hợp lệ, chỉ còn "Chi tiết" (xem nội dung). Hồ sơ đã duyệt ("approved")
                  là trạng thái cuối — không cho từ chối lại, và badge "Đã duyệt giữ chỗ" ở
                  đầu modal đã đủ thông tin nên không cần thêm footer nhắc lại. */}
              {detailTab === "info" && (detail.status === "submitted" || detail.status === "waitlisted") && (
                hasRejectedReservationPriority(detail) ? (
                  <div className="shrink-0 border-t border-[#eef3fb] bg-[#fbfdff] px-8 py-5">
                    <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>Minh chứng ưu tiên không hợp lệ. Hồ sơ không thể duyệt/chuyển vào danh sách chờ/từ chối tiếp — vui lòng kiểm tra lại minh chứng.</span>
                    </div>
                  </div>
                ) : (
                <div className="shrink-0 border-t border-[#eef3fb] bg-[#fbfdff] px-8 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#dce7f6] bg-white px-5 py-4">
                  <div>
                    <p className={detailSectionTitle}>Quyết định hồ sơ</p>
                    {detail.autoDecision && (
                      <span className={`mt-2 inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${AUTO_DECISION_BADGE[detail.autoDecision].className}`}>
                        {AUTO_DECISION_BADGE[detail.autoDecision].label}
                      </span>
                    )}
                  </div>
                  {hasPendingReservationPriority(detail) && (
                    <div className="flex max-w-xl items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>Còn minh chứng ưu tiên chưa xác minh. Vui lòng xác minh hoặc từ chối tất cả minh chứng trước khi duyệt.</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {renderDecisionDropdown(detail, "detail")}
                  </div>
                  </div>
                </div>
                )
              )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ── Priority Verification Notice ── */}
      {createPortal(
        <AnimatePresence>
          {priorityNotice && (
            <motion.div
              key="priority-notice"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
              onClick={() => setPriorityNotice(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                className="relative w-full max-w-md rounded-[24px] border border-amber-200 bg-white p-6 shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setPriorityNotice(null)}
                  className="absolute right-4 top-4 rounded-full p-1.5 text-[#7f93b6] transition hover:bg-[#f2f6fd] hover:text-[#244cb8]"
                  aria-label="Đóng thông báo"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex items-start gap-3 pr-8">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#1a2d52]">Cần xác minh minh chứng</h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#5d7299]">{priorityNotice.message}</p>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPriorityNotice(null)}
                    className={`${secondaryBtn} h-10 min-w-[90px]`}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPriorityNotice(null);
                      setStatusFilter("all");
                      setPriorityEvidenceFilter("pending");
                    }}
                    className={`${primaryBtn} h-10 min-w-[190px]`}
                  >
                    Xem danh sách chờ xác minh
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ── Proposal Reject Dialog ── */}
      {createPortal(
        <AnimatePresence>
          {proposalRejectTarget && (
            <motion.div key="proposal-reject" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-3"
              onClick={() => { setProposalRejectTarget(null); setProposalRejectReason(""); }}>
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
                className="w-full max-w-md rounded-[24px] border border-rose-200 bg-white p-6 shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
                onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-1 text-xl font-bold text-[#1a2d52]">Phản hồi hồ sơ</h2>
              <p className="mb-3 text-sm text-[#62789f]">{proposalRejectTarget.candidate?.fullName} — {proposalRejectTarget.reservationCode}</p>
              <label className="mb-1 block text-xs font-semibold text-[#324B76]">Lý do gợi ý từ chối *</label>
              <textarea value={proposalRejectReason} onChange={(e) => setProposalRejectReason(e.target.value)} rows={4} className={`${inputCls} resize-none`} placeholder="Nhập lý do từ chối..." />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => { setProposalRejectTarget(null); setProposalRejectReason(""); }} className="rounded-xl border border-[#d6e2f1] bg-white px-4 py-2 text-sm font-semibold text-[#5d7299]">Hủy</button>
                <button type="button" disabled={actionId === proposalRejectTarget.id || !proposalRejectReason.trim()} onClick={() => void handleConfirmProposalReject()} className={`${dangerBtn} h-9`}>
                  {actionId === proposalRejectTarget.id && <Loader2 className="h-4 w-4 animate-spin" />} Lưu gợi ý từ chối
                </button>
              </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ── Rank Confirm Dialog ── */}
      {createPortal(
        <AnimatePresence>
          {rankConfirmPeriod && (
            <motion.div key="rank-confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-3"
              onClick={() => setRankConfirmPeriod(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
                className="w-full max-w-lg rounded-[24px] border border-amber-200 bg-white p-6 shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
                onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#1a2d52]">Đợt đăng ký vẫn đang nhận hồ sơ</h2>
                    <div className="mt-2 space-y-2 text-sm leading-6 text-[#5d7299]">
                      <p>Việc xếp hạng lúc này chỉ mang tính tạm thời vì vẫn có thể có hồ sơ mới được nộp hoặc điểm ưu tiên thay đổi.</p>
                      <p>Hành động này sẽ tính điểm ưu tiên và tạo đề xuất "Gợi ý duyệt" hoặc "Gợi ý danh sách chờ". Trạng thái thật của hồ sơ chỉ thay đổi sau khi admin xác nhận đề xuất.</p>
                      <p>Bạn có muốn tiếp tục?</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRankConfirmPeriod(null)}
                    className="rounded-xl border border-[#d6e2f1] bg-white px-4 py-2 text-sm font-semibold text-[#5d7299]"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={rankLoading}
                    onClick={() => {
                      const periodId = rankConfirmPeriod.id;
                      setRankConfirmPeriod(null);
                      void runRank(periodId);
                    }}
                    className={`${primaryBtn} h-9 px-4`}
                  >
                    {rankLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Vẫn xếp hạng
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ── Image Lightbox ── */}
      {createPortal(
        <AnimatePresence>
          {previewImg && (
            <motion.div key="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
              onClick={() => setPreviewIndex(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                className="relative max-h-[90dvh] max-w-[90vw]"
                onClick={(e) => e.stopPropagation()}>
              <p className="mb-2 text-center text-sm font-semibold text-white">{previewImg.label}</p>
              <div className="relative">
                <img src={previewImg.url} alt={previewImg.label} className="max-h-[80dvh] max-w-full rounded-2xl object-contain shadow-2xl" />
                {previewImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={showPreviousPreview}
                      className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/28 text-white opacity-70 shadow-[0_12px_24px_rgba(0,0,0,0.28)] backdrop-blur-sm transition hover:bg-slate-950/45 hover:opacity-100"
                      aria-label="Ảnh trước"
                      title="Ảnh trước"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={showNextPreview}
                      className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/28 text-white opacity-70 shadow-[0_12px_24px_rgba(0,0,0,0.28)] backdrop-blur-sm transition hover:bg-slate-950/45 hover:opacity-100"
                      aria-label="Ảnh tiếp theo"
                      title="Ảnh tiếp theo"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>
              {previewImages.length > 1 && previewIndex != null ? (
                <p className="mt-2 text-center text-xs font-semibold text-white/70">
                  {previewIndex + 1}/{previewImages.length}
                </p>
              ) : null}
              <button type="button" onClick={() => setPreviewIndex(null)}
                className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1a2d52] shadow-lg hover:bg-[#f0f5ff]">
                <X className="h-4 w-4" />
              </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

    </motion.section>
  );
}
