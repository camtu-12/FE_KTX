import { motion } from "framer-motion";
import { CircleDollarSign, Eye, Funnel, Plus, X } from "lucide-react";
import type { ReactNode, WheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import {
  confirmRoomFeePayment,
  generateRoomFeeBills,
  getPaymentSettings,
  listRoomFeeBills,
  type PaymentStatus,
  type RoomFeeBill as ApiRoomFeeBill,
  updatePaymentSettings,
} from "../../../api/paymentApi";

type StatusFilter = PaymentStatus | "all";
type FilterMenuType = "month" | "year" | "status";

type RoomFeeForm = {
  month: string;
  year: string;
  dueDate: string;
};

type RoomFeeBill = {
  id: number;
  studentCode: string;
  fullName: string;
  room: string;
  month: number;
  year: number;
  amount: number;
  createdAt: string;
  dueDate: string;
  status: PaymentStatus;
  paidAt?: string;
};

const ROOM_FEE_PER_MONTH = 350000;

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const getTodayValue = () => new Date().toISOString().slice(0, 10);
const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);
const formatMoney = (value: number) => `${moneyFormatter.format(value)}đ`;

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "unpaid", label: "Chưa thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "overdue", label: "Quá hạn" },
];

const statusMeta: Record<PaymentStatus, { label: string; className: string }> = {
  unpaid: {
    label: "Chưa thanh toán",
    className: "border border-amber-200 bg-amber-50 text-amber-700",
  },
  paid: {
    label: "Đã thanh toán",
    className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  overdue: {
    label: "Quá hạn",
    className: "border border-rose-200 bg-rose-50 text-rose-700",
  },
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "-";
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatRoomName = (bill: ApiRoomFeeBill) =>
  bill.room ? `${bill.room.buildingCode}${bill.room.roomNumber}` : "-";

const mapRoomFeeBill = (bill: ApiRoomFeeBill): RoomFeeBill => ({
  id: bill.id,
  studentCode: bill.student?.studentCode || "-",
  fullName: bill.student?.fullName || "-",
  room: formatRoomName(bill),
  month: bill.month,
  year: bill.year,
  amount: bill.amount,
  createdAt: bill.createdAt,
  dueDate: bill.dueDate,
  status: bill.status,
  paidAt: bill.paidAt || undefined,
});

function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${statusMeta[status].className}`}>
      {statusMeta[status].label}
    </span>
  );
}

function InfoLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <p className="text-sm text-[#5570a0]">
      {label}: <span className="font-semibold text-[#1b3766]">{value}</span>
    </p>
  );
}

export default function AdminRoomFeePage() {
  const { headerSearchValue } = useOutletContext<AdminLayoutOutletContext>();
  const [bills, setBills] = useState<RoomFeeBill[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [draftStatusFilter, setDraftStatusFilter] = useState<StatusFilter>("all");
  const [monthFilter, setMonthFilter] = useState(String(currentMonth));
  const [draftMonthFilter, setDraftMonthFilter] = useState(String(currentMonth));
  const [yearFilter, setYearFilter] = useState(String(currentYear));
  const [draftYearFilter, setDraftYearFilter] = useState(String(currentYear));
  const [openFilterMenu, setOpenFilterMenu] = useState<FilterMenuType | null>(null);
  const [filterMenuPosition, setFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const monthFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const yearFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const statusFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<RoomFeeBill | null>(null);
  const [createResult, setCreateResult] = useState<{ createdCount: number; skippedCount: number } | null>(null);
  const [formError, setFormError] = useState("");
  const [feeError, setFeeError] = useState("");
  const [monthlyRoomFee, setMonthlyRoomFee] = useState(ROOM_FEE_PER_MONTH);
  const [feeFormValue, setFeeFormValue] = useState(String(ROOM_FEE_PER_MONTH));
  const [form, setForm] = useState<RoomFeeForm>({
    month: String(currentMonth),
    year: String(currentYear),
    dueDate: getTodayValue(),
  });
  const years = useMemo(() => Array.from(new Set([currentYear, ...bills.map((bill) => bill.year)])).sort((a, b) => b - a), [bills]);

  const loadBills = async () => {
    const data = await listRoomFeeBills();
    setBills(data.map(mapRoomFeeBill));
  };

  const loadSettings = async () => {
    const settings = await getPaymentSettings();
    setMonthlyRoomFee(settings.roomFeePerMonth);
    setFeeFormValue(String(settings.roomFeePerMonth));
  };

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      void loadBills();
      void loadSettings();
    }, 0);

    if (typeof window !== "undefined") {
      window.addEventListener("ktx-payments-updated", loadBills);
      window.addEventListener("focus", loadBills);
    }

    return () => {
      window.clearTimeout(initialLoadId);
      if (typeof window !== "undefined") {
        window.removeEventListener("ktx-payments-updated", loadBills);
        window.removeEventListener("focus", loadBills);
      }
    };
  }, []);

  const visibleBills = useMemo(() => {
    const normalizedHeaderSearch = headerSearchValue.trim().toLowerCase();

    return bills.filter((bill) => {
      const searchableText = [bill.studentCode, bill.fullName].join(" ").toLowerCase();
      const matchesHeaderSearch = !normalizedHeaderSearch || searchableText.includes(normalizedHeaderSearch);
      const matchesStatus = statusFilter === "all" || bill.status === statusFilter;
      const matchesMonth = bill.month === Number(monthFilter);
      const matchesYear = bill.year === Number(yearFilter);

      return matchesHeaderSearch && matchesStatus && matchesMonth && matchesYear;
    });
  }, [bills, headerSearchValue, monthFilter, statusFilter, yearFilter]);

  const totalCount = visibleBills.length;
  const unpaidCount = visibleBills.filter((bill) => bill.status === "unpaid").length;
  const paidCount = visibleBills.filter((bill) => bill.status === "paid").length;
  const overdueCount = visibleBills.filter((bill) => bill.status === "overdue").length;

  const summaryCards = [
    { label: "Tổng hóa đơn", value: totalCount, valueClassName: "text-[#244cb8]" },
    { label: "Chưa thanh toán", value: unpaidCount, valueClassName: "text-[#9b6b00]" },
    { label: "Đã thanh toán", value: paidCount, valueClassName: "text-[#16784b]" },
    { label: "Quá hạn", value: overdueCount, valueClassName: "text-[#c4364f]" },
  ];

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setFormError("");
  };

  const openCreateModal = () => {
    setForm({
      month: String(currentMonth),
      year: String(currentYear),
      dueDate: getTodayValue(),
    });
    setFormError("");
    setIsCreateOpen(true);
  };

  useEffect(() => {
    if (!openFilterMenu) {
      return;
    }

    const updateMenuPosition = () => {
      const currentButton =
        openFilterMenu === "month" ? monthFilterButtonRef.current : openFilterMenu === "year" ? yearFilterButtonRef.current : statusFilterButtonRef.current;
      const buttonRect = currentButton?.getBoundingClientRect();

      if (!buttonRect) {
        return;
      }

      setFilterMenuPosition({
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
  }, [openFilterMenu]);

  useEffect(() => {
    if (!createResult) {
      return;
    }

    const timeoutId = window.setTimeout(() => setCreateResult(null), 3600);

    return () => window.clearTimeout(timeoutId);
  }, [createResult]);

  const handleOpenFilter = (type: FilterMenuType) => {
    setDraftMonthFilter(monthFilter);
    setDraftYearFilter(yearFilter);
    setDraftStatusFilter(statusFilter);
    setOpenFilterMenu(type);
  };

  const handleResetFilter = () => {
    if (openFilterMenu === "month") {
      setDraftMonthFilter(String(currentMonth));
      setMonthFilter(String(currentMonth));
    }

    if (openFilterMenu === "year") {
      setDraftYearFilter(String(currentYear));
      setYearFilter(String(currentYear));
    }

    if (openFilterMenu === "status") {
      setDraftStatusFilter("all");
      setStatusFilter("all");
    }

    setOpenFilterMenu(null);
  };

  const handleApplyFilter = () => {
    if (openFilterMenu === "month") {
      setMonthFilter(draftMonthFilter);
    }

    if (openFilterMenu === "year") {
      setYearFilter(draftYearFilter);
    }

    if (openFilterMenu === "status") {
      setStatusFilter(draftStatusFilter);
    }

    setOpenFilterMenu(null);
  };

  const openFeeModal = () => {
    setFeeFormValue(String(monthlyRoomFee));
    setFeeError("");
    setIsFeeModalOpen(true);
  };

  const closeFeeModal = () => {
    setIsFeeModalOpen(false);
    setFeeError("");
  };

  const handleSaveFee = async () => {
    const nextFee = Number(feeFormValue);

    if (!Number.isInteger(nextFee) || nextFee <= 0) {
      setFeeError("Vui lòng nhập mức phí/tháng là số nguyên dương.");
      return;
    }

    try {
      const settings = await updatePaymentSettings({ room_fee_per_month: nextFee });
      setMonthlyRoomFee(settings.roomFeePerMonth);
      setFeeFormValue(String(settings.roomFeePerMonth));
      closeFeeModal();
    } catch {
      setFeeError("Không thể cập nhật mức phí. Vui lòng thử lại.");
    }
  };

  const handleCreateBills = async () => {
    const year = Number(form.year);
    const month = Number(form.month);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      setFormError("Vui lòng chọn tháng hợp lệ.");
      return;
    }

    if (!Number.isInteger(year) || year < 2020) {
      setFormError("Vui lòng nhập năm hợp lệ.");
      return;
    }

    if (!form.dueDate) {
      setFormError("Vui lòng chọn hạn thanh toán.");
      return;
    }

    try {
      const result = await generateRoomFeeBills({
        month,
        year,
        amount: monthlyRoomFee,
        due_date: form.dueDate,
      });

      setCreateResult({ createdCount: result.createdCount, skippedCount: result.skippedCount });
      await loadBills();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ktx-payments-updated"));
      }
      closeCreateModal();
    } catch {
      setFormError("Không thể tạo hóa đơn tháng. Vui lòng thử lại.");
    }
  };

  const confirmPayment = async (billId: number) => {
    try {
      const updated = mapRoomFeeBill(await confirmRoomFeePayment(billId, {
        payment_method: "Thủ công",
        paid_at: getTodayValue(),
      }));

      setBills((current) => current.map((bill) => (bill.id === billId ? updated : bill)));
      setSelectedBill((current) => (current?.id === billId ? updated : current));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ktx-payments-updated"));
      }
    } catch {
      setFormError("Không thể xác nhận thanh toán. Vui lòng thử lại.");
    }
  };

  const monthHeader = (
    <div className="inline-flex items-center justify-center gap-2">
      <span>Tháng</span>
      <button
        ref={monthFilterButtonRef}
        type="button"
        onClick={openFilterMenu === "month" ? () => setOpenFilterMenu(null) : () => handleOpenFilter("month")}
        className={`flex items-center justify-center transition ${monthFilter !== "all" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"}`}
        aria-label="Bật lọc tháng"
        title="Bật lọc tháng"
      >
        <Funnel className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const yearHeader = (
    <div className="inline-flex items-center justify-center gap-2">
      <span>Năm</span>
      <button
        ref={yearFilterButtonRef}
        type="button"
        onClick={openFilterMenu === "year" ? () => setOpenFilterMenu(null) : () => handleOpenFilter("year")}
        className={`flex items-center justify-center transition ${yearFilter !== "all" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"}`}
        aria-label="Bật lọc năm"
        title="Bật lọc năm"
      >
        <Funnel className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const statusHeader = (
    <div className="inline-flex items-center justify-center gap-2">
      <span>Trạng thái</span>
      <button
        ref={statusFilterButtonRef}
        type="button"
        onClick={openFilterMenu === "status" ? () => setOpenFilterMenu(null) : () => handleOpenFilter("status")}
        className={`flex items-center justify-center transition ${statusFilter !== "all" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"}`}
        aria-label="Bật lọc trạng thái"
        title="Bật lọc trạng thái"
      >
        <Funnel className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const activeFilterOptions =
    openFilterMenu === "month"
      ? monthOptions.map((month) => ({ value: String(month), label: String(month).padStart(2, "0") }))
      : openFilterMenu === "year"
        ? years.map((year) => ({ value: String(year), label: String(year) }))
        : statusOptions;

  const activeDraftFilter = openFilterMenu === "month" ? draftMonthFilter : openFilterMenu === "year" ? draftYearFilter : draftStatusFilter;
  const setActiveDraftFilter = (value: string) => {
    if (openFilterMenu === "month") {
      setDraftMonthFilter(value);
      return;
    }

    if (openFilterMenu === "year") {
      setDraftYearFilter(value);
      return;
    }

    setDraftStatusFilter(value as StatusFilter);
  };

  const handleFilterOverlayWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const scrollContainer = document.querySelector<HTMLElement>(".auth-scrollbar");

    if (scrollContainer) {
      scrollContainer.scrollBy({ top: event.deltaY, left: event.deltaX });
      return;
    }

    window.scrollBy({ top: event.deltaY, left: event.deltaX });
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Tiền phòng</h1>
              <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[#62789f] sm:text-sm">
                Quản lý hóa đơn tiền phòng theo tháng và xác nhận thanh toán thủ công.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 xl:items-end">
              <button
                type="button"
                onClick={openCreateModal}
                className="auth-btn-gloss inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
              >
                <Plus className="auth-btn-gloss__content h-4 w-4" />
                <span className="auth-btn-gloss__content">Tạo hóa đơn tháng</span>
              </button>
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <span className="inline-flex h-9 items-center gap-2 rounded-full border border-[#c8daf4] bg-[#eef6ff] px-3.5 text-sm font-semibold text-[#244cb8]">
                  <CircleDollarSign className="h-4 w-4" />
                  Phí hiện tại: {formatMoney(monthlyRoomFee)}/tháng
                </span>
                <button
                  type="button"
                  onClick={openFeeModal}
                  className="inline-flex h-9 items-center rounded-full border border-[#c8daf4] bg-white px-3.5 text-sm font-semibold text-[#244cb8] transition duration-200 hover:border-[#aac7ef] hover:bg-[#e4f0ff]"
                >
                  Cập nhật đơn giá
                </button>
              </div>
            </div>
          </div>

        </div>

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
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7c8fb5]">{card.label}</p>
              <p className={`mt-3 text-[2rem] font-extrabold leading-none ${card.valueClassName}`}>{card.value}</p>
            </motion.article>
          ))}
        </div>

        <PaymentTable
          headings={["MSSV", "Họ tên", "Phòng", "Tháng", "Năm", "Hạn thanh toán", "Trạng thái", "Hành động"]}
          headerContent={{ Tháng: monthHeader, Năm: yearHeader, "Trạng thái": statusHeader }}
          emptyMessage="Không có hóa đơn tiền phòng phù hợp với bộ lọc."
          rows={visibleBills.map((bill) => ({
            key: bill.id,
            cells: [
              <span className="text-[15px] font-semibold text-[#24407f]">{bill.studentCode}</span>,
              <span className="line-clamp-2 text-sm font-semibold text-[#1f3152]">{bill.fullName}</span>,
              bill.room,
              String(bill.month).padStart(2, "0"),
              bill.year,
              formatDate(bill.dueDate),
              <StatusBadge status={bill.status} />,
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBill(bill)}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#bfd2ec] bg-white px-2.5 py-2 text-xs font-semibold text-[#2a4f8f] transition duration-200 hover:-translate-y-0.5 hover:border-[#9ebce5] hover:bg-[#f3f8ff]"
                >
                  <Eye className="h-4 w-4" />
                  Xem chi tiết
                </button>
              </div>,
            ],
          }))}
        />
      </motion.section>

      {openFilterMenu && filterMenuPosition
        ? createPortal(
            <div
              className="fixed inset-0 z-[68]"
              onClick={() => setOpenFilterMenu(null)}
              onWheel={handleFilterOverlayWheel}
            >
              <div
                className={`absolute -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)] ${
                  openFilterMenu === "month" ? "w-[320px]" : "w-[230px]"
                }`}
                style={{ top: filterMenuPosition.top, left: filterMenuPosition.left }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={`${openFilterMenu === "month" ? "grid grid-cols-2 gap-x-2 gap-y-0.5" : "space-y-0.5"} p-2.5`}>
                  {activeFilterOptions.map((option) => {
                    const isSelected = activeDraftFilter === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setActiveDraftFilter(option.value)}
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
                    onClick={handleResetFilter}
                    className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyFilter}
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

      {createResult
        ? createPortal(
            <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center px-4">
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="rounded-[22px] border border-[#bfd4f2] bg-white px-6 py-4 text-center shadow-[0_24px_56px_rgba(27,56,122,0.24)]"
              >
                <p className="text-sm font-bold text-[#173a78]">Đã tạo {createResult.createdCount} hóa đơn mới.</p>
                <p className="mt-1 text-sm font-semibold text-[#5570a0]">Bỏ qua {createResult.skippedCount} hóa đơn đã tồn tại.</p>
              </motion.div>
            </div>,
            document.body,
          )
        : null}

      {isFeeModalOpen
        ? createPortal(
            <div className="fixed inset-0 z-[82] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
                className="w-full max-w-[460px] rounded-[26px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-bold uppercase text-[#7d90b5]">Cập nhật mức phí</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeFeeModal}
                    className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                    aria-label="Đóng"
                    title="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <label className="mt-2 block">
                  <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Mức phí/tháng</span>
                  <input
                    type="number"
                    min={1}
                    value={feeFormValue}
                    onChange={(event) => setFeeFormValue(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10"
                  />
                </label>
                {feeError ? <p className="mt-4 text-sm font-semibold text-[#cc3c4f]">{feeError}</p> : null}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={closeFeeModal} className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white">
                    Hủy
                  </button>
                  <button type="button" onClick={handleSaveFee} className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110">
                    <span className="auth-btn-gloss__content">Lưu</span>
                  </button>
                </div>
              </motion.div>
            </div>,
            document.body,
          )
        : null}

      {isCreateOpen
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
                className="w-full max-w-[560px] rounded-[26px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-bold uppercase text-[#7d90b5]">Tạo hóa đơn tháng</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                    aria-label="Đóng"
                    title="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Tháng</span>
                    <select value={form.month} onChange={(event) => setForm((current) => ({ ...current, month: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10">
                      {monthOptions.map((month) => (
                        <option key={month} value={month}>
                          Tháng {month}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Năm</span>
                    <input value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Hạn thanh toán</span>
                    <input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Mức phí hiện tại</span>
                    <input disabled value={`${formatMoney(monthlyRoomFee)}/tháng`} className="mt-2 h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-[#1b3766] shadow-sm outline-none" />
                  </label>
                </div>
                <p className="mt-4 rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-semibold text-[#2f5f9f]">
                  Hệ thống sẽ tạo hóa đơn cho tất cả sinh viên đang lưu trú trong kỳ đã chọn.
                </p>
                {formError ? <p className="mt-4 text-sm font-semibold text-[#cc3c4f]">{formError}</p> : null}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={closeCreateModal} className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white">
                    Hủy
                  </button>
                  <button type="button" onClick={handleCreateBills} className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110">
                    <span className="auth-btn-gloss__content">Sinh hóa đơn tháng</span>
                  </button>
                </div>
              </motion.div>
            </div>,
            document.body,
          )
        : null}

      {selectedBill
        ? createPortal(
            <div className="fixed inset-0 z-[78] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
                className="w-full max-w-[680px] rounded-[26px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-bold uppercase  text-[#7d90b5]">Chi tiết hóa đơn</p>
         
                  </div>
                  <button type="button" onClick={() => setSelectedBill(null)} className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]" aria-label="Đóng" title="Đóng">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                  <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                    <div className="space-y-3">
                      <InfoLine label="MSSV" value={selectedBill.studentCode} />
                      <InfoLine label="Họ tên" value={selectedBill.fullName} />
                      <InfoLine label="Phòng" value={selectedBill.room} />
                      <InfoLine label="Mức phí áp dụng" value={`${formatMoney(selectedBill.amount)}/tháng`} />
                      <InfoLine label="Trạng thái" value={<StatusBadge status={selectedBill.status} />} />
                    </div>
                    <div className="space-y-3">
                      <InfoLine label="Tháng" value={String(selectedBill.month).padStart(2, "0")} />
                      <InfoLine label="Năm" value={selectedBill.year} />
                      <InfoLine label="Ngày tạo hóa đơn" value={formatDate(selectedBill.createdAt)} />
                      <InfoLine label="Hạn thanh toán" value={formatDate(selectedBill.dueDate)} />
                      {selectedBill.status === "paid" && selectedBill.paidAt ? (
                        <InfoLine label="Ngày thanh toán" value={formatDate(selectedBill.paidAt)} />
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  {selectedBill.status === "unpaid" ? (
                    <button
                      type="button"
                      onClick={() => confirmPayment(selectedBill.id)}
                      className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#1f9a60_0%,#35bf7a_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(31,154,96,0.22)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
                    >
                      <span className="auth-btn-gloss__content">Xác nhận thanh toán</span>
                    </button>
                  ) : null}
                  <button type="button" onClick={() => setSelectedBill(null)} className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white">
                    Đóng
                  </button>
                </div>
              </motion.div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function PaymentTable({
  headings,
  rows,
  emptyMessage,
  headerContent,
}: {
  headings: string[];
  rows: Array<{ key: number; cells: ReactNode[] }>;
  emptyMessage: string;
  headerContent?: Partial<Record<string, ReactNode>>;
}) {
  return (
    <div className="overflow-x-auto rounded-[22px] border border-[#d6e2f1] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
      <table className="min-w-[1040px] table-fixed border-separate border-spacing-0">
        <thead>
          <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
            {headings.map((heading) => (
              <th key={heading} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                {headerContent?.[heading] ?? heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.key} className="transition hover:bg-[#f8fbff]">
                {row.cells.map((cell, index) => (
                  <td key={index} className="border-t border-[#e8eef8] px-3 py-3.5 text-center align-middle text-sm font-semibold text-[#5570a0]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headings.length} className="px-4 py-8 text-center text-sm font-semibold text-[#6f84ad]">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

