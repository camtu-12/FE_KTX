import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  DoorOpen,
  Eye,
  Gavel,
  MapPin,
  NotebookText,
  ShieldAlert,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import { listViolations, processViolation, type ViolationRecord } from "../../../api/violationApi";
import type { ViolationLevel } from "../../../api/violationTypeApi";
import { formatDate } from "../../../utils/dateFormat";

type LevelFilter = ViolationLevel | "ALL";
type ViolationStatus = "PENDING" | "RESOLVED";
type ViolationAction = "WARNING" | "FORCED_CHECKOUT";
type StatusFilter = ViolationStatus | "ALL";
type ActionFilter = ViolationAction | "ALL" | "NONE";

type ViolationRow = {
  id: number;
  occupancyId: number;
  typeId: number;
  violationDate: string;
  status: ViolationStatus;
  actionTaken: ViolationAction | null;
  note: string;
  typeName: string;
  typeDescription: string;
  level: ViolationLevel;
  studentCode: string;
  fullName: string;
  room: string;
  bed: string;
};

type SummaryCard = {
  label: string;
  value: number;
  valueClassName: string;
};

const emptyValue = "-";

const levelOptions: Array<{ value: LevelFilter; label: string }> = [
  { value: "ALL", label: "Tất cả mức độ" },
  { value: "MINOR", label: "Nhẹ" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "SERIOUS", label: "Nghiêm trọng" },
];

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "RESOLVED", label: "Đã xử lý" },
];

const actionOptions: Array<{ value: ActionFilter; label: string }> = [
  { value: "ALL", label: "Tất cả kết quả" },
  { value: "NONE", label: "Chưa xử lý" },
  { value: "WARNING", label: "Nhắc nhở" },
  { value: "FORCED_CHECKOUT", label: "Buộc thôi ở" },
];

const levelMeta: Record<ViolationLevel, { label: string; badgeClassName: string }> = {
  MINOR: {
    label: "Nhẹ",
    badgeClassName: "text-yellow-700",
  },
  MEDIUM: {
    label: "Trung bình",
    badgeClassName: "text-orange-700",
  },
  SERIOUS: {
    label: "Nghiêm trọng",
    badgeClassName: "text-red-700",
  },
};

const statusMeta: Record<ViolationStatus, { label: string; badgeClassName: string; Icon: LucideIcon }> = {
  PENDING: {
    label: "Chờ xử lý",
    badgeClassName: "border border-amber-200 bg-amber-50 text-amber-700",
    Icon: AlertTriangle,
  },
  RESOLVED: {
    label: "Đã xử lý",
    badgeClassName: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    Icon: CheckCircle2,
  },
};

const actionMeta: Record<ViolationAction, { label: string; badgeClassName: string; Icon: LucideIcon }> = {
  WARNING: {
    label: "Nhắc nhở",
    badgeClassName: "border border-sky-200 bg-sky-50 text-sky-700",
    Icon: ClipboardCheck,
  },
  FORCED_CHECKOUT: {
    label: "Buộc thôi ở",
    badgeClassName: "border border-rose-200 bg-rose-50 text-rose-700",
    Icon: Gavel,
  },
};

const createRows = (records: ViolationRecord[]): ViolationRow[] =>
  records.map((violation) => ({
    id: violation.id,
    occupancyId: violation.occupancyId,
    typeId: violation.typeId,
    violationDate: violation.violationDate,
    status: violation.status,
    actionTaken: violation.actionTaken,
    note: violation.note,
    typeName: violation.type?.name ?? emptyValue,
    typeDescription: violation.type?.description ?? emptyValue,
    level: violation.type?.level ?? "MINOR",
    studentCode: violation.student?.studentCode || emptyValue,
    fullName: violation.student?.fullName || emptyValue,
    room: violation.room.displayName || emptyValue,
    bed: violation.bed.displayName || emptyValue,
  }));

