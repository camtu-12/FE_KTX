import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Loader2,
  LockOpen,
  Plus,
  RefreshCw,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  closeOccupancyPeriod,
  createOccupancyPeriod,
  deleteOccupancyPeriod,
  getOccupancyPeriods,
  getOccupancyPeriodSuggestion,
  openOccupancyPeriod,
  updateOccupancyPeriod,
  type OccupancyPeriod,
  type OccupancyPeriodPayload,
  type OccupancyPeriodSuggestion,
} from "../../../api/occupancyPeriodApi";
import { formatDate } from "../../../utils/dateFormat";

type StatusLabel = Record<OccupancyPeriod["status"], string>;
type StatusClass = Record<OccupancyPeriod["status"], string>;

const STATUS_LABELS: StatusLabel = {
  draft: "Bản nháp",
  open: "Đang mở",
  closed: "Đã đóng",
};

const STATUS_DOT: StatusClass = {
  draft: "bg-slate-400",
  open: "bg-emerald-500",
  closed: "bg-rose-500",
};

const STATUS_BADGE: StatusClass = {
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  open: "border-emerald-200 bg-emerald-50 text-emerald-700",
  closed: "border-rose-200 bg-rose-50 text-rose-700",
};

type FormState = {
  name: string;
  start_date: string;
  end_date: string;
  extension_until_date: string;
  description: string;
};

const emptyForm: FormState = {
  name: "",
  start_date: "",
  end_date: "",
  extension_until_date: "",
  description: "",
};

type FormError = Partial<Record<keyof FormState, string>>;

function validateForm(form: FormState): FormError {
  const errors: FormError = {};
  if (!form.name.trim()) errors.name = "Vui lòng nhập tên đợt.";
  if (!form.start_date) errors.start_date = "Vui lòng chọn ngày bắt đầu nhận đơn.";
  if (!form.end_date) errors.end_date = "Vui lòng chọn ngày kết thúc nhận đơn.";
  if (form.start_date && form.end_date && form.end_date < form.start_date)
    errors.end_date = "Ngày kết thúc phải sau ngày bắt đầu.";
  if (form.extension_until_date && form.end_date && form.extension_until_date < form.end_date)
    errors.extension_until_date = "Ngày gia hạn đến phải sau ngày kết thúc nhận đơn.";
  return errors;
}

// Lệch bao nhiêu ngày so với gợi ý thì cảnh báo trước khi cho mở đợt (không chặn cứng).
const OPEN_DATE_WARNING_THRESHOLD_DAYS = 10;

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

