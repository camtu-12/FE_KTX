import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Shuffle,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  approveReservation,
  cancelReservation,
  getAdminDormReservation,
  getAdminDormReservations,
  rankDormReservations,
  rejectReservation,
  rejectReservationPriority,
  updateReservationNote,
  verifyReservationPriority,
  waitlistReservation,
  type DormReservation,
  type ReservationStatus,
} from "../../../api/dormReservationApi";
import { getRegistrationPeriods } from "../../../api/registrationApi";
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

const STATUS_LABELS: Record<ReservationStatus, string> = {
  submitted: "Đã nộp",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  waitlisted: "Đang chờ",
  converted: "Đã chuyển đổi",
  expired: "Hết hạn",
  cancelled: "Đã huỷ",
};
const STATUS_COLORS: Record<ReservationStatus, string> = {
  submitted: "border-blue-200 bg-blue-50 text-blue-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  waitlisted: "border-amber-200 bg-amber-50 text-amber-700",
  converted: "border-violet-200 bg-violet-50 text-violet-700",
  expired: "border-slate-200 bg-slate-50 text-slate-600",
  cancelled: "border-slate-200 bg-slate-100 text-slate-500",
};

type Period = { id: number; name: string; allowAdmissionCandidates: boolean };
type PreviewImage = { url: string; label: string };

