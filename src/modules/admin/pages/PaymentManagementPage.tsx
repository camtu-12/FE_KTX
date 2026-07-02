import { motion } from "framer-motion";
import { CheckCircle2, CreditCard, Plus, Zap } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import {
  confirmElectricityPayment,
  confirmRoomFeePayment,
  generateElectricityBills,
  generateRoomFeeBills,
  listElectricityBills,
  listElectricityRecords,
  listRoomFeeBills,
  type ElectricityBill,
  type ElectricityRecord,
  type PaymentStatus,
  type RoomFeeBill,
} from "../../../api/paymentApi";
import { getRooms } from "../../../api/registrationService";
import type { DormRoom } from "../../../types/dormRoom";
import { formatDate } from "../../../utils/dateFormat";

type TabKey = "room" | "electricity";
type ConfirmTarget =
  | { source: "room"; id: number; name: string }
  | { source: "electricity"; id: number; name: string }
  | null;

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

const getTodayValue = () => new Date().toISOString().slice(0, 10);

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

const parseMoneyValue = (value: string) => {
  const normalized = value.replace(/\D/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoneyInput = (value: string) => {
  const normalized = value.replace(/\D/g, "");

  if (!normalized) {
    return "";
  }

  const formattedInteger = normalized.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".") || "0";

  return formattedInteger;
};

const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0;
const isNonNegativeInteger = (value: number) => Number.isInteger(value) && value >= 0;

const formatRoomName = (room: { buildingCode?: string; roomNumber?: string } | null) =>
  room ? `${room.buildingCode ?? ""}${room.roomNumber ?? ""}` : "-";

const formatDormRoomName = (room: DormRoom) => `${room.building_code}${room.room_number}`;

function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ${statusMeta[status].className}`}>
      {statusMeta[status].label}
    </span>
  );
}

export default function PaymentManagementPage() {
  const { headerSearchValue } = useOutletContext<AdminLayoutOutletContext>();
  const [activeTab, setActiveTab] = useState<TabKey>("room");
  const [roomBills, setRoomBills] = useState<RoomFeeBill[]>([]);
  const [electricityBills, setElectricityBills] = useState<ElectricityBill[]>([]);
  const [electricityRecords, setElectricityRecords] = useState<ElectricityRecord[]>([]);
  const [rooms, setRooms] = useState<DormRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [roomForm, setRoomForm] = useState({
    quarter: String(getQuarterFromMonth(new Date().getMonth() + 1)),
    year: String(new Date().getFullYear()),
    amount: "",
    dueDate: getTodayValue(),
  });
  const [electricityForm, setElectricityForm] = useState({
    roomId: "",
    monthYear: new Date().toISOString().slice(0, 7),
    oldIndex: "",
    newIndex: "",
    unitPrice: "",
    dueDate: getTodayValue(),
  });
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [confirmForm, setConfirmForm] = useState({
    paymentMethod: "Chuyển khoản",
    transactionCode: "",
    paidAt: getTodayValue(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [nextRoomBills, nextElectricityBills, nextRecords, nextRooms] = await Promise.all([
        listRoomFeeBills(),
        listElectricityBills(),
        listElectricityRecords(),
        getRooms(),
      ]);
      setRoomBills(nextRoomBills);
      setElectricityBills(nextElectricityBills);
      setElectricityRecords(nextRecords);
      setRooms(nextRooms);
    } catch {
      setErrorMessage("Không thể tải dữ liệu thanh toán.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      void loadData();
    }, 0);

    if (typeof window !== "undefined") {
      window.addEventListener("ktx-payments-updated", loadData);
    }

    return () => {
      window.clearTimeout(initialLoadId);
      if (typeof window !== "undefined") {
        window.removeEventListener("ktx-payments-updated", loadData);
      }
    };
  }, []);

  const normalizedSearch = headerSearchValue.trim().toLowerCase();

  const visibleRoomBills = useMemo(
    () =>
      roomBills.filter((bill) => {
        if (!normalizedSearch) return true;
        return [bill.student?.studentCode, bill.student?.fullName, bill.student?.email, formatRoomName(bill.room)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      }),
    [normalizedSearch, roomBills],
  );

  const visibleElectricityBills = useMemo(
    () =>
      electricityBills.filter((bill) => {
        if (!normalizedSearch) return true;
        return [bill.student?.studentCode, bill.student?.fullName, bill.student?.email, formatRoomName(bill.room), bill.monthYear]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      }),
    [electricityBills, normalizedSearch],
  );

  const unpaidTotal = [...roomBills, ...electricityBills]
    .filter((bill) => bill.status !== "paid" && bill.status !== "exempted")
    .reduce((sum, bill) => sum + bill.amount, 0);
  const paidTotal = [...roomBills, ...electricityBills]
    .filter((bill) => bill.status === "paid")
    .reduce((sum, bill) => sum + bill.amount, 0);

  const openConfirm = (target: ConfirmTarget) => {
    setConfirmTarget(target);
    setConfirmForm({
      paymentMethod: "Chuyển khoản",
      transactionCode: "",
      paidAt: getTodayValue(),
    });
    setErrorMessage("");
  };

  const handleGenerateRoomFee = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const amount = parseMoneyValue(roomForm.amount);
    if (!isPositiveInteger(amount)) {
      setErrorMessage("Vui lòng nhập số tiền phòng là số nguyên dương.");
      return;
    }

    setIsSubmitting(true);

    try {
      const months = QUARTER_MONTHS[roomForm.quarter] ?? [];
      const firstMonth = months[0];
      if (firstMonth) {
        // 1 hóa đơn duy nhất mỗi quý, số tiền nhập vào là số tiền/quý
        await generateRoomFeeBills({
          month: firstMonth,
          year: Number(roomForm.year),
          amount,
          due_date: roomForm.dueDate,
        });
      }
      await loadData();
    } catch {
      setErrorMessage("Không thể tạo hóa đơn tiền phòng. Vui lòng kiểm tra dữ liệu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateElectricity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const unitPrice = parseMoneyValue(electricityForm.unitPrice);
    const oldIndex = Number(electricityForm.oldIndex);
    const newIndex = Number(electricityForm.newIndex);

    if (!isNonNegativeInteger(oldIndex)) {
      setErrorMessage("Vui lòng nhập chỉ số cũ là số nguyên không âm.");
      return;
    }

    if (!isPositiveInteger(newIndex)) {
      setErrorMessage("Vui lòng nhập chỉ số mới là số nguyên dương.");
      return;
    }

    if (newIndex < oldIndex) {
      setErrorMessage("Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ.");
      return;
    }

    if (!isPositiveInteger(unitPrice)) {
      setErrorMessage("Vui lòng nhập đơn giá là số nguyên dương.");
      return;
    }

    setIsSubmitting(true);

    try {
      await generateElectricityBills({
        room_id: Number(electricityForm.roomId),
        month_year: electricityForm.monthYear,
        old_index: oldIndex,
        new_index: newIndex,
        unit_price: unitPrice,
        due_date: electricityForm.dueDate,
      });
      await loadData();
    } catch {
      setErrorMessage("Không thể sinh hóa đơn điện. Vui lòng kiểm tra chỉ số và phòng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!confirmTarget) return;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        payment_method: confirmForm.paymentMethod.trim(),
        transaction_code: confirmForm.transactionCode.trim(),
        paid_at: confirmForm.paidAt,
      };

      if (confirmTarget.source === "room") {
        await confirmRoomFeePayment(confirmTarget.id, payload);
      } else {
        await confirmElectricityPayment(confirmTarget.id, payload);
      }

      setConfirmTarget(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ktx-payments-updated"));
      }
      await loadData();
    } catch {
      setErrorMessage("Không thể xác nhận thanh toán. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex min-h-[calc(100vh-8rem)] flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <header className="rounded-[24px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#1a2d52]">Quản lý thanh toán</h1>
            <p className="mt-1 text-sm text-[#62789f]">Quản lý hóa đơn tiền phòng, tiền điện và xác nhận thanh toán thủ công.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#d3e0f2] bg-white/80 px-5 py-3 text-center shadow-[0_12px_24px_rgba(36,76,184,0.10)]">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Chưa thu</p>
              <p className="mt-1 text-xl font-bold text-[#b77900]">{moneyFormatter.format(unpaidTotal)}</p>
            </div>
            <div className="rounded-2xl border border-[#d3e0f2] bg-white/80 px-5 py-3 text-center shadow-[0_12px_24px_rgba(36,76,184,0.10)]">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Đã thu</p>
              <p className="mt-1 text-xl font-bold text-[#087a4d]">{moneyFormatter.format(paidTotal)}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("room")}
          className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold shadow-[0_10px_22px_rgba(36,76,184,0.12)] transition ${
            activeTab === "room" ? "bg-[#244cb8] text-white" : "border border-[#c8d8ef] bg-white text-[#24407f]"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Tiền phòng
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("electricity")}
          className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold shadow-[0_10px_22px_rgba(36,76,184,0.12)] transition ${
            activeTab === "electricity" ? "bg-[#244cb8] text-white" : "border border-[#c8d8ef] bg-white text-[#24407f]"
          }`}
        >
          <Zap className="h-4 w-4" />
          Tiền điện
        </button>
      </div>

      {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{errorMessage}</div> : null}

      {activeTab === "room" ? (
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]">
          <form onSubmit={handleGenerateRoomFee} className="rounded-[22px] border border-[#d6e2f1] bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
            <h2 className="text-lg font-bold text-[#1a2d52]">Tạo hóa đơn tiền phòng</h2>
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Quý</span>
                  <select value={roomForm.quarter} onChange={(event) => setRoomForm((current) => ({ ...current, quarter: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10">
                    <option value="1">Quý 1 (Tháng 1–3)</option>
                    <option value="2">Quý 2 (Tháng 4–6)</option>
                    <option value="3">Quý 3 (Tháng 7–9)</option>
                    <option value="4">Quý 4 (Tháng 10–12)</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Năm</span>
                  <input value={roomForm.year} onChange={(event) => setRoomForm((current) => ({ ...current, year: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Số tiền</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={roomForm.amount}
                  onChange={(event) => setRoomForm((current) => ({ ...current, amount: formatMoneyInput(event.target.value) }))}
                  placeholder="Nhập số tiền"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Hạn đóng</span>
                <input type="date" value={roomForm.dueDate} onChange={(event) => setRoomForm((current) => ({ ...current, dueDate: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
              </label>
              <button type="submit" disabled={isSubmitting} className="auth-btn-gloss inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#244cb8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] disabled:opacity-60">
                <Plus className="h-4 w-4" />
                <span className="auth-btn-gloss__content">Tạo hóa đơn quý</span>
              </button>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
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
            </div>
          </form>

          <BillTable
            isLoading={isLoading}
            headings={["Sinh viên", "Phòng", "Quý", "Số tiền", "Miễn/Giảm", "Hạn đóng", "Trạng thái", "Hành động"]}
            rows={visibleRoomBills.map((bill) => ({
              key: `room-${bill.id}`,
              cells: [
                <StudentCell key="student" student={bill.student} />,
                formatRoomName(bill.room),
                `Quý ${getQuarterFromMonth(bill.month)}/${bill.year}`,
                <RoomFeeAmountCell key="amount" bill={bill} />,
                <DiscountCell key="discount" discountPercent={bill.discountPercent} discountReason={bill.discountReason} />,
                formatDate(bill.dueDate),
                <StatusBadge key="status" status={bill.status} />,
                bill.status === "paid" || bill.status === "exempted" ? "-" : <ConfirmButton key="confirm" onClick={() => openConfirm({ source: "room", id: bill.id, name: bill.student?.fullName || "hóa đơn" })} />,
              ],
            }))}
          />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]">
          <form onSubmit={handleGenerateElectricity} className="rounded-[22px] border border-[#d6e2f1] bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
            <h2 className="text-lg font-bold text-[#1a2d52]">Nhập chỉ số điện</h2>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Phòng</span>
                <select value={electricityForm.roomId} onChange={(event) => setElectricityForm((current) => ({ ...current, roomId: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10">
                  <option value="">Chọn phòng</option>
                  {rooms.map((room) => <option key={room.id} value={room.id}>{formatDormRoomName(room)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Tháng</span>
                <input type="month" value={electricityForm.monthYear} onChange={(event) => setElectricityForm((current) => ({ ...current, monthYear: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Chỉ số cũ</span>
                  <input type="number" min="0" step="1" value={electricityForm.oldIndex} onChange={(event) => setElectricityForm((current) => ({ ...current, oldIndex: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Chỉ số mới</span>
                  <input type="number" min="1" step="1" value={electricityForm.newIndex} onChange={(event) => setElectricityForm((current) => ({ ...current, newIndex: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Đơn giá</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={electricityForm.unitPrice}
                    onChange={(event) => setElectricityForm((current) => ({ ...current, unitPrice: formatMoneyInput(event.target.value) }))}
                    placeholder="Nhập đơn giá"
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Hạn đóng</span>
                  <input type="date" value={electricityForm.dueDate} onChange={(event) => setElectricityForm((current) => ({ ...current, dueDate: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
                </label>
              </div>
              <button type="submit" disabled={isSubmitting} className="auth-btn-gloss inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#244cb8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] disabled:opacity-60">
                <Zap className="h-4 w-4" />
                <span className="auth-btn-gloss__content">Tính và sinh hóa đơn</span>
              </button>
            </div>
          </form>

          <div className="space-y-5">
            <BillTable
              isLoading={isLoading}
              headings={["Sinh viên", "Phòng", "Tháng", "kWh", "Số tiền", "Trạng thái", "Hành động"]}
              rows={visibleElectricityBills.map((bill) => ({
                key: `electricity-${bill.id}`,
                cells: [
                  <StudentCell key="student" student={bill.student} />,
                  formatRoomName(bill.room),
                  bill.monthYear,
                  bill.usageKwh,
                  moneyFormatter.format(bill.amount),
                  <StatusBadge key="status" status={bill.status} />,
                  bill.status === "paid" ? "-" : <ConfirmButton key="confirm" onClick={() => openConfirm({ source: "electricity", id: bill.id, name: bill.student?.fullName || "hóa đơn" })} />,
                ],
              }))}
            />

            <BillTable
              isLoading={isLoading}
              headings={["Phòng", "Tháng", "Chỉ số cũ", "Chỉ số mới", "kWh", "Tổng tiền"]}
              rows={electricityRecords.slice(0, 8).map((record) => ({
                key: `record-${record.id}`,
                cells: [
                  formatRoomName(record.room),
                  record.monthYear,
                  record.oldIndex,
                  record.newIndex,
                  record.usageKwh,
                  moneyFormatter.format(record.totalAmount),
                ],
              }))}
            />
          </div>
        </div>
      )}

      {confirmTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-[26px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]">
            <h2 className="text-2xl font-bold text-[#173a78]">Xác nhận thanh toán</h2>
            <p className="mt-1 text-sm font-semibold text-[#62789f]">{confirmTarget.name}</p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Phương thức</span>
                <input value={confirmForm.paymentMethod} onChange={(event) => setConfirmForm((current) => ({ ...current, paymentMethod: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
              </label>
              <label className="block">
                <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Mã giao dịch</span>
                <input value={confirmForm.transactionCode} onChange={(event) => setConfirmForm((current) => ({ ...current, transactionCode: event.target.value }))} placeholder="Nhập mã giao dịch nếu có" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
              </label>
              <label className="block">
                <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Ngày thanh toán</span>
                <input type="date" value={confirmForm.paidAt} onChange={(event) => setConfirmForm((current) => ({ ...current, paidAt: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmTarget(null)} className="rounded-2xl border border-[#c8d8ef] bg-white px-5 py-2.5 text-sm font-semibold text-[#24407f]">Hủy</button>
              <button type="button" onClick={() => void handleConfirmPayment()} disabled={isSubmitting} className="auth-btn-gloss inline-flex items-center gap-2 rounded-2xl bg-[#244cb8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] disabled:opacity-60">
                <CheckCircle2 className="h-4 w-4" />
                <span className="auth-btn-gloss__content">Xác nhận</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.section>
  );
}

function StudentCell({ student }: { student: RoomFeeBill["student"] }) {
  return (
    <div>
      <p className="font-bold text-[#1f3152]">{student?.fullName || "-"}</p>
      <p className="mt-1 text-xs font-semibold text-[#6f84ad]">{student?.studentCode || "-"}</p>
    </div>
  );
}

function RoomFeeAmountCell({ bill }: { bill: RoomFeeBill }) {
  const hasDiscount = (bill.discountPercent ?? 0) > 0 && (bill.originalAmount ?? 0) > 0;
  return (
    <div className="text-sm">
      {hasDiscount ? (
        <>
          <p className="text-xs text-[#9aafcf] line-through">{moneyFormatter.format(bill.originalAmount!)}</p>
          <p className="font-bold text-[#1f3152]">{moneyFormatter.format(bill.amount)}</p>
        </>
      ) : (
        <p className="font-bold text-[#1f3152]">{moneyFormatter.format(bill.amount)}</p>
      )}
    </div>
  );
}

function DiscountCell({ discountPercent, discountReason }: { discountPercent: number | null; discountReason: string | null }) {
  if (!discountPercent || discountPercent <= 0) {
    return <span className="text-sm text-[#9aafcf]">-</span>;
  }
  return (
    <div className="text-sm">
      <p className="font-bold text-emerald-600">Giảm {discountPercent}%</p>
      {discountReason ? <p className="text-xs text-[#6f84ad]">{discountReason}</p> : null}
    </div>
  );
}

function ConfirmButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl bg-[#244cb8] px-2.5 py-2 text-xs font-bold text-white shadow-[0_10px_20px_rgba(36,76,184,0.20)]"
    >
      <CheckCircle2 className="h-4 w-4" />
      Xác nhận
    </button>
  );
}

function BillTable({
  headings,
  rows,
  isLoading,
}: {
  headings: string[];
  rows: Array<{ key: string; cells: Array<ReactNode> }>;
  isLoading: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[#d6e2f1] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0">
          <thead>
            <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
              {headings.map((heading) => (
                <th key={heading} className="px-3 py-3.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={headings.length} className="px-4 py-8 text-center text-sm font-semibold text-[#6f84ad]">Đang tải dữ liệu...</td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.key} className="transition hover:bg-[#f8fbff]">
                  {row.cells.map((cell, index) => (
                    <td key={index} className="border-t border-[#e8eef8] px-3 py-3.5 text-sm font-semibold text-[#5570a0]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headings.length} className="px-4 py-8 text-center text-sm font-semibold text-[#6f84ad]">Chưa có dữ liệu.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
