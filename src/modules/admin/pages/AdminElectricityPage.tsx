import { motion } from "framer-motion";
import { CheckCircle2, Eye, Funnel, Plus, X, Zap } from "lucide-react";
import type { ReactNode, WheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import {
  confirmElectricityPayment,
  generateElectricityBills,
  getPaymentSettings,
  listElectricityBills,
  listElectricityRecords,
  type ElectricityBill as ApiElectricityBill,
  type ElectricityRecord as ApiElectricityRecord,
  type PaymentStatus,
  updatePaymentSettings,
} from "../../../api/paymentApi";
import { getRooms } from "../../../api/registrationService";
import type { DormRoom } from "../../../types/dormRoom";
import { formatDate } from "../../../utils/dateFormat";

type TabKey = "records" | "bills";

type SummaryCard = {
  label: string;
  value: ReactNode;
  valueClassName: string;
  valueSizeClassName?: string;
  filterValue?: BillStatusFilter;
};

type BillStatusFilter = PaymentStatus | "all";

const billStatusOptions: Array<{ value: BillStatusFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "unpaid", label: "Chưa thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "overdue", label: "Quá hạn" },
  { value: "exempted", label: "Đã miễn" },
];

type ElectricityForm = {
  room: string;
  month: string;
  oldIndex: string;
  newIndex: string;
  unitPrice: string;
};

type ElectricityBill = {
  id: number;
  studentCode: string;
  fullName: string;
  room: string;
  month: string;
  amount: number;
  createdAt: string;
  dueDate: string;
  status: PaymentStatus;
  paidAt?: string;
};

type ElectricityRecord = {
  id: number;
  room: string;
  studentCount: number;
  month: string;
  oldIndex: number;
  newIndex: number;
  usageKwh: number;
  unitPrice: number;
  totalAmount: number;
};
const ELECTRICITY_PRICE_PER_KWH = 2900;
const recordTableColumnWidths = ["10%", "12%", "10%", "10%", "13%", "13%", "15%", "18%"];
const billTableColumnWidths = ["10%", "16%", "9%", "8%", "8%", "14%", "12%", "13%", "10%"];
const currentYear = new Date().getFullYear();
const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

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
  exempted: {
    label: "Đã miễn",
    className: "border border-sky-200 bg-sky-50 text-sky-700",
  },
};

const getCurrentMonthValue = () => new Date().toISOString().slice(0, 7);
const getTodayValue = () => new Date().toISOString().slice(0, 10);

const formatMonth = (value: string) => {
  const [year, month] = value.split("-");

  return month && year ? `${month}/${year}` : value;
};

const formatMoneyInput = (value: string) => {
  const normalized = value.replace(/\D/g, "");

  if (!normalized) {
    return "";
  }

  return normalized.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".") || "0";
};

const parseMoneyValue = (value: string) => Number(value.replace(/\D/g, ""));
const formatPlainMoney = (value: number) => `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)}đ`;

const formatApiRoomName = (room: ApiElectricityBill["room"] | ApiElectricityRecord["room"]) =>
  room ? `${room.buildingCode}${room.roomNumber}` : "-";

const formatDormRoomName = (room: DormRoom) => `${room.building_code}${room.room_number}`;

const mapElectricityBill = (bill: ApiElectricityBill): ElectricityBill => ({
  id: bill.id,
  studentCode: bill.student?.studentCode || "-",
  fullName: bill.student?.fullName || "-",
  room: formatApiRoomName(bill.room),
  month: bill.monthYear,
  amount: bill.amount,
  createdAt: bill.createdAt,
  dueDate: bill.dueDate,
  status: bill.status,
  paidAt: bill.paidAt || undefined,
});

const mapElectricityRecord = (record: ApiElectricityRecord, bills: ElectricityBill[]): ElectricityRecord => {
  const room = formatApiRoomName(record.room);
  const studentCount = bills.filter((bill) => bill.room === room && bill.month === record.monthYear).length;

  return {
    id: record.id,
    room,
    studentCount,
    month: record.monthYear,
    oldIndex: record.oldIndex,
    newIndex: record.newIndex,
    usageKwh: record.usageKwh,
    unitPrice: record.unitPrice,
    totalAmount: record.totalAmount,
  };
};

