import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  LifeBuoy,
  Plus,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  createSupportRequest,
  listMySupportRequests,
  type SupportRequestStatus,
  type SupportRequestType,
  type StudentSupportRequest,
} from "../../../api/studentSupportApi";
import { formatDate } from "../../../utils/dateFormat";
import { useAuthStore } from "../../auth/store";
import { useOccupancyStatus } from "../hooks/useOccupancyStatus";

type StatusFilter = "all" | SupportRequestStatus;

type FormState = {
  title: string;
  content: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
};

const requestTypeLabels: Partial<Record<SupportRequestType, string>> = {
  room_change: "Đổi phòng",
  bed_change: "Đổi giường",
  roommate_request: "Bạn cùng phòng",
  complaint: "Khiếu nại",
  suggestion: "Góp ý",
  maintenance_report: "Báo cáo sửa chữa",
  other: "Hỗ trợ khác",
};

const initialForm: FormState = {
  title: "",
  content: "",
};

const statusMeta: Record<SupportRequestStatus, { label: string; className: string; Icon: LucideIcon }> = {
  pending: { label: "Chờ xử lý", className: "border-amber-200 bg-amber-50 text-amber-700", Icon: Clock3 },
  processing: { label: "Đang xử lý", className: "border-sky-200 bg-sky-50 text-sky-700", Icon: LifeBuoy },
  approved: { label: "Đã duyệt", className: "border-emerald-200 bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
  rejected: { label: "Từ chối", className: "border-rose-200 bg-rose-50 text-rose-700", Icon: XCircle },
  completed: { label: "Hoàn tất", className: "border-emerald-200 bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
};

const statusFilterValues: StatusFilter[] = ["all", "pending", "processing", "approved", "rejected", "completed"];

function normalizeStatusFilter(value: string | null): StatusFilter {
  return statusFilterValues.includes(value as StatusFilter) ? (value as StatusFilter) : "all";
}

const inferTypeLabel = (item: StudentSupportRequest) => {
  if (item.requestType in requestTypeLabels) {
    return requestTypeLabels[item.requestType] ?? "Hỗ trợ khác";
  }
  const title = item.title.toLowerCase();
  if (title.includes("đổi phòng")) return "Đổi phòng";
  if (title.includes("đổi giường")) return "Đổi giường";
  if (title.includes("gia hạn")) return "Gia hạn lưu trú";
  return "Hỗ trợ khác";
};

function StatusBadge({ status }: { status: SupportRequestStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.Icon;
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${meta.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function StudentSupportTableHead({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-4 text-center align-middle text-xs font-bold uppercase tracking-[0.1em] text-[#6f84ad] ${className}`}>{children}</th>;
}

function StudentSupportTableCell({ children }: { children: React.ReactNode }) {
  return <td className="border-t border-[#e8eef8] px-4 py-4 text-center align-middle">{children}</td>;
}

export default function StudentSupportPage() {
  const email = useAuthStore((state) => state.user?.email ?? "");
  const occupancy = useOccupancyStatus();
  const canCreateRequest = occupancy.isCurrentlyActive;
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<StudentSupportRequest[]>([]);
  const [selected, setSelected] = useState<StudentSupportRequest | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  const loadItems = useCallback(async () => {
    if (!email) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setItems(await listMySupportRequests());
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => normalizeStatusFilter(searchParams.get("status")));

  useEffect(() => {
    setStatusFilter(normalizeStatusFilter(searchParams.get("status")));
  }, [searchParams]);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || items.length === 0) return;
    const target = items.find((it) => String(it.id) === openId) ?? null;
    if (target) {
      setSelected(target);
      setSearchParams((prev) => { prev.delete("open"); return prev; }, { replace: true });
    }
  }, [items, searchParams, setSearchParams]);

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", value);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const summary = useMemo(() => ({
    total: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    processing: items.filter((i) => i.status === "processing").length,
    completed: items.filter((i) => i.status === "completed").length,
  }), [items]);

  const filteredItems = useMemo(
    () => statusFilter === "all" ? items : items.filter((i) => i.status === statusFilter),
    [items, statusFilter],
  );

  const openCreateModal = () => {
    if (!canCreateRequest) return;
    setIsCreateOpen(true);
    setForm(initialForm);
    setFormError("");
  };

  const closeCreateModal = () => {
    if (isSubmitting) return;
    setIsCreateOpen(false);
    setForm(initialForm);
    setFormError("");
  };

  const updateField = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((cur) => ({ ...cur, [field]: event.target.value }));
  };

  const handleSubmitSupport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!email) {
      setFormError("Không tìm thấy email sinh viên.");
      return;
    }

    if (!form.title.trim() || !form.content.trim()) {
      setFormError("Vui lòng nhập đầy đủ tiêu đề và nội dung yêu cầu.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createSupportRequest({
        request_type: "other",
        title: form.title.trim(),
        content: form.content.trim(),
      });
      setIsCreateOpen(false);
      setForm(initialForm);
      await loadItems();
      setToast({ type: "success", message: "Đã gửi yêu cầu hỗ trợ thành công." });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Không thể gửi yêu cầu hỗ trợ lúc này.";
      setFormError(msg);
      setToast({ type: "error", message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (occupancy.isLoading || isLoading) {
    return (
      <section className="rounded-[24px] bg-[#eef3f8] p-4 sm:p-5">
        <div className="rounded-[22px] border border-[#c1d6f4] bg-white/80 p-5 text-sm font-semibold text-[#5570a0] shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
          Đang tải thông tin yêu cầu hỗ trợ...
        </div>
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-5 rounded-[24px] bg-[#eef3f8] p-4 sm:p-5"
    >
      <div className="rounded-[22px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_100%)] px-6 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Yêu cầu hỗ trợ</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#62789f]">
              Gửi tiêu đề và mô tả yêu cầu. Ban quản lý sẽ phản hồi sớm nhất có thể.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!occupancy.isLoading && !canCreateRequest}
              title={!occupancy.isLoading && !canCreateRequest ? "Bạn cần đang chính thức lưu trú mới có thể gửi yêu cầu đổi phòng/giường." : undefined}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#244cb8] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(36,76,184,0.22)] transition hover:bg-[#1d3f9c] disabled:cursor-not-allowed disabled:bg-[#a9b8d6] disabled:shadow-none disabled:hover:bg-[#a9b8d6]"
            >
              <Plus className="h-4 w-4" />
              Tạo yêu cầu mới
            </button>
            {!occupancy.isLoading && !canCreateRequest ? (
              <p className="max-w-xs text-right text-xs font-semibold leading-5 text-[#8794ab]">
                Bạn cần đang chính thức lưu trú mới có thể gửi yêu cầu đổi phòng/giường.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <section className="rounded-[22px] border border-[#cbdcf2] bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.09)]">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#244cb8]" />
              <h2 className="text-lg font-bold text-[#1a2d52]">Lịch sử yêu cầu</h2>
            </div>
            <p className="text-sm font-semibold text-[#6f84ad]">{filteredItems.length}/{items.length} ticket</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              { value: "all",        label: "Tất cả",      count: items.length },
              { value: "pending",    label: "Chờ xử lý",   count: summary.pending },
              { value: "processing", label: "Đang xử lý",  count: summary.processing },
              { value: "completed",  label: "Hoàn tất",    count: summary.completed },
              { value: "approved",   label: "Đã duyệt",    count: items.filter((i) => i.status === "approved").length },
              { value: "rejected",   label: "Từ chối",     count: items.filter((i) => i.status === "rejected").length },
            ] as Array<{ value: StatusFilter; label: string; count: number }>)
              .filter((opt) => opt.value === "all" || opt.value === "rejected" || opt.count > 0)
              .map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusFilterChange(opt.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${
                    statusFilter === opt.value
                      ? "border-[#244cb8] bg-[#244cb8] text-white shadow-[0_4px_10px_rgba(36,76,184,0.2)]"
                      : "border-[#c8d8ef] bg-white text-[#5570a0] hover:border-[#9eb9e6] hover:bg-[#f0f6ff]"
                  }`}
                >
                  {opt.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${statusFilter === opt.value ? "bg-white/20 text-white" : "bg-[#eef3fb] text-[#244cb8]"}`}>
                    {opt.count}
                  </span>
                </button>
              ))}
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#e2eaf6] bg-[#f8fbff] px-4 py-4 text-sm font-semibold text-[#62789f]">
            Đang tải yêu cầu...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cbdcf2] bg-[#f8fbff] px-5 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf4ff] text-[#244cb8]">
              <LifeBuoy className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-extrabold text-[#1a2d52]">Bạn chưa gửi yêu cầu nào</h3>
            <p className="mx-auto mt-1 max-w-xl text-sm font-semibold leading-6 text-[#62789f]">
              {!occupancy.isLoading && !canCreateRequest
                ? "Bạn cần đang chính thức lưu trú mới có thể gửi yêu cầu đổi phòng/giường."
                : "Khi cần hỗ trợ, hãy tạo yêu cầu mới và ban quản lý sẽ phản hồi sớm nhất có thể."}
            </p>
            {occupancy.isLoading || canCreateRequest ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#244cb8] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(36,76,184,0.20)]"
              >
                <Plus className="h-4 w-4" />
                Tạo yêu cầu đầu tiên
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#d6e2f1]">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                  <StudentSupportTableHead className="w-[32%]">Tiêu đề</StudentSupportTableHead>
                  <StudentSupportTableHead className="w-[22%]">Ngày gửi</StudentSupportTableHead>
                  <StudentSupportTableHead className="w-[24%]">Trạng thái</StudentSupportTableHead>
                  <StudentSupportTableHead className="w-[22%]">Hành động</StudentSupportTableHead>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm font-semibold text-[#6f84ad]">
                      Không có yêu cầu nào ở trạng thái này.
                    </td>
                  </tr>
                ) : filteredItems.map((item) => (
                    <tr key={item.id} className="transition hover:bg-[#f8fbff]">
                      <StudentSupportTableCell>
                        <span className="mx-auto line-clamp-2 max-w-[220px] text-sm font-bold leading-5 text-[#1f3152]">{item.title || inferTypeLabel(item)}</span>
                      </StudentSupportTableCell>
                      <StudentSupportTableCell>
                        <span className="text-sm font-bold text-[#62789f]">{formatDate(item.createdAt)}</span>
                      </StudentSupportTableCell>
                      <StudentSupportTableCell>
                        <div className="flex justify-center">
                          <StatusBadge status={item.status} />
                        </div>
                      </StudentSupportTableCell>
                      <StudentSupportTableCell>
                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#bfd2ec] bg-white px-3 text-xs font-bold text-[#244cb8] transition hover:border-[#9ebce5] hover:bg-[#eef5ff]"
                        >
                          <Eye className="h-4 w-4" />
                          Xem chi tiết
                        </button>
                      </StudentSupportTableCell>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected ? <StudentRequestDetailModal item={selected} onClose={() => setSelected(null)} /> : null}

      {/* Create form modal */}
      {isCreateOpen
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 py-6 backdrop-blur-sm">
              <motion.form
                onSubmit={handleSubmitSupport}
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-[#bfd4f2] bg-white shadow-[0_28px_70px_rgba(27,56,122,0.28)]"
              >
                <div className="flex items-start justify-between gap-4 border-b border-[#e3ebf7] px-5 py-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#1a2d52]">Tạo yêu cầu hỗ trợ</h2>
                    <p className="mt-1 text-sm font-semibold text-[#62789f]">Nhập tiêu đề và mô tả nội dung cần hỗ trợ. Ban quản lý sẽ phản hồi sớm nhất có thể.</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#bfd2ee] bg-white text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                    aria-label="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto px-5 py-5">
                  <section className="rounded-2xl border border-[#d8e3f1] bg-[#f8fbff] p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[#244cb8]" />
                      <h3 className="text-base font-bold text-[#1a2d52]">Nội dung yêu cầu</h3>
                    </div>
                    <div className="space-y-4">
                      <SupportReasonForm form={form} updateField={updateField} />
                    </div>
                  </section>

                  {formError ? <p className="text-sm font-semibold text-[#c4364f]">{formError}</p> : null}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-[#e3ebf7] px-5 py-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#c8d8ef] bg-white px-5 text-sm font-bold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition hover:bg-[#f5f9ff]"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#244cb8] px-6 text-sm font-bold text-white shadow-[0_12px_24px_rgba(36,76,184,0.22)] transition hover:bg-[#1d3f9c] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Send className="h-4 w-4" />
                    {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
                  </button>
                </div>
              </motion.form>
            </div>,
            document.body,
          )
        : null}

      {toast
        ? createPortal(
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`fixed right-5 top-5 z-[100] rounded-2xl border px-4 py-3 text-sm font-bold shadow-[0_16px_34px_rgba(15,23,42,0.18)] ${
                toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {toast.message}
            </motion.div>,
            document.body,
          )
        : null}
    </motion.section>
  );
}

// ── Simple unified support form ────────────────────────────────────────────────

function SupportReasonForm({
  form,
  updateField,
}: {
  form: FormState;
  updateField: (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}) {
  return (
    <>
      <TextField label="Tiêu đề" value={form.title} onChange={updateField("title")} />
      <TextAreaField label="Lý do / Nội dung chi tiết *" value={form.content} onChange={updateField("content")} rows={6} />
    </>
  );
}

// ── Detail modal ───────────────────────────────────────────────────────────────

type ParsedField = { label: string; value: string };

const DETAIL_FIELD_ORDER = [
  "Phòng hiện tại", "Phòng mong muốn", "Lý do",
  "Giường hiện tại", "Giường mong muốn",
];

function parseContent(content: string): { fields: ParsedField[]; body: string[] } {
  const fields: ParsedField[] = [];
  const body: string[] = [];
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      if (line === "Thông tin lưu trú hiện tại:" || line === "Thông tin yêu cầu:") return;
      const sep = line.indexOf(":");
      if (sep === -1) { body.push(line); return; }
      fields.push({ label: line.slice(0, sep).trim(), value: line.slice(sep + 1).trim() || "-" });
    });
  return { fields, body };
}

function StudentRequestDetailModal({ item, onClose }: { item: StudentSupportRequest; onClose: () => void }) {
  const targetRoomLabel = item.targetRoom ? `${item.targetRoom.buildingCode}${item.targetRoom.roomNumber}` : "";
  const targetBedLabel = item.targetBed ? `Giường ${item.targetBed.bedNumber}` : "";

  const { fields, body } = useMemo(() => parseContent(item.content), [item.content]);
  const contentFields = useMemo(() => {
    const fieldMap = new Map(fields.map((f) => [f.label, f.value]));
    return [
      ...DETAIL_FIELD_ORDER.filter((l) => fieldMap.has(l)).map((l) => ({ label: l, value: fieldMap.get(l)! })),
      ...fields.filter((f) => !DETAIL_FIELD_ORDER.includes(f.label)),
    ];
  }, [fields]);

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 py-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-[#bfd4f2] bg-white shadow-[0_28px_70px_rgba(27,56,122,0.28)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e3ebf7] px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">Chi tiết yêu cầu</p>
            <h2 className="mt-1 text-xl font-extrabold text-[#1a2d52]">{item.title || inferTypeLabel(item)}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#bfd2ee] bg-white text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-5">
          <section className="grid gap-3 rounded-2xl border border-[#d8e3f1] bg-[#f8fbff] p-4 sm:grid-cols-2">
            <DetailInfoRow label="Loại yêu cầu" value={inferTypeLabel(item)} />
            <DetailInfoRow label="Ngày gửi" value={formatDate(item.createdAt)} />
            <div className="sm:col-span-2">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6f84ad]">Trạng thái</p>
              <div className="mt-1.5">
                <StatusBadge status={item.status} />
              </div>
            </div>
          </section>

          {targetRoomLabel || targetBedLabel || item.targetStudent ? (
            <section className="grid gap-3 rounded-2xl border border-[#d8e3f1] bg-white p-4 sm:grid-cols-2">
              {item.targetStudent ? <DetailInfoRow label="Sinh viên muốn ở cùng" value={`${item.targetStudent.fullName} (${item.targetStudent.studentCode})`} /> : null}
              {targetRoomLabel ? <DetailInfoRow label="Phòng đích" value={targetRoomLabel} /> : null}
              {targetBedLabel ? <DetailInfoRow label="Giường đích" value={targetBedLabel} /> : null}
            </section>
          ) : null}

          {item.adminNote ? (
            <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-sky-700">Phản hồi từ ban quản lý</p>
              <p className="text-sm font-semibold leading-6 text-sky-900">{item.adminNote}</p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-[#d8e3f1] bg-white p-4">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.08em] text-[#6f84ad]">Nội dung yêu cầu</p>
            {contentFields.length === 0 && body.length === 0 ? (
              <p className="text-sm font-semibold text-[#6f84ad]">Không có nội dung yêu cầu.</p>
            ) : (
              <>
                {contentFields.length > 0 && (
                  <div className="grid grid-cols-3 gap-x-8 gap-y-4">
                    {contentFields.map((row, i) => (
                      <div key={`${row.label}-${i}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#5570a0]">{row.label}</p>
                        <p className="mt-1 text-sm font-semibold text-[#1b3766]">{row.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {body.length > 0 && (
                  <div className={contentFields.length > 0 ? "mt-3 border-t border-[#e2eaf6] pt-3" : ""}>
                    {body.map((line, i) => (
                      <p key={`${line}-${i}`} className="whitespace-pre-line text-sm font-semibold leading-6 text-[#1b3766]">{line}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

function DetailInfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6f84ad]">{label}</p>
      <p className="mt-1.5 whitespace-pre-line text-sm font-bold leading-6 text-[#1b3766]">{value || "-"}</p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#526a96]">{label}</span>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1.5 h-11 w-full rounded-2xl border border-[#d6e2f1] bg-white px-3 text-sm font-semibold text-[#1f3152] outline-none placeholder:text-[#8da0bf] focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#526a96]">{label}</span>
      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        className="mt-1.5 w-full resize-none rounded-2xl border border-[#d6e2f1] bg-white px-3 py-3 text-sm font-semibold text-[#1f3152] outline-none placeholder:text-[#8da0bf] focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12"
      />
    </label>
  );
}