function Badge({
  children,
  className,
  Icon,
}: {
  children: string;
  className: string;
  Icon?: LucideIcon;
}) {
  return (
    <span className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${className}`}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-[#5570a0]">
      {label}: <span className="font-semibold text-[#1b3766]">{value || emptyValue}</span>
    </p>
  );
}

function CardInfoLine({
  Icon,
  label,
  children,
  alignTop = false,
}: {
  Icon: LucideIcon;
  label: string;
  children: ReactNode;
  alignTop?: boolean;
}) {
  return (
    <p className={`flex min-w-0 gap-2 text-sm text-slate-600 ${alignTop ? "items-start" : "items-center"}`}>
      <Icon className={`h-4 w-4 shrink-0 text-slate-400 ${alignTop ? "mt-0.5" : ""}`} />
      <span className={alignTop ? "w-[48px] shrink-0" : "shrink-0"}>{label}:</span>
      <span className="min-w-0 flex-1 font-semibold text-slate-700">{children}</span>
    </p>
  );
}

export default function ViolationManagementPage() {
  const { headerSearchValue } = useOutletContext<AdminLayoutOutletContext>();
  const [rows, setRows] = useState<ViolationRow[]>([]);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("ALL");
  const [selectedViolation, setSelectedViolation] = useState<ViolationRow | null>(null);
  const [processingViolation, setProcessingViolation] = useState<ViolationRow | null>(null);
  const [selectedAction, setSelectedAction] = useState<ViolationAction>("WARNING");
  const [processNote, setProcessNote] = useState("");
  const [forcedCheckoutReason, setForcedCheckoutReason] = useState("");
  const [processError, setProcessError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadViolations = async () => {
      try {
        const data = await listViolations();
        if (mounted) {
          setRows(createRows(data));
        }
      } catch {
        if (mounted) {
          setRows([]);
        }
      }
    };

    void loadViolations();

    if (typeof window !== "undefined") {
      window.addEventListener("ktx-violations-updated", loadViolations);
      window.addEventListener("focus", loadViolations);
    }

    return () => {
      mounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("ktx-violations-updated", loadViolations);
        window.removeEventListener("focus", loadViolations);
      }
    };
  }, []);

  const activeSearchValue = headerSearchValue.trim();
  const visibleRows = useMemo(() => {
    const normalizedSearch = activeSearchValue.toLowerCase();

    return rows.filter((item) => {
      const matchesLevel = levelFilter === "ALL" || item.level === levelFilter;
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchesAction =
        actionFilter === "ALL" ||
        (actionFilter === "NONE" ? item.actionTaken === null : item.actionTaken === actionFilter);
      const matchesSearch =
        !normalizedSearch ||
        [item.studentCode, item.fullName].join(" ").toLowerCase().includes(normalizedSearch);

      return matchesLevel && matchesStatus && matchesAction && matchesSearch;
    });
  }, [actionFilter, activeSearchValue, levelFilter, rows, statusFilter]);

  const totalCount = rows.length;
  const pendingCount = rows.filter((item) => item.status === "PENDING").length;
  const resolvedCount = rows.filter((item) => item.status === "RESOLVED").length;
  const forcedCheckoutCount = rows.filter((item) => item.actionTaken === "FORCED_CHECKOUT").length;

  const summaryCards: SummaryCard[] = [
    {
      label: "Tổng vi phạm",
      value: totalCount,
      valueClassName: "text-[#244cb8]",
    },
    {
      label: "Chờ xử lý",
      value: pendingCount,
      valueClassName: "text-[#9b6b00]",
    },
    {
      label: "Đã xử lý",
      value: resolvedCount,
      valueClassName: "text-[#16784b]",
    },
    {
      label: "Buộc thôi ở",
      value: forcedCheckoutCount,
      valueClassName: "text-[#c4364f]",
    },
  ];

  const closeProcessModal = () => {
    setProcessingViolation(null);
    setSelectedAction("WARNING");
    setProcessNote("");
    setForcedCheckoutReason("");
    setProcessError("");
  };

  const openProcessModal = (violation: ViolationRow) => {
    setProcessingViolation(violation);
    setSelectedAction("WARNING");
    setProcessNote("");
    setForcedCheckoutReason("");
    setProcessError("");
  };

  const resetFilters = () => {
    setLevelFilter("ALL");
    setStatusFilter("ALL");
    setActionFilter("ALL");
  };

  const handleConfirmProcess = async () => {
    if (!processingViolation) {
      return;
    }

    const trimmedProcessNote = processNote.trim();
    const trimmedForcedReason = forcedCheckoutReason.trim();

    if (selectedAction === "FORCED_CHECKOUT" && !trimmedForcedReason) {
      setProcessError("Vui lòng nhập lý do buộc thôi ở.");
      return;
    }

    try {
      const updated = await processViolation(processingViolation.id, {
        action_taken: selectedAction,
        note: trimmedProcessNote || processingViolation.note,
      });
      const [nextViolation] = createRows([updated]);

      setRows((current) => current.map((item) => (item.id === nextViolation.id ? nextViolation : item)));
      setSelectedViolation((current) => (current?.id === nextViolation.id ? nextViolation : current));
      closeProcessModal();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ktx-violations-updated"));
        window.dispatchEvent(new Event("ktx-registrations-updated"));
        window.dispatchEvent(new Event("ktx-rooms-updated"));
      }
    } catch {
      setProcessError("Không thể cập nhật xử lý vi phạm. Vui lòng thử lại.");
    }
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: "easeOut" }}
          className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:px-8"
        >
          <div className="flex flex-col gap-2">
            <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">
              Quản lý vi phạm 
            </h1>
            <p className="max-w-3xl text-[13px] leading-6 text-[#62789f] sm:text-sm">
              Theo dõi vi phạm nội trú, trạng thái xử lý và các trường hợp cần buộc thôi ở.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <select
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value as LevelFilter)}
              className="h-11 rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-3 text-sm font-semibold text-[#1f3152] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
            >
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-11 rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-3 text-sm font-semibold text-[#1f3152] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value as ActionFilter)}
              className="h-11 rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-3 text-sm font-semibold text-[#1f3152] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
            >
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="h-11 rounded-2xl border border-[#c8d8ef] bg-white px-5 text-sm font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-[#f5f9ff]"
            >
              Reset
            </button>
          </div>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card, index) => (
              <motion.article
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ duration: 0.32, delay: 0.08 + index * 0.04, ease: "easeOut" }}
                className="relative overflow-hidden rounded-[26px] border border-[#d8e4f5] bg-white px-5 py-4 text-center shadow-[0_14px_30px_rgba(36,76,184,0.09)] transition-shadow duration-300 hover:shadow-[0_22px_44px_rgba(36,76,184,0.16)]"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7c8fb5]">
                  {card.label}
                </p>
                <p className={`mt-3 text-[2rem] font-extrabold leading-none ${card.valueClassName}`}>
                  {card.value}
                </p>
              </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.16, ease: "easeOut" }}
          className="mt-1"
        >
          {visibleRows.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {visibleRows.map((item, index) => {
                const CardStatusIcon = statusMeta[item.status].Icon;

                return (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2, delay: index * 0.03, ease: "easeOut" }}
                    className="group flex min-h-[300px] flex-col rounded-3xl border border-[#cfdbef] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_38px_rgba(36,76,184,0.16)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-bold text-[#1a2d52]">{item.fullName}</h2>
                        <p className="mt-1 truncate text-sm text-[#61779d]">{item.studentCode}</p>
                      </div>

                      <Badge Icon={CardStatusIcon} className={statusMeta[item.status].badgeClassName}>
                        {statusMeta[item.status].label}
                      </Badge>
                    </div>

                    <div className="mt-5 space-y-2.5">
                      
                      <CardInfoLine Icon={MapPin} label="Vị trí">
                        <span className="block truncate">
                          {item.room} - {item.bed}
                        </span>
                      </CardInfoLine>
                      <CardInfoLine Icon={ShieldAlert} label="Loại">
                        <span className="block truncate">{item.typeName}</span>
                      </CardInfoLine>
                      <CardInfoLine Icon={AlertTriangle} label="Mức độ">
                        <span className={levelMeta[item.level].badgeClassName}>
                          {levelMeta[item.level].label}
                        </span>
                      </CardInfoLine>
                      <CardInfoLine Icon={NotebookText} label="Chi tiết" alignTop>
                        <span className="block whitespace-normal break-all">{item.note || emptyValue}</span>
                      </CardInfoLine>
                      <CardInfoLine Icon={CalendarDays} label="Ngày">
                        {formatDate(item.violationDate)}
                      </CardInfoLine>
                      <CardInfoLine Icon={DoorOpen} label="Kết quả">
                        {item.actionTaken ? actionMeta[item.actionTaken].label : "Chưa xử lý"}
                      </CardInfoLine>
                    </div>

                    <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
                      {item.status === "PENDING" ? (
                        <button
                          type="button"
                          onClick={() => openProcessModal(item)}
                          className="auth-btn-gloss inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-3 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(36,76,184,0.20)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
                        >
                          <ClipboardCheck className="auth-btn-gloss__content h-4 w-4" />
                          <span className="auth-btn-gloss__content">Xử lý</span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setSelectedViolation(item)}
                        className={`inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-[#bfd2ec] bg-white px-3 text-xs font-semibold text-[#2a4f8f] transition duration-200 hover:-translate-y-0.5 hover:border-[#9ebce5] hover:bg-[#f3f8ff] ${
                          item.status === "PENDING" ? "" : "sm:col-span-2"
                        }`}
                      >
                        <Eye className="h-4 w-4" />
                        Xem
                      </button>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          ) : (
            <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-[28px] border border-dashed border-[#cfdcf0] bg-[#f8fbff] px-6 py-10 text-center shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
              <p className="text-sm font-semibold text-[#1a2d52]">
                Không có dữ liệu vi phạm phù hợp với bộ lọc.
              </p>
            </div>
          )}
        </motion.div>
      </motion.section>

      {selectedViolation
        ? createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-0 z-[72] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="relative max-h-[90vh] w-full max-w-[820px] overflow-y-auto rounded-[28px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_72%,#e7f0ff_100%)] p-6 shadow-[0_28px_70px_rgba(27,56,122,0.28)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-2xl font-semibold uppercase  ">
                      CHI TIẾT VI PHẠM
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedViolation(null)}
                    className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                    aria-label="Đóng"
                    title="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                      THÔNG TIN SINH VIÊN
                    </h3>
                    <div className="mt-4 grid gap-x-6 gap-y-3 md:grid-cols-2">
                      <InfoLine label="MSSV" value={selectedViolation.studentCode} />
                      <InfoLine label="Phòng" value={selectedViolation.room} />
                      <InfoLine label="Họ tên" value={selectedViolation.fullName} />
                      <InfoLine label="Giường" value={selectedViolation.bed} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                      THÔNG TIN VI PHẠM
                    </h3>
                    <div className="mt-4 grid gap-x-6 gap-y-3 md:grid-cols-2">
                      <InfoLine label="Loại vi phạm" value={selectedViolation.typeName} />
                      <div className="flex flex-wrap items-center gap-2 text-sm text-[#5570a0]">
                        <span>Mức độ:</span>
                        <span className={`font-semibold ${levelMeta[selectedViolation.level].badgeClassName}`}>
                          {levelMeta[selectedViolation.level].label}
                        </span>
                      </div>
                      <InfoLine label="Ngày vi phạm" value={formatDate(selectedViolation.violationDate)} />
                      <p className="text-sm text-[#5570a0]">
                        Chi tiết vi phạm:{" "}
                        <span className="font-semibold break-all text-[#1b3766]">{selectedViolation.note || emptyValue}</span>
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                      TRẠNG THÁI XỬ LÝ
                    </h3>
                    <div className="mt-4 grid gap-x-6 gap-y-3 md:grid-cols-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-[#5570a0]">
                        <span>Trạng thái:</span>
                        <Badge Icon={statusMeta[selectedViolation.status].Icon} className={statusMeta[selectedViolation.status].badgeClassName}>
                          {statusMeta[selectedViolation.status].label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-[#5570a0]">
                        <span>Kết quả:</span>
                        {selectedViolation.actionTaken ? (
                          <Badge
                            Icon={actionMeta[selectedViolation.actionTaken].Icon}
                            className={actionMeta[selectedViolation.actionTaken].badgeClassName}
                          >
                            {actionMeta[selectedViolation.actionTaken].label}
                          </Badge>
                        ) : (
                          <span className="font-semibold text-[#1b3766]">Chưa xử lý</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  {selectedViolation.status === "PENDING" ? (
                    <button
                      type="button"
                      onClick={() => openProcessModal(selectedViolation)}
                      className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
                    >
                      <span className="auth-btn-gloss__content">Xử lý</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSelectedViolation(null)}
                    className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            </motion.div>,
            document.body,
          )
        : null}

      {processingViolation
        ? createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-[82] flex items-center justify-center bg-[rgba(14,25,48,0.50)] px-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
                className="w-full max-w-[620px] rounded-[26px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7d90b5]">
                      XỬ LÝ VI PHẠM
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-[#173a78]">{processingViolation.fullName}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeProcessModal}
                    className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                    aria-label="Đóng"
                    title="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(["WARNING", "FORCED_CHECKOUT"] as ViolationAction[]).map((action) => {
                      const isSelected = selectedAction === action;
                      const meta = actionMeta[action];
                      const ActionIcon = meta.Icon;

                      return (
                        <button
                          key={action}
                          type="button"
                          onClick={() => {
                            setSelectedAction(action);
                            setProcessError("");
                          }}
                          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition duration-200 ${
                            isSelected
                              ? "border-[#244cb8] bg-[#eef5ff] shadow-[0_12px_24px_rgba(36,76,184,0.12)]"
                              : "border-[#d3e0f2] bg-white/72 hover:border-[#aac2ea] hover:bg-white"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                              isSelected ? "border-[#244cb8] bg-[#244cb8]/10" : "border-[#cfd9e8] bg-white"
                            }`}
                          >
                            <span className={`h-2.5 w-2.5 rounded-full ${isSelected ? "bg-[#244cb8]" : "bg-transparent"}`} />
                          </span>
                          <ActionIcon className={`h-5 w-5 ${action === "FORCED_CHECKOUT" ? "text-rose-600" : "text-sky-600"}`} />
                          <span className="text-sm font-bold text-[#1b3766]">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Ghi chú xử lý</span>
                    <textarea
                      value={processNote}
                      onChange={(event) => setProcessNote(event.target.value)}
                      rows={4}
                      className="mt-2 w-full resize-none rounded-2xl border border-[#d3e0f2] bg-white/80 px-4 py-3 text-sm font-semibold text-[#1b3766] outline-none transition placeholder:text-[#9aabc9] focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
                      placeholder="Nhập ghi chú xử lý..."
                    />
                  </label>

                  {selectedAction === "FORCED_CHECKOUT" ? (
                    <label className="block">
                      <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Lý do buộc thôi ở *</span>
                      <textarea
                        value={forcedCheckoutReason}
                        onChange={(event) => {
                          setForcedCheckoutReason(event.target.value);
                          setProcessError("");
                        }}
                        rows={4}
                        className="mt-2 w-full resize-none rounded-2xl border border-[#d3e0f2] bg-white/80 px-4 py-3 text-sm font-semibold text-[#1b3766] outline-none transition placeholder:text-[#9aabc9] focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
                        placeholder="Nhập lý do để sau này lưu vào occupancy.reason..."
                      />
                    </label>
                  ) : null}

                  {processError ? <p className="text-sm font-semibold text-[#cc3c4f]">{processError}</p> : null}
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeProcessModal}
                    className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmProcess}
                    className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
                  >
                    <span className="auth-btn-gloss__content">Xác nhận</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>,
            document.body,
          )
        : null}
    </>
  );
}
