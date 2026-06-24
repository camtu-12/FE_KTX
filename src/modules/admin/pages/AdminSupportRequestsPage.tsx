import { motion } from "framer-motion";
import { BedDouble, CheckCircle2, ClipboardList, Clock3, Eye, Funnel, LifeBuoy, Settings2, User, X, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext, useSearchParams } from "react-router-dom";
import {
  listAdminSupportRequests,
  updateAdminSupportRequestStatus,
  type SupportRequestStatus,
  type SupportRequestType,
  type StudentSupportRequest,
} from "../../../api/studentSupportApi";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import { formatDate } from "../../../utils/dateFormat";

type StatusFilter = SupportRequestStatus | "ALL";
type TypeFilter = SupportRequestType | "ALL";

type ToastState = {
  type: "success" | "error";
  message: string;
};

type ParsedContent = {
  currentStay: Array<{ label: string; value: string }>;
  proposal: Array<{ label: string; value: string }>;
  body: string[];
};

const typeOptions: Array<{ value: TypeFilter; label: string }> = [
  { value: "ALL", label: "Tất cả loại" },
  { value: "room_change", label: "Đổi phòng" },
  { value: "bed_change", label: "Đổi giường" },
  { value: "roommate_request", label: "Yêu cầu bạn cùng phòng" },
  { value: "complaint", label: "Khiếu nại" },
  { value: "suggestion", label: "Góp ý" },
  { value: "maintenance_report", label: "Báo cáo sửa chữa" },
  { value: "other", label: "Khác" },
];

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "pending", label: "Chờ xử lý" },
  { value: "processing", label: "Đang xử lý" },
  { value: "rejected", label: "Từ chối" },
  { value: "completed", label: "Hoàn tất" },
];

const statusMeta: Record<SupportRequestStatus, { label: string; className: string; Icon: LucideIcon }> = {
  pending: { label: "Chờ xử lý", className: "border-amber-200 bg-amber-50 text-amber-700", Icon: Clock3 },
  processing: { label: "Đang xử lý", className: "border-sky-200 bg-sky-50 text-sky-700", Icon: LifeBuoy },
  approved: { label: "Đã duyệt", className: "border-emerald-200 bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
  rejected: { label: "Từ chối", className: "border-rose-200 bg-rose-50 text-rose-700", Icon: XCircle },
  completed: { label: "Hoàn tất", className: "border-emerald-200 bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
};

const currentStayLabels = new Set([
  "Phòng hiện tại",
  "Giường hiện tại",
  "Ngày bắt đầu lưu trú",
  "Ngày kết thúc hiện tại",
  "Trạng thái lưu trú",
]);

const getTypeLabel = (value: SupportRequestType) => typeOptions.find((item) => item.value === value)?.label ?? "Khác";

const parseSupportContent = (content: string): ParsedContent => {
  const parsed: ParsedContent = { currentStay: [], proposal: [], body: [] };
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      if (line === "Thông tin lưu trú hiện tại:" || line === "Thông tin yêu cầu:") return;
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) {
        parsed.body.push(line);
        return;
      }
      const label = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim() || "-";
      const item = { label, value };
      if (currentStayLabels.has(label)) {
        parsed.currentStay.push(item);
      } else {
        parsed.proposal.push(item);
      }
    });
  return parsed;
};

const isAutoTransferType = (type: SupportRequestType) => type === "room_change" || type === "bed_change" || type === "roommate_request";

const getAutoTransferLabel = (type: SupportRequestType) => {
  if (type === "room_change") return "Yêu cầu đổi phòng";
  if (type === "roommate_request") return "Yêu cầu bạn cùng phòng";
  return "Yêu cầu đổi giường";
};

