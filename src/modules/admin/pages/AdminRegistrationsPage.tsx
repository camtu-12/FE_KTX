import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowUp, ChevronDown, Filter, LoaderCircle, X, XCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import {
  getRegistrations,
  patchAutoDecision,
  previewManualApprove,
  confirmSingleRegistration,
  confirmBatchRegistrations,
  verifyStudentPriority,
} from "../../../api/registrationService";
import { getRegistrationPeriods, type RegistrationPeriodData } from "../../../api/registrationApi";
import {
  statusMap,
  type RegistrationRequest,
} from "../data/registrationRequests";
import { formatDate, formatDateTime } from "../../../utils/dateFormat";

type AdminTab = "main" | "rolling";
type SubFilter = "pending" | "review" | "done";
type PendingFilter = "all" | "approve" | "reject";
type ProcessedFilter = "all" | "approved" | "rejected" | "cancelled";

const proposalBadge = (ad: RegistrationRequest["auto_decision"]) => {
  if (ad === "approve") return { label: "Duyệt", cls: "border border-emerald-200 bg-emerald-50 text-emerald-700" };
  if (ad === "reject") return { label: "Từ chối", cls: "border border-rose-200 bg-rose-50 text-rose-700" };
  if (ad === "review") return { label: "Cần xem lại", cls: "border border-amber-200 bg-amber-50 text-amber-700" };
  return { label: "Chưa xếp hạng", cls: "border border-slate-200 bg-slate-50 text-slate-500" };
};

