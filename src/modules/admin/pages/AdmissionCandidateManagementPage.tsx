import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import {
  bulkEnrollCandidates,
  deleteAdminCandidate,
  getAdminCandidate,
  getAdminCandidates,
  type AdmissionCandidate,
  type BulkEnrollResult,
  type CandidatePayload,
  type CandidateStatus,
} from "../../../api/admissionCandidateApi";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import { formatDate } from "../../../utils/dateFormat";

const primaryBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_45%,#31b7d4_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(36,76,184,0.20)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#fff_0%,#f5f9ff_100%)] px-4 text-sm font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.09)] transition hover:-translate-y-0.5 disabled:opacity-50";
const inputCls =
  "w-full rounded-xl border border-[#cfdcf0] bg-[#f7faff] px-3 py-1.5 text-sm text-[#1f3152] focus:border-[#244cb8] focus:outline-none";
const iconBtn =
  "inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#bfd2ec] bg-white text-[#244cb8] shadow-[0_10px_22px_rgba(36,76,184,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-[#9ebce5] hover:bg-[#f3f8ff]";
const deleteIconBtn =
  "inline-flex h-12 w-12 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 shadow-[0_10px_22px_rgba(244,63,94,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60";

const STATUS_LABELS: Record<CandidateStatus, string> = {
  admitted: "Trúng tuyển",
  enrolled: "Đã nhập học",
  cancelled: "Đã hủy",
};

const STATUS_BADGE_CLASSES: Record<CandidateStatus, string> = {
  admitted: "border-sky-200 bg-sky-50 text-sky-700",
  enrolled: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};
type FormErrors = Partial<Record<string, string>>;

const emptyPayload: CandidatePayload = {
  admission_code: "",
  full_name: "",
  date_of_birth: "",
  gender: null,
  cccd: null,
  phone: null,
  email: null,
  permanent_address: null,
  major_code: null,
  major_name: null,
  course_year: null,
  school_year: null,
  status: "admitted",
};

