import { motion } from "framer-motion";
import { CircleDollarSign, Eye, Funnel, Plus, X } from "lucide-react";
import type { ReactNode, WheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext, useSearchParams } from "react-router-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import {
  applyOneTimeDiscount,
  confirmRoomFeePayment,
  exemptRoomFeeBill,
  generateRoomFeeBills,
  getPaymentSettings,
  listRoomFeeBills,
  type PaymentStatus,
  type RoomFeeBill as ApiRoomFeeBill,
  updatePaymentSettings,
} from "../../../api/paymentApi";
import { formatDate } from "../../../utils/dateFormat";
import StudentPaymentPlanModal from "../components/StudentPaymentPlanModal";

type StatusFilter = PaymentStatus | "all";
type FilterMenuType = "room" | "quarter" | "year" | "status";

type RoomFeeForm = {
  quarter: string;
  year: string;
  dueDate: string;
};

type RoomFeeBill = {
  id: number;
  studentId: number;
  studentCode: string;
  fullName: string;
  room: string;
  month: number;
  year: number;
  isQuarterly: boolean;
  amount: number;
  originalAmount: number | null;
  discountPercent: number | null;
  discountReason: string | null;
  adminNote: string | null;
  createdAt: string;
  dueDate: string;
  status: PaymentStatus;
  paidAt?: string;
};

const QUARTER_MONTHS: Record<string, number[]> = {
  "1": [1, 2, 3],
  "2": [4, 5, 6],
  "3": [7, 8, 9],
  "4": [10, 11, 12],
};

const getQuarterFromMonth = (month: number) => Math.ceil(month / 3);

const BILLING_RULES = [
  "Thu tiền theo quý (3 tháng/lần).",
  "Vào giữa tháng: đóng full tháng đó + tiền cả quý tiếp theo.",
  "Không hoàn tiền khi sinh viên rời ký túc xá trước hạn.",
  "Rời vào tháng 11 (quý 4): không hoàn tiền tháng 12.",
];

const quarterOptions = [
  { value: "1", label: "Quý 1 (Tháng 1–3)" },
  { value: "2", label: "Quý 2 (Tháng 4–6)" },
  { value: "3", label: "Quý 3 (Tháng 7–9)" },
  { value: "4", label: "Quý 4 (Tháng 10–12)" },
];

const ROOM_FEE_PER_MONTH = 350000;

const moneyFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const currentQuarter = getQuarterFromMonth(currentMonth);
const getTodayValue = () => new Date().toISOString().slice(0, 10);
const formatMoney = (value: number) => `${moneyFormatter.format(value)}đ`;

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "unpaid", label: "Chưa thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "overdue", label: "Quá hạn" },
  { value: "exempted", label: "Đã miễn" },
];

const statusMeta: Record<PaymentStatus, { label: string; className: string }> = {
  unpaid: { label: "Chưa thanh toán", className: "border border-amber-200 bg-amber-50 text-amber-700" },
  paid: { label: "Đã thanh toán", className: "border border-emerald-200 bg-emerald-50 text-emerald-700" },
  overdue: { label: "Quá hạn", className: "border border-rose-200 bg-rose-50 text-rose-700" },
  exempted: { label: "Đã miễn", className: "border border-sky-200 bg-sky-50 text-sky-700" },
};

const formatRoomName = (bill: ApiRoomFeeBill) =>
  bill.room ? `${bill.room.buildingCode}${bill.room.roomNumber}` : "-";

