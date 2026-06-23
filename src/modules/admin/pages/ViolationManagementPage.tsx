import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Gavel,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import { listViolations, type ViolationRecord } from "../../../api/violationApi";
import type { ActivityCategory, ViolationLevel } from "../../../api/violationTypeApi";
import { formatDate } from "../../../utils/dateFormat";

type CategoryFilter = ActivityCategory | "ALL";
type LevelFilter = ViolationLevel | "ALL";
type ActionFilter = ViolationAction | "ALL";
type ViolationStatus = "PENDING" | "RESOLVED";
type ViolationAction = "reward_recorded" | "reminded" | "warned" | "force_evicted";

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
  category: ActivityCategory;
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

const categoryFilterOptions: Array<{ value: CategoryFilter; label: string }> = [
  { value: "ALL", label: "Tất cả loại" },
  { value: "positive", label: "Hoạt động tích cực" },
  { value: "negative", label: "Vi phạm" },
];

const levelFilterOptions: Array<{ value: LevelFilter; label: string }> = [
  { value: "ALL", label: "Tất cả mức độ" },
  { value: "MINOR", label: "MINOR" },
  { value: "MEDIUM", label: "MEDIUM" },
  { value: "SERIOUS", label: "SERIOUS" },
];

const actionFilterOptions: Array<{ value: ActionFilter; label: string }> = [
  { value: "ALL", label: "Tất cả kết quả" },
  { value: "reward_recorded", label: "Đã ghi nhận" },
  { value: "reminded", label: "Nhắc nhở" },
  { value: "warned", label: "Cảnh cáo" },
  { value: "force_evicted", label: "Buộc thôi ở" },
];

const levelMeta: Record<ViolationLevel, { label: string; badgeClassName: string }> = {
  MINOR: {
    label: "MINOR",
    badgeClassName: "border border-yellow-200 bg-yellow-50 text-yellow-700",
  },
  MEDIUM: {
    label: "MEDIUM",
    badgeClassName: "border border-orange-200 bg-orange-50 text-orange-700",
  },
  SERIOUS: {
    label: "SERIOUS",
    badgeClassName: "border border-red-200 bg-red-50 text-red-700",
  },
};