const getPreviousElectricityIndex = (records: ElectricityRecord[], room: string, month: string): number | null => {
  if (!room || !month) {
    return null;
  }

  const [latestRecord] = records
    .filter((record) => record.room === room && record.month < month)
    .sort((a, b) => b.month.localeCompare(a.month) || b.id - a.id);

  return latestRecord?.newIndex ?? null;
};

const getLatestElectricityMonth = (records: ElectricityRecord[], room: string): string | null => {
  if (!room) {
    return null;
  }

  const [latestRecord] = records
    .filter((record) => record.room === room)
    .sort((a, b) => b.month.localeCompare(a.month) || b.id - a.id);

  return latestRecord?.month ?? null;
};

const getNextMonthValue = (month: string | null): string | undefined => {
  if (!month) {
    return undefined;
  }

  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return undefined;
  }

  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;

  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
};

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

export default function AdminElectricityPage() {
  const { headerSearchValue } = useOutletContext<AdminLayoutOutletContext>();
  const [activeTab, setActiveTab] = useState<TabKey>("records");
  const [records, setRecords] = useState<ElectricityRecord[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [rooms, setRooms] = useState<DormRoom[]>([]);
  const [monthFilter, setMonthFilter] = useState("all");
  const [draftMonthFilter, setDraftMonthFilter] = useState("all");
  const [isMonthFilterOpen, setIsMonthFilterOpen] = useState(false);
  const [monthFilterMenuPosition, setMonthFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const monthFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const [yearFilter, setYearFilter] = useState("all");
  const [draftYearFilter, setDraftYearFilter] = useState("all");
  const [isYearFilterOpen, setIsYearFilterOpen] = useState(false);
  const [yearFilterMenuPosition, setYearFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const yearFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const [billStatusFilter, setBillStatusFilter] = useState<BillStatusFilter>("all");
  const [draftBillStatusFilter, setDraftBillStatusFilter] = useState<BillStatusFilter>("all");
  const [isBillStatusFilterOpen, setIsBillStatusFilterOpen] = useState(false);
  const [billStatusFilterMenuPosition, setBillStatusFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const billStatusFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<ElectricityBill | null>(null);
  const [formError, setFormError] = useState("");
  const [priceError, setPriceError] = useState("");
  const [currentElectricityPrice, setCurrentElectricityPrice] = useState(ELECTRICITY_PRICE_PER_KWH);
  const [priceFormValue, setPriceFormValue] = useState(String(ELECTRICITY_PRICE_PER_KWH));
  const [form, setForm] = useState<ElectricityForm>({
    room: "",
    month: getCurrentMonthValue(),
    oldIndex: "",
    newIndex: "",
    unitPrice: formatMoneyInput(String(ELECTRICITY_PRICE_PER_KWH)),
  });

  const roomOptions = useMemo(() => rooms.map((room) => ({ id: room.id, name: formatDormRoomName(room) })), [rooms]);
  const years = useMemo(
    () =>
      Array.from(
        new Set([
          currentYear,
          ...records.map((record) => Number(record.month.split("-")[0])),
          ...bills.map((bill) => Number(bill.month.split("-")[0])),
        ]),
      )
        .filter((year) => Number.isInteger(year))
        .sort((a, b) => b - a),
    [bills, records],
  );
  const latestElectricityMonth = useMemo(() => getLatestElectricityMonth(records, form.room), [form.room, records]);
  const nextAvailableElectricityMonth = useMemo(() => getNextMonthValue(latestElectricityMonth), [latestElectricityMonth]);
  const effectiveFormMonth = latestElectricityMonth && nextAvailableElectricityMonth && form.month <= latestElectricityMonth ? nextAvailableElectricityMonth : form.month;
  const autoOldIndex = useMemo(() => getPreviousElectricityIndex(records, form.room, effectiveFormMonth), [effectiveFormMonth, form.room, records]);
  const effectiveOldIndex = autoOldIndex === null ? form.oldIndex : String(autoOldIndex);

  const loadData = async () => {
    const [nextBills, nextRecords, nextRooms, settings] = await Promise.all([
      listElectricityBills(),
      listElectricityRecords(),
      getRooms(),
      getPaymentSettings(),
    ]);
    const mappedBills = nextBills.map(mapElectricityBill);
    setBills(mappedBills);
    setRecords(nextRecords.map((record) => mapElectricityRecord(record, mappedBills)));
    setRooms(nextRooms);
    setCurrentElectricityPrice(settings.electricityUnitPrice);
    setPriceFormValue(String(settings.electricityUnitPrice));
    setForm((current) => ({
      ...current,
      unitPrice: formatMoneyInput(String(settings.electricityUnitPrice)),
      room: current.room || (nextRooms[0] ? formatDormRoomName(nextRooms[0]) : ""),
    }));
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    if (typeof window !== "undefined") {
      window.addEventListener("ktx-payments-updated", loadData);
      window.addEventListener("ktx-rooms-updated", loadData);
      window.addEventListener("focus", loadData);
    }

    return () => {
      window.clearTimeout(timeoutId);

      if (typeof window !== "undefined") {
        window.removeEventListener("ktx-payments-updated", loadData);
        window.removeEventListener("ktx-rooms-updated", loadData);
        window.removeEventListener("focus", loadData);
      }
    };
  }, []);

  const usagePreview = Math.max(0, Number(form.newIndex || 0) - Number(effectiveOldIndex || 0));
  const unitPricePreview = parseMoneyValue(form.unitPrice);
  const totalPreview = usagePreview * unitPricePreview;
  const selectedMonthNumber = Number(monthFilter);
  const selectedYearNumber = Number(yearFilter);

  const visibleRecords = useMemo(
    () =>
      records.filter((record) => {
        const [recordYear, recordMonth] = record.month.split("-").map(Number);
        const matchesMonth = monthFilter === "all" || Number(recordMonth) === selectedMonthNumber;
        const matchesYear = yearFilter === "all" || recordYear === selectedYearNumber;

        return matchesMonth && matchesYear;
      }),
    [monthFilter, records, selectedMonthNumber, selectedYearNumber, yearFilter],
  );

  // Base list áp mọi filter TRỪ billStatusFilter — dùng để tính số đếm cho 4 thẻ thống kê,
  // để các thẻ không active vẫn hiện đúng số thật khi 1 thẻ khác đang lọc (không bị sập về 0).
  const billsBeforeStatusFilter = useMemo(() => {
    const normalizedHeaderSearch = headerSearchValue.trim().toLowerCase();

    return bills.filter((bill) => {
      const [billYear, billMonth] = bill.month.split("-").map(Number);
      const searchableText = [bill.studentCode, bill.fullName].join(" ").toLowerCase();
      const matchesHeaderSearch = !normalizedHeaderSearch || searchableText.includes(normalizedHeaderSearch);
      const matchesMonth = monthFilter === "all" || Number(billMonth) === selectedMonthNumber;
      const matchesYear = yearFilter === "all" || billYear === selectedYearNumber;

      return matchesHeaderSearch && matchesMonth && matchesYear;
    });
  }, [bills, headerSearchValue, monthFilter, selectedMonthNumber, selectedYearNumber, yearFilter]);

  const visibleBills = useMemo(
    () => billsBeforeStatusFilter.filter((bill) => billStatusFilter === "all" || bill.status === billStatusFilter),
    [billsBeforeStatusFilter, billStatusFilter],
  );

  const recordSummaryCards = useMemo<SummaryCard[]>(() => {
    const roomStudentCountMap = visibleRecords.reduce<Map<string, number>>((roomMap, record) => {
      roomMap.set(record.room, record.studentCount);
      return roomMap;
    }, new Map());
    const totalStudents = Array.from(roomStudentCountMap.values()).reduce((total, studentCount) => total + studentCount, 0);
    const totalUsageKwh = visibleRecords.reduce((total, record) => total + record.usageKwh, 0);
    const totalAmount = visibleRecords.reduce((total, record) => total + record.totalAmount, 0);

    return [
      { label: "Tổng phòng", value: roomStudentCountMap.size, valueClassName: "text-[#244cb8]" },
      { label: "Tổng sinh viên", value: totalStudents, valueClassName: "text-[#16784b]" },
      { label: "Tổng số điện", value: `${totalUsageKwh} kWh`, valueClassName: "text-[#9b6b00]", valueSizeClassName: "text-[1.65rem]" },
      { label: "Tổng tiền điện", value: moneyFormatter.format(totalAmount), valueClassName: "text-[#c4364f]", valueSizeClassName: "text-[1.65rem]" },
    ];
  }, [visibleRecords]);

  const billSummaryCards = useMemo<SummaryCard[]>(
    () => [
      { label: "Tổng hóa đơn", value: billsBeforeStatusFilter.length, valueClassName: "text-[#244cb8]", filterValue: "all" },
      {
        label: "Chưa thanh toán",
        value: billsBeforeStatusFilter.filter((bill) => bill.status === "unpaid").length,
        valueClassName: "text-[#9b6b00]",
        filterValue: "unpaid",
      },
      {
        label: "Đã thanh toán",
        value: billsBeforeStatusFilter.filter((bill) => bill.status === "paid").length,
        valueClassName: "text-[#16784b]",
        filterValue: "paid",
      },
      {
        label: "Quá hạn",
        value: billsBeforeStatusFilter.filter((bill) => bill.status === "overdue").length,
        valueClassName: "text-[#c4364f]",
        filterValue: "overdue",
      },
    ],
    [billsBeforeStatusFilter],
  );

  const summaryCards = activeTab === "records" ? recordSummaryCards : billSummaryCards;

  const selectedBillRecord = useMemo(
    () => (selectedBill ? records.find((record) => record.room === selectedBill.room && record.month === selectedBill.month) : undefined),
    [records, selectedBill],
  );

  const closeRecordModal = () => {
    setIsRecordModalOpen(false);
    setFormError("");
  };

  const openRecordModal = () => {
    setForm((current) => ({
      ...current,
      unitPrice: formatMoneyInput(String(currentElectricityPrice)),
    }));
    setFormError("");
    setIsRecordModalOpen(true);
  };

  const openPriceModal = () => {
    setPriceFormValue(String(currentElectricityPrice));
    setPriceError("");
    setIsPriceModalOpen(true);
  };

  const closePriceModal = () => {
    setIsPriceModalOpen(false);
    setPriceError("");
  };

  const handleSavePrice = async () => {
    const nextPrice = Number(priceFormValue);

    if (!Number.isInteger(nextPrice) || nextPrice <= 0) {
      setPriceError("Vui lòng nhập đơn giá điện là số nguyên dương.");
      return;
    }

    try {
      const settings = await updatePaymentSettings({ electricity_unit_price: nextPrice });
      setCurrentElectricityPrice(settings.electricityUnitPrice);
      setPriceFormValue(String(settings.electricityUnitPrice));
      setForm((current) => ({ ...current, unitPrice: formatMoneyInput(String(settings.electricityUnitPrice)) }));
      closePriceModal();
    } catch {
      setPriceError("Không thể cập nhật đơn giá điện. Vui lòng thử lại.");
    }
  };

  const handleCreateRecord = async () => {
    const oldIndex = Number(effectiveOldIndex);
    const newIndex = Number(form.newIndex);
    const unitPrice = parseMoneyValue(form.unitPrice);
    const month = effectiveFormMonth;
    const selectedRoom = roomOptions.find((room) => room.name === form.room);

    if (!form.room) {
      setFormError("Vui lòng chọn phòng.");
      return;
    }

    if (!selectedRoom) {
      setFormError("Không tìm thấy phòng đã chọn.");
      return;
    }

    if (!month) {
      setFormError("Vui lòng chọn tháng.");
      return;
    }

    if (latestElectricityMonth && month <= latestElectricityMonth) {
      setFormError(`Tháng ghi nhận mới phải sau ${formatMonth(latestElectricityMonth)}.`);
      return;
    }

    if (!Number.isInteger(oldIndex) || oldIndex < 0) {
      setFormError("Chỉ số cũ phải là số nguyên không âm.");
      return;
    }

    if (!Number.isInteger(newIndex) || newIndex < oldIndex) {
      setFormError("Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ.");
      return;
    }

    if (!Number.isInteger(unitPrice) || unitPrice <= 0) {
      setFormError("Đơn giá phải là số nguyên dương.");
      return;
    }

    try {
      await generateElectricityBills({
        room_id: selectedRoom.id,
        month_year: month,
        old_index: oldIndex,
        new_index: newIndex,
        unit_price: unitPrice,
        due_date: getTodayValue(),
      });
      await loadData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ktx-payments-updated"));
      }
      closeRecordModal();
    } catch {
      setFormError("Không thể ghi nhận chỉ số điện. Vui lòng thử lại.");
    }
  };

  const confirmPayment = async (billId: number) => {
    try {
      const updated = mapElectricityBill(await confirmElectricityPayment(billId, {
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

  useEffect(() => {
    if (!isMonthFilterOpen) {
      return;
    }

    const updateMenuPosition = () => {
      const buttonRect = monthFilterButtonRef.current?.getBoundingClientRect();

      if (!buttonRect) {
        return;
      }

      setMonthFilterMenuPosition({
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
  }, [isMonthFilterOpen]);

  const openMonthFilter = () => {
    setDraftMonthFilter(monthFilter);
    setIsYearFilterOpen(false);
    setIsMonthFilterOpen(true);
  };

  const resetMonthFilter = () => {
    setDraftMonthFilter("all");
    setMonthFilter("all");
    setIsMonthFilterOpen(false);
  };

  const applyMonthFilter = () => {
    setMonthFilter(draftMonthFilter);
    setIsMonthFilterOpen(false);
  };

  useEffect(() => {
    if (!isYearFilterOpen) {
      return;
    }

    const updateMenuPosition = () => {
      const buttonRect = yearFilterButtonRef.current?.getBoundingClientRect();

      if (!buttonRect) {
        return;
      }

      setYearFilterMenuPosition({
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
  }, [isYearFilterOpen]);

  const openYearFilter = () => {
    setDraftYearFilter(yearFilter);
    setIsMonthFilterOpen(false);
    setIsYearFilterOpen(true);
  };

  const resetYearFilter = () => {
    setDraftYearFilter("all");
    setYearFilter("all");
    setIsYearFilterOpen(false);
  };

  const applyYearFilter = () => {
    setYearFilter(draftYearFilter);
    setIsYearFilterOpen(false);
  };

  useEffect(() => {
    if (!isBillStatusFilterOpen) {
      return;
    }

    const updateMenuPosition = () => {
      const buttonRect = billStatusFilterButtonRef.current?.getBoundingClientRect();

      if (!buttonRect) {
        return;
      }

      setBillStatusFilterMenuPosition({
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
  }, [isBillStatusFilterOpen]);

  const openBillStatusFilter = () => {
    setDraftBillStatusFilter(billStatusFilter);
    setIsMonthFilterOpen(false);
    setIsYearFilterOpen(false);
    setIsBillStatusFilterOpen(true);
  };

  const resetBillStatusFilter = () => {
    setDraftBillStatusFilter("all");
    setBillStatusFilter("all");
    setIsBillStatusFilterOpen(false);
  };

  const applyBillStatusFilter = () => {
    setBillStatusFilter(draftBillStatusFilter);
    setIsBillStatusFilterOpen(false);
  };

  const handleBillSummaryCardClick = (filterValue: BillStatusFilter) => {
    setBillStatusFilter((current) => (current === filterValue ? "all" : filterValue));
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

  const monthHeader = (
    <div className="inline-flex items-center justify-center gap-2">
      <span>Tháng</span>
      <button
        ref={monthFilterButtonRef}
        type="button"
        onClick={isMonthFilterOpen ? () => setIsMonthFilterOpen(false) : openMonthFilter}
        className="flex items-center justify-center text-[#244cb8] transition"
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
        onClick={isYearFilterOpen ? () => setIsYearFilterOpen(false) : openYearFilter}
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
        ref={billStatusFilterButtonRef}
        type="button"
        onClick={isBillStatusFilterOpen ? () => setIsBillStatusFilterOpen(false) : openBillStatusFilter}
        className={`flex items-center justify-center transition ${billStatusFilter !== "all" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"}`}
        aria-label="Bật lọc trạng thái"
        title="Bật lọc trạng thái"
      >
        <Funnel className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Tiền điện</h1>
              <p className="mt-3 max-w-3xl text-[13px] leading-6 text-[#62789f] sm:text-sm">
                Quản lý chỉ số điện phòng và hóa đơn điện phân bổ cho từng sinh viên.
              </p>
            </div>
            {activeTab === "records" ? (
              <div className="flex flex-col items-start gap-2 xl:items-end">
                <button
                  type="button"
                  onClick={openRecordModal}
                  className="auth-btn-gloss inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
                >
                  <Plus className="auth-btn-gloss__content h-4 w-4" />
                  <span className="auth-btn-gloss__content">Ghi nhận chỉ số điện</span>
                </button>
                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  <span className="inline-flex h-9 items-center gap-2 rounded-full border border-[#c8daf4] bg-[#eef6ff] px-3.5 text-sm font-semibold text-[#244cb8]">
                    <Zap className="h-4 w-4" />
                    Đơn giá hiện tại: {formatPlainMoney(currentElectricityPrice)}/kWh
                  </span>
                  <button
                    type="button"
                    onClick={openPriceModal}
                    className="inline-flex h-9 items-center rounded-full border border-[#c8daf4] bg-white px-3.5 text-sm font-semibold text-[#244cb8] transition duration-200 hover:border-[#aac7ef] hover:bg-[#e4f0ff]"
                  >
                    Cập nhật đơn giá
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card, index) => {
            const isClickable = card.filterValue !== undefined;
            const isActive = isClickable && billStatusFilter === card.filterValue;

            return (
              <motion.article
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ duration: 0.32, delay: 0.08 + index * 0.04, ease: "easeOut" }}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                aria-pressed={isClickable ? isActive : undefined}
                onClick={isClickable ? () => handleBillSummaryCardClick(card.filterValue as BillStatusFilter) : undefined}
                onKeyDown={
                  isClickable
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleBillSummaryCardClick(card.filterValue as BillStatusFilter);
                        }
                      }
                    : undefined
                }
                className={`relative overflow-hidden rounded-[26px] border px-5 py-4 text-center shadow-[0_14px_30px_rgba(36,76,184,0.09)] outline-none transition-shadow duration-300 hover:shadow-[0_22px_44px_rgba(36,76,184,0.16)] ${
                  isClickable ? "cursor-pointer focus-visible:ring-4 focus-visible:ring-[#244cb8]/25" : ""
                } ${isActive ? "border-[#244cb8] bg-[#244cb8]/5" : "border-[#d8e4f5] bg-white"}`}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7c8fb5]">{card.label}</p>
                <p className={`mt-3 ${card.valueSizeClassName ?? "text-[2rem]"} font-extrabold leading-none ${card.valueClassName}`}>{card.value}</p>
              </motion.article>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("records")}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold shadow-[0_10px_22px_rgba(36,76,184,0.12)] transition ${
              activeTab === "records" ? "bg-[#244cb8] text-white" : "border border-[#c8d8ef] bg-white text-[#24407f]"
            }`}
          >
            <Zap className="h-4 w-4" />
            Chỉ số điện
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bills")}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold shadow-[0_10px_22px_rgba(36,76,184,0.12)] transition ${
              activeTab === "bills" ? "bg-[#244cb8] text-white" : "border border-[#c8d8ef] bg-white text-[#24407f]"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Hóa đơn điện
          </button>
        </div>

        {activeTab === "records" ? (
          <PaymentTable
            headings={["Phòng", "Số sinh viên", "Tháng", "Năm", "Chỉ số cũ", "Chỉ số mới", "Số điện", "Tổng tiền"]}
            headerContentByIndex={{ 2: monthHeader, 3: yearHeader }}
            columnWidths={recordTableColumnWidths}
            emptyMessage="Không có chỉ số điện phù hợp với bộ lọc."
            rows={visibleRecords.map((record) => ({
              key: record.id,
              cells: [
                <span className="font-bold text-[#1f3152]">{record.room}</span>,
                record.studentCount,
                record.month.split("-")[1] ?? record.month,
                record.month.split("-")[0] ?? "",
                record.oldIndex,
                record.newIndex,
                `${record.usageKwh} kWh`,
                moneyFormatter.format(record.totalAmount),
              ],
            }))}
          />
        ) : (
          <PaymentTable
            headings={["MSSV", "Họ tên", "Phòng", "Tháng", "Năm", "Tiền điện", "Hạn thanh toán", "Trạng thái", "Hành động"]}
            headerContentByIndex={{ 3: monthHeader, 4: yearHeader, 7: statusHeader }}
            columnWidths={billTableColumnWidths}
            emptyMessage="Không có hóa đơn điện phù hợp với bộ lọc."
            rows={visibleBills.map((bill) => ({
              key: bill.id,
              cells: [
                <span className="text-[15px] font-semibold text-[#24407f]">{bill.studentCode}</span>,
                <span className="line-clamp-2 text-sm font-semibold text-[#1f3152]">{bill.fullName}</span>,
                <span className="text-sm font-semibold text-[#6d7fa6]">{bill.room}</span>,
                bill.month.split("-")[1] ?? bill.month,
                bill.month.split("-")[0] ?? "",
                moneyFormatter.format(bill.amount),
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
        )}
      </motion.section>

      {isMonthFilterOpen && monthFilterMenuPosition
        ? createPortal(
            <div
              className="fixed inset-0 z-[68]"
              onClick={() => setIsMonthFilterOpen(false)}
              onWheel={handleFilterOverlayWheel}
            >
              <div
                className="absolute w-[320px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
                style={{ top: monthFilterMenuPosition.top, left: monthFilterMenuPosition.left }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 p-2.5">
                  {[{ value: "all", label: "Tất cả" }, ...monthOptions.map((month) => ({ value: String(month), label: String(month).padStart(2, "0") }))].map((option) => {
                    const value = option.value;
                    const isSelected = draftMonthFilter === value;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDraftMonthFilter(value)}
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
                    onClick={resetMonthFilter}
                    className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={applyMonthFilter}
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

      {isYearFilterOpen && yearFilterMenuPosition
        ? createPortal(
            <div
              className="fixed inset-0 z-[68]"
              onClick={() => setIsYearFilterOpen(false)}
              onWheel={handleFilterOverlayWheel}
            >
              <div
                className="absolute w-[230px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
                style={{ top: yearFilterMenuPosition.top, left: yearFilterMenuPosition.left }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-0.5 p-2.5">
                  {[{ value: "all", label: "Tất cả" }, ...years.map((year) => ({ value: String(year), label: String(year) }))].map((option) => {
                    const isSelected = draftYearFilter === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDraftYearFilter(option.value)}
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
                    onClick={resetYearFilter}
                    className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={applyYearFilter}
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

      {isBillStatusFilterOpen && billStatusFilterMenuPosition
        ? createPortal(
            <div
              className="fixed inset-0 z-[68]"
              onClick={() => setIsBillStatusFilterOpen(false)}
              onWheel={handleFilterOverlayWheel}
            >
              <div
                className="absolute w-[210px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
                style={{ top: billStatusFilterMenuPosition.top, left: billStatusFilterMenuPosition.left }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-0.5 p-2.5">
                  {billStatusOptions.map((option) => {
                    const isSelected = draftBillStatusFilter === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDraftBillStatusFilter(option.value)}
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
                    onClick={resetBillStatusFilter}
                    className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={applyBillStatusFilter}
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

      {isPriceModalOpen
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
                    <p className="text-xl font-bold uppercase text-[#7d90b5]">Cập nhật đơn giá điện</p>
                  </div>
                  <button
                    type="button"
                    onClick={closePriceModal}
                    className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                    aria-label="Đóng"
                    title="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <label className="mt-5 block">
                  <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Đơn giá (đ/kWh)</span>
                  <input
                    type="number"
                    min={1}
                    value={priceFormValue}
                    onChange={(event) => setPriceFormValue(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10"
                  />
                </label>
                {priceError ? <p className="mt-4 text-sm font-semibold text-[#cc3c4f]">{priceError}</p> : null}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={closePriceModal} className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white">
                    Hủy
                  </button>
                  <button type="button" onClick={handleSavePrice} className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110">
                    <span className="auth-btn-gloss__content">Lưu</span>
                  </button>
                </div>
              </motion.div>
            </div>,
            document.body,
          )
        : null}

      {isRecordModalOpen
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
                className="w-full max-w-[620px] rounded-[26px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7d90b5]">Nhập chỉ số điện</p>
                    <h2 className="mt-2 text-2xl font-bold text-[#173a78]">Chỉ số phòng</h2>
                  </div>
                  <button type="button" onClick={closeRecordModal} className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]" aria-label="Đóng" title="Đóng">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Phòng</span>
                    <select value={form.room} onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10">
                      {roomOptions.map((room) => (
                        <option key={room.id} value={room.name}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Tháng</span>
                    <input type="month" value={effectiveFormMonth} min={nextAvailableElectricityMonth} onChange={(event) => setForm((current) => ({ ...current, month: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Chỉ số cũ</span>
                    <input type="number" min="0" step="1" value={effectiveOldIndex} readOnly={autoOldIndex !== null} onChange={(event) => setForm((current) => ({ ...current, oldIndex: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Chỉ số mới</span>
                    <input type="number" min="0" step="1" value={form.newIndex} onChange={(event) => setForm((current) => ({ ...current, newIndex: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Đơn giá</span>
                    <input disabled value={form.unitPrice} inputMode="decimal" className="mt-2 h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-[#1b3766] shadow-sm outline-none" />
                  </label>
                  <div className="rounded-2xl border border-[#d3e0f2] bg-white/70 p-4">
                    <p className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Hệ thống tự tính</p>
                    <p className="mt-3 text-sm font-semibold text-[#5570a0]">Số điện tiêu thụ: <span className="text-[#1b3766]">{usagePreview} kWh</span></p>
                    <p className="mt-2 text-sm font-semibold text-[#5570a0]">Tổng tiền điện phòng: <span className="text-[#1b3766]">{moneyFormatter.format(totalPreview)}</span></p>
                  </div>
                </div>
                {formError ? <p className="mt-4 text-sm font-semibold text-[#cc3c4f]">{formError}</p> : null}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={closeRecordModal} className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white">
                    Hủy
                  </button>
                  <button type="button" onClick={handleCreateRecord} className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110">
                    <span className="auth-btn-gloss__content">Lưu chỉ số</span>
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
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7d90b5]">Chi tiết hóa đơn điện</p>
                    <h2 className="mt-2 text-2xl font-bold text-[#173a78]">{selectedBill.fullName}</h2>
                  </div>
                  <button type="button" onClick={() => setSelectedBill(null)} className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]" aria-label="Đóng" title="Đóng">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-5 rounded-2xl border border-[#d3e0f2] bg-white/65 p-4">
                  <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
                    <div className="space-y-3">
                      <InfoLine label="MSSV" value={selectedBill.studentCode} />
                      <InfoLine label="Họ tên" value={selectedBill.fullName} />
                      <InfoLine label="Ngày tạo hóa đơn" value={formatDate(selectedBill.createdAt)} />
                      <InfoLine label="Hạn thanh toán" value={formatDate(selectedBill.dueDate)} />
                      {selectedBill.status === "paid" && selectedBill.paidAt ? (
                        <InfoLine label="Ngày thanh toán" value={formatDate(selectedBill.paidAt)} />
                      ) : null}
                      <InfoLine label="Trạng thái" value={<StatusBadge status={selectedBill.status} />} />
                    </div>
                    <div className="space-y-3">
                      <InfoLine label="Phòng" value={selectedBill.room} />
                      <InfoLine label="Kỳ" value={formatMonth(selectedBill.month)} />
                      <InfoLine label="Tiền điện phòng" value={selectedBillRecord ? moneyFormatter.format(selectedBillRecord.totalAmount) : "-"} />
                      <InfoLine label="Số sinh viên phòng" value={selectedBillRecord?.studentCount ?? "-"} />
                      <InfoLine label="Tiền điện" value={moneyFormatter.format(selectedBill.amount)} />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap justify-end gap-3">
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
  columnWidths,
  headerContent,
  headerContentByIndex,
  rows,
  emptyMessage,
}: {
  headings: string[];
  columnWidths?: string[];
  headerContent?: Partial<Record<string, ReactNode>>;
  headerContentByIndex?: Partial<Record<number, ReactNode>>;
  rows: Array<{ key: number; cells: ReactNode[] }>;
  emptyMessage: string;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[#d6e2f1] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] table-fixed border-separate border-spacing-0">
          {columnWidths ? (
            <colgroup>
              {headings.map((heading, index) => (
                <col key={heading} style={{ width: columnWidths[index] }} />
              ))}
            </colgroup>
          ) : null}
          <thead>
            <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
              {headings.map((heading, index) => (
                <th key={heading} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  {headerContentByIndex?.[index] ?? headerContent?.[heading] ?? heading}
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
    </div>
  );
}