const mapRoomFeeBill = (bill: ApiRoomFeeBill): RoomFeeBill => ({
  id: bill.id,
  studentId: bill.studentId,
  studentCode: bill.student?.studentCode || "-",
  fullName: bill.student?.fullName || "-",
  room: formatRoomName(bill),
  month: bill.month,
  year: bill.year,
  isQuarterly: bill.isQuarterly,
  amount: bill.amount,
  originalAmount: bill.originalAmount ?? null,
  discountPercent: bill.discountPercent ?? null,
  discountReason: bill.discountReason ?? null,
  adminNote: bill.adminNote ?? null,
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
  const [searchParams] = useSearchParams();
  const queryStatus = searchParams.get("status");
  const queryYear = searchParams.get("year");
  const initialStatusFilter: StatusFilter =
    queryStatus === "unpaid" || queryStatus === "paid" || queryStatus === "overdue" || queryStatus === "exempted"
      ? queryStatus
      : "all";
  const initialYearFilter =
    queryYear && Number(queryYear) >= 2020 && Number(queryYear) <= 2100 ? String(Number(queryYear)) : String(currentYear);

  const [bills, setBills] = useState<RoomFeeBill[]>([]);
  const [roomFilter, setRoomFilter] = useState("all");
  const [draftRoomFilter, setDraftRoomFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [draftStatusFilter, setDraftStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [quarterFilter, setQuarterFilter] = useState("all");
  const [draftQuarterFilter, setDraftQuarterFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState(initialYearFilter);
  const [draftYearFilter, setDraftYearFilter] = useState(initialYearFilter);
  const [openFilterMenu, setOpenFilterMenu] = useState<FilterMenuType | null>(null);
  const [filterMenuPosition, setFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const roomFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const quarterFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const yearFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const statusFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<RoomFeeBill | null>(null);
  const [createResult, setCreateResult] = useState<{ createdCount: number; skippedCount: number } | null>(null);
  const [formError, setFormError] = useState("");
  const [feeError, setFeeError] = useState("");
  const [isExemptFormOpen, setIsExemptFormOpen] = useState(false);
  const [exemptNote, setExemptNote] = useState("");
  const [exemptError, setExemptError] = useState("");
  const [isDiscountFormOpen, setIsDiscountFormOpen] = useState(false);
  const [discountFormValue, setDiscountFormValue] = useState("");
  const [discountReasonValue, setDiscountReasonValue] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [monthlyRoomFee, setMonthlyRoomFee] = useState(ROOM_FEE_PER_MONTH);
  const [feeFormValue, setFeeFormValue] = useState(String(ROOM_FEE_PER_MONTH));
  const [form, setForm] = useState<RoomFeeForm>({
    quarter: String(currentQuarter),
    year: String(currentYear),
    dueDate: getTodayValue(),
  });

  const years = useMemo(
    () => Array.from(new Set([currentYear, ...bills.map((b) => b.year)])).sort((a, b) => b - a),
    [bills],
  );
  const roomOptions = useMemo(
    () =>
      Array.from(new Set(bills.map((b) => b.room).filter((r) => r && r !== "-"))).sort((a, b) =>
        a.localeCompare(b, "vi", { numeric: true }),
      ),
    [bills],
  );

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
    const id = window.setTimeout(() => {
      void loadBills();
      void loadSettings();
    }, 0);
    window.addEventListener("ktx-payments-updated", loadBills);
    window.addEventListener("focus", loadBills);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("ktx-payments-updated", loadBills);
      window.removeEventListener("focus", loadBills);
    };
  }, []);

  const visibleBills = useMemo(() => {
    const q = headerSearchValue.trim().toLowerCase();
    return bills.filter((bill) => {
      const text = [bill.studentCode, bill.fullName].join(" ").toLowerCase();
      return (
        (!q || text.includes(q)) &&
        (roomFilter === "all" || bill.room === roomFilter) &&
        (statusFilter === "all" || bill.status === statusFilter) &&
        (quarterFilter === "all" || getQuarterFromMonth(bill.month) === Number(quarterFilter)) &&
        (yearFilter === "all" || bill.year === Number(yearFilter))
      );
    });
  }, [bills, headerSearchValue, quarterFilter, roomFilter, statusFilter, yearFilter]);

  const totalCount = visibleBills.length;
  const unpaidCount = visibleBills.filter((b) => b.status === "unpaid").length;
  const paidCount = visibleBills.filter((b) => b.status === "paid").length;
  const overdueCount = visibleBills.filter((b) => b.status === "overdue").length;

  const summaryCards = [
    { label: "Tổng hóa đơn", value: totalCount, valueClassName: "text-[#244cb8]" },
    { label: "Chưa thanh toán", value: unpaidCount, valueClassName: "text-[#9b6b00]" },
    { label: "Đã thanh toán", value: paidCount, valueClassName: "text-[#16784b]" },
    { label: "Quá hạn", value: overdueCount, valueClassName: "text-[#c4364f]" },
  ];

  const closeCreateModal = () => { setIsCreateOpen(false); setFormError(""); };
  const openCreateModal = () => {
    setForm({ quarter: String(currentQuarter), year: String(currentYear), dueDate: getTodayValue() });
    setFormError("");
    setIsCreateOpen(true);
  };

  useEffect(() => {
    if (!openFilterMenu) return;
    const update = () => {
      const btn =
        openFilterMenu === "room" ? roomFilterButtonRef.current
        : openFilterMenu === "quarter" ? quarterFilterButtonRef.current
        : openFilterMenu === "year" ? yearFilterButtonRef.current
        : statusFilterButtonRef.current;
      const rect = btn?.getBoundingClientRect();
      if (!rect) return;
      setFilterMenuPosition({ top: rect.bottom + 10, left: rect.left + rect.width / 2 });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [openFilterMenu]);

  useEffect(() => {
    if (!createResult) return;
    const id = window.setTimeout(() => setCreateResult(null), 3600);
    return () => window.clearTimeout(id);
  }, [createResult]);

  const handleOpenFilter = (type: FilterMenuType) => {
    setDraftRoomFilter(roomFilter);
    setDraftQuarterFilter(quarterFilter);
    setDraftYearFilter(yearFilter);
    setDraftStatusFilter(statusFilter);
    setOpenFilterMenu(type);
  };

  const handleResetFilter = () => {
    if (openFilterMenu === "room") { setDraftRoomFilter("all"); setRoomFilter("all"); }
    if (openFilterMenu === "quarter") { setDraftQuarterFilter("all"); setQuarterFilter("all"); }
    if (openFilterMenu === "year") { setDraftYearFilter("all"); setYearFilter("all"); }
    if (openFilterMenu === "status") { setDraftStatusFilter("all"); setStatusFilter("all"); }
    setOpenFilterMenu(null);
  };

  const handleApplyFilter = () => {
    if (openFilterMenu === "room") setRoomFilter(draftRoomFilter);
    if (openFilterMenu === "quarter") setQuarterFilter(draftQuarterFilter);
    if (openFilterMenu === "year") setYearFilter(draftYearFilter);
    if (openFilterMenu === "status") setStatusFilter(draftStatusFilter);
    setOpenFilterMenu(null);
  };

  const openFeeModal = () => { setFeeFormValue(String(monthlyRoomFee)); setFeeError(""); setIsFeeModalOpen(true); };
  const closeFeeModal = () => { setIsFeeModalOpen(false); setFeeError(""); };

  const handleSaveFee = async () => {
    const nextFee = Number(feeFormValue);
    if (!Number.isInteger(nextFee) || nextFee <= 0) { setFeeError("Vui lòng nhập mức phí/tháng là số nguyên dương."); return; }
    try {
      const settings = await updatePaymentSettings({ room_fee_per_month: nextFee });
      setMonthlyRoomFee(settings.roomFeePerMonth);
      setFeeFormValue(String(settings.roomFeePerMonth));
      closeFeeModal();
    } catch { setFeeError("Không thể cập nhật mức phí. Vui lòng thử lại."); }
  };

  const handleCreateBills = async () => {
    const year = Number(form.year);
    const months = QUARTER_MONTHS[form.quarter] ?? [];
    const firstMonth = months[0];
    if (!firstMonth) { setFormError("Vui lòng chọn quý hợp lệ."); return; }
    if (!Number.isInteger(year) || year < 2020) { setFormError("Vui lòng nhập năm hợp lệ."); return; }
    if (!form.dueDate) { setFormError("Vui lòng chọn hạn thanh toán."); return; }
    try {
      // Tạo 1 hóa đơn duy nhất mỗi quý, số tiền = phí tháng × 3
      const result = await generateRoomFeeBills({
        month: firstMonth,
        year,
        amount: monthlyRoomFee * 3,
        due_date: form.dueDate,
      });
      setCreateResult({ createdCount: result.createdCount, skippedCount: result.skippedCount });
      await loadBills();
      window.dispatchEvent(new Event("ktx-payments-updated"));
      closeCreateModal();
    } catch { setFormError("Không thể tạo hóa đơn quý. Vui lòng thử lại."); }
  };

  const confirmPayment = async (billId: number) => {
    try {
      const updated = mapRoomFeeBill(await confirmRoomFeePayment(billId, { payment_method: "Thủ công", paid_at: getTodayValue() }));
      setBills((cur) => cur.map((b) => (b.id === billId ? updated : b)));
      setSelectedBill((cur) => (cur?.id === billId ? updated : cur));
      window.dispatchEvent(new Event("ktx-payments-updated"));
    } catch { setFormError("Không thể xác nhận thanh toán. Vui lòng thử lại."); }
  };

  const openExemptForm = () => { setExemptNote(""); setExemptError(""); setIsExemptFormOpen(true); };
  const closeExemptForm = () => { setIsExemptFormOpen(false); setExemptError(""); };

  const handleExemptBill = async () => {
    if (!selectedBill) return;
    try {
      const updated = mapRoomFeeBill(await exemptRoomFeeBill(selectedBill.id, { admin_note: exemptNote || undefined }));
      setBills((cur) => cur.map((b) => (b.id === selectedBill.id ? updated : b)));
      setSelectedBill(updated);
      window.dispatchEvent(new Event("ktx-payments-updated"));
      setIsExemptFormOpen(false);
    } catch { setExemptError("Không thể miễn hóa đơn này. Vui lòng thử lại."); }
  };

  const openDiscountForm = () => { setDiscountFormValue(""); setDiscountReasonValue(""); setDiscountError(""); setIsDiscountFormOpen(true); };
  const closeDiscountForm = () => { setIsDiscountFormOpen(false); setDiscountError(""); };

  const handleApplyDiscount = async () => {
    if (!selectedBill) return;
    const percent = Number(discountFormValue);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      setDiscountError("Vui lòng nhập % giảm hợp lệ (0-100).");
      return;
    }
    try {
      const updated = mapRoomFeeBill(
        await applyOneTimeDiscount(selectedBill.id, { discount_percent: percent, reason: discountReasonValue || undefined }),
      );
      setBills((cur) => cur.map((b) => (b.id === selectedBill.id ? updated : b)));
      setSelectedBill(updated);
      window.dispatchEvent(new Event("ktx-payments-updated"));
      setIsDiscountFormOpen(false);
    } catch { setDiscountError("Không thể giảm giá hóa đơn này. Vui lòng thử lại."); }
  };

  const roomHeader = (
    <div className="inline-flex items-center justify-center gap-2">
      <span>Phòng</span>
      <button ref={roomFilterButtonRef} type="button" onClick={openFilterMenu === "room" ? () => setOpenFilterMenu(null) : () => handleOpenFilter("room")} className={`flex items-center justify-center transition ${roomFilter !== "all" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"}`} aria-label="Lọc phòng"><Funnel className="h-3.5 w-3.5" /></button>
    </div>
  );

  const quarterHeader = (
    <div className="inline-flex items-center justify-center gap-2">
      <span>Quý</span>
      <button ref={quarterFilterButtonRef} type="button" onClick={openFilterMenu === "quarter" ? () => setOpenFilterMenu(null) : () => handleOpenFilter("quarter")} className={`flex items-center justify-center transition ${quarterFilter !== "all" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"}`} aria-label="Lọc quý"><Funnel className="h-3.5 w-3.5" /></button>
    </div>
  );

  const yearHeader = (
    <div className="inline-flex items-center justify-center gap-2">
      <span>Năm</span>
      <button ref={yearFilterButtonRef} type="button" onClick={openFilterMenu === "year" ? () => setOpenFilterMenu(null) : () => handleOpenFilter("year")} className={`flex items-center justify-center transition ${yearFilter !== "all" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"}`} aria-label="Lọc năm"><Funnel className="h-3.5 w-3.5" /></button>
    </div>
  );

  const statusHeader = (
    <div className="inline-flex items-center justify-center gap-2">
      <span>Trạng thái</span>
      <button ref={statusFilterButtonRef} type="button" onClick={openFilterMenu === "status" ? () => setOpenFilterMenu(null) : () => handleOpenFilter("status")} className={`flex items-center justify-center transition ${statusFilter !== "all" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"}`} aria-label="Lọc trạng thái"><Funnel className="h-3.5 w-3.5" /></button>
    </div>
  );

  const activeFilterOptions =
    openFilterMenu === "room"
      ? [{ value: "all", label: "Tất cả" }, ...roomOptions.map((r) => ({ value: r, label: r }))]
      : openFilterMenu === "quarter"
        ? [{ value: "all", label: "Tất cả" }, ...quarterOptions]
        : openFilterMenu === "year"
          ? [{ value: "all", label: "Tất cả" }, ...years.map((y) => ({ value: String(y), label: String(y) }))]
          : statusOptions;

  const activeDraftFilter =
    openFilterMenu === "room" ? draftRoomFilter
    : openFilterMenu === "quarter" ? draftQuarterFilter
    : openFilterMenu === "year" ? draftYearFilter
    : draftStatusFilter;

  const setActiveDraftFilter = (value: string) => {
    if (openFilterMenu === "room") { setDraftRoomFilter(value); return; }
    if (openFilterMenu === "quarter") { setDraftQuarterFilter(value); return; }
    if (openFilterMenu === "year") { setDraftYearFilter(value); return; }
    setDraftStatusFilter(value as StatusFilter);
  };

  const handleFilterOverlayWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sc = document.querySelector<HTMLElement>(".auth-scrollbar");
    if (sc) { sc.scrollBy({ top: event.deltaY, left: event.deltaX }); return; }
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
                Quản lý hóa đơn tiền phòng theo quý và xác nhận thanh toán thủ công.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 xl:items-end">
              <button type="button" onClick={openCreateModal} className="auth-btn-gloss inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110">
                <Plus className="auth-btn-gloss__content h-4 w-4" />
                <span className="auth-btn-gloss__content">Tạo hóa đơn quý</span>
              </button>
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <span className="inline-flex h-9 items-center gap-2 rounded-full border border-[#c8daf4] bg-[#eef6ff] px-3.5 text-sm font-semibold text-[#244cb8]">
                  <CircleDollarSign className="h-4 w-4" />
                  Phí/quý: {formatMoney(monthlyRoomFee * 3)}
                </span>
                <button type="button" onClick={openFeeModal} className="inline-flex h-9 items-center rounded-full border border-[#c8daf4] bg-white px-3.5 text-sm font-semibold text-[#244cb8] transition duration-200 hover:border-[#aac7ef] hover:bg-[#e4f0ff]">
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
          headings={["MSSV", "Họ tên", roomHeader, quarterHeader, yearHeader, "Hạn thanh toán", statusHeader, "Hành động"]}
          emptyMessage="Không có hóa đơn tiền phòng phù hợp với bộ lọc."
          rows={visibleBills.map((bill) => ({
            key: bill.id,
            cells: [
              <span key="code" className="text-[15px] font-semibold text-[#24407f]">{bill.studentCode}</span>,
              <span key="name" className="line-clamp-2 text-sm font-semibold text-[#1f3152]">{bill.fullName}</span>,
              bill.room,
              bill.isQuarterly ? `Quý ${getQuarterFromMonth(bill.month)}` : `Tháng ${bill.month}`,
              bill.year,
              formatDate(bill.dueDate),
              <StatusBadge key="status" status={bill.status} />,
              <div key="action" className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => setSelectedBill(bill)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#bfd2ec] bg-white text-[#2a4f8f] transition duration-200 hover:-translate-y-0.5 hover:border-[#9ebce5] hover:bg-[#f3f8ff]" aria-label="Xem chi tiết" title="Xem chi tiết">
                  <Eye className="h-4 w-4" />
                </button>
              </div>,
            ],
          }))}
        />
      </motion.section>

      {openFilterMenu && filterMenuPosition
        ? createPortal(
            <div className="fixed inset-0 z-[68]" onClick={() => setOpenFilterMenu(null)} onWheel={handleFilterOverlayWheel}>
              <div
                className="absolute -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)] w-[260px]"
                style={{ top: filterMenuPosition.top, left: filterMenuPosition.left }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-0.5 p-2.5">
                  {activeFilterOptions.map((option) => {
                    const isSelected = activeDraftFilter === option.value;
                    return (
                      <button key={option.value} type="button" onClick={() => setActiveDraftFilter(option.value)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]">
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-[#244cb8] bg-[#244cb8]/10" : "border-[#cfd9e8] bg-white"}`}>
                          <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-[#244cb8]" : "bg-transparent"}`} />
                        </span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between border-t border-[#dbe5f3] px-2.5 py-2">
                  <button type="button" onClick={handleResetFilter} className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]">Reset</button>
                  <button type="button" onClick={handleApplyFilter} className="rounded-xl bg-[#0c4f97] px-3 py-1.5 text-[10px] font-semibold tracking-normal text-white shadow-[0_8px_16px_rgba(12,79,151,0.22)] transition hover:brightness-110">OK</button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {createResult
        ? createPortal(
            <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center px-4">
              <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22, ease: "easeOut" }} className="rounded-[22px] border border-[#bfd4f2] bg-white px-6 py-4 text-center shadow-[0_24px_56px_rgba(27,56,122,0.24)]">
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
              <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.26, ease: "easeOut" }} className="w-full max-w-[460px] rounded-[26px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xl font-bold uppercase text-[#7d90b5]">Cập nhật mức phí</p>
                  <button type="button" onClick={closeFeeModal} className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]" aria-label="Đóng"><X className="h-4 w-4" /></button>
                </div>
                <label className="mt-2 block">
                  <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Mức phí/tháng</span>
                  <input type="number" min={1} value={feeFormValue} onChange={(e) => setFeeFormValue(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
                  {Number(feeFormValue) > 0 && (
                    <p className="mt-1.5 text-xs font-semibold text-[#6f84ad]">Tương đương {formatMoney(Number(feeFormValue) * 3)}/quý</p>
                  )}
                </label>
                {feeError ? <p className="mt-4 text-sm font-semibold text-[#cc3c4f]">{feeError}</p> : null}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={closeFeeModal} className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white">Hủy</button>
                  <button type="button" onClick={handleSaveFee} className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"><span className="auth-btn-gloss__content">Lưu</span></button>
                </div>
              </motion.div>
            </div>,
            document.body,
          )
        : null}

      {isCreateOpen
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.26, ease: "easeOut" }} className="w-full max-w-[560px] rounded-[26px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xl font-bold uppercase text-[#7d90b5]">Tạo hóa đơn quý</p>
                  <button type="button" onClick={closeCreateModal} className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]" aria-label="Đóng"><X className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Quý</span>
                    <select value={form.quarter} onChange={(e) => setForm((cur) => ({ ...cur, quarter: e.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10">
                      {quarterOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Năm</span>
                    <input value={form.year} onChange={(e) => setForm((cur) => ({ ...cur, year: e.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Hạn thanh toán</span>
                    <input type="date" value={form.dueDate} onChange={(e) => setForm((cur) => ({ ...cur, dueDate: e.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Mức phí hiện tại</span>
                    <input disabled value={`${formatMoney(monthlyRoomFee * 3)}/quý`} className="mt-2 h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-[#1b3766] shadow-sm outline-none" />
                  </label>
                </div>
                <p className="mt-4 rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-semibold text-[#2f5f9f]">
                  Hệ thống sẽ tạo hóa đơn cho tất cả sinh viên đang lưu trú trong quý đã chọn (3 tháng).
                </p>
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.10em] text-amber-700">Quy tắc thu tiền</p>
                  <ul className="space-y-1">
                    {BILLING_RULES.map((rule) => (
                      <li key={rule} className="flex items-start gap-1.5 text-xs font-semibold text-amber-800">
                        <span className="mt-0.5 shrink-0">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {formError ? <p className="mt-4 text-sm font-semibold text-[#cc3c4f]">{formError}</p> : null}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={closeCreateModal} className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white">Hủy</button>
                  <button type="button" onClick={handleCreateBills} className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"><span className="auth-btn-gloss__content">Sinh hóa đơn quý</span></button>
                </div>
              </motion.div>
            </div>,
            document.body,
          )
        : null}

      {selectedBill
        ? createPortal(
            <div className="fixed inset-0 z-[78] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.26, ease: "easeOut" }} className="w-full max-w-[680px] rounded-[26px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xl font-bold uppercase text-[#7d90b5]">Chi tiết hóa đơn</p>
                  <button type="button" onClick={() => setSelectedBill(null)} className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]" aria-label="Đóng"><X className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                  <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                    <div className="space-y-3">
                      <InfoLine label="MSSV" value={selectedBill.studentCode} />
                      <InfoLine label="Họ tên" value={selectedBill.fullName} />
                      <InfoLine label="Phòng" value={selectedBill.room} />
                      <InfoLine label="Mức phí áp dụng" value={`${formatMoney(selectedBill.amount)}${selectedBill.isQuarterly ? "/quý" : "/tháng"}`} />
                      <InfoLine label="Trạng thái" value={<StatusBadge status={selectedBill.status} />} />
                    </div>
                    <div className="space-y-3">
                      <InfoLine
                        label="Kỳ thanh toán"
                        value={
                          selectedBill.isQuarterly
                            ? `Quý ${getQuarterFromMonth(selectedBill.month)}/${selectedBill.year}`
                            : `Tháng ${selectedBill.month}/${selectedBill.year}`
                        }
                      />
                      <InfoLine label="Ngày tạo hóa đơn" value={formatDate(selectedBill.createdAt)} />
                      <InfoLine label="Hạn thanh toán" value={formatDate(selectedBill.dueDate)} />
                      {selectedBill.status === "paid" && selectedBill.paidAt ? (
                        <InfoLine label="Ngày thanh toán" value={formatDate(selectedBill.paidAt)} />
                      ) : null}
                    </div>
                  </div>
                  {(selectedBill.discountPercent ?? 0) > 0 ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.10em] text-emerald-700">Miễn giảm</p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-emerald-800">
                          Giảm {selectedBill.discountPercent}%{selectedBill.discountReason ? ` · ${selectedBill.discountReason}` : ""}
                        </span>
                        {selectedBill.originalAmount != null ? (
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#9aafcf] line-through">
                              {formatMoney(selectedBill.originalAmount)}{selectedBill.isQuarterly ? "/quý" : "/tháng"}
                            </span>
                            <span className="text-sm font-bold text-emerald-800">{formatMoney(selectedBill.amount)}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {selectedBill.status === "exempted" && selectedBill.adminNote ? (
                    <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.10em] text-sky-700">Ghi chú miễn</p>
                      <p className="mt-1.5 text-sm font-semibold text-sky-800">{selectedBill.adminNote}</p>
                    </div>
                  ) : null}
                  {isExemptFormOpen ? (
                    <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3">
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-[0.10em] text-sky-700">Lý do miễn (không bắt buộc)</span>
                        <input value={exemptNote} onChange={(e) => setExemptNote(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" placeholder="Vd: Gia đình khó khăn — theo yêu cầu hỗ trợ #12" />
                      </label>
                      {exemptError ? <p className="mt-2 text-xs font-semibold text-[#cc3c4f]">{exemptError}</p> : null}
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={closeExemptForm} className="rounded-xl border border-[#c8d8ef] bg-white px-4 py-2 text-xs font-semibold text-[#24407f]">Hủy</button>
                        <button type="button" onClick={() => void handleExemptBill()} className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:brightness-110">Xác nhận miễn</button>
                      </div>
                    </div>
                  ) : null}
                  {isDiscountFormOpen ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-[0.10em] text-emerald-700">% giảm</span>
                          <input type="number" min={0} max={100} value={discountFormValue} onChange={(e) => setDiscountFormValue(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
                        </label>
                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-[0.10em] text-emerald-700">Lý do</span>
                          <input value={discountReasonValue} onChange={(e) => setDiscountReasonValue(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" placeholder="Vd: Hỗ trợ sinh viên khó khăn" />
                        </label>
                      </div>
                      {discountError ? <p className="mt-2 text-xs font-semibold text-[#cc3c4f]">{discountError}</p> : null}
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={closeDiscountForm} className="rounded-xl border border-[#c8d8ef] bg-white px-4 py-2 text-xs font-semibold text-[#24407f]">Hủy</button>
                        <button type="button" onClick={() => void handleApplyDiscount()} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:brightness-110">Áp dụng giảm giá</button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={() => setIsPlanModalOpen(true)} className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white">Quản lý chế độ đặc biệt</button>
                  {selectedBill.status === "unpaid" || selectedBill.status === "overdue" ? (
                    <>
                      <button type="button" onClick={openDiscountForm} className="rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow-[0_8px_18px_rgba(16,185,129,0.10)] transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-100">Giảm giá tức thời</button>
                      <button type="button" onClick={openExemptForm} className="rounded-2xl border border-sky-300 bg-sky-50 px-5 py-2.5 text-sm font-semibold text-sky-700 shadow-[0_8px_18px_rgba(14,165,233,0.10)] transition duration-200 hover:-translate-y-0.5 hover:bg-sky-100">Miễn hóa đơn này</button>
                    </>
                  ) : null}
                  {selectedBill.status === "unpaid" ? (
                    <button type="button" onClick={() => void confirmPayment(selectedBill.id)} className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#1f9a60_0%,#35bf7a_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(31,154,96,0.22)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"><span className="auth-btn-gloss__content">Xác nhận thanh toán</span></button>
                  ) : null}
                  <button type="button" onClick={() => { setSelectedBill(null); setIsExemptFormOpen(false); setIsDiscountFormOpen(false); }} className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white">Đóng</button>
                </div>
              </motion.div>
            </div>,
            document.body,
          )
        : null}

      {isPlanModalOpen && selectedBill
        ? createPortal(
            <StudentPaymentPlanModal
              studentId={selectedBill.studentId}
              studentLabel={`${selectedBill.studentCode} · ${selectedBill.fullName}`}
              onClose={() => setIsPlanModalOpen(false)}
            />,
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
}: {
  headings: ReactNode[];
  rows: Array<{ key: number; cells: ReactNode[] }>;
  emptyMessage: string;
}) {
  const colWidths = ["15%", "20%", "10%", "8%", "8%", "15%", "14%", "10%"];
  return (
    <div className="overflow-x-auto rounded-[22px] border border-[#d6e2f1] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
      <table className="w-full min-w-[980px] table-fixed border-separate border-spacing-0">
        <colgroup>
          {headings.map((_, i) => <col key={i} style={{ width: colWidths[i] }} />)}
        </colgroup>
        <thead>
          <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
            {headings.map((heading, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-3.5 text-center align-middle text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.key} className="transition hover:bg-[#f8fbff]">
                {row.cells.map((cell, i) => (
                  <td key={i} className="border-t border-[#e8eef8] px-3 py-3.5 text-center align-middle text-sm font-semibold text-[#5570a0]">{cell}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr><td colSpan={headings.length} className="px-4 py-8 text-center text-sm font-semibold text-[#6f84ad]">{emptyMessage}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