const categoryMeta: Record<ActivityCategory, { label: string }> = {
  positive: {
    label: "Hoạt động tích cực",
  },
  negative: {
    label: "Vi phạm",
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
  reward_recorded: {
    label: "Đã ghi nhận",
    badgeClassName: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    Icon: ClipboardCheck,
  },
  reminded: {
    label: "Nhắc nhở",
    badgeClassName: "border border-sky-200 bg-sky-50 text-sky-700",
    Icon: ClipboardCheck,
  },
  warned: {
    label: "Cảnh cáo",
    badgeClassName: "border border-amber-200 bg-amber-50 text-amber-700",
    Icon: AlertTriangle,
  },
  force_evicted: {
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
    category: violation.type?.category ?? "negative",
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
    <span className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${className}`}>
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

export default function ViolationManagementPage() {
  const { headerSearchValue } = useOutletContext<AdminLayoutOutletContext>();
  const [rows, setRows] = useState<ViolationRow[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("ALL");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("ALL");
  const [selectedViolation, setSelectedViolation] = useState<ViolationRow | null>(null);

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
      const matchesCategory = categoryFilter === "ALL" || item.category === categoryFilter;
      const matchesLevel = levelFilter === "ALL" || (item.category === "negative" && item.level === levelFilter);
      const matchesAction = actionFilter === "ALL" || item.actionTaken === actionFilter;
      const matchesSearch =
        !normalizedSearch ||
        [item.studentCode, item.fullName, item.typeName].join(" ").toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesLevel && matchesAction && matchesSearch;
    });
  }, [activeSearchValue, actionFilter, categoryFilter, levelFilter, rows]);

  const positiveCount = rows.filter((item) => item.category === "positive").length;
  const negativeCount = rows.filter((item) => item.category === "negative").length;
  const forcedCheckoutCount = rows.filter((item) => item.actionTaken === "force_evicted").length;

  const summaryCards: SummaryCard[] = [
    {
      label: "Hoạt động tích cực",
      value: positiveCount,
      valueClassName: "text-[#16784b]",
    },
    {
      label: "Vi phạm",
      value: negativeCount,
      valueClassName: "text-[#c4364f]",
    },
    {
      label: "Buộc thôi ở",
      value: forcedCheckoutCount,
      valueClassName: "text-[#c4364f]",
    },
  ];

  const resetFilters = () => {
    setCategoryFilter("ALL");
    setLevelFilter("ALL");
    setActionFilter("ALL");
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
              Lịch sử hoạt động
            </h1>
            <p className="max-w-3xl text-[13px] leading-6 text-[#62789f] sm:text-sm">
              Theo dõi hoạt động tích cực, vi phạm và kết quả xử lý của sinh viên nội trú.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
              className="h-11 rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-3 text-sm font-semibold text-[#1f3152] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
            >
              {categoryFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value as LevelFilter)}
              className="h-11 rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-3 text-sm font-semibold text-[#1f3152] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
            >
              {levelFilterOptions.map((option) => (
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
              {actionFilterOptions.map((option) => (
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

        <div className="grid gap-3 sm:grid-cols-3">
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
          className="mt-1 space-y-3"
        >
          {visibleRows.length > 0 ? (
            <>
              <div className="hidden overflow-hidden rounded-[22px] border border-[#d6e2f1] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.10)] md:block">
                <div className="overflow-hidden">
                  <table className="w-full table-auto border-separate border-spacing-0">
                    <colgroup>
                      <col className="w-[10%]" />
                      <col className="w-[12%]" />
                      <col className="w-[17%]" />
                      <col className="w-[24%]" />
                      <col className="w-[16%]" />
                      <col className="w-[15%] min-w-[160px]" />
                      <col className="w-[6%] min-w-[100px]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                        {["Ngày", "MSSV", "Họ tên", "Hoạt động", "Phân loại", "Kết quả xử lý", "Thao tác"].map((heading) => (
                          <th
                            key={heading}
                            className={`whitespace-nowrap px-4 py-4 text-center align-middle text-xs font-bold uppercase tracking-[0.1em] text-[#6f84ad] ${
                              heading === "Thao tác" ? "min-w-[100px]" : heading === "Kết quả xử lý" ? "min-w-[160px]" : ""
                            }`}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((item) => (
                        <tr key={item.id} className="transition duration-200 hover:bg-[#f8fbff]">
                          <td className="border-t border-[#e8eef8] px-4 py-4 text-center align-middle text-sm font-semibold text-[#1f3152]">{formatDate(item.violationDate)}</td>
                          <td className="border-t border-[#e8eef8] px-4 py-4 text-center align-middle text-sm font-bold text-[#1f3152]">{item.studentCode}</td>
                          <td className="border-t border-[#e8eef8] px-4 py-4 text-center align-middle text-sm font-semibold text-[#1f3152]">
                            <span className="mx-auto block line-clamp-2 max-w-[180px]">{item.fullName}</span>
                          </td>
                          <td className="border-t border-[#e8eef8] px-4 py-4 text-center align-middle text-sm font-semibold text-[#1f3152]">
                            <span className="mx-auto block line-clamp-2 max-w-[260px]">{item.typeName}</span>
                          </td>
                          <td className="whitespace-nowrap border-t border-[#e8eef8] px-4 py-4 text-center align-middle text-sm font-semibold text-[#1f3152]">
                            {categoryMeta[item.category].label}
                          </td>
                          <td className="border-t border-[#e8eef8] px-4 py-4 text-center align-middle">
                            {item.actionTaken ? (
                              <Badge Icon={actionMeta[item.actionTaken].Icon} className={actionMeta[item.actionTaken].badgeClassName}>
                                {actionMeta[item.actionTaken].label}
                              </Badge>
                            ) : (
                              <span className="text-sm font-semibold text-[#8a9abb]">-</span>
                            )}
                          </td>
                          <td className="border-t border-[#e8eef8] px-4 py-4 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => setSelectedViolation(item)}
                              className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#bfd2ec] bg-white text-sm font-semibold text-[#2a4f8f] transition duration-200 hover:-translate-y-0.5 hover:border-[#9ebce5] hover:bg-[#f3f8ff]"
                              aria-label="Xem chi tiết"
                              title="Xem chi tiết"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3 md:hidden">
                {visibleRows.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-[#d6e2f1] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="line-clamp-2 text-base font-bold text-[#1a2d52]">{item.typeName}</h2>
                        <p className="mt-1 text-sm font-semibold text-[#62789f]">{formatDate(item.violationDate)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedViolation(item)}
                        className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[#bfd2ec] bg-white text-[#2a4f8f]"
                        aria-label="Xem chi tiết"
                        title="Xem chi tiết"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-1 text-sm">
                      <p className="font-semibold text-[#1f3152]">{item.studentCode} - {item.fullName}</p>
                      <p className="text-[#5d7299]">{item.room} / {item.bed}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="whitespace-nowrap text-sm font-semibold text-[#1f3152]">{categoryMeta[item.category].label}</span>
                      {item.category === "negative" ? (
                        <Badge className={levelMeta[item.level].badgeClassName}>{levelMeta[item.level].label}</Badge>
                      ) : null}
                      {item.actionTaken ? (
                        <Badge Icon={actionMeta[item.actionTaken].Icon} className={actionMeta[item.actionTaken].badgeClassName}>
                          {actionMeta[item.actionTaken].label}
                        </Badge>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-[28px] border border-dashed border-[#cfdcf0] bg-[#f8fbff] px-6 py-10 text-center shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
              <p className="text-sm font-semibold text-[#1a2d52]">
                Không có dữ liệu hoạt động phù hợp với bộ lọc.
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
                      CHI TIẾT HOẠT ĐỘNG
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
                      THÔNG TIN HOẠT ĐỘNG
                    </h3>
                    <div className="mt-4 grid gap-x-6 gap-y-3 md:grid-cols-2">
                      <InfoLine label="Hoạt động" value={selectedViolation.typeName} />
                      <InfoLine label="Phân loại" value={categoryMeta[selectedViolation.category].label} />
                      {selectedViolation.category === "negative" ? (
                        <div className="flex flex-wrap items-center gap-2 text-sm text-[#5570a0]">
                          <span>Mức độ:</span>
                          <Badge className={levelMeta[selectedViolation.level].badgeClassName}>
                            {levelMeta[selectedViolation.level].label}
                          </Badge>
                        </div>
                      ) : null}
                      <InfoLine label="Ngày hoạt động" value={formatDate(selectedViolation.violationDate)} />
                      {selectedViolation.note.trim() ? (
                        <p className="text-sm text-[#5570a0] md:col-span-2">
                          Ghi chú:{" "}
                          <span className="break-all font-semibold text-[#1b3766]">{selectedViolation.note.trim()}</span>
                        </p>
                      ) : null}
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

    </>
  );
}