export default function DormReservationManagementPage() {
  const { headerSearchValue: search } = useOutletContext<AdminLayoutOutletContext>();

  const [reservations, setReservations] = useState<DormReservation[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "">("");
  const [periodFilter, setPeriodFilter] = useState<number | "">("");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // detail modal
  const [detail, setDetail] = useState<DormReservation | null>(null);

  // reject dialog
  const [rejectTarget, setRejectTarget] = useState<DormReservation | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  // note dialog
  const [noteTarget, setNoteTarget] = useState<DormReservation | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  // action loading
  const [actionId, setActionId] = useState<number | null>(null);

  // detail loading (for full detail with priorities)
  const [detailLoading, setDetailLoading] = useState(false);

  // ranking panel
  const [rankPeriodId, setRankPeriodId] = useState<number | "">("");
  const [rankLoading, setRankLoading] = useState(false);
  const [rankResult, setRankResult] = useState<{ approved: number; waitlist: number; freeBeds: number } | null>(null);
  const [rankBlockedCount, setRankBlockedCount] = useState<number | null>(null);

  // priority action loading in detail modal
  const [priorityActionId, setPriorityActionId] = useState<number | null>(null);

  // image lightbox
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    getRegistrationPeriods()
      .then((data: Array<{ id: number; name: string; allow_admission_candidates?: boolean }>) =>
        setPeriods(
          data.map((p) => ({
            id: p.id,
            name: p.name,
            allowAdmissionCandidates: Boolean((p as unknown as { allow_admission_candidates?: boolean }).allow_admission_candidates),
          }))
        )
      )
      .catch(() => null);
  }, []);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await getAdminDormReservations({
        search: search || undefined,
        status: statusFilter || undefined,
        registration_period_id: periodFilter || undefined,
        page,
      });
      setReservations(res.data);
      setTotal(res.total);
      setCurrentPage(res.current_page);
      setLastPage(res.last_page);
    } catch {
      setApiError("Không thể tải danh sách hồ sơ giữ chỗ.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, periodFilter]);

  useEffect(() => { void load(1); }, [load]);

  const patch = (updated: DormReservation) => {
    setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (detail?.id === updated.id) setDetail(updated);
  };

  const handleApprove = async (r: DormReservation) => {
    setActionId(r.id);
    try {
      const res = await approveReservation(r.id);
      patch(res.reservation);
      showToast("success", "Đã duyệt hồ sơ giữ chỗ.");
    } catch (err: unknown) {
      showToast("error", (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Thao tác thất bại.");
    } finally {
      setActionId(null);
    }
  };

  const handleWaitlist = async (r: DormReservation) => {
    setActionId(r.id);
    try {
      const res = await waitlistReservation(r.id);
      patch(res.reservation);
      showToast("success", "Đã chuyển vào danh sách chờ.");
    } catch (err: unknown) {
      showToast("error", (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Thao tác thất bại.");
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (r: DormReservation) => {
    setActionId(r.id);
    try {
      const res = await cancelReservation(r.id);
      patch(res.reservation);
      showToast("success", "Đã huỷ hồ sơ giữ chỗ.");
    } catch (err: unknown) {
      showToast("error", (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Thao tác thất bại.");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setRejectLoading(true);
    try {
      const res = await rejectReservation(rejectTarget.id, rejectReason);
      patch(res.reservation);
      showToast("success", "Đã từ chối hồ sơ.");
      setRejectTarget(null);
      setRejectReason("");
    } catch (err: unknown) {
      showToast("error", (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Thao tác thất bại.");
    } finally {
      setRejectLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteTarget) return;
    setNoteSaving(true);
    try {
      const res = await updateReservationNote(noteTarget.id, noteText);
      patch(res.reservation);
      showToast("success", "Đã lưu ghi chú.");
      setNoteTarget(null);
    } catch {
      showToast("error", "Lưu ghi chú thất bại.");
    } finally {
      setNoteSaving(false);
    }
  };

  const isActive = (r: DormReservation) => ["submitted", "approved", "waitlisted"].includes(r.status);

  const handleOpenDetail = async (r: DormReservation) => {
    setDetail(r);
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

  const handleRank = async () => {
    if (!rankPeriodId) return;
    setRankLoading(true);
    setRankResult(null);
    setRankBlockedCount(null);
    try {
      const res = await rankDormReservations(Number(rankPeriodId));
      setRankResult({ approved: res.approved, waitlist: res.waitlist, freeBeds: res.free_beds });
      showToast("success", `Đã xếp hạng: ${res.approved} duyệt, ${res.waitlist} chờ.`);
      void load(1);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; pending_priority_count?: number } } })?.response?.data;
      if (typeof data?.pending_priority_count === "number" && data.pending_priority_count > 0) {
        setRankBlockedCount(data.pending_priority_count);
      }
      showToast("error", data?.message ?? "Xếp hạng thất bại.");
    } finally {
      setRankLoading(false);
    }
  };

  const handleVerifyPriority = async (priorityId: number) => {
    setPriorityActionId(priorityId);
    try {
      const res = await verifyReservationPriority(priorityId);
      if (detail) {
        setDetail({
          ...detail,
          reservationPriorities: detail.reservationPriorities?.map((p) =>
            p.id === priorityId ? res.priority : p
          ),
        });
      }
      showToast("success", "Đã xác minh tiêu chí.");
    } catch {
      showToast("error", "Xác minh thất bại.");
    } finally {
      setPriorityActionId(null);
    }
  };

  const handleRejectPriority = async (priorityId: number) => {
    setPriorityActionId(priorityId);
    try {
      const res = await rejectReservationPriority(priorityId);
      if (detail) {
        setDetail({
          ...detail,
          reservationPriorities: detail.reservationPriorities?.map((p) =>
            p.id === priorityId ? res.priority : p
          ),
        });
      }
      showToast("success", "Đã từ chối tiêu chí.");
    } catch {
      showToast("error", "Từ chối thất bại.");
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

      {/* Header */}
      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1a2d52]">Hồ sơ giữ chỗ KTX tân sinh viên</h1>
            <p className="mt-1 text-sm text-[#62789f]">{total} hồ sơ — Quản lý đăng ký giữ chỗ trước khi có MSSV.</p>
          </div>
          <button type="button" onClick={() => void load(1)} disabled={loading} className={secondaryBtn}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Làm mới
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(["", "submitted", "approved", "waitlisted", "rejected"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${statusFilter === s ? "border-[#244cb8] bg-[#244cb8] text-white" : "border-[#cfdcf0] bg-white text-[#62789f] hover:border-[#244cb8]"}`}>
              {s === "" ? "Tất cả" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        {periods.length > 0 && (
          <div className="mt-2">
            <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value ? Number(e.target.value) : "")}
              className="rounded-xl border border-[#cfdcf0] bg-white px-3 py-1.5 text-xs font-semibold text-[#62789f] focus:border-[#244cb8] focus:outline-none">
              <option value="">Tất cả đợt đăng ký</option>
              {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {apiError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{apiError}</div>}

      {/* ── Công cụ hàng loạt ── */}
      {periods.some((p) => p.allowAdmissionCandidates) && (
        <div className="rounded-[18px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_100%)] p-4 sm:p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#62789f]">Công cụ hàng loạt — đợt tân sinh viên</p>
          <div className="flex flex-wrap gap-4">
            {/* Xếp hạng */}
            <div className="min-w-[220px] flex-1 rounded-xl border border-[#d6e2f1] bg-white p-3">
              <p className="mb-2 text-xs font-semibold text-[#1a2d52]">Xếp hạng theo ưu tiên</p>
              <div className="mb-2 flex gap-2">
                <select value={rankPeriodId} onChange={(e) => { setRankPeriodId(e.target.value ? Number(e.target.value) : ""); setRankResult(null); }}
                  className="flex-1 rounded-xl border border-[#cfdcf0] bg-[#f7faff] px-2.5 py-1.5 text-xs font-medium text-[#1f3152] focus:border-[#244cb8] focus:outline-none">
                  <option value="">— Chọn đợt —</option>
                  {periods.filter((p) => p.allowAdmissionCandidates).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button type="button" disabled={!rankPeriodId || rankLoading} onClick={() => void handleRank()}
                  className={`${primaryBtn} h-8 gap-1.5 px-3 text-xs`}>
                  {rankLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shuffle className="h-3.5 w-3.5" />}
                  Xếp hạng
                </button>
              </div>
              {rankBlockedCount !== null && (
                <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Còn <strong>{rankBlockedCount}</strong> minh chứng ưu tiên chưa xác minh. Vui lòng xác minh (hoặc từ chối) tất cả minh chứng trước khi xếp hạng.</span>
                </div>
              )}
              {rankResult && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
                  Duyệt <strong>{rankResult.approved}</strong> · Chờ <strong>{rankResult.waitlist}</strong> · Chỗ trống <strong>{rankResult.freeBeds}</strong>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

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
              className="rounded-[18px] border border-[#d6e2f1] bg-white p-4 shadow-[0_8px_20px_rgba(36,76,184,0.07)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[#1a2d52]">{r.candidate?.fullName ?? "—"}</span>
                    <span className={`rounded-lg border px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                    {r.candidate?.status === "enrolled" && (
                      <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Đã nhập học
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-[#62789f]">
                    {r.reservationCode} · {r.candidate?.admissionCode}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[#7c8fb5]">
                    {r.period && <span>Đợt: <strong className="text-[#1f3152]">{r.period.name}</strong></span>}
                    {r.studentCode && <span>MSSV: <strong className="text-[#1f3152]">{r.studentCode}</strong></span>}
                    {r.candidate?.phone && <span>SĐT: <strong className="text-[#1f3152]">{r.candidate.phone}</strong></span>}
                    {r.submittedAt && <span>Nộp: <strong className="text-[#1f3152]">{r.submittedAt.slice(0, 10)}</strong></span>}
                  </div>
                  {r.status === "converted" && r.convertedRegistrationId && (
                    <Link to={`/admin/registrations/${r.convertedRegistrationId}`}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#244cb8] hover:underline">
                      Xem đơn KTX #{r.convertedRegistrationId} <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button type="button" onClick={() => void handleOpenDetail(r)} className={`${secondaryBtn} h-9 px-3 text-xs`}>Chi tiết</button>
                  <button type="button" onClick={() => { setNoteTarget(r); setNoteText(r.adminNote ?? ""); }} className={`${secondaryBtn} h-9 px-3 text-xs`}>Ghi chú</button>
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
              onClick={() => setDetail(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
                className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-[#c1d6f4] bg-white shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
                onClick={(e) => e.stopPropagation()}>
              <div className="flex shrink-0 items-center justify-between border-b border-[#eef3fb] px-5 py-3">
                <h2 className="text-lg font-bold text-[#1a2d52]">Chi tiết hồ sơ giữ chỗ</h2>
                <button type="button" onClick={() => setDetail(null)} className="text-[#7c8fb5] hover:text-[#1a2d52]"><X className="h-5 w-5" /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-4 [scrollbar-gutter:stable]">
                <div className="rounded-xl border border-[#dce7f6] bg-[#f5f9ff] p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#9aaac4]">Mã giữ chỗ</p>
                  <p className="text-lg font-bold text-[#244cb8]">{detail.reservationCode}</p>
                  <span className={`mt-1 inline-block rounded-lg border px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[detail.status]}`}>
                    {STATUS_LABELS[detail.status]}
                  </span>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9aaac4]">Thí sinh</p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <div><dt className="text-[#62789f]">Họ tên</dt><dd className="font-semibold text-[#1a2d52]">{detail.candidate?.fullName}</dd></div>
                    <div><dt className="text-[#62789f]">Mã hồ sơ</dt><dd className="font-mono text-xs font-semibold text-[#1a2d52]">{detail.candidate?.admissionCode}</dd></div>
                    <div><dt className="text-[#62789f]">Ngày sinh</dt><dd className="font-semibold">{detail.candidate?.dateOfBirth}</dd></div>
                    <div><dt className="text-[#62789f]">CCCD</dt><dd className="font-semibold">{detail.candidate?.cccd ?? "—"}</dd></div>
                    <div><dt className="text-[#62789f]">SĐT</dt><dd className="font-semibold">{detail.candidate?.phone ?? "—"}</dd></div>
                    <div><dt className="text-[#62789f]">Email</dt><dd className="font-semibold">{detail.candidate?.email ?? "—"}</dd></div>
                    <div><dt className="text-[#62789f]">Ngành</dt><dd className="font-semibold">{detail.candidate?.majorName ?? "—"}</dd></div>
                    <div><dt className="text-[#62789f]">Trạng thái thí sinh</dt>
                      <dd>
                        <span className={`rounded-md border px-1.5 py-0.5 text-xs font-semibold ${
                          detail.candidate?.status === "enrolled" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700"
                        }`}>{detail.candidate?.status === "enrolled" ? "Đã nhập học" : "Trúng tuyển"}</span>
                      </dd>
                    </div>
                    {detail.studentCode && <div className="col-span-2"><dt className="text-[#62789f]">MSSV</dt><dd className="font-bold text-emerald-700">{detail.studentCode}</dd></div>}
                  </dl>
                </div>

                {detail.period && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#9aaac4]">Đợt đăng ký</p>
                    <p className="text-sm font-semibold text-[#1a2d52]">{detail.period.name}</p>
                    <p className="text-xs text-[#62789f]">{detail.period.schoolYear} · HK {detail.period.semester}</p>
                  </div>
                )}

                {detail.priorityNote && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#9aaac4]">Ghi chú ưu tiên</p>
                    <p className="text-sm text-[#1f3152]">{detail.priorityNote}</p>
                  </div>
                )}
                {detail.rejectionReason && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                    <p className="mb-1 text-xs font-semibold text-rose-600">Lý do từ chối</p>
                    <p className="text-sm text-rose-800">{detail.rejectionReason}</p>
                  </div>
                )}
                {detail.adminNote && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#9aaac4]">Ghi chú admin</p>
                    <p className="text-sm text-[#1f3152]">{detail.adminNote}</p>
                  </div>
                )}
                {detail.status === "converted" && detail.convertedRegistrationId && (
                  <Link to={`/admin/registrations/${detail.convertedRegistrationId}`}
                    className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100"
                    onClick={() => setDetail(null)}>
                    <ArrowRight className="h-4 w-4" /> Xem đơn KTX #{detail.convertedRegistrationId}
                  </Link>
                )}

                {/* Hồ sơ ảnh */}
                {(detail.avatarUrl || detail.cccdFrontUrl || detail.cccdBackUrl) && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9aaac4]">Hồ sơ ảnh</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { key: "avatarUrl", label: "Ảnh đại diện" },
                          { key: "cccdFrontUrl", label: "CCCD mặt trước" },
                          { key: "cccdBackUrl", label: "CCCD mặt sau" },
                        ] as { key: "avatarUrl" | "cccdFrontUrl" | "cccdBackUrl"; label: string }[]
                      ).map(({ key, label }) => {
                        const url = resolveUrl(detail[key]);
                        return (
                          <div key={key} className="flex flex-col gap-1">
                            <p className="text-[0.68rem] font-semibold text-[#62789f]">{label}</p>
                            {url ? (
                              <button
                                type="button"
                                onClick={() => openPreviewImage(url, label)}
                                className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#dce7f6] bg-[#f5f9ff]"
                              >
                                <img src={url} alt={label} className="h-full w-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                                  <Eye className="h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
                                </div>
                              </button>
                            ) : (
                              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-[#dce7f6] bg-[#f5f9ff] text-[0.65rem] text-[#9aaac4]">
                                Chưa tải
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tiêu chí ưu tiên */}
                {detailLoading && (
                  <div className="flex items-center gap-2 text-xs text-[#7c8fb5]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải tiêu chí ưu tiên...
                  </div>
                )}
                {!detailLoading && detail.reservationPriorities && detail.reservationPriorities.length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#9aaac4]">
                      <Award className="h-3.5 w-3.5" /> Tiêu chí ưu tiên
                    </p>
                    <div className="space-y-2">
                      {detail.reservationPriorities.map((p) => (
                        <div key={p.id} className={`rounded-xl border px-3 py-2.5 ${
                          p.status === "verified" ? "border-emerald-200 bg-emerald-50"
                          : p.status === "rejected" ? "border-rose-200 bg-rose-50"
                          : "border-[#dce7f6] bg-[#f8fafd]"
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-[#1a2d52]">{p.criteria?.name ?? `#${p.priorityCriteriaId}`}</p>
                              {p.evidences && p.evidences.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {p.evidences.map((ev) => {
                                    const evUrl = resolveUrl(ev.fileUrl);
                                    const isPdf = ev.mimeType === "application/pdf" || ev.fileUrl.endsWith(".pdf");
                                    return isPdf ? (
                                      <a key={ev.id} href={evUrl} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-1 rounded-lg border border-[#dce7f6] bg-[#f5f9ff] px-2 py-1 text-[0.65rem] font-semibold text-[#244cb8] hover:bg-[#e8f0fd]">
                                        <FileText className="h-3 w-3" />
                                        {ev.originalName ?? "File PDF"}
                                      </a>
                                    ) : (
                                      <button key={ev.id} type="button"
                                        onClick={() => openPreviewImage(evUrl, ev.originalName ?? "Minh chứng")}
                                        className="group relative h-14 w-14 overflow-hidden rounded-lg border border-[#dce7f6] bg-[#f5f9ff]">
                                        <img src={evUrl} alt={ev.originalName ?? ""} className="h-full w-full object-cover" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                                          <Eye className="h-3.5 w-3.5 text-white opacity-0 transition group-hover:opacity-100" />
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span className={`rounded-md border px-1.5 py-0.5 text-[0.68rem] font-semibold ${
                                p.status === "verified" ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                                : p.status === "rejected" ? "border-rose-200 bg-rose-100 text-rose-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                              }`}>
                                {p.status === "verified" ? "Đã xác minh" : p.status === "rejected" ? "Từ chối" : "Chờ xác minh"}
                              </span>
                              {p.status === "pending" && (
                                <>
                                  <button type="button" disabled={priorityActionId === p.id}
                                    onClick={() => void handleVerifyPriority(p.id)}
                                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[0.68rem] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                                    {priorityActionId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Xác minh"}
                                  </button>
                                  <button type="button" disabled={priorityActionId === p.id}
                                    onClick={() => void handleRejectPriority(p.id)}
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[0.68rem] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                                    Từ chối
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              {(detail.status === "submitted" || detail.status === "waitlisted" || detail.status === "approved") && (
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#eef3fb] px-5 py-3">
                  <button type="button" onClick={() => setDetail(null)}
                    className="rounded-xl border border-[#d6e2f1] bg-white px-4 py-2 text-sm font-semibold text-[#5d7299] hover:-translate-y-0.5 transition">
                    Hủy
                  </button>
                  <button type="button" onClick={() => { setRejectTarget(detail); setRejectReason(""); }}
                    className={`${dangerBtn} h-9 px-4 text-sm`}>
                    Từ chối
                  </button>
                  {(detail.status === "submitted" || detail.status === "waitlisted") && (
                    <button type="button" disabled={actionId === detail.id}
                      onClick={() => void handleApprove(detail)}
                      className={`${primaryBtn} h-9 px-4 text-sm`}>
                      {actionId === detail.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Duyệt
                    </button>
                  )}
                </div>
              )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ── Reject Dialog ── */}
      {createPortal(
        <AnimatePresence>
          {rejectTarget && (
            <motion.div key="reject" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-3"
              onClick={() => setRejectTarget(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
                className="w-full max-w-md rounded-[24px] border border-rose-200 bg-white p-6 shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
                onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-1 text-lg font-bold text-[#1a2d52]">Từ chối hồ sơ</h2>
              <p className="mb-3 text-sm text-[#62789f]">{rejectTarget.candidate?.fullName} — {rejectTarget.reservationCode}</p>
              <label className="mb-1 block text-xs font-semibold text-[#324B76]">Lý do từ chối *</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder="Nhập lý do từ chối..." />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setRejectTarget(null)} className="rounded-xl border border-[#d6e2f1] bg-white px-4 py-2 text-sm font-semibold text-[#5d7299]">Hủy</button>
                <button type="button" disabled={rejectLoading || !rejectReason.trim()} onClick={() => void handleReject()} className={`${dangerBtn} h-9`}>
                  {rejectLoading && <Loader2 className="h-4 w-4 animate-spin" />} Xác nhận từ chối
                </button>
              </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ── Note Dialog ── */}
      {createPortal(
        <AnimatePresence>
          {noteTarget && (
            <motion.div key="note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-3"
              onClick={() => setNoteTarget(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
                className="w-full max-w-md rounded-[24px] border border-[#c1d6f4] bg-white p-6 shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
                onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-3 text-lg font-bold text-[#1a2d52]">Ghi chú admin</h2>
              <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={4} className={`${inputCls} resize-none`} placeholder="Nhập ghi chú..." />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setNoteTarget(null)} className="rounded-xl border border-[#d6e2f1] bg-white px-4 py-2 text-sm font-semibold text-[#5d7299]">Hủy</button>
                <button type="button" disabled={noteSaving} onClick={() => void handleSaveNote()} className={`${primaryBtn} h-9`}>
                  {noteSaving && <Loader2 className="h-4 w-4 animate-spin" />} Lưu ghi chú
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
