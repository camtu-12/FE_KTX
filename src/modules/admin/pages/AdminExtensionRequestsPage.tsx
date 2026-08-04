import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import {
  approveExtension,
  exportApprovedExtensionsExcel,
  exportApprovedExtensionsPdf,
  getAdminExtensions,
  getExtensionStats,
  rejectExtension,
  type ExtensionStats,
  type ExtensionStatus,
  type OccupancyExtension,
} from "../../../api/extensionApi";
import {
  listViolationsByStudentId,
  type ViolationRecord,
} from "../../../api/violationApi";
import {
  getOccupancyPeriods,
  type OccupancyPeriod,
} from "../../../api/occupancyPeriodApi";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import { formatDate } from "../../../utils/dateFormat";
import ExportPdfButton from "../../../components/ExportPdfButton";
import ExportExcelButton from "../../../components/ExportExcelButton";

type StatusTab = "pending" | "done";
type DoneFilter = "all" | "approved" | "rejected";
type ToastState = { type: "success" | "error"; message: string };

const STATUS_LABELS: Record<ExtensionStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

const STATUS_COLORS: Record<ExtensionStatus, string> = {
  pending: "border border-amber-200 bg-amber-50 text-amber-700",
  approved: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border border-rose-200 bg-rose-50 text-rose-700",
};