function Badge({ status }: { status: SupportRequestStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.Icon;
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${meta.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

export default function AdminSupportRequestsPage() {
  const { headerSearchValue } = useOutletContext<AdminLayoutOutletContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<StudentSupportRequest[]>([]);
  const [detailItem, setDetailItem] = useState<StudentSupportRequest | null>(null);
  const [processItem, setProcessItem] = useState<StudentSupportRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [draftStatusFilter, setDraftStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [statusFilterMenuPosition, setStatusFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const statusFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      setItems(await listAdminSupportRequests());
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || items.length === 0) return;
    const target = items.find((it) => String(it.id) === openId) ?? null;
    if (target) {
      setDetailItem(target);
      setSearchParams((prev) => { prev.delete("open"); return prev; }, { replace: true });
    }
  }, [items, searchParams, setSearchParams]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!isStatusFilterOpen) return;

    const updateMenuPosition = () => {
      const buttonRect = statusFilterButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;

      setStatusFilterMenuPosition({
        top: buttonRect.bottom + 10,
        left: buttonRect.left + buttonRect.width / 2,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isStatusFilterOpen]);

  const visibleItems = useMemo(() => {
    const search = headerSearchValue.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchesType = typeFilter === "ALL" || item.requestType === typeFilter;
      const matchesSearch =
        !search ||
        [item.student?.studentCode, item.student?.fullName, item.student?.email, item.title, item.content]
          .join(" ")
          .toLowerCase()
          .includes(search);
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [headerSearchValue, items, statusFilter, typeFilter]);

  const openProcessModal = (item: StudentSupportRequest) => {
    setProcessItem(item);
    setAdminNote(item.adminNote ?? "");
  };

  const closeProcessModal = () => {
    if (isSaving) return;
    setProcessItem(null);
    setAdminNote("");
  };

  const saveProcess = async (status: SupportRequestStatus) => {
    if (!processItem) return;
    setIsSaving(true);
    try {
      await updateAdminSupportRequestStatus(processItem.id, {
        status,
        admin_note: adminNote.trim() || undefined,
      });
      setProcessItem(null);
      setAdminNote("");
      await loadItems();
      setToast({ type: "success", message: status === "approved" ? "Đã duyệt yêu cầu hỗ trợ." : "Đã từ chối yêu cầu hỗ trợ." });
    } catch {
      setToast({ type: "error", message: "Không thể cập nhật yêu cầu hỗ trợ." });
    } finally {
      setIsSaving(false);
    }
  };

  const resetFilters = () => {
    setStatusFilter("ALL");
    setDraftStatusFilter("ALL");
    setTypeFilter("ALL");
  };

  const handleOpenStatusFilter = () => {
    setDraftStatusFilter(statusFilter);
    setIsStatusFilterOpen(true);
  };

  const handleResetStatusFilter = () => {
    setDraftStatusFilter("ALL");
    setStatusFilter("ALL");
    setIsStatusFilterOpen(false);
  };

  const handleApplyStatusFilter = () => {
    setStatusFilter(draftStatusFilter);
    setIsStatusFilterOpen(false);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_42%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Quản lý yêu cầu hỗ trợ</h1>
            <p className="text-sm text-[#62789f]">Theo dõi, tiếp nhận và xử lý các yêu cầu hỗ trợ sinh viên.</p>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="h-9 w-[190px] rounded-xl border border-[#d6e2f1] bg-white px-3 text-xs font-semibold text-[#1f3152] outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12"
            >
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="h-9 rounded-xl border border-[#c8d8ef] bg-white px-4 text-xs font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.10)]"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[22px] border border-[#d6e2f1] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        {isLoading ? (
          <p className="p-5 text-sm font-semibold text-[#62789f]">Đang tải yêu cầu hỗ trợ...</p>
        ) : visibleItems.length === 0 ? (
          <p className="p-5 text-sm font-semibold text-[#62789f]">Không có yêu cầu phù hợp với bộ lọc.</p>
        ) : (
          <table className="w-full table-fixed border-separate border-spacing-0">
            <thead>
              <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                <TableHead className="w-[14%]">MSSV</TableHead>
                <TableHead className="w-[18%]">Họ tên</TableHead>
                <TableHead className="w-[22%]">Loại yêu cầu</TableHead>
                <TableHead className="w-[16%]">Ngày gửi</TableHead>
                <TableHead className="w-[14%]">
                  <span className="inline-flex items-center justify-center gap-2">
                    <span>Trạng thái</span>
                    <button
                      ref={statusFilterButtonRef}
                      type="button"
                      onClick={isStatusFilterOpen ? () => setIsStatusFilterOpen(false) : handleOpenStatusFilter}
                      className={`flex items-center justify-center transition ${
                        statusFilter !== "ALL" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"
                      }`}
                      aria-label="Bật lọc trạng thái"
                      title="Bật lọc trạng thái"
                    >
                      <Funnel className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </TableHead>
                <TableHead className="w-[16%]">Hành động</TableHead>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id} className="transition hover:bg-[#f8fbff]">
                  <TableCell>
                    <span className="block max-w-full truncate text-[15px] font-semibold text-[#24407f]">{item.student?.studentCode || "-"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="block max-w-full truncate text-sm font-semibold text-[#1f3152]">{item.student?.fullName || "-"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="mx-auto line-clamp-2 max-w-[220px] text-sm font-semibold leading-5 text-[#1f3152]">{getTypeLabel(item.requestType)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold text-[#1f3152]">{formatDate(item.createdAt)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Badge status={item.status} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailItem(item)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#bfd2ec] bg-white text-[#244cb8] transition hover:bg-[#eef5ff]"
                        aria-label="Xem"
                        title="Xem"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openProcessModal(item)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#244cb8] text-white transition hover:bg-[#1d3f9c]"
                        aria-label="Xử lý"
                        title="Xử lý"
                      >
                        <Settings2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isStatusFilterOpen && statusFilterMenuPosition
        ? createPortal(
            <div className="fixed inset-0 z-[68]" onClick={() => setIsStatusFilterOpen(false)}>
              <div
                className="absolute w-[210px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
                style={{ top: statusFilterMenuPosition.top, left: statusFilterMenuPosition.left }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-0.5 p-2.5">
                  {statusOptions.map((option) => {
                    const isSelected = draftStatusFilter === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDraftStatusFilter(option.value)}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            isSelected ? "border-[#2554d8]" : "border-[#cbd8eb]"
                          }`}
                        >
                          {isSelected ? <span className="h-2.5 w-2.5 rounded-full bg-[#2554d8]" /> : null}
                        </span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-[#dbe5f3] px-2.5 py-2">
                  <button
                    type="button"
                    onClick={handleResetStatusFilter}
                    className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyStatusFilter}
                    className="rounded-xl bg-[#0c4f97] px-3 py-1.5 text-[10px] font-semibold tracking-normal text-white shadow-[0_8px_16px_rgba(12,79,151,0.22)] transition hover:brightness-110"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {detailItem ? <DetailModal item={detailItem} onClose={() => setDetailItem(null)} /> : null}

      {processItem
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 py-6 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#bfd4f2] bg-white shadow-[0_28px_70px_rgba(27,56,122,0.28)]"
              >
                <div className="flex items-start justify-between gap-4 border-b border-[#e3ebf7] px-5 py-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#1a2d52]">Xử lý yêu cầu</h2>
                    <p className="mt-1 text-sm font-semibold text-[#62789f]">{processItem.title}</p>
                  </div>
                  <CloseButton onClick={closeProcessModal} />
                </div>

                <div className="space-y-4 px-5 py-5">
                  {/* Transfer target info for room/bed change requests */}
                  {isAutoTransferType(processItem.requestType) && (
                    <div className={`rounded-2xl border p-4 ${processItem.targetBedId ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                      <p className={`mb-2 text-sm font-bold ${processItem.targetBedId ? "text-emerald-700" : "text-amber-700"}`}>
                        {getAutoTransferLabel(processItem.requestType)}
                        {processItem.targetBedId ? " — có đích cụ thể" : " — chưa có đích"}
                      </p>
                      {processItem.targetRoom && (
                        <p className="text-sm font-semibold text-emerald-800">
                          Phòng đích: <span className="font-bold">{processItem.targetRoom.buildingCode}{processItem.targetRoom.roomNumber}</span>
                        </p>
                      )}
                      {processItem.targetBed ? (
                        <p className="text-sm font-semibold text-emerald-800">
                          Giường đích: <span className="font-bold">Giường {processItem.targetBed.bedNumber}</span>
                        </p>
                      ) : (
                        <p className="text-sm font-semibold text-amber-700">
                          Sinh viên chưa chọn giường đích — cần xử lý thủ công.
                        </p>
                      )}
                    </div>
                  )}

                  <label className="block">
                    <span className="text-sm font-bold text-[#526a96]">Ghi chú xử lý</span>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={5}
                      className="mt-1.5 w-full resize-none rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-3 py-3 text-sm font-semibold text-[#1f3152] outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12"
                    />
                  </label>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-[#e3ebf7] px-5 py-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => void saveProcess("rejected")}
                    disabled={isSaving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-6 text-sm font-bold text-rose-700 shadow-[0_8px_18px_rgba(225,29,72,0.10)] transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <XCircle className="h-4 w-4" />
                    {isSaving ? "Đang lưu..." : "Từ chối"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void saveProcess("approved")}
                    disabled={isSaving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-[0_12px_24px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isSaving ? "Đang lưu..." : "Duyệt"}
                  </button>
                </div>
              </motion.div>
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

const CONTENT_FIELD_ORDER = [
  'Phòng hiện tại', 'Phòng mong muốn', 'Lý do',
  'Giường hiện tại', 'Giường mong muốn',
];

function DetailModal({ item, onClose }: { item: StudentSupportRequest; onClose: () => void }) {
  const parsed = useMemo(() => parseSupportContent(item.content), [item.content]);

  const contentFields = useMemo(() => {
    const allFields = [...parsed.currentStay, ...parsed.proposal];
    const fieldMap = new Map(allFields.map((r) => [r.label, r.value]));
    return [
      ...CONTENT_FIELD_ORDER.filter((l) => fieldMap.has(l)).map((l) => ({ label: l, value: fieldMap.get(l)! })),
      ...allFields.filter((r) => !CONTENT_FIELD_ORDER.includes(r.label)),
    ];
  }, [parsed]);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 py-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-[#bfd4f2] bg-white shadow-[0_28px_70px_rgba(27,56,122,0.28)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e3ebf7] px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Chi tiết yêu cầu</p>
            <h2 className="mt-2 text-xl font-extrabold uppercase text-[#1a2d52]">{item.title || getTypeLabel(item.requestType)}</h2>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoSection title="Thông tin sinh viên" icon={<User className="h-5 w-5 text-[#244cb8]" />}>
              <InfoRow label="MSSV" value={item.student?.studentCode} />
              <InfoRow label="Họ tên" value={item.student?.fullName} />
              <InfoRow label="Email" value={item.student?.email} />
              <InfoRow label="Lớp/Khoa" value={[item.student?.className, item.student?.faculty].filter(Boolean).join(" - ")} />
            </InfoSection>

            <InfoSection title="Thông tin yêu cầu" icon={<ClipboardList className="h-5 w-5 text-[#244cb8]" />}>
              <InfoRow label="Loại yêu cầu" value={getTypeLabel(item.requestType)} />
              <InfoRow label="Ngày gửi" value={formatDate(item.createdAt)} />
              <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
                <span className="text-sm font-normal text-[#5570a0]">Trạng thái</span>
                <Badge status={item.status} />
              </div>
            </InfoSection>
          </div>

          <InfoSection title="Nội dung yêu cầu" icon={<BedDouble className="h-5 w-5 text-[#244cb8]" />}>
            {contentFields.length === 0 && parsed.body.length === 0 ? (
              <EmptyLine text="Không có nội dung yêu cầu." />
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
                {parsed.body.length > 0 && (
                  <div className={contentFields.length > 0 ? "border-t border-[#e2eaf6] pt-3" : ""}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#5570a0]">Nội dung</p>
                    {parsed.body.map((line, i) => (
                      <p key={`${line}-${i}`} className="whitespace-pre-line text-sm font-normal leading-6 text-[#1b3766]">{line}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </InfoSection>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

function TableHead({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-4 text-center align-middle text-xs font-bold uppercase tracking-[0.1em] text-[#6f84ad] ${className}`}>{children}</th>;
}

function TableCell({ children }: { children: React.ReactNode }) {
  return <td className="border-t border-[#e8eef8] px-4 py-4 text-center align-middle">{children}</td>;
}

function InfoSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e2eaf6] bg-[#f8fbff] p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-base font-extrabold text-[#1a2d52]">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
      <span className="text-sm font-normal text-[#5570a0]">{label}</span>
      <span className="whitespace-pre-line text-sm font-normal text-[#1b3766]">{value || "-"}</span>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm font-normal text-[#6f84ad]">{text}</p>;
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#bfd2ee] bg-white text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
      aria-label="Đóng"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