export default function AdminOccupancyPeriodsPage() {
  const [periods, setPeriods] = useState<OccupancyPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormError>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<OccupancyPeriodSuggestion | null>(null);
  const [openWarning, setOpenWarning] = useState<{ period: OccupancyPeriod; diffDays: number } | null>(null);

  const hasActiveOrDraft = periods.some((p) => p.status === "open" || p.status === "draft");
  const blockCreateReason = hasActiveOrDraft
    ? `Đợt "${periods.find((p) => p.status === "open" || p.status === "draft")?.name}" chưa đóng. Đóng đợt đó trước khi tạo mới.`
    : null;

  const load = async () => {
    setLoading(true);
    try {
      const data = await getOccupancyPeriods();
      setPeriods(data);
    } catch {
      setApiError("Không thể tải danh sách đợt gia hạn.");
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestion = async () => {
    try {
      const data = await getOccupancyPeriodSuggestion();
      setSuggestion(data);
    } catch {
      setSuggestion(null);
    }
  };

  useEffect(() => {
    void load();
    void loadSuggestion();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, extension_until_date: suggestion?.extension_until_date ?? "" });
    setFormErrors({});
    setApiError(null);
    setShowForm(true);
    void loadSuggestion();
  };

  const openEdit = (period: OccupancyPeriod) => {
    setEditingId(period.id);
    setForm({
      name: period.name,
      start_date: period.start_date ?? "",
      end_date: period.end_date ?? "",
      extension_until_date: period.extension_until_date ?? "",
      description: period.description ?? "",
    });
    setFormErrors({});
    setApiError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setSaving(true);
    setApiError(null);
    try {
      const payload: OccupancyPeriodPayload = {
        name: form.name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        extension_until_date: form.extension_until_date || null,
        description: form.description.trim() || null,
      };
      if (editingId !== null) {
        const updated = await updateOccupancyPeriod(editingId, payload);
        setPeriods((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await createOccupancyPeriod(payload);
        setPeriods((prev) => [created, ...prev]);
      }
      closeForm();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      if (data?.errors) {
        const mapped: FormError = {};
        for (const [key, msgs] of Object.entries(data.errors)) {
          mapped[key as keyof FormState] = Array.isArray(msgs) ? msgs[0] : String(msgs);
        }
        setFormErrors((prev) => ({ ...prev, ...mapped }));
      } else {
        setApiError(data?.message ?? "Lưu không thành công.");
      }
    } finally {
      setSaving(false);
    }
  };

  const requestOpen = (period: OccupancyPeriod) => {
    if (period.suggested_open_date) {
      const today = new Date().toISOString().slice(0, 10);
      const diffDays = daysBetween(period.suggested_open_date, today);
      if (Math.abs(diffDays) > OPEN_DATE_WARNING_THRESHOLD_DAYS) {
        setOpenWarning({ period, diffDays });
        return;
      }
    }
    void handleOpen(period.id);
  };

  const handleOpen = async (id: number) => {
    setOpenWarning(null);
    setActionId(id);
    setApiError(null);
    try {
      const updated = await openOccupancyPeriod(id);
      setPeriods((prev) => prev.map((p) => (p.id === id ? updated : p.status === "open" ? { ...p, status: "open" } : p)));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg ?? "Không thể mở đợt.");
    } finally {
      setActionId(null);
    }
  };

  const handleClose = async (id: number) => {
    setActionId(id);
    setApiError(null);
    try {
      const updated = await closeOccupancyPeriod(id);
      setPeriods((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg ?? "Không thể đóng đợt.");
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setActionId(id);
    setApiError(null);
    setConfirmDelete(null);
    try {
      await deleteOccupancyPeriod(id);
      setPeriods((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg ?? "Không thể xóa đợt.");
    } finally {
      setActionId(null);
    }
  };

  const field = (
    key: keyof FormState,
    label: string,
    type: "text" | "date" | "textarea" = "text",
  ) => (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[#324B76]">{label}</label>
      {type === "textarea" ? (
        <textarea
          value={form[key]}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, [key]: e.target.value }));
            setFormErrors((prev) => ({ ...prev, [key]: undefined }));
          }}
          rows={3}
          className="w-full rounded-xl border border-[#cfdcf0] bg-[#f7faff] px-3 py-1.5 text-sm text-[#1f3152] focus:border-[#244cb8] focus:outline-none resize-none"
        />
      ) : (
        <input
          type={type}
          lang={type === "date" ? "vi" : undefined}
          value={form[key]}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, [key]: e.target.value }));
            setFormErrors((prev) => ({ ...prev, [key]: undefined }));
          }}
          className="w-full rounded-xl border border-[#cfdcf0] bg-[#f7faff] px-3 py-1.5 text-sm text-[#1f3152] focus:border-[#244cb8] focus:outline-none"
        />
      )}
      {formErrors[key] && <p className="mt-1 text-xs text-rose-600">{formErrors[key]}</p>}
    </div>
  );

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
              Quản lý đợt gia hạn lưu trú
            </h1>
            <p className="mt-1 text-[13px] leading-6 text-[#62789f] sm:text-sm">
              Tạo và quản lý các đợt nhận yêu cầu gia hạn lưu trú của sinh viên.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#fff_0%,#f5f9ff_100%)] px-4 py-2.5 text-sm font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.09)] transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Làm mới
            </button>
            <button
              type="button"
              disabled={!!blockCreateReason}
              title={blockCreateReason ?? undefined}
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.22)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:brightness-100"
            >
              <Plus className="h-4 w-4" />
              Tạo đợt mới
            </button>
          </div>
        </div>
      </div>

      {apiError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between gap-3">
          <span>{apiError}</span>
          <button type="button" onClick={() => setApiError(null)} className="shrink-0 text-rose-400 hover:text-rose-700">
            <X className="h-4 w-4" />
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
          <CalendarRange className="mb-3 h-12 w-12 opacity-40" />
          <p className="text-sm">Chưa có đợt gia hạn nào. Tạo đợt đầu tiên!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {periods.map((period, index) => (
            <motion.div
              key={period.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
              className="rounded-[20px] border border-[#d6e2f1] bg-white p-4 shadow-[0_12px_28px_rgba(36,76,184,0.09)] sm:p-5"
            >
              {/* Title + status */}
              <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
                <h2 className="text-[20px] font-bold leading-tight text-[#1a2d52]">{period.name}</h2>
                <span
                  className={`inline-flex min-h-9 w-fit items-center gap-2 rounded-xl border px-3.5 text-sm font-bold ${STATUS_BADGE[period.status]}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[period.status]}`} />
                  {STATUS_LABELS[period.status]}
                </span>
              </div>

              {/* Info tiles */}
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <InfoTile icon={CalendarRange} label="Thời gian nhận đơn">
                  {formatDate(period.start_date)} — {formatDate(period.end_date)}
                </InfoTile>
                <InfoTile icon={CalendarDays} label="Gia hạn lưu trú đến">
                  {period.extension_until_date ? formatDate(period.extension_until_date) : "Chưa thiết lập"}
                </InfoTile>
                <InfoTile icon={CheckCircle2} label="Yêu cầu đã nhận">
                  {period.extensions_count ?? 0} yêu cầu
                </InfoTile>
              </div>

              {period.status === "draft" && period.suggested_open_date && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm text-sky-800">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                  <span>
                    Gợi ý: nên mở đợt này từ <strong>{formatDate(period.suggested_open_date)}</strong> (đầu tháng
                    cuối cùng trước khi kỳ lưu trú kết thúc {formatDate(period.end_date)}). Đây chỉ là gợi ý, bạn
                    vẫn có thể mở đợt vào ngày khác.
                  </span>
                </div>
              )}

              {period.status === "draft" && !period.extension_until_date && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span>
                    Bản nháp tự động — cần điền <strong>Gia hạn lưu trú đến</strong> trước khi mở đợt.
                    Bấm <strong>Sửa</strong> để cập nhật.
                  </span>
                </div>
              )}

              {period.description && (
                <p className="mt-3 text-sm text-[#62789f]">{period.description}</p>
              )}

              {/* Actions */}
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 border-t border-[#eef3fb] pt-3.5">
                {period.status === "open" && (
                  <Link
                    to="/admin/extensions"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#c8d8ef] bg-white px-4 text-sm font-semibold text-[#244cb8] shadow-sm transition hover:-translate-y-0.5"
                  >
                    Xem yêu cầu
                  </Link>
                )}

                {period.status === "draft" && (
                  <button
                    type="button"
                    disabled={actionId === period.id || !period.extension_until_date}
                    title={!period.extension_until_date ? 'Cần điền "Gia hạn lưu trú đến" trước khi mở đợt' : undefined}
                    onClick={() => requestOpen(period)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(16,185,129,0.20)] transition hover:-translate-y-0.5 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {actionId === period.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockOpen className="h-4 w-4" />}
                    Mở đợt
                  </button>
                )}

                {period.status === "open" && (
                  <button
                    type="button"
                    disabled={actionId === period.id}
                    onClick={() => void handleClose(period.id)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:opacity-50"
                  >
                    {actionId === period.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Đóng đợt
                  </button>
                )}

                {period.status !== "open" && (
                  <button
                    type="button"
                    onClick={() => openEdit(period)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 text-sm font-semibold text-[#244cb8] shadow-sm transition hover:-translate-y-0.5"
                  >
                    Sửa
                  </button>
                )}

                {(period.status === "draft" || period.status === "closed") && (
                  <button
                    type="button"
                    disabled={actionId === period.id}
                    onClick={() => setConfirmDelete(period.id)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:opacity-50"
                  >
                    {actionId === period.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Xóa
                  </button>
                )}
              </div>
            </motion.div>
          ))}
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
                    {editingId !== null ? "Sửa đợt gia hạn" : "Tạo đợt gia hạn mới"}
                  </h2>
                  <button type="button" onClick={closeForm} className="text-[#7c8fb5] hover:text-[#1a2d52]">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-gutter:stable]">
                  {apiError && (
                    <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {apiError}
                    </div>
                  )}
                  <div className="space-y-3">
                    {editingId === null && suggestion?.suggested_open_date && (
                      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm text-sky-800">
                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                        <span>
                          Gợi ý: nên bắt đầu nhận đơn từ <strong>{formatDate(suggestion.suggested_open_date)}</strong> —
                          đầu tháng cuối cùng trước khi {suggestion.students_count} sinh viên hết hạn lưu trú đúng{" "}
                          <strong>{formatDate(suggestion.target_check_out_date)}</strong>. Chỉ là gợi ý, bạn vẫn có
                          thể chọn ngày khác.
                        </span>
                      </div>
                    )}
                    {field("name", "Tên đợt gia hạn")}
                    <div className="grid grid-cols-2 gap-3">
                      {field("start_date", "Ngày bắt đầu nhận đơn", "date")}
                      {field("end_date", "Ngày kết thúc nhận đơn", "date")}
                    </div>
                    {field("extension_until_date", "Gia hạn lưu trú đến (tuỳ chọn)", "date")}
                    {field("description", "Mô tả (tuỳ chọn)", "textarea")}
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

        {confirmDelete !== null && (
          <motion.div
            key="confirm-delete-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-md rounded-[24px] border border-rose-200 bg-white p-6 shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                <div>
                  <h2 className="text-[18px] font-bold text-[#1a2d52]">Xóa đợt gia hạn?</h2>
                  <p className="mt-2 text-sm text-[#5d7299]">
                    Đợt này sẽ bị xóa vĩnh viễn. Hành động không thể hoàn tác.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="rounded-xl border border-[#d6e2f1] bg-white px-4 py-2 text-sm font-semibold text-[#5d7299] transition hover:bg-[#f5f9ff]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={actionId === confirmDelete}
                  onClick={() => void handleDelete(confirmDelete)}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(220,38,38,0.22)] transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionId === confirmDelete && <Loader2 className="h-4 w-4 animate-spin" />}
                  Xóa
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {openWarning && (
          <motion.div
            key="open-warning-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setOpenWarning(null)}
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
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <h2 className="text-[18px] font-bold text-[#1a2d52]">Mốc mở đợt lệch nhiều so với gợi ý</h2>
                  <p className="mt-2 text-sm text-[#5d7299]">
                    Gợi ý nên mở đợt này từ{" "}
                    <strong>{formatDate(openWarning.period.suggested_open_date)}</strong> nhưng hôm nay{" "}
                    {openWarning.diffDays > 0 ? "đã trễ hơn" : "còn sớm hơn"}{" "}
                    <strong>{Math.abs(openWarning.diffDays)} ngày</strong> so với mốc đó. Bạn vẫn có thể tiếp tục mở
                    đợt nếu chắc chắn.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpenWarning(null)}
                  className="rounded-xl border border-[#d6e2f1] bg-white px-4 py-2 text-sm font-semibold text-[#5d7299] transition hover:bg-[#f5f9ff]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={actionId === openWarning.period.id}
                  onClick={() => void handleOpen(openWarning.period.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(16,185,129,0.22)] transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  {actionId === openWarning.period.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  Vẫn mở đợt
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function InfoTile({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#dce7f6] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-3 shadow-[0_6px_14px_rgba(36,76,184,0.05)]">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#cbdcf2] bg-[#eef6ff] text-[#244cb8]">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-xs font-semibold text-[#5d7299]">{label}</p>
      </div>
      <div className="text-sm font-semibold text-[#1f3152]">{children}</div>
    </div>
  );
}
