import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import {
  bulkEnrollCandidates,
  deleteAdminCandidate,
  enrollCandidate,
  getAdminCandidates,
  type AdmissionCandidate,
  type BulkEnrollResult,
  type CandidatePayload,
  type CandidateStatus,
  type EnrollPayload,
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
  cancelled: "Đã huỷ",
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

const emptyEnroll: EnrollPayload = {
  student_code: "",
  class_name: "",
  email: null,
  phone: null,
  faculty: null,
  course_year: null,
  current_year: 1,
  cccd_issued_date: null,
  cccd_issued_place: null,
  nationality: null,
  ethnicity: null,
  religion: null,
  permanent_address: null,
};

function FieldGroup({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[#324B76]">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
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
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // enroll modal
  const [enrollTarget, setEnrollTarget] = useState<AdmissionCandidate | null>(null);
  const [enrollForm, setEnrollForm] = useState<EnrollPayload>(emptyEnroll);
  const [enrollErrors, setEnrollErrors] = useState<FormErrors>({});
  const [enrollLoading, setEnrollLoading] = useState(false);

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
    setFormErrors({});
    setApiError(null);
    setShowForm(true);
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

  // ── Enroll ─────────────────────────────────────────────────────────────────
  const handleEnroll = async () => {
    const errs: FormErrors = {};
    if (!enrollForm.student_code.trim()) errs.student_code = "Bắt buộc.";
    if (!enrollForm.class_name.trim()) errs.class_name = "Bắt buộc.";
    if (Object.keys(errs).length) { setEnrollErrors(errs); return; }

    setEnrollLoading(true);
    try {
      const res = await enrollCandidate(enrollTarget!.id, enrollForm);
      setCandidates((prev) => prev.map((c) => (c.id === enrollTarget!.id ? res.candidate : c)));
      showToast("success", `Đã tạo sinh viên ${res.student.student_code}. Sinh viên chưa có tài khoản.`);
      setEnrollTarget(null);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      const fe = data?.errors;
      if (fe) {
        const mapped: FormErrors = {};
        for (const [k, v] of Object.entries(fe)) mapped[k] = Array.isArray(v) ? v[0] : String(v);
        setEnrollErrors(mapped);
      } else {
        setEnrollErrors({ student_code: data?.message ?? "Không thể tạo sinh viên." });
      }
    } finally {
      setEnrollLoading(false);
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

  const ef = (key: keyof EnrollPayload, label: string, type = "text") => (
    <FieldGroup label={label} error={enrollErrors[key]}>
      <input
        type={type}
        value={(enrollForm[key] as string) ?? ""}
        onChange={(e) => setEnrollForm((prev) => ({ ...prev, [key]: e.target.value || null }))}
        className={inputCls}
      />
    </FieldGroup>
  );

  const detailInputCls = `${inputCls} disabled:cursor-default disabled:bg-[#f7faff] disabled:text-[#1f3152] disabled:opacity-100`;

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
          {(["", "admitted", "enrolled"] as const).map((s) => (
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
                  <p className="text-base font-bold text-[#1a2d52]">{c.fullName}</p>
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
              className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-[#c1d6f4] bg-white shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
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
              className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-[#c1d6f4] bg-white shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[#eef3fb] px-5 py-3">
                <h2 className="text-lg font-bold text-[#1a2d52]">Chi tiết hồ sơ trúng tuyển</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-[#7c8fb5] hover:text-[#1a2d52]">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-gutter:stable]">
                {apiError && (
                  <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{apiError}</div>
                )}
                <div className="space-y-3">
                  <FieldGroup label="Mã hồ sơ trúng tuyển *" error={formErrors.admission_code}>
                    <input type="text" value={form.admission_code} onChange={(e) => setForm((p) => ({ ...p, admission_code: e.target.value }))} className={detailInputCls} placeholder="01_TT_XTS_GBTT_00319" disabled />
                  </FieldGroup>
                  <FieldGroup label="Họ và tên *" error={formErrors.full_name}>
                    <input type="text" value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} className={detailInputCls} disabled />
                  </FieldGroup>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Ngày sinh *" error={formErrors.date_of_birth}>
                      <input type="text" value={formatDate(form.date_of_birth)} readOnly className={detailInputCls} disabled />
                    </FieldGroup>
                    <FieldGroup label="Giới tính" error={formErrors.gender}>
                      <div className="relative">
                        <select value={form.gender ?? ""} onChange={(e) => setForm((p) => ({ ...p, gender: (e.target.value as "male" | "female") || null }))} className={`${detailInputCls} appearance-none pr-7`} disabled>
                          <option value="">Chưa chọn</option>
                          <option value="male">Nam</option>
                          <option value="female">Nữ</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7c8fb5]" />
                      </div>
                    </FieldGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="CCCD" error={formErrors.cccd}>
                      <input type="text" value={form.cccd ?? ""} onChange={(e) => setForm((p) => ({ ...p, cccd: e.target.value || null }))} className={detailInputCls} disabled />
                    </FieldGroup>
                    <FieldGroup label="SĐT" error={formErrors.phone}>
                      <input type="tel" value={form.phone ?? ""} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value || null }))} className={detailInputCls} disabled />
                    </FieldGroup>
                  </div>
                  <FieldGroup label="Email" error={formErrors.email}>
                    <input type="email" value={form.email ?? ""} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value || null }))} className={detailInputCls} disabled />
                  </FieldGroup>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Ngành học">
                      <input type="text" value={form.major_name ?? ""} onChange={(e) => setForm((p) => ({ ...p, major_name: e.target.value || null }))} className={detailInputCls} placeholder="Tên ngành" disabled />
                    </FieldGroup>
                    <FieldGroup label="Mã ngành">
                      <input type="text" value={form.major_code ?? ""} onChange={(e) => setForm((p) => ({ ...p, major_code: e.target.value || null }))} className={detailInputCls} disabled />
                    </FieldGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Khoá (vd: 2026-2030)">
                      <input type="text" value={form.course_year ?? ""} onChange={(e) => setForm((p) => ({ ...p, course_year: e.target.value || null }))} className={detailInputCls} disabled />
                    </FieldGroup>
                    <FieldGroup label="Năm học (vd: 2026-2027)">
                      <input type="text" value={form.school_year ?? ""} onChange={(e) => setForm((p) => ({ ...p, school_year: e.target.value || null }))} className={detailInputCls} disabled />
                    </FieldGroup>
                  </div>
                  <FieldGroup label="Địa chỉ thường trú">
                    <input type="text" value={form.permanent_address ?? ""} onChange={(e) => setForm((p) => ({ ...p, permanent_address: e.target.value || null }))} className={detailInputCls} disabled />
                  </FieldGroup>
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

      {/* ── Enroll Modal ── */}
      <AnimatePresence>
        {enrollTarget && (
          <motion.div
            key="enroll-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-3"
            onClick={() => setEnrollTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-[#c1d6f4] bg-white shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[#eef3fb] px-5 py-3">
                <h2 className="text-lg font-bold text-[#1a2d52]">Xác nhận nhập học — Tạo sinh viên</h2>
                <button type="button" onClick={() => setEnrollTarget(null)} className="text-[#7c8fb5] hover:text-[#1a2d52]"><X className="h-5 w-5" /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-gutter:stable]">
                {/* Candidate summary */}
                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm">
                  <p className="font-semibold text-[#1a2d52]">{enrollTarget.fullName}</p>
                  <p className="text-xs text-[#62789f]">{enrollTarget.admissionCode} · Ngày sinh: {formatDate(enrollTarget.dateOfBirth)}</p>
                </div>

                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                  <strong>Lưu ý:</strong> Sau khi tạo sinh viên, tài khoản sẽ KHÔNG được tạo tự động. Sinh viên cần tự đăng ký tài khoản tại <strong>/register</strong> bằng MSSV.
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="MSSV *" error={enrollErrors.student_code}>
                      <input type="text" value={enrollForm.student_code} onChange={(e) => setEnrollForm((p) => ({ ...p, student_code: e.target.value }))} className={inputCls} placeholder="DH52201001" />
                      {enrollTarget?.expectedStudentCode && enrollForm.student_code === enrollTarget.expectedStudentCode && (
                        <p className="mt-1 text-xs text-blue-600">Tự động điền từ hồ sơ tuyển sinh.</p>
                      )}
                    </FieldGroup>
                    <FieldGroup label="Lớp *" error={enrollErrors.class_name}>
                      <input type="text" value={enrollForm.class_name} onChange={(e) => setEnrollForm((p) => ({ ...p, class_name: e.target.value }))} className={inputCls} placeholder="DH52201" />
                    </FieldGroup>
                  </div>
                  {ef("faculty", "Khoa / Ngành")}
                  <div className="grid grid-cols-2 gap-3">
                    {ef("course_year", "Khoá (vd: 2026-2030)")}
                    <FieldGroup label="Năm hiện tại">
                      <input type="number" min={1} max={10} value={enrollForm.current_year ?? 1} onChange={(e) => setEnrollForm((p) => ({ ...p, current_year: Number(e.target.value) }))} className={inputCls} />
                    </FieldGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {ef("email", "Email", "email")}
                    {ef("phone", "SĐT", "tel")}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {ef("cccd_issued_date", "Ngày cấp CCCD", "date")}
                    {ef("cccd_issued_place", "Nơi cấp CCCD")}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {ef("nationality", "Quốc tịch")}
                    {ef("ethnicity", "Dân tộc")}
                  </div>
                  {ef("religion", "Tôn giáo")}
                  {ef("permanent_address", "Địa chỉ thường trú")}
                </div>
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-[#eef3fb] px-5 py-3">
                <button type="button" onClick={() => setEnrollTarget(null)} className="rounded-xl border border-[#d6e2f1] bg-white px-4 py-1.5 text-sm font-semibold text-[#5d7299] hover:bg-[#f5f9ff]">Hủy</button>
                <button type="button" disabled={enrollLoading} onClick={() => void handleEnroll()} className={`${primaryBtn} h-9`}>
                  {enrollLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <UserCheck className="h-4 w-4" /> Tạo sinh viên
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
