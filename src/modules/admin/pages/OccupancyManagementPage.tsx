import { motion } from "framer-motion";
import { CheckCircle2, CircleAlert, Clock3, Funnel, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import { type Occupancy, type OccupancyStatus } from "../../../mocks/occupancies";
import { getOccupancies, subscribeOccupancies, updateOccupancyById } from "../../../mocks/occupancyStore";
import { students, type Student, type StudentGender } from "../../../mocks/students";

type OccupancyStatusFilter = OccupancyStatus | "ALL";

const statusMeta: Record<
  OccupancyStatus,
  {
    label: string;
    badgeClassName: string;
    Icon: typeof CheckCircle2;
  }
> = {
  ACTIVE: {
    label: "Đang lưu trú",
    badgeClassName: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    Icon: CheckCircle2,
  },
  CHECKOUT_REQUESTED: {
    label: "Yêu cầu thôi ở",
    badgeClassName: "border border-amber-200 bg-amber-50 text-amber-700",
    Icon: Clock3,
  },
  CHECKED_OUT: {
    label: "Đã thôi ở",
    badgeClassName: "border border-slate-200 bg-slate-50 text-slate-600",
    Icon: CheckCircle2,
  },
  FORCED_CHECKOUT: {
    label: "Buộc thôi ở",
    badgeClassName: "border border-rose-200 bg-rose-50 text-rose-700",
    Icon: CircleAlert,
  },
};

const statusOptions: Array<{ value: OccupancyStatusFilter; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "ACTIVE", label: "Đang lưu trú" },
  { value: "CHECKOUT_REQUESTED", label: "Yêu cầu thôi ở" },
  { value: "CHECKED_OUT", label: "Đã thôi ở" },
  { value: "FORCED_CHECKOUT", label: "Buộc thôi ở" },
];

const getStatusMeta = (status: Occupancy["status"]) => statusMeta[status] ?? statusMeta.ACTIVE;

const formatDate = (iso: string) => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const uniqueSorted = <T extends string | number>(items: T[]) => {
  return Array.from(new Set(items)).sort((a, b) => String(a).localeCompare(String(b), "vi-VN", { numeric: true }));
};

const emptyValue = "-";

const getGenderLabel = (gender?: StudentGender) => {
  if (gender === "MALE") {
    return "Nam";
  }

  if (gender === "FEMALE") {
    return "Nữ";
  }

  return emptyValue;
};

const getStudentText = (student: Student | undefined, field: keyof Student) => {
  const value = student?.[field];

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return emptyValue;
};