export default function AdminRegistrationsPage() {
  const { headerSearchValue } = useOutletContext<AdminLayoutOutletContext>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeState = location.state as {
    openRequestId?: number;
    requestModalTab?: "info" | "history";
    mainSubFilter?: SubFilter;
    rollingSubFilter?: SubFilter;
    activeTab?: AdminTab;
  } | null;
  const [shouldSkipAnim] = useState(() => Boolean(routeState?.openRequestId));

  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (routeState?.activeTab) return routeState.activeTab;
    const ch = searchParams.get("channel");
    return ch === "rolling" ? "rolling" : "main";
  });
  const initialSubFilter = (): SubFilter => {
    const f = searchParams.get("filter");
    return f === "review" || f === "done" ? f : "pending";
  };
  // Quay lại từ trang "Mở trang chi tiết" (route riêng, làm unmount hẳn trang này) phải
  // khôi phục đúng tab đang xem ("Cần xem lại"/"Đã xử lý"...) — nếu không, mainSubFilter
  // reset về mặc định "pending" vì đây chỉ là state thường, không có gì giữ lại khi remount.
  const [mainSubFilter, setMainSubFilter] = useState<SubFilter>(() => routeState?.mainSubFilter ?? initialSubFilter());
  const [rollingSubFilter, setRollingSubFilter] = useState<SubFilter>(() => routeState?.rollingSubFilter ?? initialSubFilter());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScrollToTopVisible, setIsScrollToTopVisible] = useState(false);

  // Modal "Chi tiết hồ sơ"
  const [viewingRequestId, setViewingRequestId] = useState<number | null>(routeState?.openRequestId ?? null);
  const [requestModalTab, setRequestModalTab] = useState<"info" | "history">(routeState?.requestModalTab ?? "info");

  // Reject dialog
  const [rejectDialog, setRejectDialog] = useState<{ id: number } | null>(null);
  const [rejectionInput, setRejectionInput] = useState("");

  // Duyệt tay dialog — ghim đơn ngoài top N, có thể đẩy 1 người khác xuống waitlist khi xếp
  // hạng lại (xem PriorityRankingService::splitBucketWithManualPins()). Preview lấy tên người
  // có thể bị ảnh hưởng để cảnh báo admin trước khi bắt buộc nhập lý do.
  const [approveDialog, setApproveDialog] = useState<{
    id: number;
    bumpedStudent: { full_name: string | null; student_code: string | null } | null;
  } | null>(null);
  const [approveReasonInput, setApproveReasonInput] = useState("");

  // Confirm single dialog
  const [confirmSingleId, setConfirmSingleId] = useState<number | null>(null);

  // Toast báo lỗi — trước đây các thao tác Duyệt/Từ chối/Xác nhận không có nơi hiện lỗi, nên
  // khi request thất bại (vd. hết suất do người khác vừa duyệt), dialog vẫn tự đóng như thành
  // công, người dùng tưởng đã xong nhưng dữ liệu không hề đổi.
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const showErrorToast = (err: unknown, fallback: string) => {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
    setErrorToast(msg || fallback);
    setTimeout(() => setErrorToast(null), 4000);
  };

  // Confirm batch dialog (main tab)
  const [confirmBatchInfo, setConfirmBatchInfo] = useState<{
    periodId: number; periodName: string; approveCount: number; rejectCount: number;
  } | null>(null);

  // Confirm rolling-all dialog
  const [confirmRollingAll, setConfirmRollingAll] = useState(false);

  // Modal xác minh ưu tiên
  const [verifyModalId, setVerifyModalId] = useState<number | null>(null);
  const [submittingPriorityIds, setSubmittingPriorityIds] = useState<Set<number>>(new Set());
  const [verifyAllDoneToast, setVerifyAllDoneToast] = useState(false);
  const [priorityRejectDialog, setPriorityRejectDialog] = useState<{
    priorityId: number;
    registrationId: number;
    criteriaLabel: string;
  } | null>(null);
  const [priorityRejectionInput, setPriorityRejectionInput] = useState("");

  // Filter
  const [filterPeriodId, setFilterPeriodId] = useState<number | "all">(() => {
    const p = searchParams.get("period");
    const n = p ? Number(p) : NaN;
    return Number.isFinite(n) && n > 0 ? n : "all";
  });
  const [pendingFilter, setPendingFilter] = useState<PendingFilter>("all");
  const [processedFilter, setProcessedFilter] = useState<ProcessedFilter>("all");
  const [openSubFilterMenu, setOpenSubFilterMenu] = useState<"pending" | "done" | null>(null);
  const [periods, setPeriods] = useState<RegistrationPeriodData[]>([]);
  const [now, setNow] = useState(() => new Date());

  // "Đổi đề xuất" dropdown
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  // Card cuối danh sách mở dropdown xuống dưới sẽ bị khuất mép màn hình — tự lật lên trên
  // khi không đủ chỗ bên dưới.
  const [openDropdownDirection, setOpenDropdownDirection] = useState<"down" | "up">("down");
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const subFilterMenuRef = useRef<HTMLDivElement | null>(null);

  // Clear URL params after reading them into state
  useEffect(() => {
    if (searchParams.get("period") || searchParams.get("channel") || searchParams.get("filter")) {
      setSearchParams({}, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // ─── Load ───────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await getRegistrations();
      if (mounted) setRequests(data);
    };
    void load().finally(() => { if (mounted) setIsLoading(false); });
    getRegistrationPeriods().then((ps) => { if (mounted) setPeriods(ps); }).catch(() => {});
    const onUpdate = () => { if (mounted) void load(); };
    window.addEventListener("ktx-registrations-updated", onUpdate);
    return () => { mounted = false; window.removeEventListener("ktx-registrations-updated", onUpdate); };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdownId) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdownId]);

  useEffect(() => {
    if (!openSubFilterMenu) return;
    const handler = (e: MouseEvent) => {
      if (subFilterMenuRef.current && !subFilterMenuRef.current.contains(e.target as Node)) {
        setOpenSubFilterMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openSubFilterMenu]);

  // Sync modal + sub-filter state vào route (location.state) của chính trang này — không
  // chỉ để phục hồi modal, mà còn để mainSubFilter/rollingSubFilter/activeTab không bị mất
  // khi điều hướng sang "Mở trang chi tiết" (route riêng, unmount hẳn trang này) rồi quay
  // lại bằng navigate(-1): lúc đó trang remount và đọc lại đúng state đã lưu ở đây thay vì
  // rơi về mặc định "Chờ xác nhận".
  useEffect(() => {
    const nextState = { openRequestId: viewingRequestId, requestModalTab, mainSubFilter, rollingSubFilter, activeTab };
    const cur = {
      openRequestId: routeState?.openRequestId ?? null,
      requestModalTab: routeState?.requestModalTab ?? "info",
      mainSubFilter: routeState?.mainSubFilter ?? "pending",
      rollingSubFilter: routeState?.rollingSubFilter ?? "pending",
      activeTab: routeState?.activeTab ?? "main",
    };
    const unchanged = (Object.keys(nextState) as Array<keyof typeof nextState>)
      .every((k) => nextState[k] === cur[k]);
    if (unchanged) return;
    navigate(location.pathname, { replace: true, state: nextState });
  }, [location.pathname, navigate, requestModalTab, routeState, viewingRequestId, mainSubFilter, rollingSubFilter, activeTab]);

  // Scroll-to-top visibility
  useEffect(() => {
    const el = document.querySelector(".auth-scrollbar") as HTMLElement | null;
    if (!el) return;
    const onScroll = () => {
      setIsScrollToTopVisible(el.scrollTop > Math.max(180, el.clientHeight * 0.6));
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ─── Derived data ────────────────────────────────────────
  const search = headerSearchValue.trim().toLowerCase();

  const matchSearch = (r: RegistrationRequest) =>
    !search ||
    [r.formData?.mssv ?? "", r.formData?.fullName ?? "", r.email ?? ""].join(" ").toLowerCase().includes(search);

  // Chỉ hiện lần nộp MỚI NHẤT của mỗi sinh viên trong cùng 1 đợt ở danh sách chính — tránh
  // liệt kê trùng khi bị từ chối rồi nộp lại. Dedupe ở FE (không phải backend) để giữ
  // nguyên toàn bộ `requests` cho tab "Lịch sử" (selectedRequestHistory group theo email
  // từ chính mảng requests này — dedupe ở backend sẽ làm mất lần nộp cũ khỏi lịch sử).
  const latestOnlyIds = useMemo(() => {
    const byGroup = new Map<string, RegistrationRequest>();
    for (const r of requests) {
      const key = `${r.email?.trim().toLowerCase() ?? r.id}|${r.registration_period_id ?? ""}`;
      const existing = byGroup.get(key);
      if (!existing || r.id > existing.id) byGroup.set(key, r);
    }
    return new Set(Array.from(byGroup.values(), (r) => r.id));
  }, [requests]);

  // Main channel
  const allMainItems = useMemo(() =>
    requests.filter((r) =>
      r.channel === "main" &&
      latestOnlyIds.has(r.id) &&
      matchSearch(r) &&
      (filterPeriodId === "all" || r.registration_period_id === filterPeriodId),
    ),
    [requests, latestOnlyIds, search, filterPeriodId], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const hasPendingPriority = (r: RegistrationRequest) =>
    (r.priority_criteria ?? []).some((p) => p.status === "pending");
  const hasRejectedPriority = (r: RegistrationRequest) =>
    (r.priority_criteria ?? []).some((p) => p.status === "rejected");

  const mainPendingItems = useMemo(() => allMainItems.filter((r) => r.status === "submitted" && r.auto_decision !== "review" && !hasPendingPriority(r) && !hasRejectedPriority(r)), [allMainItems]); // eslint-disable-line react-hooks/exhaustive-deps
  const mainReviewItems  = useMemo(() => allMainItems.filter((r) => r.status === "submitted" && (r.auto_decision === "review" || hasPendingPriority(r) || hasRejectedPriority(r))), [allMainItems]); // eslint-disable-line react-hooks/exhaustive-deps
  const mainDoneItems    = useMemo(() => allMainItems.filter((r) => r.status === "approved" || r.status === "rejected" || r.status === "cancelled"), [allMainItems]);
  const filteredMainPendingItems = useMemo(
    () => mainPendingItems.filter((r) => pendingFilter === "all" || r.auto_decision === pendingFilter),
    [mainPendingItems, pendingFilter],
  );
  const filteredMainDoneItems = useMemo(
    () => mainDoneItems.filter((r) => processedFilter === "all" || r.status === processedFilter),
    [mainDoneItems, processedFilter],
  );

  // Rolling channel
  const allRollingItems = useMemo(() =>
    requests.filter((r) => r.channel === "rolling" && latestOnlyIds.has(r.id) && matchSearch(r)),
    [requests, latestOnlyIds, search], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const rollingPendingItems = useMemo(() => allRollingItems.filter((r) => r.status === "submitted" && r.auto_decision !== "review" && !hasPendingPriority(r) && !hasRejectedPriority(r)), [allRollingItems]); // eslint-disable-line react-hooks/exhaustive-deps
  const rollingReviewItems  = useMemo(() => allRollingItems.filter((r) => r.status === "submitted" && (r.auto_decision === "review" || hasPendingPriority(r) || hasRejectedPriority(r))), [allRollingItems]); // eslint-disable-line react-hooks/exhaustive-deps
  const rollingDoneItems    = useMemo(() => allRollingItems.filter((r) => r.status === "approved" || r.status === "rejected" || r.status === "cancelled"), [allRollingItems]);
  const filteredRollingPendingItems = useMemo(
    () => rollingPendingItems.filter((r) => pendingFilter === "all" || r.auto_decision === pendingFilter),
    [rollingPendingItems, pendingFilter],
  );
  const filteredRollingDoneItems = useMemo(
    () => rollingDoneItems.filter((r) => processedFilter === "all" || r.status === processedFilter),
    [rollingDoneItems, processedFilter],
  );

  // Hạn cuối THẬT (không phải dự kiến) — LUÔN là 17:00 của end_date, dùng chung công thức
  // với AdminRegistrationPeriodsPage.tsx (cùng quy tắc BE ở admissionDeadline()) — nút "Xác
  // nhận tất cả" ở đây trước đây không hề check deadline, cho bấm được trước hạn dù backend
  // vẫn chặn (422), gây trải nghiệm xấu: tưởng xong việc rồi mới thấy báo lỗi (báo cáo 28/07).
  function admissionDeadline(endDate: string | null | undefined): Date | null {
    if (!endDate) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(endDate);
    if (!match) return null;
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), 17, 0, 0);
  }

  // Processing periods banner (main tab — "Chờ xác nhận" sub-filter)
  const mainPeriodGroups = useMemo(() => {
    const map = new Map<number, { periodId: number; periodName: string; periodStatus: string; approveCount: number; rejectCount: number; nullCount: number }>();
    for (const r of mainPendingItems) {
      if (!r.registration_period_id) continue;
      const pid = r.registration_period_id;
      if (!map.has(pid)) {
        map.set(pid, { periodId: pid, periodName: r.period_name ?? `Đợt #${pid}`, periodStatus: r.period_status ?? "", approveCount: 0, rejectCount: 0, nullCount: 0 });
      }
      const g = map.get(pid)!;
      if (r.auto_decision === "approve") g.approveCount++;
      else if (r.auto_decision === "reject") g.rejectCount++;
      else g.nullCount++;
    }
    return Array.from(map.values());
  }, [mainPendingItems]);
  const processingPeriods = mainPeriodGroups.filter((g) => g.periodStatus === "processing");

  // Modal helpers
  const selectedRequest = useMemo(() => requests.find((r) => r.id === viewingRequestId) ?? null, [requests, viewingRequestId]);
  const selectedRequestHistory = useMemo(() => {
    if (!selectedRequest?.email) return [];
    const key = selectedRequest.email.trim().toLowerCase();
    return requests.filter((r) => r.email?.trim().toLowerCase() === key).sort((a, b) => a.id - b.id);
  }, [requests, selectedRequest]);

  // ─── Handlers ────────────────────────────────────────────
  const updateLocalRequest = (updated: RegistrationRequest | null) => {
    if (!updated) return;
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  // Chờ preview tải xong rồi mới mở dialog 1 lần — tránh dialog mở ra với nội dung "Đang kiểm
  // tra..." rồi nhảy sang nội dung thật ngay sau đó.
  const handleOpenApproveDialog = async (id: number) => {
    setApproveReasonInput("");
    setIsSubmitting(true);
    try {
      const preview = await previewManualApprove(id);
      setApproveDialog({ id, bumpedStudent: preview.bumped_student });
    } catch (err) {
      showErrorToast(err, "Không kiểm tra được ảnh hưởng, vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmApprove = async () => {
    if (!approveDialog || !approveReasonInput.trim()) return;
    setIsSubmitting(true);
    try {
      const updated = await patchAutoDecision(approveDialog.id, "approve", approveReasonInput.trim());
      updateLocalRequest(updated);
      setApproveDialog(null);
      setApproveReasonInput("");
    } catch (err) {
      showErrorToast(err, "Duyệt tay thất bại, vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSingle = async (id: number) => {
    setIsSubmitting(true);
    try {
      const updated = await confirmSingleRegistration(id);
      updateLocalRequest(updated);
      setConfirmSingleId(null);
    } catch (err) {
      showErrorToast(err, "Xác nhận thất bại, vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // "Từ chối" từ dropdown "Đổi đề xuất" giờ chốt thật ngay trong patchAutoDecision(reject) —
  // không cần gọi thêm confirmSingleRegistration() nữa.
  const handleConfirmRejectFromReview = async () => {
    if (!rejectDialog || !rejectionInput.trim()) return;
    setIsSubmitting(true);
    try {
      const updatedDecision = await patchAutoDecision(rejectDialog.id, "reject", rejectionInput.trim());
      updateLocalRequest(updatedDecision);
      setRejectDialog(null);
      setRejectionInput("");
    } catch (err) {
      showErrorToast(err, "Từ chối thất bại, vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmBatch = async () => {
    if (!confirmBatchInfo) return;
    setIsSubmitting(true);
    try {
      await confirmBatchRegistrations(confirmBatchInfo.periodId);
      const data = await getRegistrations();
      setRequests(data);
    } finally {
      setIsSubmitting(false);
      setConfirmBatchInfo(null);
    }
  };

  const handleConfirmRollingAll = async () => {
    setIsSubmitting(true);
    try {
      const eligible = rollingPendingItems.filter((r) => r.auto_decision === "approve" || r.auto_decision === "reject");
      for (const r of eligible) {
        await confirmSingleRegistration(r.id);
      }
      const data = await getRegistrations();
      setRequests(data);
    } finally {
      setIsSubmitting(false);
      setConfirmRollingAll(false);
    }
  };

  const handleScrollToTop = () => {
    (document.querySelector(".auth-scrollbar") as HTMLElement | null)?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleVerifyPriority = async (priorityId: number, registrationId: number, status: "verified" | "rejected", note?: string) => {
    setSubmittingPriorityIds((prev) => new Set(prev).add(priorityId));
    try {
      const res = await verifyStudentPriority(priorityId, status, note);
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id !== registrationId) return r;
          const updatedCriteria = (r.priority_criteria ?? []).map((p) =>
            p.id === priorityId ? { ...p, status: res.status } : p,
          );
          const allResolved = updatedCriteria.every((p) => p.status !== "pending");
          if (allResolved) {
            setVerifyAllDoneToast(true);
            setTimeout(() => {
              setVerifyAllDoneToast(false);
              setVerifyModalId(null);
            }, 2200);
          }
          return {
            ...r,
            // Từ chối minh chứng ưu tiên cascade registration.status → 'rejected' ngay ở
            // backend (StudentPriorityController::verify()) — phải áp lại status/lý do từ
            // chối vào state local, nếu không hồ sơ vẫn kẹt ở "Cần xem lại" cho tới khi
            // reload trang, dù thực ra đã bị từ chối rồi.
            status: (res.registration_status as typeof r.status) ?? r.status,
            rejectionReason: res.rejection_reason ?? r.rejectionReason,
            top_priority_tier: res.top_priority_tier,
            total_priority_score: res.total_priority_score,
            priority_criteria: updatedCriteria,
          };
        }),
      );
    } finally {
      setSubmittingPriorityIds((prev) => {
        const next = new Set(prev);
        next.delete(priorityId);
        return next;
      });
    }
  };

  const handleConfirmPriorityReject = async () => {
    if (!priorityRejectDialog || !priorityRejectionInput.trim()) return;
    await handleVerifyPriority(
      priorityRejectDialog.priorityId,
      priorityRejectDialog.registrationId,
      "rejected",
      priorityRejectionInput.trim(),
    );
    setPriorityRejectDialog(null);
    setPriorityRejectionInput("");
  };

  // Derived from updated requests state so it always reflects latest verify results
  const verifyModalRegistration = useMemo(
    () => (verifyModalId ? requests.find((r) => r.id === verifyModalId) ?? null : null),
    [verifyModalId, requests],
  );

  // ─── Render helpers ──────────────────────────────────────
  const renderSubFilter = (
    current: SubFilter,
    onChange: (v: SubFilter) => void,
    counts: { pending: number; review: number; done: number },
  ) => {
    const opts: { key: SubFilter; label: string }[] = [
      { key: "pending", label: "Chờ xác nhận" },
      { key: "review",  label: "Cần xem lại"  },
      { key: "done",    label: "Đã xử lý"     },
    ];
    const pendingFilterOptions: Array<{ value: PendingFilter; label: string }> = [
      { value: "all", label: "Tất cả" },
      { value: "approve", label: "Duyệt" },
      { value: "reject", label: "Từ chối" },
    ];
    const processedFilterOptions: Array<{ value: ProcessedFilter; label: string }> = [
      { value: "all", label: "Tất cả" },
      { value: "approved", label: "Đã duyệt" },
      { value: "rejected", label: "Đã từ chối" },
      { value: "cancelled", label: "Đã hủy" },
    ];
    return (
      <div ref={subFilterMenuRef} className="inline-flex flex-wrap gap-1 rounded-2xl border border-[#c6d8f0] bg-[#f2f7ff] p-1">
        {opts.map((o) => {
          const hasFilter = o.key === "pending" || o.key === "done";
          const isFilterActive =
            (o.key === "pending" && pendingFilter !== "all") ||
            (o.key === "done" && processedFilter !== "all");
          const isMenuOpen = openSubFilterMenu === o.key;

          return (
            <div key={o.key} className="relative inline-flex">
              <button
                type="button"
                onClick={() => onChange(o.key)}
                className={`rounded-xl py-2 pl-4 text-sm font-semibold transition ${hasFilter ? "pr-9" : "pr-4"} ${
                  current === o.key
                    ? "bg-white text-[#244cb8] shadow-[0_8px_16px_rgba(36,76,184,0.16)]"
                    : "text-[#6a81aa] hover:text-[#244cb8]"
                }`}
              >
                {o.label}
                <span className={`ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  current === o.key ? "bg-[#244cb8] text-white" : "bg-[#dce8f7] text-[#4d6ea3]"
                }`}>{counts[o.key]}</span>
              </button>

              {hasFilter ? (
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenSubFilterMenu(isMenuOpen ? null : o.key === "pending" ? "pending" : "done");
                    }}
                    aria-label={`Lọc ${o.label}`}
                    title={`Lọc ${o.label}`}
                    className={`absolute right-2 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full transition ${
                      isFilterActive
                        ? "bg-[#244cb8] text-white"
                        : current === o.key
                          ? "text-[#244cb8] hover:bg-[#eaf2ff]"
                          : "text-[#7d90b5] hover:bg-white hover:text-[#244cb8]"
                    }`}
                  >
                    <Filter className="h-3.5 w-3.5" />
                  </button>

                  {isMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.45rem)] z-50 w-36 overflow-hidden rounded-2xl border border-[#c8d8ef] bg-white p-1.5 text-left shadow-[0_16px_32px_rgba(36,76,184,0.16)]">
                      {(o.key === "pending" ? pendingFilterOptions : processedFilterOptions).map((option) => {
                        const selected = o.key === "pending"
                          ? pendingFilter === option.value
                          : processedFilter === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              if (o.key === "pending") {
                                setPendingFilter(option.value as PendingFilter);
                              } else {
                                setProcessedFilter(option.value as ProcessedFilter);
                              }
                              setOpenSubFilterMenu(null);
                            }}
                            className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                              selected
                                ? "bg-[#edf4ff] text-[#244cb8]"
                                : "text-[#5d7299] hover:bg-[#f5f9ff] hover:text-[#244cb8]"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  const renderProposalBadge = (r: RegistrationRequest) => {
    const b = proposalBadge(r.auto_decision);
    return (
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${b.cls}`}>
          {b.label}
        </span>
        {r.decision_source === "manual" ? (
          <span
            title={r.manual_decision_reason ?? undefined}
            className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700"
          >
            Đã ghi đè tay
          </span>
        ) : null}
      </div>
    );
  };

  const hasDormReservationSource = (r: RegistrationRequest) => Boolean(r.source_dorm_reservation_id);

  const renderDormReservationSourceBadge = (r: RegistrationRequest) =>
    hasDormReservationSource(r) ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
        Đã có suất giữ chỗ
      </span>
    ) : null;

  const renderDropdown = (r: RegistrationRequest) => {
    // Trước đây khóa cứng dropdown cho Registration nguồn giữ chỗ (không cho đổi đề xuất
    // rời khỏi 'approve'), vì sợ để lại DormReservation approved dở dang. Giờ backend đã tự
    // xử lý chuyển DormReservation nguồn về waitlisted + báo thí sinh khi đề xuất đổi thành
    // reject (xem patchAutoDecision()/confirmSingle()/confirmBatch()), nên admin đổi đề xuất
    // bình thường như mọi đơn khác.
    return (
      <div className="relative" ref={openDropdownId === r.id ? dropdownRef : null}>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={(e) => {
            if (openDropdownId === r.id) {
              setOpenDropdownId(null);
              return;
            }
            const rect = e.currentTarget.getBoundingClientRect();
            const estimatedMenuHeight = 88; // 2 mục ~44px/mục
            setOpenDropdownDirection(window.innerHeight - rect.bottom < estimatedMenuHeight ? "up" : "down");
            setOpenDropdownId(r.id);
          }}
          className="inline-flex h-10 min-w-[132px] items-center justify-center gap-2 rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 text-[13px] font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.09)] transition hover:-translate-y-0.5 hover:border-[#9eb9e6] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {r.auto_decision ? "Đổi đề xuất" : "Xử lý đơn"} <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {openDropdownId === r.id ? (
          <div
            className={`absolute right-0 z-50 w-36 overflow-hidden rounded-xl border border-[#d7e2f2] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] ${
              openDropdownDirection === "up" ? "bottom-full mb-1" : "top-full mt-1"
            }`}
          >
            {(["approve", "reject"] as const)
              .filter((opt) => opt !== r.auto_decision)
              .map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  if (opt === "reject") {
                    setRejectDialog({ id: r.id });
                    setRejectionInput(r.auto_decision === "reject" ? r.auto_decision_reason ?? "" : "");
                    setOpenDropdownId(null);
                    return;
                  }
                  setOpenDropdownId(null);
                  void handleOpenApproveDialog(r.id);
                }}
                className={`flex w-full items-center px-3 py-2 text-left text-xs font-medium transition hover:bg-[#f5f9ff] ${
                  opt === "approve" ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {opt === "approve" ? "Duyệt" : "Từ chối"}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const renderViewButton = (r: RegistrationRequest) => (
    <button
      type="button"
      onClick={() => {
        setViewingRequestId(r.id);
        setRequestModalTab("info");
      }}
      className="inline-flex h-10 min-w-[118px] items-center justify-center rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 text-[13px] font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.09)] transition hover:-translate-y-0.5 hover:border-[#9eb9e6] hover:bg-white"
    >
      Xem đơn
    </button>
  );

  const renderRegistrationCard = (
    r: RegistrationRequest,
    badges: ReactNode,
    actions: ReactNode,
    note?: ReactNode,
  ) => (
    <div
      key={r.id}
      className="flex min-h-[96px] flex-wrap items-center gap-4 rounded-2xl border border-[#d6e2f1] bg-white px-5 py-4 shadow-[0_8px_18px_rgba(36,76,184,0.07)]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[18px] font-semibold leading-tight text-[#1f3152] sm:text-[20px]">
            {r.formData?.fullName || "Chưa có tên"}
          </span>
          {badges}
        </div>
        <p className="mt-1 text-[15px] font-medium text-[#5d7299] sm:text-[16px]">
          MSSV: {r.formData?.mssv || "Chưa có MSSV"}
        </p>
        {note ? <div className="mt-1.5 text-[13px] text-[#6b7f9f]">{note}</div> : null}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2.5">{actions}</div>
    </div>
  );

  const renderEmptyState = (message: string) => (
    <div className="rounded-2xl border border-dashed border-[#cbdcf2] bg-white/55 px-5 py-10 text-center text-sm font-medium text-[#7c8fb5]">
      {message}
    </div>
  );

  const renderList = (items: RegistrationRequest[], emptyMessage: string, renderItem: (r: RegistrationRequest) => ReactNode) => (
    <div className="space-y-3">
      {items.length === 0 ? renderEmptyState(emptyMessage) : items.map(renderItem)}
    </div>
  );

  const renderStatusBadge = (r: RegistrationRequest) => {
    const st = statusMap[r.status];
    return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${st.className}`}>{st.label}</span>;
  };

  const renderPeriodBadge = (r: RegistrationRequest) =>
    r.period_name ? (
      <span className="inline-flex rounded-full border border-[#c8d8ef] bg-[#f2f7ff] px-3 py-1.5 text-xs font-bold text-[#244cb8]">
        {r.period_name}
      </span>
    ) : null;

  const renderDateNote = (r: RegistrationRequest) => (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-[#6b7f9f]">
      <span>Nộp: {formatDate(r.submittedAt)}</span>
      {r.status === "approved" && r.approved_at ? (
        <span className="text-emerald-600">Duyệt: {formatDate(r.approved_at)}</span>
      ) : null}
      {r.status === "rejected" && r.rejectionReason ? (
        <span className="text-rose-600">Lý do: {r.rejectionReason}</span>
      ) : null}
      {r.status === "cancelled" && r.cancelled_at ? (
        <span className="text-slate-500">Hủy: {formatDate(r.cancelled_at)}</span>
      ) : null}
      {r.status === "cancelled" && r.cancellation_reason ? (
        <span className="text-slate-500">Lý do hủy: {r.cancellation_reason}</span>
      ) : null}
    </div>
  );

  // ─── Shared sub-sections ─────────────────────────────────
  const renderReviewSection = (items: RegistrationRequest[]) => {
    const priorityGroup = items.filter((r) => hasPendingPriority(r));
    const rejectedGroup = items.filter((r) => !hasPendingPriority(r) && hasRejectedPriority(r));
    const manualGroup   = items.filter((r) => r.auto_decision === "review" && !hasPendingPriority(r) && !hasRejectedPriority(r));

    if (items.length === 0) return renderEmptyState("Không có đơn nào cần xem lại");

    return (
      <div className="space-y-6">
        {/* Nhóm 0: Minh chứng ưu tiên không hợp lệ — chỉ xem chi tiết, không còn hành động
            duyệt/xác nhận nào (hồ sơ lẽ ra đã tự chuyển rejected; nhóm này chỉ còn xuất
            hiện với dữ liệu cũ chưa cascade). */}
        {rejectedGroup.length > 0 && (
          <div className="space-y-3">
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-rose-600">
              Minh chứng không hợp lệ ({rejectedGroup.length})
            </p>
            {rejectedGroup.map((r) =>
              renderRegistrationCard(
                r,
                <>
                  {renderPeriodBadge(r)}
                  <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[13px] font-semibold text-rose-700">
                    Minh chứng không hợp lệ
                  </span>
                </>,
                renderViewButton(r),
                renderDateNote(r),
              ),
            )}
          </div>
        )}

        {/* Nhóm 1: Chờ xác minh ưu tiên */}
        {priorityGroup.length > 0 && (
          <div className="space-y-3">
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#315b9e]">
              Chờ xác minh ưu tiên ({priorityGroup.length})
            </p>
            {priorityGroup.map((r) => {
              return renderRegistrationCard(
                r,
                <>
                  {renderPeriodBadge(r)}
                </>,
                <>
                  {renderViewButton(r)}
                  <button
                    type="button"
                    onClick={() => setVerifyModalId(r.id)}
                    className="inline-flex h-11 min-w-[170px] items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_58%,#31b7d4_100%)] px-4 text-[13px] font-semibold text-white shadow-[0_10px_22px_rgba(36,76,184,0.22)] transition hover:brightness-110"
                  >
                    Xác minh minh chứng
                  </button>
                </>,
                renderDateNote(r),
              );
            })}
          </div>
        )}

        {/* Nhóm 2: Chờ duyệt thủ công — dữ liệu cũ (auto_decision='review' còn sót lại từ
            trước khi bỏ tùy chọn "Cần xem lại" khỏi dropdown "Đổi đề xuất"). Không còn nút
            Duyệt/Từ chối nhanh ở đây nữa — 2 nút đó approve/reject thẳng cả đơn mà không qua
            xác minh minh chứng hay xếp hạng, gây bug "đơn đã duyệt sẵn vẫn chiếm lại suất khi
            xếp hạng lại". Muốn xử lý minh chứng thì bấm "Xem đơn" để xác minh đúng chỗ. */}
        {manualGroup.length > 0 && (
          <div className="space-y-3">
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-amber-600">
              Chờ duyệt thủ công ({manualGroup.length})
            </p>
            {manualGroup.map((r) =>
              renderRegistrationCard(
                r,
                <>
                  {renderPeriodBadge(r)}
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[13px] font-semibold text-amber-700">
                    Cần xem lại
                  </span>
                </>,
                renderViewButton(r),
                <>
                  {r.auto_decision_reason ? <div className="text-[#9b6b00]">Lý do: {r.auto_decision_reason}</div> : null}
                  {renderDateNote(r)}
                </>,
              ),
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDoneSection = (items: RegistrationRequest[]) =>
    renderList(items, "Chưa có đơn nào đã xử lý", (r) =>
      renderRegistrationCard(
        r,
        <>
          {renderPeriodBadge(r)}
          {renderStatusBadge(r)}
        </>,
        renderViewButton(r),
        renderDateNote(r),
      ),
    );

  // ─── Tab: Đợt chính ──────────────────────────────────────
  const renderTabMain = () => (
    <div className="space-y-4">
      {renderSubFilter(mainSubFilter, setMainSubFilter, {
        pending: mainPendingItems.length,
        review:  mainReviewItems.length,
        done:    mainDoneItems.length,
      })}

      {mainSubFilter === "pending" && (
        <div className="space-y-4">
          {processingPeriods.map((g) => (
            <div key={g.periodId} className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-blue-800">
                    Đợt <span className="italic">{g.periodName}</span> đã xếp hạng xong, đang chờ xác nhận
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    ✅ {g.approveCount} duyệt &nbsp;❌ {g.rejectCount} từ chối
                    {g.nullCount > 0 ? ` &nbsp;⏳ ${g.nullCount} chưa xếp hạng` : ""}
                  </p>
                </div>
                {(() => {
                  const deadline = admissionDeadline(periods.find((p) => p.id === g.periodId)?.end_date);
                  const isBeforeDeadline = deadline ? now.getTime() < deadline.getTime() : false;
                  return (
                    <button
                      type="button"
                      disabled={isSubmitting || g.approveCount + g.rejectCount === 0 || isBeforeDeadline}
                      title={isBeforeDeadline
                        ? `Chưa tới hạn 17:00 ngày ${deadline ? formatDate(deadline) : ""} — chưa thể xác nhận đóng đợt.`
                        : undefined}
                      onClick={() => setConfirmBatchInfo({ periodId: g.periodId, periodName: g.periodName, approveCount: g.approveCount, rejectCount: g.rejectCount })}
                      className="rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(36,76,184,0.24)] transition hover:brightness-110 disabled:opacity-40"
                    >
                      Xác nhận tất cả
                    </button>
                  );
                })()}
              </div>
            </div>
          ))}
          {renderList(filteredMainPendingItems, "Không có đơn nào chờ xác nhận", (r) =>
            renderRegistrationCard(
              r,
              <>
                {renderPeriodBadge(r)}
                {renderProposalBadge(r)}
                {renderDormReservationSourceBadge(r)}
              </>,
              <>
                {renderViewButton(r)}
                {renderDropdown(r)}
              </>,
              renderDateNote(r),
            ),
          )}
        </div>
      )}
      {mainSubFilter === "review" && renderReviewSection(mainReviewItems)}
      {mainSubFilter === "done"    && renderDoneSection(filteredMainDoneItems)}
    </div>
  );

  // ─── Tab: Quanh năm ──────────────────────────────────────
  const renderTabRolling = () => {
    const eligibleCount = filteredRollingPendingItems.filter((r) => r.auto_decision === "approve" || r.auto_decision === "reject").length;
    return (
      <div className="space-y-4">
        {renderSubFilter(rollingSubFilter, setRollingSubFilter, {
          pending: rollingPendingItems.length,
          review:  rollingReviewItems.length,
          done:    rollingDoneItems.length,
        })}

        {rollingSubFilter === "pending" && (
          <div className="space-y-3">
            {renderList(filteredRollingPendingItems, "Không có đơn nào chờ xác nhận", (r) =>
              renderRegistrationCard(
                r,
                <>
                  {renderPeriodBadge(r)}
                  {renderProposalBadge(r)}
                </>,
                <>
                  {renderViewButton(r)}
                  {renderDropdown(r)}
                  {r.auto_decision === "approve" || r.auto_decision === "reject" ? (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setConfirmSingleId(r.id)}
                      className="rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_6px_14px_rgba(36,76,184,0.22)] transition hover:brightness-110 disabled:opacity-40"
                    >
                      Xác nhận
                    </button>
                  ) : null}
                </>,
                renderDateNote(r),
              ),
            )}
            {filteredRollingPendingItems.length > 0 && eligibleCount > 0 ? (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setConfirmRollingAll(true)}
                  className="rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(36,76,184,0.22)] transition hover:brightness-110 disabled:opacity-40"
                >
                  Xác nhận tất cả ({eligibleCount})
                </button>
              </div>
            ) : null}
          </div>
        )}
        {rollingSubFilter === "review" && renderReviewSection(rollingReviewItems)}
        {rollingSubFilter === "done"    && renderDoneSection(filteredRollingDoneItems)}
      </div>
    );
  };

  const tabs: { key: AdminTab; label: string; count: number }[] = [
    { key: "main",    label: "Đợt chính", count: allMainItems.length    },
    { key: "rolling", label: "Quanh năm", count: allRollingItems.length },
  ];

  // ─── Render ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative isolate flex min-h-[calc(100vh-5rem-28px)] flex-col items-center justify-center rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        <div className="flex h-40 w-full max-w-3xl flex-col items-center justify-center rounded-3xl bg-white/80 p-6 text-center shadow-[0_20px_60px_rgba(36,76,184,0.12)] backdrop-blur-sm">
          <LoaderCircle className="mb-3 h-8 w-8 animate-spin text-[#244CB8]" />
          <p className="text-sm font-medium text-[#1F3152]">Đang tải danh sách đơn đăng ký...</p>
        </div>
      </motion.section>
    );
  }

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {errorToast && (
            <div className="fixed inset-0 z-90 flex items-center justify-center bg-[rgba(14,25,48,0.35)] px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-center gap-3 rounded-[20px] border border-rose-200 bg-white px-6 py-4 text-sm font-semibold text-rose-700 shadow-[0_24px_60px_rgba(15,23,42,0.25)]"
              >
                <XCircle className="h-5 w-5 shrink-0" />
                {errorToast}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
      <motion.section
        initial={shouldSkipAnim ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        {/* Header */}
        <div className="auth-reveal is-visible rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Quản lý đơn đăng ký</h1>
              <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[#62789f] sm:text-sm">
                Xem đề xuất tự động, chỉnh sửa và xác nhận từng đơn hoặc cả lô.
              </p>
            </div>

            {/* Filter bar — period dropdown only for main tab */}
            {activeTab === "main" ? (
              <div className="flex w-full justify-end xl:w-[420px]">
                <label className="block w-full sm:w-[240px] xl:w-[300px]">
                  <select
                    value={filterPeriodId}
                    onChange={(e) => setFilterPeriodId(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="h-11 w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-3 text-sm font-semibold text-[#1f3152] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
                  >
                    <option value="all">Tất cả đợt</option>
                    {periods
                      .filter((p) => p.channel === "main")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.school_year} HK{p.semester}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            ) : null}
          </div>
        </div>

        {/* Tabs */}
        <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-[#c6d8f0] bg-[#f2f7ff] p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === t.key
                  ? "bg-white text-[#244cb8] shadow-[0_8px_16px_rgba(36,76,184,0.16)]"
                  : "text-[#6a81aa] hover:text-[#244cb8]"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                activeTab === t.key ? "bg-[#244cb8] text-white" : "bg-[#dce8f7] text-[#4d6ea3]"
              }`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "main"    && renderTabMain()}
          {activeTab === "rolling" && renderTabRolling()}
        </div>
      </motion.section>

      {/* Scroll to top */}
      {isScrollToTopVisible
        ? createPortal(
            <div className="fixed bottom-6 right-6 z-[70]">
              <button type="button" onClick={handleScrollToTop}
                className="group inline-flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_42%,#31b7d4_100%)] text-white shadow-[0_16px_32px_rgba(36,76,184,0.28)] transition hover:-translate-y-0.5 hover:brightness-110">
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>,
            document.body,
          )
        : null}

      {/* ── Modals ── */}
      <AnimatePresence initial={!shouldSkipAnim}>
        {/* Chi tiết hồ sơ */}
        {selectedRequest ? (
          <motion.div key="detail-modal"
            initial={shouldSkipAnim ? false : { opacity: 0 }}
            animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[72] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={shouldSkipAnim ? false : { opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-2xl rounded-[28px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_72%,#e7f0ff_100%)] p-6 shadow-[0_28px_70px_rgba(27,56,122,0.28)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="mt-2 text-2xl font-bold text-[#173a78]">Chi tiết hồ sơ</h3>
                  <p className="mt-2 text-sm leading-7 text-[#4f6894]">Họ và tên: {selectedRequest.formData.fullName}</p>
                  <p className="text-sm leading-7 text-[#4f6894]">Email: {selectedRequest.email}</p>
                </div>
                <button type="button" onClick={() => { setViewingRequestId(null); setRequestModalTab("info"); }}
                  className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:text-[#244cb8]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 inline-flex rounded-2xl border border-[#c6d8f0] bg-[#f2f7ff] p-1">
                {(["info", "history"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setRequestModalTab(t)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${requestModalTab === t ? "bg-white text-[#244cb8] shadow-[0_8px_16px_rgba(36,76,184,0.16)]" : "text-[#6a81aa] hover:text-[#244cb8]"}`}>
                    {t === "info" ? "Thông tin đơn" : "Lịch sử"}
                  </button>
                ))}
              </div>

              {requestModalTab === "info" ? (
                <div className="mt-5 space-y-3 rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                  <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <p className="text-[#5570a0]">MSSV: <span className="font-semibold text-[#1b3766]">{selectedRequest.formData.mssv}</span></p>
                    <p className="text-[#5570a0]">Trạng thái: <span className="font-semibold text-[#1b3766]">{statusMap[selectedRequest.status].label}</span></p>
                    <p className="text-[#5570a0]">Lớp: <span className="font-semibold text-[#1b3766]">{selectedRequest.formData.class}</span></p>
                    <p className="text-[#5570a0]">Nộp lúc: <span className="font-semibold text-[#1b3766]">{formatDateTime(selectedRequest.submittedAt)}</span></p>
                    <p className="text-[#5570a0]">Khoa: <span className="font-semibold text-[#1b3766]">{selectedRequest.formData.department}</span></p>
                  </div>
                  {selectedRequest.rejectionReason ? (
                    <p className="text-sm text-[#bf3e53]">Lý do từ chối: {selectedRequest.rejectionReason}</p>
                  ) : null}
                  {selectedRequest.status === "cancelled" ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      <p className="font-semibold text-slate-700">Thông tin hủy</p>
                      {selectedRequest.cancelled_at ? <p>Thời điểm: {formatDateTime(selectedRequest.cancelled_at)}</p> : null}
                      {selectedRequest.cancellation_reason ? <p>Lý do: {selectedRequest.cancellation_reason}</p> : null}
                      {selectedRequest.cancelled_by ? <p>Người hủy: {selectedRequest.cancelled_by === "candidate" ? "Sinh viên tự hủy" : selectedRequest.cancelled_by}</p> : null}
                    </div>
                  ) : null}
                  <Link to={`/admin/registrations/${selectedRequest.id}`} state={{ request: selectedRequest, returnToModal: true }}
                    className="inline-flex rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 py-2 text-sm font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.12)] transition hover:-translate-y-0.5">
                    Mở trang chi tiết
                  </Link>
                </div>
              ) : (
                <div className="mt-5 max-h-[52vh] space-y-3 overflow-y-auto rounded-2xl border border-[#d3e0f2] bg-white/55 p-2 pr-3">
                  {selectedRequestHistory.map((hr, idx) => {
                    const st = statusMap[hr.status];
                    return (
                      <div key={hr.id} className="rounded-2xl border border-[#c8d9f0] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 py-3 shadow-[0_10px_22px_rgba(36,76,184,0.10)]">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[#1b3766]">Lần nộp {idx + 1}</p>
                          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${st.className}`}>{st.label}</span>
                        </div>
                        <p className="mt-2 text-sm text-[#5570a0]">Nộp lúc: {formatDateTime(hr.submittedAt)}</p>
                        {hr.rejectionReason ? <p className="mt-1 text-sm text-[#bf3e53]">Lý do: {hr.rejectionReason}</p> : null}
                        <div className="mt-3">
                          <Link to={`/admin/registrations/${hr.id}`} state={{ request: hr, returnToModal: true }}
                            className="inline-flex rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-3.5 py-1.5 text-xs font-semibold text-[#244cb8] transition hover:-translate-y-0.5">
                            Xem chi tiết
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button type="button" onClick={() => { setViewingRequestId(null); setRequestModalTab("info"); }}
                  className="rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition hover:brightness-110">
                  Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {/* Reject dialog */}
        {rejectDialog ? (
          <motion.div key="reject-dialog"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[74] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-xl rounded-[28px] border border-[#d5e1f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_28px_70px_rgba(15,23,42,0.24)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-2xl font-bold text-[#1a2d52]">Phản hồi hồ sơ</p>
                </div>
                <button type="button" onClick={() => setRejectDialog(null)}
                  className="rounded-xl border border-[#d5e1f2] bg-white p-2 text-[#6c80a8] transition hover:text-[#244cb8]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-5">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#667ca8]">Lý do từ chối</label>
                <textarea value={rejectionInput} onChange={(e) => setRejectionInput(e.target.value)}
                  placeholder="Ví dụ: Ảnh CCCD chưa rõ nét, thiếu thông tin người thân..." rows={5}
                  className="w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-4 py-3 text-sm text-[#1f3152] outline-none transition placeholder:text-[#8ea1c0] focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12" />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setRejectDialog(null)}
                  className="rounded-2xl border border-[#c9d8ef] bg-white px-5 py-2.5 text-sm font-semibold text-[#4b6494] transition hover:text-[#244cb8]">
                  Hủy
                </button>
                <button type="button" disabled={!rejectionInput.trim() || isSubmitting}
                  onClick={() => void handleConfirmRejectFromReview()}
                  className="rounded-2xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(204,60,79,0.22)] transition hover:brightness-105 disabled:opacity-40">
                  Xác nhận từ chối
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {/* Approve (ghim tay) dialog */}
        {approveDialog ? (
          <motion.div key="approve-dialog"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[74] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-xl rounded-[28px] border border-[#d5e1f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_28px_70px_rgba(15,23,42,0.24)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-2xl font-bold text-[#1a2d52]">Duyệt tay (ghim ưu tiên)</p>
                </div>
                <button type="button" onClick={() => setApproveDialog(null)}
                  className="rounded-xl border border-[#d5e1f2] bg-white p-2 text-[#6c80a8] transition hover:text-[#244cb8]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                {approveDialog.bumpedStudent ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Chỉ tiêu hiện đã đủ người, không còn chỗ trống — duyệt tay đơn này sẽ chiếm 1 suất trước, khiến{" "}
                    <span className="font-bold">
                      {approveDialog.bumpedStudent.full_name ?? "1 sinh viên khác"}
                      {approveDialog.bumpedStudent.student_code ? ` (${approveDialog.bumpedStudent.student_code})` : ""}
                    </span>{" "}
                    — người đang xếp hạng đủ điều kiện tự nhiên — bị chuyển xuống danh sách chờ khi bấm "Xếp hạng lại" tiếp theo.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-4 py-3 text-sm text-[#4b6494]">
                    Chỉ tiêu hiện vẫn còn chỗ trống hoặc đơn này đã tự nhiên đủ điều kiện — duyệt tay không làm ai bị đẩy khỏi danh sách duyệt khi xếp hạng lại.
                  </div>
                )}
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#667ca8]">Lý do duyệt tay</label>
                <textarea value={approveReasonInput} onChange={(e) => setApproveReasonInput(e.target.value)}
                  placeholder="Ví dụ: Trường hợp đặc cách theo quyết định của Ban quản lý KTX..." rows={4}
                  className="w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-4 py-3 text-sm text-[#1f3152] outline-none transition placeholder:text-[#8ea1c0] focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12" />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setApproveDialog(null)}
                  className="rounded-2xl border border-[#c9d8ef] bg-white px-5 py-2.5 text-sm font-semibold text-[#4b6494] transition hover:text-[#244cb8]">
                  Hủy
                </button>
                <button type="button" disabled={!approveReasonInput.trim() || isSubmitting}
                  onClick={() => void handleConfirmApprove()}
                  className="rounded-2xl bg-[linear-gradient(135deg,#1f9a60_0%,#35bf7a_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(31,154,96,0.22)] transition hover:brightness-105 disabled:opacity-40">
                  Xác nhận duyệt
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {/* Confirm single */}
        {confirmSingleId ? (
          <motion.div key="confirm-single"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[74] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-md rounded-[28px] border border-[#d5e1f2] bg-white p-6 shadow-[0_28px_70px_rgba(15,23,42,0.24)]">
              <h3 className="text-xl font-bold text-[#1a2d52]">Xác nhận đơn này?</h3>
              <p className="mt-2 text-sm text-[#61779d]">Hành động này sẽ apply đề xuất tự động và thông báo cho sinh viên.</p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setConfirmSingleId(null)}
                  className="rounded-2xl border border-[#c9d8ef] bg-white px-4 py-2 text-sm font-semibold text-[#4b6494]">Hủy</button>
                <button type="button" disabled={isSubmitting} onClick={() => void handleConfirmSingle(confirmSingleId)}
                  className="rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(36,76,184,0.22)] transition hover:brightness-110 disabled:opacity-40">
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {/* Confirm batch (main) */}
        {confirmBatchInfo ? (
          <motion.div key="confirm-batch"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[74] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-md rounded-[28px] border border-[#d5e1f2] bg-white p-6 shadow-[0_28px_70px_rgba(15,23,42,0.24)]">
              <h3 className="text-xl font-bold text-[#1a2d52]">Xác nhận tất cả?</h3>
              <p className="mt-2 text-sm text-[#61779d]">
                Duyệt <strong>{confirmBatchInfo.approveCount}</strong> đơn và từ chối <strong>{confirmBatchInfo.rejectCount}</strong> đơn trong đợt <em>{confirmBatchInfo.periodName}</em>?
              </p>
              <p className="mt-1 text-xs text-[#bf3e53]">Hành động này không thể hoàn tác.</p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setConfirmBatchInfo(null)}
                  className="rounded-2xl border border-[#c9d8ef] bg-white px-4 py-2 text-sm font-semibold text-[#4b6494]">Hủy</button>
                <button type="button" disabled={isSubmitting} onClick={() => void handleConfirmBatch()}
                  className="rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(36,76,184,0.22)] transition hover:brightness-110 disabled:opacity-40">
                  OK, xác nhận
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {/* Confirm rolling all */}
        {confirmRollingAll ? (
          <motion.div key="confirm-rolling-all"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[74] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-md rounded-[28px] border border-[#d5e1f2] bg-white p-6 shadow-[0_28px_70px_rgba(15,23,42,0.24)]">
              <h3 className="text-xl font-bold text-[#1a2d52]">Xác nhận tất cả đơn quanh năm?</h3>
              <p className="mt-2 text-sm text-[#61779d]">
                Sẽ xác nhận {rollingPendingItems.filter((r) => r.auto_decision === "approve" || r.auto_decision === "reject").length} đơn có đề xuất (bỏ qua đơn chưa xếp hạng).
              </p>
              <p className="mt-1 text-xs text-[#bf3e53]">Hành động này không thể hoàn tác.</p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setConfirmRollingAll(false)}
                  className="rounded-2xl border border-[#c9d8ef] bg-white px-4 py-2 text-sm font-semibold text-[#4b6494]">Hủy</button>
                <button type="button" disabled={isSubmitting} onClick={() => void handleConfirmRollingAll()}
                  className="rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(36,76,184,0.22)] transition hover:brightness-110 disabled:opacity-40">
                  OK, xác nhận
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {/* Modal xác minh tiêu chí ưu tiên */}
        {verifyModalId !== null ? (
          <motion.div key="verify-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[76] flex items-center justify-center bg-[rgba(14,25,48,0.56)] px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-2xl rounded-[28px] border border-[#d5e1f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#eef5ff_100%)] p-6 shadow-[0_28px_70px_rgba(15,23,42,0.20)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold uppercase text-[#1a2d52]">Xác minh minh chứng tiêu chí ưu tiên</h3>
                  {verifyModalRegistration && (
                    <p className="mt-1 text-sm text-[#244cb8]">
                      {verifyModalRegistration.formData?.fullName} —&nbsp;
                      <span className="font-semibold">{verifyModalRegistration.formData?.mssv}</span>
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => setVerifyModalId(null)}
                  className="rounded-xl border border-[#c8d8ef] bg-white/80 p-2 text-[#5f76a4] transition hover:border-[#9eb9e6] hover:text-[#244cb8]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 max-h-[62vh] space-y-3 overflow-y-auto pr-1">
                {!verifyModalRegistration ? (
                  <p className="text-sm text-[#5f76a4]">Đang tải...</p>
                ) : (verifyModalRegistration.priority_criteria ?? []).length === 0 ? (
                  <p className="text-sm text-[#5f76a4]">Không có tiêu chí ưu tiên nào.</p>
                ) : (
                  (verifyModalRegistration.priority_criteria ?? []).map((p) => {
                    const isPending = p.status === "pending";
                    const isVerified = p.status === "verified";
                    const isSubmittingThis = submittingPriorityIds.has(p.id);
                    return (
                      <div key={p.id} className={`rounded-2xl border px-4 py-4 ${
                        isPending ? "border-[#c8d8ef] bg-white" : isVerified ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50"
                      }`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[#1a2d52]">
                              [{p.code}] {p.name}
                            </p>
                            {!isPending ? (
                              <p className={`mt-0.5 text-xs font-semibold ${isVerified ? "text-emerald-600" : "text-rose-600"}`}>
                                {isVerified ? "Đã xác minh ✓" : "Đã từ chối ✗"}
                              </p>
                            ) : null}
                          </div>
                          {isPending ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={isSubmittingThis}
                                onClick={() => {
                                  setPriorityRejectDialog({
                                    priorityId: p.id,
                                    registrationId: verifyModalRegistration.id,
                                    criteriaLabel: `[${p.code}] ${p.name}`,
                                  });
                                  setPriorityRejectionInput("");
                                }}
                                className="rounded-xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-3 py-1.5 text-xs font-bold text-white shadow-[0_4px_10px_rgba(204,60,79,0.18)] transition hover:brightness-105 disabled:opacity-40"
                              >
                                {isSubmittingThis ? "..." : "✗ Từ chối"}
                              </button>
                              <button
                                type="button"
                                disabled={isSubmittingThis}
                                onClick={() => void handleVerifyPriority(p.id, verifyModalRegistration.id, "verified")}
                                className="rounded-xl bg-[linear-gradient(135deg,#1f9a60_0%,#35bf7a_100%)] px-3 py-1.5 text-xs font-bold text-white shadow-[0_4px_10px_rgba(31,154,96,0.22)] transition hover:brightness-110 disabled:opacity-40"
                              >
                                {isSubmittingThis ? "..." : "✓ Xác minh"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                        {p.evidence_urls && p.evidence_urls.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {p.evidence_urls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer"
                                className="block h-16 w-16 overflow-hidden rounded-xl border border-[#c8d8ef] bg-[#f7fbff] transition hover:border-[#9eb9e6] hover:opacity-80">
                                <img src={url} alt={`Minh chứng ${i + 1}`} className="h-full w-full object-cover" />
                              </a>
                            ))}
                          </div>
                        ) : (
                          isPending ? <p className="mt-2 text-xs text-[#7d90b5]">Chưa có minh chứng đính kèm</p> : null
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Toast */}
              {verifyAllDoneToast ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  Đã xác minh xong. Điểm ưu tiên đã được cập nhật.
                </div>
              ) : null}

              <div className="mt-5 flex justify-end">
                <button type="button" onClick={() => setVerifyModalId(null)}
                  className="rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_58%,#31a8cf_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition hover:brightness-110">
                  Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {priorityRejectDialog ? (
          <motion.div
            key="priority-reject-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[78] flex items-center justify-center bg-[rgba(14,25,48,0.58)] px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-xl rounded-[28px] border border-[#d5e1f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_28px_70px_rgba(15,23,42,0.24)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-2xl font-bold text-[#1a2d52]">Phản hồi hồ sơ</p>
                  <p className="mt-2 text-sm font-semibold text-[#bf3e53]">{priorityRejectDialog.criteriaLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPriorityRejectDialog(null);
                    setPriorityRejectionInput("");
                  }}
                  className="rounded-xl border border-[#d5e1f2] bg-white p-2 text-[#6c80a8] transition hover:text-[#244cb8]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-5">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#667ca8]">Lý do từ chối</label>
                <textarea
                  value={priorityRejectionInput}
                  onChange={(e) => setPriorityRejectionInput(e.target.value)}
                  placeholder="Ví dụ: Minh chứng không đúng tiêu chí đã chọn, ảnh bị mờ hoặc thiếu xác nhận của địa phương..."
                  rows={5}
                  className="w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-4 py-3 text-sm text-[#1f3152] outline-none transition placeholder:text-[#8ea1c0] focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPriorityRejectDialog(null);
                    setPriorityRejectionInput("");
                  }}
                  className="rounded-2xl border border-[#c9d8ef] bg-white px-5 py-2.5 text-sm font-semibold text-[#4b6494] transition hover:text-[#244cb8]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!priorityRejectionInput.trim() || submittingPriorityIds.has(priorityRejectDialog.priorityId)}
                  onClick={() => void handleConfirmPriorityReject()}
                  className="rounded-2xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(204,60,79,0.22)] transition hover:brightness-105 disabled:opacity-40"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