function FieldGroup({ label, error, children, className = "" }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold text-[#324B76]">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function CandidateStatusBadge({ status, label }: { status: CandidateStatus; label?: string }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_BADGE_CLASSES[status]}`}>
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}

function getDetailTitle(status?: CandidateStatus) {
  if (status === "enrolled") return "Chi tiết sinh viên đã nhập học";
  if (status === "cancelled") return "Chi tiết hồ sơ đã hủy";
  return "Chi tiết hồ sơ trúng tuyển";
}

function getReservationConversionStatus(candidate: AdmissionCandidate | null) {
  if (!candidate) return null;
  const reservation = candidate.dormReservations?.find((item) => item.convertedRegistrationId || item.status === "converted");
  if (!reservation) return null;
  return reservation.convertedRegistrationId || reservation.status === "converted"
    ? "Đã chuyển đổi hồ sơ giữ chỗ"
    : STATUS_LABELS[candidate.status];
}

export default function AdmissionCandidateManagementPage() {
  const { headerSearchValue: search } = useOutletContext<AdminLayoutOutletContext>();

  const [candidates, setCandidates] = useState<AdmissionCandidate[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | "">("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // detail modal
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CandidatePayload>(emptyPayload);
  const [detailCandidate, setDetailCandidate] = useState<AdmissionCandidate | null>(null);
  const [, setFormErrors] = useState<FormErrors>({});

  // delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // bulk import
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkEnrollResult | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await getAdminCandidates({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
      });
      setCandidates(res.data);
      setTotal(res.total);
      setCurrentPage(res.current_page);
      setLastPage(res.last_page);
    } catch {
      setApiError("Không thể tải danh sách.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { void load(1); }, [load]);

  // ── Detail ────────────────────────────────────────────────────────────────
  const openDetail = (c: AdmissionCandidate) => {
    setForm({
      admission_code: c.admissionCode,
      expected_student_code: c.expectedStudentCode,
      full_name: c.fullName,
      date_of_birth: c.dateOfBirth,
      gender: c.gender,
      cccd: c.cccd,
      phone: c.phone,
      email: c.email,
      permanent_address: c.permanentAddress,
      major_code: c.majorCode,
      major_name: c.majorName,
      course_year: c.courseYear,
      school_year: c.schoolYear,
      status: c.status === "enrolled" ? "admitted" : c.status,
    });
    setDetailCandidate(c);
    setFormErrors({});
    setApiError(null);
    setShowForm(true);
    void getAdminCandidate(c.id)
      .then((fresh) => setDetailCandidate(fresh))
      .catch(() => {
        setApiError("Không thể tải chi tiết hồ sơ mới nhất.");
      });
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteAdminCandidate(id);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setTotal((t) => t - 1);
      showToast("success", "Đã xóa hồ sơ thí sinh.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Xóa thất bại.";
      showToast("error", msg);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Bulk Import ────────────────────────────────────────────────────────────
  const openBulkModal = () => {
    setBulkFile(null);
    setBulkResult(null);
    setBulkError(null);
    setShowBulkModal(true);
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setBulkFile(f);
    setBulkResult(null);
    setBulkError(null);
  };

  const handleBulkSubmit = async () => {
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkError(null);
    setBulkResult(null);
    try {
      const result = await bulkEnrollCandidates(bulkFile);
      setBulkResult(result);
      if (result.summary.success > 0) {
        void load(1);
        showToast("success", `Import thành công ${result.summary.success} sinh viên.`);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Import thất bại. Vui lòng kiểm tra lại file.";
      setBulkError(msg);
    } finally {
      setBulkLoading(false);
    }
  };

  const detailInputCls = `${inputCls} disabled:cursor-default disabled:bg-[#f7faff] disabled:text-[#1f3152] disabled:opacity-100`;
  const detailStatus = detailCandidate?.status ?? "admitted";
  const isEnrolledDetail = detailStatus === "enrolled";
  const reservationConversionStatus = getReservationConversionStatus(detailCandidate);
  const enrolledStudent = detailCandidate?.student;
  const hasDetailValue = (value: string | number | null | undefined) =>
    value !== null && value !== undefined && String(value).trim() !== "";
  const normalizeDetailValue = (value: string | number | null | undefined) =>
    hasDetailValue(value) ? String(value).trim() : "";
  const displayPhone = hasDetailValue(form.phone) ? form.phone : enrolledStudent?.phone;
  const hasChangedDetailValue = (
    current: string | number | null | undefined,
    original: string | number | null | undefined,
  ) => hasDetailValue(current) && normalizeDetailValue(current) !== normalizeDetailValue(original);
  const genderLabel = (gender: "male" | "female" | null | undefined) =>
    gender === "male" ? "Nam" : gender === "female" ? "Nữ" : null;
  const relationshipLabel = (relationship: string | null | undefined) => {
    if (relationship === "father") return "Cha";
    if (relationship === "mother") return "Mẹ";
    if (relationship === "sibling") return "Anh/chị/em";
    if (relationship === "relative") return "Người thân";
    return relationship;
  };
  const detailField = (label: string, value: string | number | null | undefined, type = "text", fullWidth = false) =>
    hasDetailValue(value) ? (
      <FieldGroup label={label} className={fullWidth ? "sm:col-span-2 lg:col-span-3" : ""}>
        <input type={type} value={String(value)} readOnly className={detailInputCls} disabled />
      </FieldGroup>
    ) : null;
  const detailDateField = (label: string, value: string | null | undefined) =>
    hasDetailValue(value) ? detailField(label, formatDate(value as string)) : null;
  const detailChangedDateField = (label: string, current: string | null | undefined, original: string | null | undefined) =>
    hasChangedDetailValue(current, original) ? detailField(label, formatDate(current as string)) : null;
  const detailSection = (title: string | null, tone: "blue" | "emerald", children: React.ReactNode[]) => {
    const visibleChildren = children.filter(Boolean);
    if (visibleChildren.length === 0) return null;

    return (
      <div className={`space-y-3 rounded-2xl border p-4 ${
        tone === "emerald"
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-[#d6e2f1] bg-[#fbfdff]"
      }`}>
        {title && (
          <h3 className={`text-xs font-extrabold uppercase tracking-[0.14em] ${
            tone === "emerald" ? "text-emerald-700" : "text-[#244cb8]"
          }`}>
            {title}
          </h3>
        )}
        <div className="grid grid-cols-1 gap-x-7 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{visibleChildren}</div>
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
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className={`fixed right-4 top-20 z-[200] flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1a2d52]">Hồ sơ trúng tuyển</h1>
            <p className="mt-1 text-sm text-[#62789f]">
              Danh sách thí sinh trúng tuyển — {total} hồ sơ.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={() => void load(1)} disabled={loading} className={secondaryBtn}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Làm mới
            </button>
            <button type="button" onClick={openBulkModal} className={primaryBtn}>
              <FileSpreadsheet className="h-4 w-4" /> Import Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(["", "admitted", "enrolled", "cancelled"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatusFilter(s); }}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === s
                  ? "border-[#244cb8] bg-[#244cb8] text-white"
                  : "border-[#cfdcf0] bg-white text-[#62789f] hover:border-[#244cb8]"
              }`}
            >
              {s === "" ? "Tất cả" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {apiError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{apiError}</div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#244cb8]" /></div>
      ) : candidates.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-[#7c8fb5]">
          <GraduationCap className="mb-3 h-12 w-12 opacity-40" />
          <p className="text-sm">Không tìm thấy hồ sơ trúng tuyển.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[18px] border border-[#d6e2f1] bg-white p-4 shadow-[0_8px_20px_rgba(36,76,184,0.07)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-bold text-[#1a2d52]">{c.fullName}</p>
                    <CandidateStatusBadge status={c.status} />
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-[#62789f]">{c.admissionCode}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {c.status === "admitted" && (
                    <>
                      <button
                        type="button"
                        onClick={() => openDetail(c)}
                        className={iconBtn}
                        aria-label="Xem chi tiết"
                        title="Xem chi tiết"
                      >
                        <Eye className="h-5 w-5 stroke-[2.25]" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === c.id}
                        onClick={() => void handleDelete(c.id)}
                        className={deleteIconBtn}
                        aria-label="Xóa hồ sơ"
                        title="Xóa hồ sơ"
                      >
                        {deletingId === c.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                      </button>
                    </>
                  )}
                  {c.status === "enrolled" && (
                    <button
                      type="button"
                      onClick={() => openDetail(c)}
                      className={iconBtn}
                      aria-label="Xem chi tiết"
                      title="Xem chi tiết"
                    >
                      <Eye className="h-5 w-5 stroke-[2.25]" aria-hidden="true" />
                    </button>
                  )}
                  {c.status === "cancelled" && (
                    <>
                      <button
                        type="button"
                        onClick={() => openDetail(c)}
                        className={iconBtn}
                        aria-label="Xem chi tiết"
                        title="Xem chi tiết"
                      >
                        <Eye className="h-5 w-5 stroke-[2.25]" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === c.id}
                        onClick={() => void handleDelete(c.id)}
                        className={deleteIconBtn}
                        aria-label="Xóa hồ sơ"
                        title="Xóa hồ sơ"
                      >
                        {deletingId === c.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => void load(p)}
              className={`h-9 w-9 rounded-xl border text-sm font-semibold transition ${
                p === currentPage
                  ? "border-[#244cb8] bg-[#244cb8] text-white"
                  : "border-[#cfdcf0] bg-white text-[#62789f] hover:border-[#244cb8]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── Bulk Import Modal ── */}
      {createPortal(
        <AnimatePresence>
          {showBulkModal && (
          <motion.div
            key="bulk-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-3"
            onClick={() => { if (!bulkLoading) setShowBulkModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="flex max-h-[82dvh] w-[min(96vw,92rem)] flex-col overflow-hidden rounded-[24px] border border-[#c1d6f4] bg-white shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-[#eef3fb] px-5 py-3">
                <h2 className="text-lg font-bold text-[#1a2d52]">Import danh sách sinh viên</h2>
                <button type="button" disabled={bulkLoading} onClick={() => setShowBulkModal(false)} className="text-[#7c8fb5] hover:text-[#1a2d52]">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-gutter:stable] space-y-4">
                {/* File input */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#324B76]">Chọn file Excel</label>
                  <div
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#c1d6f4] bg-[#f7faff] py-6 text-sm text-[#62789f] transition hover:border-[#244cb8] hover:bg-[#eaf3ff]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6 text-[#244cb8]" />
                    {bulkFile ? (
                      <span className="font-semibold text-[#244cb8]">{bulkFile.name}</span>
                    ) : (
                      <span>Nhấn để chọn file <strong>.xlsx</strong> hoặc <strong>.xls</strong></span>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleBulkFileChange}
                  />
                </div>

                {/* Error */}
                {bulkError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {bulkError}
                  </div>
                )}

                {/* Result */}
                {bulkResult && (
                  <div className="space-y-3">
                    {/* Summary chips */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
                      <div className="rounded-xl border border-[#c1d6f4] bg-[#f0f6ff] py-2">
                        <p className="text-lg font-bold text-[#244cb8]">{bulkResult.summary.total}</p>
                        <p className="text-[#62789f]">Tổng</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 py-2">
                        <p className="text-lg font-bold text-emerald-700">{bulkResult.summary.success}</p>
                        <p className="text-emerald-600">Thành công</p>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50 py-2">
                        <p className="text-lg font-bold text-amber-700">{bulkResult.summary.skipped}</p>
                        <p className="text-amber-600">Bỏ qua</p>
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-rose-50 py-2">
                        <p className="text-lg font-bold text-rose-700">{bulkResult.summary.error}</p>
                        <p className="text-rose-600">Lỗi</p>
                      </div>
                    </div>

                    {/* Row details (only non-success) */}
                    {bulkResult.rows.filter((r) => r.status !== "success").length > 0 && (
                      <div className="rounded-xl border border-[#d6e2f1] overflow-hidden">
                        <div className="bg-[#f0f6ff] px-3 py-2 text-xs font-semibold text-[#324B76]">
                          Chi tiết dòng bỏ qua / lỗi
                        </div>
                        <div className="divide-y divide-[#eef3fb] max-h-48 overflow-y-auto">
                          {bulkResult.rows
                            .filter((r) => r.status !== "success")
                            .map((r) => (
                              <div key={r.row} className="flex items-start gap-2 px-3 py-2 text-xs">
                                <span className="shrink-0 font-mono text-[#7c8fb5]">Dòng {r.row}</span>
                                <span className={`shrink-0 rounded px-1.5 py-0.5 font-semibold ${
                                  r.status === "skipped"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-rose-100 text-rose-700"
                                }`}>
                                  {r.status === "skipped" ? "Bỏ qua" : "Lỗi"}
                                </span>
                                {r.student_code && (
                                  <span className="font-mono text-[#62789f]">{r.student_code}</span>
                                )}
                                <span className="text-[#1f3152]">{r.message}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex shrink-0 justify-end gap-2 border-t border-[#eef3fb] px-5 py-3">
                <button type="button" disabled={bulkLoading} onClick={() => setShowBulkModal(false)} className="rounded-xl border border-[#d6e2f1] bg-white px-4 py-1.5 text-sm font-semibold text-[#5d7299] hover:bg-[#f5f9ff]">
                  {bulkResult ? "Đóng" : "Hủy"}
                </button>
                {!bulkResult && (
                  <button
                    type="button"
                    disabled={!bulkFile || bulkLoading}
                    onClick={() => void handleBulkSubmit()}
                    className={`${primaryBtn} h-9`}
                  >
                    {bulkLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Upload className="h-4 w-4" /> Bắt đầu import
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ── Detail Modal ── */}
      {createPortal(
        <AnimatePresence>
          {showForm && (
          <motion.div
            key="form-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-3"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="flex max-h-[calc(100dvh-4rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] border border-[#c1d6f4] bg-white shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[#eef3fb] px-5 py-3">
                <h2 className="text-lg font-bold text-[#1a2d52]">{getDetailTitle(detailStatus)}</h2>
                <div className="flex items-center gap-3">
                  <CandidateStatusBadge
                    status={detailStatus}
                    label={detailStatus === "admitted" ? "Chưa nhập học" : undefined}
                  />
                  <button type="button" onClick={() => setShowForm(false)} className="text-[#7c8fb5] hover:text-[#1a2d52]">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-8 [scrollbar-gutter:stable]">
                {apiError && (
                  <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{apiError}</div>
                )}
                <div className="space-y-4">
                  {detailSection(isEnrolledDetail ? "Thông tin trúng tuyển" : null, "blue", [
                    detailField("Mã hồ sơ", form.admission_code),
                    detailField("Họ tên", form.full_name),
                    detailDateField("Ngày sinh", form.date_of_birth),
                    detailField("Giới tính", genderLabel(form.gender)),
                    detailField("Số điện thoại", displayPhone, "tel"),
                    detailField("Ngành", form.major_name),
                    detailField("Mã ngành", form.major_code),
                    detailField("Khóa", form.course_year),
                    detailField("Năm học", form.school_year),
                    detailField("Email cá nhân", form.email, "email", true),
                    detailField("CCCD", form.cccd),
                    detailField("Địa chỉ thường trú", form.permanent_address, "text", true),
                  ])}

                  {isEnrolledDetail && detailSection("Thông tin học tập sau nhập học", "emerald", [
                    detailField("MSSV", enrolledStudent?.studentCode),
                    detailField("Lớp", enrolledStudent?.className),
                    detailField("Khoa", enrolledStudent?.faculty),
                    detailField("Khóa", enrolledStudent?.courseYear),
                    detailField("Năm hiện tại", enrolledStudent?.currentYear),
                    hasChangedDetailValue(enrolledStudent?.schoolEmail, form.email)
                      ? detailField("Email trường", enrolledStudent?.schoolEmail, "email", true)
                      : null,
                    detailDateField("Ngày nhập học", detailCandidate?.enrolledAt),
                    detailField("Trạng thái chuyển đổi hồ sơ giữ chỗ", reservationConversionStatus),
                  ])}

                  {isEnrolledDetail && detailSection("Thông tin cá nhân sau nhập học", "emerald", [
                    hasChangedDetailValue(enrolledStudent?.fullName, form.full_name)
                      ? detailField("Họ tên hiện tại", enrolledStudent?.fullName)
                      : null,
                    detailChangedDateField("Ngày sinh hiện tại", enrolledStudent?.dateOfBirth, form.date_of_birth),
                    hasChangedDetailValue(enrolledStudent?.gender, form.gender)
                      ? detailField("Giới tính hiện tại", genderLabel(enrolledStudent?.gender))
                      : null,
                    hasChangedDetailValue(enrolledStudent?.cccd, form.cccd)
                      ? detailField("CCCD hiện tại", enrolledStudent?.cccd)
                      : null,
                    detailDateField("Ngày cấp CCCD", enrolledStudent?.cccdIssuedDate),
                    detailField("Nơi cấp CCCD", enrolledStudent?.cccdIssuedPlace),
                    detailField("Quốc tịch", enrolledStudent?.nationality),
                    detailField("Dân tộc", enrolledStudent?.ethnicity),
                    detailField("Tôn giáo", enrolledStudent?.religion),
                    hasChangedDetailValue(enrolledStudent?.permanentAddress, form.permanent_address)
                      ? detailField("Địa chỉ thường trú hiện tại", enrolledStudent?.permanentAddress, "text", true)
                      : null,
                  ])}

                  {isEnrolledDetail && detailSection("Thông tin cha", "emerald", [
                    detailField("Họ tên", enrolledStudent?.fatherName),
                    detailField("Năm sinh", enrolledStudent?.fatherBirthYear),
                    detailField("Nghề nghiệp", enrolledStudent?.fatherJob),
                    detailField("SĐT", enrolledStudent?.fatherPhone, "tel"),
                  ])}

                  {isEnrolledDetail && detailSection("Thông tin mẹ", "emerald", [
                    detailField("Họ tên", enrolledStudent?.motherName),
                    detailField("Năm sinh", enrolledStudent?.motherBirthYear),
                    detailField("Nghề nghiệp", enrolledStudent?.motherJob),
                    detailField("SĐT", enrolledStudent?.motherPhone, "tel"),
                  ])}

                  {isEnrolledDetail && detailSection("Liên hệ gia đình và khẩn cấp", "emerald", [
                    detailField("Địa chỉ cha/mẹ", enrolledStudent?.parentAddress, "text", true),
                    detailField("Người liên hệ khẩn cấp", enrolledStudent?.emergencyContactName),
                    detailField("Quan hệ", relationshipLabel(enrolledStudent?.emergencyContactRelationship)),
                    detailField("SĐT liên hệ khẩn cấp", enrolledStudent?.emergencyContactPhone, "tel"),
                  ])}
                </div>
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-[#eef3fb] px-5 py-3">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-[#d6e2f1] bg-white px-4 py-1.5 text-sm font-semibold text-[#5d7299] hover:bg-[#f5f9ff]">Đóng</button>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body,
      )}

    </motion.section>
  );
}