export default function OccupancyManagementPage() {
  const { headerSearchValue } = useOutletContext<AdminLayoutOutletContext>();
  const [occupancyRows, setOccupancyRows] = useState<Occupancy[]>(() => getOccupancies());
  const [buildingFilter, setBuildingFilter] = useState("ALL");
  const [floorFilter, setFloorFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<OccupancyStatusFilter>("ALL");
  const [draftStatusFilter, setDraftStatusFilter] = useState<OccupancyStatusFilter>("ALL");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [statusFilterMenuPosition, setStatusFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const statusFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const [selectedOccupancy, setSelectedOccupancy] = useState<Occupancy | null>(null);
  const [forceCheckoutTarget, setForceCheckoutTarget] = useState<Occupancy | null>(null);
  const [forceCheckoutReason, setForceCheckoutReason] = useState("");
  const [forceCheckoutReasonError, setForceCheckoutReasonError] = useState("");

  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), []);
  const buildingOptions = useMemo(() => uniqueSorted(occupancyRows.map((item) => item.buildingCode)), [occupancyRows]);
  const floorOptions = useMemo(() => uniqueSorted(occupancyRows.map((item) => item.floorNumber)), [occupancyRows]);
  const visibleOccupancies = useMemo(() => {
    const normalizedSearch = headerSearchValue.trim().toLowerCase();

    return occupancyRows.filter((item) => {
      const matchesBuilding = buildingFilter === "ALL" || item.buildingCode === buildingFilter;
      const matchesFloor = floorFilter === "ALL" || String(item.floorNumber) === floorFilter;
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const student = studentById.get(item.studentId);
      const matchesSearch =
        !normalizedSearch ||
        [student?.studentCode, student?.fullName].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearch);

      return matchesBuilding && matchesFloor && matchesStatus && matchesSearch;
    });
  }, [buildingFilter, floorFilter, headerSearchValue, occupancyRows, statusFilter, studentById]);

  const activeCount = occupancyRows.filter((item) => item.status === "ACTIVE").length;
  const checkoutRequestedCount = occupancyRows.filter((item) => item.status === "CHECKOUT_REQUESTED").length;
  const checkedOutCount = occupancyRows.filter((item) => item.status === "CHECKED_OUT").length;
  const selectedStudent = selectedOccupancy ? studentById.get(selectedOccupancy.studentId) : undefined;

  const summaryCards = [
    {
      label: "Đang lưu trú",
      value: activeCount,
      valueClassName: "text-[#16784b]",
      delay: 0.12,
    },
    {
      label: "Yêu cầu thôi ở",
      value: checkoutRequestedCount,
      valueClassName: "text-[#9b6b00]",
      delay: 0.18,
    },
    {
      label: "Đã thôi ở",
      value: checkedOutCount,
      valueClassName: "text-[#667085]",
      delay: 0.24,
    },
    {
      label: "Tổng lưu trú",
      value: occupancyRows.length,
      valueClassName: "text-[#244cb8]",
      delay: 0.3,
    },
  ];

  useEffect(() => {
    return subscribeOccupancies(setOccupancyRows);
  }, []);

  useEffect(() => {
    if (!isStatusFilterOpen) {
      return;
    }

    const updateMenuPosition = () => {
      const buttonRect = statusFilterButtonRef.current?.getBoundingClientRect();

      if (!buttonRect) {
        return;
      }

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

  const updateOccupancyStatus = (id: number, status: OccupancyStatus, forcedCheckoutReason?: string) => {
    const getUpdatedOccupancy = (item: Occupancy) => {
      if (item.id !== id) {
        return item;
      }

      if (status === "FORCED_CHECKOUT") {
        return { ...item, status, forcedCheckoutReason };
      }

      return { ...item, status, forcedCheckoutReason: undefined };
    };

    const updatedOccupancy = updateOccupancyById(id, status, forcedCheckoutReason);
    setSelectedOccupancy((current) => {
      if (!current || current.id !== id) {
        return current;
      }

      return updatedOccupancy ?? getUpdatedOccupancy(current);
    });
  };

  const handleForceCheckout = (item: Occupancy) => {
    setForceCheckoutTarget(item);
    setForceCheckoutReason("");
    setForceCheckoutReasonError("");
  };

  const handleCloseForceCheckoutModal = () => {
    setForceCheckoutTarget(null);
    setForceCheckoutReason("");
    setForceCheckoutReasonError("");
  };

  const handleConfirmForceCheckout = () => {
    const trimmedReason = forceCheckoutReason.trim();

    if (!trimmedReason) {
      setForceCheckoutReasonError("Vui lòng nhập lý do buộc thôi ở.");
      return;
    }

    if (forceCheckoutTarget) {
      updateOccupancyStatus(forceCheckoutTarget.id, "FORCED_CHECKOUT", trimmedReason);
    }

    handleCloseForceCheckoutModal();
  };

  const handleOpenDetail = (item: Occupancy) => {
    setSelectedOccupancy(item);
    setIsStatusFilterOpen(false);
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
          transition={{ duration: 0.2 }}
          className="auth-reveal is-visible rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-sm transition-all duration-300 ease-out hover:shadow-[0_24px_56px_rgba(36,76,184,0.14)] sm:px-8"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">
                Quản lý lưu trú
              </h1>
              <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[#62789f] sm:text-sm">
                Theo dõi danh sách sinh viên đang lưu trú, trạng thái thôi ở và thông tin phòng giường.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[420px]">
              <label className="block">
                <select
                  value={buildingFilter}
                  onChange={(event) => setBuildingFilter(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-3 text-sm font-semibold text-[#1f3152] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
                >
                  <option value="ALL">Tất cả tòa</option>
                  {buildingOptions.map((building) => (
                    <option key={building} value={building}>
                      Tòa {building}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <select
                  value={floorFilter}
                  onChange={(event) => setFloorFilter(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-[#d6e2f1] bg-[#f8fbff] px-3 text-sm font-semibold text-[#1f3152] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
                >
                  <option value="ALL">Tất cả tầng</option>
                  {floorOptions.map((floor) => (
                    <option key={floor} value={floor}>
                      Tầng {floor}
                    </option>
                  ))}
                </select>
              </label>

            </div>
          </div>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <motion.article
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: card.delay, ease: "easeOut" }}
              className="flex flex-col items-center rounded-[24px] border border-[#d8e4f5] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-5 py-4 text-center shadow-[0_14px_30px_rgba(36,76,184,0.08)]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7c8fb5]">
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
          transition={{ duration: 0.46, delay: 0.16, ease: "easeOut" }}
          className="relative mt-1 min-h-[420px] overflow-hidden rounded-[14px] border border-[#d6e2f1] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.10)]"
        >
          <table className="min-w-[860px] w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[24%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[22%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  MSSV
                </th>
                <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  Họ tên
                </th>
                <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  Phòng
                </th>
                <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  Giường
                </th>
                <th className="relative z-30 px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  <div className="inline-flex items-center justify-center gap-2">
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
                  </div>
                </th>
                <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleOccupancies.length > 0 ? (
                visibleOccupancies.map((item, index) => {
                  const meta = getStatusMeta(item.status);
                  const StatusIcon = meta.Icon;
                  const student = studentById.get(item.studentId);

                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 + index * 0.035, ease: "easeOut" }}
                      className="group transition duration-200 hover:bg-[#f8fbff]"
                    >
                      <td className="border-t border-[#e8eef8] px-3 py-4 text-center text-[15px] font-semibold text-[#24407f]">
                        {student?.studentCode ?? emptyValue}
                      </td>
                      <td className="border-t border-[#e8eef8] px-3 py-4 text-center text-sm font-semibold text-[#1f3152]">
                        <span className="line-clamp-2">{student?.fullName ?? emptyValue}</span>
                      </td>
                      <td className="border-t border-[#e8eef8] px-3 py-4 text-center text-sm font-semibold text-[#6d7fa6]">
                        {item.buildingCode}
                        {item.roomNumber}
                      </td>
                      <td className="border-t border-[#e8eef8] px-3 py-4 text-center text-sm font-semibold text-[#5a6f98]">
                        #{item.bedNumber}
                      </td>
                      <td className="border-t border-[#e8eef8] px-3 py-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${meta.badgeClassName}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="border-t border-[#e8eef8] px-3 py-4 text-center">
                        <div className="flex flex-nowrap items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item)}
                            className="auth-btn-gloss inline-flex min-w-[92px] items-center justify-center whitespace-nowrap rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-2.5 py-2 text-[12px] font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
                          >
                            <span className="auth-btn-gloss__content">Xem chi tiết</span>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="border-t border-[#e8eef8] px-4 py-14 text-center text-sm font-semibold text-[#5c7094]">
                    Không có dữ liệu lưu trú phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.div>
      </motion.section>

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
                          className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                            isSelected ? "border-[#244cb8] bg-[#244cb8]/10" : "border-[#cfd9e8] bg-white"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-[#244cb8]" : "bg-transparent"}`} />
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

      {selectedOccupancy
          ? createPortal(
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="fixed inset-0 z-[72] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative w-full max-w-[800px] rounded-[28px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_72%,#e7f0ff_100%)] p-6 shadow-[0_28px_70px_rgba(27,56,122,0.28)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7d90b5]">
                        CHI TIẾT LƯU TRÚ
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOccupancy(null)}
                      className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-2 space-y-4">
                    <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                      <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                        THÔNG TIN SINH VIÊN
                      </h4>
                      <div className="mt-4 grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                        <p className="text-[#5570a0]">
                          MSSV: <span className="font-semibold text-[#1b3766]">{selectedStudent?.studentCode ?? emptyValue}</span>
                        </p>
                        <p className="text-[#5570a0]">
                          Họ tên: <span className="font-semibold text-[#1b3766]">{selectedStudent?.fullName ?? emptyValue}</span>
                        </p>
                        <p className="text-[#5570a0]">
                          Giới tính: <span className="font-semibold text-[#1b3766]">{getGenderLabel(selectedStudent?.gender)}</span>
                        </p>
                        <p className="text-[#5570a0]">
                          Ngày sinh:{" "}
                          <span className="font-semibold text-[#1b3766]">
                            {selectedStudent?.dateOfBirth ? formatDate(selectedStudent.dateOfBirth) : emptyValue}
                          </span>
                        </p>
                        <p className="text-[#5570a0]">
                          Lớp: <span className="font-semibold text-[#1b3766]">{getStudentText(selectedStudent, "className")}</span>
                        </p>
                        <p className="text-[#5570a0]">
                          Khoa: <span className="font-semibold text-[#1b3766]">{getStudentText(selectedStudent, "faculty")}</span>
                        </p>
                        <p className="text-[#5570a0]">
                          Email: <span className="font-semibold text-[#1b3766]">{getStudentText(selectedStudent, "email")}</span>
                        </p>
                        <p className="text-[#5570a0]">
                          Số điện thoại: <span className="font-semibold text-[#1b3766]">{getStudentText(selectedStudent, "phone")}</span>
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                      <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                        THÔNG TIN LƯU TRÚ
                      </h4>
                      <div className="mt-4 grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                        <p className="text-[#5570a0]">
                          Tòa: <span className="font-semibold text-[#1b3766]">{selectedOccupancy.buildingCode}</span>
                        </p>
                        <p className="text-[#5570a0]">
                          Tầng: <span className="font-semibold text-[#1b3766]">{selectedOccupancy.floorNumber}</span>
                        </p>
                        <p className="text-[#5570a0]">
                          Phòng: <span className="font-semibold text-[#1b3766]">{selectedOccupancy.roomNumber}</span>
                        </p>
                        <p className="text-[#5570a0]">
                          Giường: <span className="font-semibold text-[#1b3766]">#{selectedOccupancy.bedNumber}</span>
                        </p>
                        <p className="text-[#5570a0]">
                          Ngày nhận phòng:{" "}
                          <span className="font-semibold text-[#1b3766]">{formatDate(selectedOccupancy.checkInDate)}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[#5570a0]">
                          <span>Trạng thái lưu trú:</span>
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                              getStatusMeta(selectedOccupancy.status).badgeClassName
                            }`}
                          >
                            {getStatusMeta(selectedOccupancy.status).label}
                          </span>
                        </div>
                        {selectedOccupancy.status === "FORCED_CHECKOUT" ? (
                          <p className="text-[#5570a0] md:col-span-2">
                            Lý do buộc thôi ở:{" "}
                            <span className="font-semibold text-[#1b3766]">
                              {selectedOccupancy.forcedCheckoutReason?.trim() || emptyValue}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {selectedOccupancy.status === "CHECKOUT_REQUESTED" ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                        <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-amber-700">
                          THÔNG TIN YÊU CẦU THÔI Ở
                        </h4>
                        <div className="mt-4 grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                          <p className="text-amber-800">
                            Ngày gửi yêu cầu:{" "}
                            <span className="font-semibold">
                              {selectedOccupancy.leaveRequest?.requestedAt
                                ? formatDate(selectedOccupancy.leaveRequest.requestedAt)
                                : emptyValue}
                            </span>
                          </p>
                          <p className="text-amber-800">
                            Ngày dự kiến rời KTX:{" "}
                            <span className="font-semibold">
                              {selectedOccupancy.leaveRequest?.expectedLeaveDate
                                ? formatDate(selectedOccupancy.leaveRequest.expectedLeaveDate)
                                : emptyValue}
                            </span>
                          </p>
                          <p className="text-amber-800 md:col-span-2">
                            Lý do:{" "}
                            <span className="font-semibold">{selectedOccupancy.leaveRequest?.reason?.trim() || emptyValue}</span>
                          </p>
                          <p className="text-amber-800 md:col-span-2">
                            Ghi chú:{" "}
                            <span className="font-semibold">{selectedOccupancy.leaveRequest?.note?.trim() || emptyValue}</span>
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                    <div className="flex flex-wrap justify-end gap-3">
                    {selectedOccupancy.status === "ACTIVE" ? (
                      <button
                        type="button"
                        onClick={() => handleForceCheckout(selectedOccupancy)}
                        className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(204,60,79,0.22)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105"
                      >
                        <span className="auth-btn-gloss__content">Buộc thôi ở</span>
                      </button>
                    ) : null}

                    {selectedOccupancy.status === "CHECKOUT_REQUESTED" ? (
                        <button
                          type="button"
                          onClick={() => updateOccupancyStatus(selectedOccupancy.id, "CHECKED_OUT")}
                          className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#1f9a60_0%,#35bf7a_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(31,154,96,0.22)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
                        >
                          <span className="auth-btn-gloss__content">Xác nhận thôi ở</span>
                        </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setSelectedOccupancy(null)}
                      className="rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
                    >
                      Đóng
                    </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>,
              document.body,
            )
          : null}

      {forceCheckoutTarget
        ? createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-[82] flex items-center justify-center bg-[rgba(14,25,48,0.50)] px-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.98 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
                className="w-full max-w-[560px] rounded-[26px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="mt-2 text-2xl font-bold text-[#173a78]">Buộc thôi ở</h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseForceCheckoutModal}
                    className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5">
                  <label className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]" htmlFor="force-checkout-reason">
                    Lý do:
                  </label>
                  <textarea
                    id="force-checkout-reason"
                    value={forceCheckoutReason}
                    onChange={(event) => {
                      setForceCheckoutReason(event.target.value);
                      if (forceCheckoutReasonError) {
                        setForceCheckoutReasonError("");
                      }
                    }}
                    rows={5}
                    className="mt-3 w-full resize-none rounded-2xl border border-[#d3e0f2] bg-white/80 px-4 py-3 text-sm font-semibold text-[#1b3766] outline-none transition placeholder:text-[#9aabc9] focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
                    placeholder="Nhập lý do để lưu lại trong hồ sơ lưu trú..."
                  />
                  {forceCheckoutReasonError ? (
                    <p className="mt-2 text-sm font-semibold text-[#cc3c4f]">{forceCheckoutReasonError}</p>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseForceCheckoutModal}
                    className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmForceCheckout}
                    className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#e25569_0%,#cc3c4f_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(204,60,79,0.22)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105"
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