export default function AdminExtensionRequestsPage() {
  const { headerSearchValue: searchQuery } = useOutletContext<AdminLayoutOutletContext>();

  const [extensions, setExtensions] = useState<OccupancyExtension[]>([]);
  const [stats, setStats] = useState<ExtensionStats | null>(null);
  const [periods, setPeriods] = useState<OccupancyPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusTab>("pending");
  const [doneFilter, setDoneFilter] = useState<DoneFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<number | "ALL">("ALL");
  const [selected, setSelected] = useState<OccupancyExtension | null>(null);
  const [activities, setActivities] = useState<ViolationRecord[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [rejectDialog, setRejectDialog] = useState<OccupancyExtension | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ext, st, per] = await Promise.all([
        getAdminExtensions(),
        getExtensionStats(),
        getOccupancyPeriods(),
      ]);
      setExtensions(ext);
      setStats(st);
      setPeriods(per);
    } catch {
      showToast("error", "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    let list = extensions;
    if (periodFilter !== "ALL") list = list.filter((e) => e.occupancy_period_id === periodFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => {
        const s = e.student;
        return (
          s?.full_name?.toLowerCase().includes(q) ||
          s?.student_code?.toLowerCase().includes(q) ||
          s?.email?.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [extensions, periodFilter, searchQuery]);

  const pendingItems = useMemo(() => filtered.filter((e) => e.status === "pending"), [filtered]);
  const doneItems = useMemo(() => filtered.filter((e) => e.status !== "pending"), [filtered]);
  const filteredDoneItems = useMemo(
    () => doneFilter === "all" ? doneItems : doneItems.filter((e) => e.status === doneFilter),
    [doneItems, doneFilter],
  );

  const openDetail = (ext: OccupancyExtension) => {
    setSelected(ext);
    setAdminNote(ext.admin_note ?? "");
    setActivities([]);
    setActivitiesLoading(true);
    listViolationsByStudentId(ext.student_id)
      .then(setActivities)
      .catch(() => setActivities([]))
      .finally(() => setActivitiesLoading(false));
  };
  const closeDetail = () => { setSelected(null); setAdminNote(""); setActivities([]); };

  const handleApprove = async (ext: OccupancyExtension, note?: string) => {
    setSaving(true);
    try {
      const updated = await approveExtension(ext.id, { admin_note: note || undefined });
      setExtensions((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      if (selected?.id === ext.id) setSelected(updated);
      showToast("success", "Đã duyệt yêu cầu gia hạn.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast("error", msg ?? "Duyệt thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    if (!rejectNote.trim()) {
      showToast("error", "Vui lòng nhập lý do từ chối.");
      return;
    }
    setSaving(true);
    try {
      const updated = await rejectExtension(rejectDialog.id, { admin_note: rejectNote });
      setExtensions((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      if (selected?.id === rejectDialog.id) setSelected(updated);
      setRejectDialog(null);
      setRejectNote("");
      showToast("success", "Đã từ chối yêu cầu gia hạn.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast("error", msg ?? "Từ chối thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const renderCard = (ext: OccupancyExtension) => (
    <div
      key={ext.id}
      className="flex min-h-[96px] flex-wrap items-center gap-4 rounded-2xl border border-[#d6e2f1] bg-white px-5 py-4 shadow-[0_8px_18px_rgba(36,76,184,0.07)]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[18px] font-semibold leading-tight text-[#1f3152]">
            {ext.student?.full_name ?? "—"}
          </span>
          {ext.occupancy_period?.name && (
            <span className="inline-flex rounded-full border border-[#c8d8ef] bg-[#f2f7ff] px-3 py-1.5 text-xs font-bold text-[#244cb8]">
              {ext.occupancy_period.name}
            </span>
          )}
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${STATUS_COLORS[ext.status]}`}>
            {STATUS_LABELS[ext.status]}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-[#6b7f9f]">
          <span>MSSV: {ext.student?.student_code ?? "—"}</span>
          {ext.occupancy?.room?.room_number && (
            <span>
              Phòng: {ext.occupancy.room.building_code ?? ""}
              {ext.occupancy.room.room_number} / #{ext.occupancy.bed?.bed_number ?? "?"}
            </span>
          )}
          <span>Gửi: {formatDate(ext.requested_at)}</span>
          {ext.approved_at && (
            <span className="text-emerald-600">Duyệt: {formatDate(ext.approved_at)}</span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={() => openDetail(ext)}
          className="inline-flex h-10 min-w-[100px] items-center justify-center rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 text-[13px] font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.09)] transition hover:-translate-y-0.5 hover:border-[#9eb9e6] hover:bg-white"
        >
          Xem đơn
        </button>
        {ext.status === "pending" && (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleApprove(ext)}
              className="rounded-xl bg-[linear-gradient(135deg,#1f9a60_0%,#35bf7a_100%)] px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_6px_14px_rgba(31,154,96,0.22)] transition hover:brightness-110 disabled:opacity-40"
            >
              Duyệt
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => { setRejectDialog(ext); setRejectNote(""); }}
              className="rounded-xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_6px_14px_rgba(204,60,79,0.20)] transition hover:brightness-105 disabled:opacity-40"
            >
              Từ chối
            </button>
          </>
        )}
      </div>
    </div>
  );

  const renderEmpty = (message: string) => (
    <div className="rounded-2xl border border-dashed border-[#cbdcf2] bg-white/55 px-5 py-10 text-center text-sm font-medium text-[#7c8fb5]">
      {message}
    </div>
  );

  const doneFilterOptions: Array<{ value: DoneFilter; label: string }> = [
    { value: "all", label: "Tất cả" },
    { value: "approved", label: "Đã duyệt" },
    { value: "rejected", label: "Đã từ chối" },
  ];

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        {/* Toast */}
        {createPortal(
          <AnimatePresence>
            {toast && (
              <div className="fixed inset-0 z-90 flex items-center justify-center bg-[rgba(14,25,48,0.35)] px-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`flex items-center gap-3 rounded-[20px] border bg-white px-6 py-4 text-sm font-semibold shadow-[0_24px_60px_rgba(15,23,42,0.25)] ${
                    toast.type === "success" ? "border-emerald-200 text-emerald-700" : "border-rose-200 text-rose-700"
                  }`}
                >
                  {toast.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
                  {toast.message}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

        {/* Header */}
        <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">
                Quản lý yêu cầu gia hạn lưu trú
              </h1>
              {stats?.active_extension_period && (
                <p className="mt-1.5 text-xs font-medium text-[#315b9e]">
                  Đợt đang mở:{" "}
                  <span className="font-bold">{stats.active_extension_period.name}</span>
                  {stats.active_extension_period.end_date && (
                    <> · Hết hạn: {formatDate(stats.active_extension_period.end_date)}</>
                  )}
                  {stats.active_extension_period.extension_until_date && (
                    <span className="text-emerald-600">
                      {" "}· Gia hạn đến: {formatDate(stats.active_extension_period.extension_until_date)}
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex w-full justify-end xl:w-[300px]">
              <select
                value={periodFilter === "ALL" ? "ALL" : String(periodFilter)}
                onChange={(e) =>
                  setPeriodFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
                }
                className="h-11 w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-3 text-sm font-semibold text-[#1f3152] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
              >
                <option value="ALL">Tất cả đợt gia hạn</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Status tabs */}
        <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-[#c6d8f0] bg-[#f2f7ff] p-1">
          {([
            { key: "pending" as StatusTab, label: "Chờ duyệt", count: pendingItems.length },
            { key: "done" as StatusTab, label: "Đã xử lý", count: doneItems.length },
          ] as const).map((t) => (
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
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-[#cbdcf2] bg-white/55 px-5 py-10 text-center text-sm text-[#7c8fb5]">
              Đang tải...
            </div>
          ) : activeTab === "pending" ? (
            pendingItems.length === 0
              ? renderEmpty("Không có yêu cầu nào đang chờ duyệt.")
              : pendingItems.map(renderCard)
          ) : (
            <>
              {/* Done sub-filter */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-[#c6d8f0] bg-[#f2f7ff] p-1">
                  {doneFilterOptions.map((opt) => {
                    const count =
                      opt.value === "all"
                        ? doneItems.length
                        : doneItems.filter((e) => e.status === opt.value).length;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDoneFilter(opt.value)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                          doneFilter === opt.value
                            ? "bg-white text-[#244cb8] shadow-[0_8px_16px_rgba(36,76,184,0.16)]"
                            : "text-[#6a81aa] hover:text-[#244cb8]"
                        }`}
                      >
                        {opt.label}
                        <span className={`ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                          doneFilter === opt.value ? "bg-[#244cb8] text-white" : "bg-[#dce8f7] text-[#4d6ea3]"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <ExportPdfButton fetcher={exportApprovedExtensionsPdf} label="Xuất PDF đã duyệt" />
                  <ExportExcelButton fetcher={exportApprovedExtensionsExcel} label="Xuất Excel đã duyệt" />
                </div>
              </div>
              {filteredDoneItems.length === 0
                ? renderEmpty("Không có yêu cầu nào.")
                : filteredDoneItems.map(renderCard)}
            </>
          )}
        </div>
      </motion.section>

      {createPortal(
        <AnimatePresence>
        {/* Detail modal */}
        {selected && (
          <motion.div
            key="detail-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 py-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_72%,#e7f0ff_100%)] shadow-[0_28px_70px_rgba(27,56,122,0.28)]"
            >
              <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
                <div>
                  <h3 className="text-2xl font-bold text-[#173a78]">Chi tiết yêu cầu gia hạn</h3>
                  <p className="mt-1 text-sm text-[#4f6894]">
                    {selected.student?.full_name} — {selected.student?.student_code}
                  </p>
                </div>
                <button
                  onClick={closeDetail}
                  className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:text-[#244cb8]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 px-6 pb-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[selected.status]}`}>
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4 pr-5">
                <section className="space-y-2 rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#5570a0]">Sinh viên</h3>
                  <InfoRow label="Họ tên" value={selected.student?.full_name} />
                  <InfoRow label="MSSV" value={selected.student?.student_code} />
                  <InfoRow label="Email" value={selected.student?.email} />
                  <InfoRow label="Lớp" value={selected.student?.class_name} />
                  <InfoRow label="Khoa" value={selected.student?.faculty} />
                </section>

                <section className="space-y-2 rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#5570a0]">Lưu trú hiện tại</h3>
                  <InfoRow
                    label="Phòng"
                    value={
                      selected.occupancy?.room?.room_number
                        ? `${selected.occupancy.room.building_code ?? ""}${selected.occupancy.room.room_number}`
                        : "—"
                    }
                  />
                  <InfoRow
                    label="Giường"
                    value={selected.occupancy?.bed ? `Giường ${selected.occupancy.bed.bed_number}` : "—"}
                  />
                </section>

                <section className="space-y-2 rounded-2xl border border-[#c6d8f0] bg-[#f2f7ff] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#244cb8]">Yêu cầu gia hạn</h3>
                  <InfoRow label="Đợt gia hạn" value={selected.occupancy_period?.name} />
                  <InfoRow
                    label="Hạn nộp đơn"
                    value={selected.occupancy_period?.end_date ? formatDate(selected.occupancy_period.end_date) : "—"}
                  />
                  <InfoRow
                    label="Gia hạn lưu trú đến"
                    value={
                      selected.occupancy_period?.extension_until_date
                        ? formatDate(selected.occupancy_period.extension_until_date)
                        : "—"
                    }
                    highlight
                  />
                  <InfoRow label="Ngày gửi" value={formatDate(selected.requested_at)} />
                  {selected.approved_at && (
                    <InfoRow label="Ngày duyệt" value={formatDate(selected.approved_at)} />
                  )}
                </section>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5570a0]">Lý do</p>
                  <p className="whitespace-pre-wrap rounded-2xl border border-[#d3e0f2] bg-white/65 p-3 text-sm text-[#1f3152]">
                    {selected.reason}
                  </p>
                </div>

                <section className="space-y-2 rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5570a0]">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Lịch sử hoạt động
                  </h3>
                  {activitiesLoading ? (
                    <p className="py-2 text-center text-xs text-[#8ea1c0]">Đang tải...</p>
                  ) : activities.length === 0 ? (
                    <p className="py-2 text-center text-xs text-[#8ea1c0]">Không có hoạt động nào được ghi nhận.</p>
                  ) : (
                    <div className="space-y-2">
                      {activities.map((act) => {
                        const isNeg = act.type?.category === "negative";
                        const level = act.type?.level ?? "";
                        const levelColor =
                          level === "SERIOUS"
                            ? "bg-red-100 text-red-700 border-red-200"
                            : level === "MEDIUM"
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : isNeg
                            ? "bg-orange-100 text-orange-700 border-orange-200"
                            : "bg-emerald-100 text-emerald-700 border-emerald-200";
                        const levelLabel =
                          level === "SERIOUS" ? "Nghiêm trọng"
                          : level === "MEDIUM" ? "Trung bình"
                          : level === "MINOR" ? "Nhẹ"
                          : level;
                        return (
                          <div
                            key={act.id}
                            className="flex items-start gap-3 rounded-xl border border-[#e8eef8] bg-[#f9fbff] px-3 py-2.5"
                          >
                            <div className="mt-0.5">
                              {isNeg ? (
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium text-[#1f3152]">
                                  {act.type?.name ?? "Không rõ"}
                                </span>
                                {level && (
                                  <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${levelColor}`}>
                                    {levelLabel}
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-[#7a90b4]">
                                <span>{formatDate(act.violationDate)}</span>
                                {act.note && <span className="truncate">{act.note}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {selected.status === "pending" ? (
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#5570a0]">
                      Ghi chú quản trị
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={3}
                      placeholder="Nhập ghi chú (bắt buộc khi từ chối)..."
                      className="w-full resize-none rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-4 py-3 text-sm text-[#1f3152] outline-none transition placeholder:text-[#8ea1c0] focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12"
                    />
                  </div>
                ) : selected.admin_note ? (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5570a0]">Ghi chú quản trị</p>
                    <p className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-3 text-sm text-[#1f3152]">
                      {selected.admin_note}
                    </p>
                  </div>
                ) : null}
              </div>

              {selected.status === "pending" ? (
                <div className="flex flex-wrap justify-end gap-3 border-t border-[#d5e2f5] bg-[#eaf3ff]/90 px-6 py-4">
                  <button
                    onClick={closeDetail}
                    className="rounded-2xl border border-[#c9d8ef] bg-white px-5 py-2.5 text-sm font-semibold text-[#4b6494] transition hover:text-[#244cb8]"
                  >
                    Đóng
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => {
                      const ext = selected;
                      const note = adminNote;
                      closeDetail();
                      setRejectDialog(ext);
                      setRejectNote(note);
                    }}
                    className="rounded-2xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(204,60,79,0.22)] transition hover:brightness-105 disabled:opacity-40"
                  >
                    Từ chối
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => void handleApprove(selected, adminNote)}
                    className="rounded-2xl bg-[linear-gradient(135deg,#1f9a60_0%,#35bf7a_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(31,154,96,0.22)] transition hover:brightness-110 disabled:opacity-40"
                  >
                    Duyệt gia hạn
                  </button>
                </div>
              ) : (
                <div className="flex justify-end border-t border-[#d5e2f5] bg-[#eaf3ff]/90 px-6 py-4">
                  <button
                    onClick={closeDetail}
                    className="rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition hover:brightness-110"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Reject dialog */}
        {rejectDialog && (
          <motion.div
            key="reject-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[130] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 py-6 backdrop-blur-sm"
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
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7d90b5]">
                    Phản hồi yêu cầu
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-[#1a2d52]">Từ chối yêu cầu gia hạn</h3>
                  <p className="mt-2 text-sm leading-7 text-[#61779d]">
                    {rejectDialog.student?.full_name} — {rejectDialog.student?.student_code}
                  </p>
                </div>
                <button
                  onClick={() => { setRejectDialog(null); setRejectNote(""); }}
                  className="rounded-xl border border-[#d5e1f2] bg-white p-2 text-[#6c80a8] transition hover:text-[#244cb8]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-5">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#667ca8]">
                  Lý do từ chối
                </label>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Nhập lý do từ chối yêu cầu gia hạn..."
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-4 py-3 text-sm text-[#1f3152] outline-none transition placeholder:text-[#8ea1c0] focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => { setRejectDialog(null); setRejectNote(""); }}
                  className="rounded-2xl border border-[#c9d8ef] bg-white px-5 py-2.5 text-sm font-semibold text-[#4b6494] transition hover:text-[#244cb8]"
                >
                  Hủy
                </button>
                <button
                  disabled={!rejectNote.trim() || saving}
                  onClick={() => void handleReject()}
                  className="rounded-2xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(204,60,79,0.22)] transition hover:brightness-105 disabled:opacity-40"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value?: string | null;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#5570a0]">{label}</span>
      <span className={`font-semibold ${highlight ? "text-emerald-700" : "text-[#1b3766]"}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}
