import { motion } from "framer-motion";
import { CalendarDays, CreditCard, MapPin, Receipt, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { confirmFreeRoomFeeBill, createVnpayPayment, getStudentPayments, verifyVnpayPayment, type PaymentStatus, type StudentPaymentItem, type StudentPayments } from "../../../api/paymentApi";
import { useAuthStore } from "../../auth/store";
import { formatDate } from "../../../utils/dateFormat";
import { useOccupancyStatus } from "../hooks/useOccupancyStatus";
import OccupancyGuardCard from "../../../components/OccupancyGuardCard";

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
    className: "border border-green-200 bg-green-50 text-green-700",
  },
  overdue: {
    label: "Quá hạn",
    className: "border border-gray-200 bg-gray-100 text-gray-700",
  },
  exempted: {
    label: "Đã miễn",
    className: "border border-sky-200 bg-sky-50 text-sky-700",
  },
};

type PaymentTab = "room_fee" | "electricity";

const formatPeriodMonth = (value: string) => {
  const [year, month] = value.split("-");
  return month && year ? `${month}/${year}` : value;
};

const parsePeriod = (value: string): { month: number; year: number } | null => {
  const dash = value.match(/^(\d{4})-(\d{1,2})$/);
  if (dash) return { year: Number(dash[1]), month: Number(dash[2]) };
  const thang = value.match(/[Tt]háng\s+(\d{1,2})\/(\d{4})/);
  if (thang) return { month: Number(thang[1]), year: Number(thang[2]) };
  return null;
};

type QuarterGroup = { key: string; label: string; items: StudentPaymentItem[]; total: number };

const groupByQuarter = (items: StudentPaymentItem[]): QuarterGroup[] => {
  const map = new Map<string, QuarterGroup>();
  for (const item of items) {
    const p = parsePeriod(item.period);
    const q = p ? Math.ceil(p.month / 3) : 0;
    const year = p?.year ?? 0;
    const key = `${year}-Q${q}`;
    const label = p ? `Quý ${q}/${year}` : item.period;
    if (!map.has(key)) map.set(key, { key, label, items: [], total: 0 });
    const group = map.get(key)!;
    group.items.push(item);
    group.total += item.amount;
  }
  return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
};

const getRoomLabel = (room: StudentPaymentItem["room"]) => (room ? `${room.buildingCode}${room.roomNumber}` : "-");

function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${statusMeta[status].className}`}>
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          status === "paid" ? "bg-green-600" : status === "unpaid" ? "bg-amber-500" : status === "exempted" ? "bg-sky-500" : "bg-gray-500"
        }`}
      />
      {statusMeta[status].label}
    </span>
  );
}

function BillIcon({ source }: { source: StudentPaymentItem["source"] }) {
  return (
    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
      {source === "electricity" ? <Zap className="h-6 w-6" /> : <Receipt className="h-6 w-6" />}
    </span>
  );
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const studentEmail = useAuthStore((state) => state.user?.email ?? "");
  const occupancyStatus = useOccupancyStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const vnpayStatus = searchParams.get("vnpay");
  const vnpayTxnRef = searchParams.get("vnp_TxnRef");
  const noticeType = searchParams.get("notice");
  const [payments, setPayments] = useState<StudentPayments | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [payingKey, setPayingKey] = useState("");
  const [activeTab, setActiveTab] = useState<PaymentTab>("room_fee");

  useEffect(() => {
    let isActive = true;

    const loadPayments = async () => {
      // Chưa từng có occupancy đạt PENDING_PAYMENT trở lên thì chắc chắn chưa có hóa đơn nào
      // được tạo — không gọi API thanh toán cho trường hợp này.
      if (occupancyStatus.isLoading) return;
      if (!occupancyStatus.hasEverHadBillableOccupancy) {
        setPayments(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError("");

      try {
        const data = await getStudentPayments();
        if (isActive) {
          setPayments(data);
        }
      } catch {
        if (isActive) {
          setPayments(null);
          setLoadError("Không thể tải thông tin thanh toán.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadPayments();

    if (typeof window !== "undefined") {
      window.addEventListener("ktx-payments-updated", loadPayments);
      window.addEventListener("focus", loadPayments);
    }

    return () => {
      isActive = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("ktx-payments-updated", loadPayments);
        window.removeEventListener("focus", loadPayments);
      }
    };
  }, [studentEmail, occupancyStatus.isLoading, occupancyStatus.hasEverHadBillableOccupancy]);

  useEffect(() => {
    const messageTimers: number[] = [];
    const setPaymentMessageLater = (message: string) => {
      const timerId = window.setTimeout(() => setPaymentMessage(message), 0);
      messageTimers.push(timerId);
    };

    if (vnpayTxnRef) {
      const payload = Object.fromEntries(searchParams.entries());
      setPaymentMessageLater("Đang xác minh thanh toán VNPay...");

      verifyVnpayPayment(payload)
        .then((result) => {
          setPaymentMessage(result.message || (result.success ? "Thanh toán VNPay thành công." : "Thanh toán VNPay không thành công."));
          window.dispatchEvent(new Event("ktx-payments-updated"));
        })
        .catch(() => {
          setPaymentMessage("Không thể xác minh thanh toán VNPay.");
        })
        .finally(() => {
          setSearchParams({}, { replace: true });
        });
      return () => {
        messageTimers.forEach((timerId) => window.clearTimeout(timerId));
      };
    }

    if (!vnpayStatus) {
      return undefined;
    }

    if (vnpayStatus === "success") {
      setPaymentMessageLater("Thanh toán VNPay thành công.");
      window.dispatchEvent(new Event("ktx-payments-updated"));
      redirectTimerRef.current = setTimeout(() => {
        navigate("/student/room", { replace: true });
      }, 1500);
    } else {
      setPaymentMessageLater("Thanh toán VNPay không thành công hoặc đã bị hủy.");
    }

    setSearchParams({}, { replace: true });
    return () => {
      messageTimers.forEach((timerId) => window.clearTimeout(timerId));
      if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
    };
  }, [searchParams, setSearchParams, vnpayStatus, vnpayTxnRef]);

  const roomFeeItems = useMemo(() => payments?.items.filter((item) => item.source === "room_fee") ?? [], [payments?.items]);
  const electricityItems = useMemo(() => payments?.items.filter((item) => item.source === "electricity") ?? [], [payments?.items]);
  const unpaidRoomFeeItems = useMemo(() => roomFeeItems.filter((item) => item.status !== "paid" && item.status !== "exempted"), [roomFeeItems]);
  const unpaidElectricityItems = useMemo(() => electricityItems.filter((item) => item.status !== "paid"), [electricityItems]);
  const paidRoomFeeItems = useMemo(() => roomFeeItems.filter((item) => item.status === "paid" || item.status === "exempted"), [roomFeeItems]);
  const paidElectricityItems = useMemo(() => electricityItems.filter((item) => item.status === "paid"), [electricityItems]);
  const activeTabData =
    activeTab === "room_fee"
      ? {
          allItems: roomFeeItems,
          unpaidItems: unpaidRoomFeeItems,
          paidItems: paidRoomFeeItems,
          unpaidEmptyText: "Không có hóa đơn tiền phòng cần thanh toán.",
          paidEmptyText: "Chưa có lịch sử thanh toán tiền phòng.",
        }
      : {
          allItems: electricityItems,
          unpaidItems: unpaidElectricityItems,
          paidItems: paidElectricityItems,
          unpaidEmptyText: "Không có hóa đơn tiền điện cần thanh toán.",
          paidEmptyText: "Chưa có lịch sử thanh toán tiền điện.",
        };
  const statusSummaryCards = [
    { label: "Đã thanh toán", value: activeTabData.paidItems.length, className: "text-[#16784b]" },
    { label: "Chưa thanh toán", value: activeTabData.allItems.filter((item) => item.status === "unpaid").length, className: "text-[#9b6b00]" },
    { label: "Quá hạn", value: activeTabData.allItems.filter((item) => item.status === "overdue").length, className: "text-[#cf2448]" },
  ];

  const handleVnpayPayment = async (item: StudentPaymentItem) => {
    if (!studentEmail) {
      setPaymentMessage("Không tìm thấy email sinh viên để tạo thanh toán VNPay.");
      return;
    }

    const key = `${item.source}-${item.id}`;
    setPayingKey(key);
    setLoadError("");
    setPaymentMessage("");

    try {
      const data = await createVnpayPayment({
        source: item.source,
        bill_id: item.id,
      });

      if (!data.paymentUrl) {
        setPaymentMessage("Không tạo được liên kết thanh toán VNPay.");
        setPayingKey("");
        return;
      }

      window.location.href = data.paymentUrl;
    } catch {
      setPaymentMessage("Không thể tạo thanh toán VNPay. Vui lòng thử lại sau.");
      setPayingKey("");
    }
  };

  const handleConfirmFree = async (item: StudentPaymentItem) => {
    if (!studentEmail) return;

    const key = `${item.source}-${item.id}`;
    setPayingKey(key);
    setLoadError("");
    setPaymentMessage("");

    try {
      await confirmFreeRoomFeeBill(item.id);
      setPaymentMessage("Thanh toán thành công!");
      window.dispatchEvent(new Event("ktx-payments-updated"));
    } catch {
      setPaymentMessage("Không thể xác nhận. Vui lòng thử lại sau.");
    } finally {
      setPayingKey("");
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6">
        <div className="rounded-[26px] border border-[#c4d7f3] bg-white/80 p-5 text-sm font-semibold text-[#5570a0] shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
          Đang tải thông tin thanh toán...
        </div>
      </section>
    );
  }

  if (!occupancyStatus.hasEverHadBillableOccupancy) {
    const hasPendingRegistration = occupancyStatus.latestRegistration?.status === "submitted";
    return (
      <section className="rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6">
        <OccupancyGuardCard
          icon={Receipt}
          title="Chưa phát sinh hóa đơn"
          description="Hóa đơn tiền phòng chỉ được tạo sau khi bạn được xếp phòng và chọn giường. Bạn chưa hoàn tất bước này nên hiện chưa có khoản nào cần thanh toán."
          actionLabel={hasPendingRegistration ? "Xem trạng thái đăng ký" : undefined}
          onAction={hasPendingRegistration ? () => navigate("/student/registration") : undefined}
        />
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <header className="rounded-[28px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-5 text-[#1a2d52] shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <h1 className="text-[32px] font-bold tracking-tight">Thanh toán hóa đơn</h1>
        <p className="mt-2 text-sm font-semibold text-[#62789f]">Theo dõi tiền phòng, tiền điện và lịch sử thanh toán.</p>
      </header>

      {loadError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{loadError}</div> : null}
      {noticeType === "bed_selected" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Bạn đã chọn giường thành công! Vui lòng thanh toán hóa đơn tháng đầu để hoàn tất đăng ký lưu trú.
        </div>
      ) : null}
      {paymentMessage ? (
        <div className="rounded-2xl border border-[#d3e0f2] bg-white/80 px-4 py-3 text-sm font-semibold text-[#1b3766]">{paymentMessage}</div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("room_fee")}
          className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold shadow-[0_10px_22px_rgba(36,76,184,0.12)] transition ${
            activeTab === "room_fee" ? "bg-[#244cb8] text-white" : "border border-[#c8d8ef] bg-white text-[#24407f]"
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

      <div className="grid gap-4 sm:grid-cols-3">
        {statusSummaryCards.map((card) => (
          <div key={card.label} className="rounded-[24px] border border-[#d3e0f2] bg-white p-5 text-center shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold ${card.className}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {activeTab === "room_fee" ? (
        <>
          <QuarterGroupedSection
            title="HÓA ĐƠN CẦN THANH TOÁN"
            groups={groupByQuarter(unpaidRoomFeeItems)}
            emptyText="Không có hóa đơn tiền phòng cần thanh toán."
            payingKey={payingKey}
            onPayOnline={handleVnpayPayment}
            onConfirmFree={handleConfirmFree}
          />
          <QuarterGroupedSection
            title="LỊCH SỬ THANH TOÁN"
            groups={groupByQuarter(paidRoomFeeItems)}
            emptyText="Chưa có lịch sử thanh toán tiền phòng."
          />
        </>
      ) : (
        <>
          <PaymentSection
            title="HÓA ĐƠN CẦN THANH TOÁN"
            items={unpaidElectricityItems}
            emptyText="Không có hóa đơn tiền điện cần thanh toán."
            payingKey={payingKey}
            onPayOnline={handleVnpayPayment}
            onConfirmFree={handleConfirmFree}
          />
          <PaymentSection
            title="LỊCH SỬ THANH TOÁN"
            items={paidElectricityItems}
            emptyText="Chưa có lịch sử thanh toán tiền điện."
          />
        </>
      )}
    </motion.section>
  );
}

function QuarterGroupedSection({
  title,
  groups,
  emptyText,
  payingKey,
  onPayOnline,
  onConfirmFree,
}: {
  title: string;
  groups: QuarterGroup[];
  emptyText: string;
  payingKey?: string;
  onPayOnline?: (item: StudentPaymentItem) => void;
  onConfirmFree?: (item: StudentPaymentItem) => void;
}) {
  return (
    <section className="rounded-[26px] border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      <div className="mt-5 space-y-5">
        {groups.length ? (
          groups.map((group) => (
            <div key={group.key} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex min-h-[44px] items-center justify-between gap-4 border-b border-gray-200 bg-gray-100 px-5 py-2.5">
                <span className="text-base font-bold text-gray-900">{group.label}</span>
                <span className="text-sm font-bold text-gray-700">Tổng: {moneyFormatter.format(group.total)}</span>
              </div>
              <div className="space-y-4 p-4">
                {group.items.map((item) => (
                  <PaymentItemCard
                    key={`${item.source}-${item.id}`}
                    item={item}
                    isPaying={payingKey === `${item.source}-${item.id}`}
                    onPayOnline={onPayOnline}
                    onConfirmFree={onConfirmFree}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm font-semibold text-gray-500">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}

function PaymentSection({
  title,
  description,
  items,
  emptyText,
  payingKey,
  onPayOnline,
  onConfirmFree,
}: {
  title: string;
  description?: string;
  items: StudentPaymentItem[];
  emptyText: string;
  payingKey?: string;
  onPayOnline?: (item: StudentPaymentItem) => void;
  onConfirmFree?: (item: StudentPaymentItem) => void;
}) {
  return (
    <section className="rounded-[26px] border border-[#c4d7f3] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1a2d52]">{title}</h2>
          {description ? <p className="mt-1 text-sm font-semibold text-[#62789f]">{description}</p> : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        {items.length ? (
          items.map((item) => (
            <PaymentItemCard
              key={`${item.source}-${item.id}`}
              item={item}
              isPaying={payingKey === `${item.source}-${item.id}`}
              onPayOnline={onPayOnline}
              onConfirmFree={onConfirmFree}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-[#d3e0f2] bg-white/70 px-4 py-8 text-center text-sm font-semibold text-[#6f84ad]">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}

function PaymentItemCard({
  item,
  isPaying = false,
  onPayOnline,
  onConfirmFree,
}: {
  item: StudentPaymentItem;
  isPaying?: boolean;
  onPayOnline?: (item: StudentPaymentItem) => void;
  onConfirmFree?: (item: StudentPaymentItem) => void;
}) {
  if (item.source === "electricity") {
    return <ElectricityPaymentItemCard item={item} isPaying={isPaying} onPayOnline={onPayOnline} />;
  }

  const hasDiscount = item.source === "room_fee" && (item.discountPercent ?? 0) > 0 && (item.originalAmount ?? 0) > 0;
  const isFree = item.source === "room_fee" && item.amount === 0;
  const originalAmount = hasDiscount ? item.originalAmount! : item.amount;
  const discountAmount = hasDiscount ? item.originalAmount! - item.amount : 0;
  const displayTitle = (() => {
    if (item.source !== "room_fee") return item.title;
    const p = parsePeriod(item.period);
    if (!p) return item.title;
    return item.isQuarterly === false ? `Tiền phòng tháng ${p.month}/${p.year}` : `Tiền phòng Quý ${Math.ceil(p.month / 3)}/${p.year}`;
  })();

  return (
    <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:p-7">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(200px,32%)] md:items-center">
        <div className="min-w-0 space-y-4">
          <div className="flex min-w-0 items-start gap-5">
            <BillIcon source={item.source} />
            <div className="min-w-0 space-y-3">
              <h3 className="text-3xl font-bold leading-tight text-gray-700">{displayTitle}</h3>
              <div className="space-y-2 text-base font-medium text-gray-500">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600/70" />
                  Phòng {item.room ? `${item.room.buildingCode}${item.room.roomNumber}` : "-"}
                </span>
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-blue-600/70" />
                  Hạn thanh toán {formatDate(item.dueDate)}
                </span>
              </div>
              {item.status === "paid" ? (
                <p className="text-base font-medium text-gray-500">
                  Đã thanh toán: {item.paidAt ? formatDate(item.paidAt) : "-"} · {item.paymentMethod || "-"} {item.transactionCode ? `· ${item.transactionCode}` : ""}
                </p>
              ) : null}
              {item.status === "overdue" ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  ⚠ Đã quá hạn thanh toán — vui lòng thanh toán sớm để tránh bị nhắc nợ/xử lý theo quy định.
                </p>
              ) : null}
            </div>
          </div>

          <div className="max-w-xl space-y-3 pl-0 sm:pl-[4.75rem]">
            <div className="flex items-center justify-between gap-6 text-base font-medium text-gray-600">
              <span>Giá gốc</span>
              <span>{moneyFormatter.format(originalAmount)}</span>
            </div>
            {hasDiscount ? (
              <div className="flex items-center justify-between gap-6 text-base font-semibold text-green-600">
                <span>
                  Giảm {item.discountPercent}%{item.discountReason ? ` (${item.discountReason})` : ""}
                </span>
                <span>-{moneyFormatter.format(discountAmount)}</span>
              </div>
            ) : null}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-end justify-between gap-6">
                <span className="text-lg font-extrabold text-gray-700">Tổng phải trả</span>
                <span className="text-2xl font-extrabold text-blue-600">{moneyFormatter.format(item.amount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-center gap-4 rounded-3xl border border-blue-100 bg-blue-50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 md:items-center md:text-center">
          <StatusBadge status={item.status} />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-500">Tổng phải thanh toán</p>
            <p className="text-5xl font-extrabold tracking-tight text-blue-600">{moneyFormatter.format(item.amount)}</p>
          </div>
          {item.status !== "paid" && item.status !== "exempted" && isFree && onConfirmFree ? (
            <button
              type="button"
              onClick={() => onConfirmFree(item)}
              disabled={isPaying}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-green-600 px-5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 md:w-[220px]"
            >
              {isPaying ? "Đang xác nhận..." : "Xác nhận miễn phí"}
            </button>
          ) : item.status !== "paid" && item.status !== "exempted" && !isFree && onPayOnline ? (
            <button
              type="button"
              onClick={() => onPayOnline(item)}
              disabled={isPaying}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 md:w-[220px]"
            >
              <CreditCard className="h-4 w-4" />
              {isPaying ? "Đang tạo..." : "Thanh toán VNPay"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ElectricityPaymentItemCard({
  item,
  isPaying = false,
  onPayOnline,
}: {
  item: StudentPaymentItem;
  isPaying?: boolean;
  onPayOnline?: (item: StudentPaymentItem) => void;
}) {
  const usageKwh = item.usageKwh ?? 0;
  const unitPrice = item.unitPrice ?? 0;
  const roomElectricityAmount = usageKwh * unitPrice;
  const studentCount = roomElectricityAmount > 0 && item.amount > 0 ? Math.max(1, Math.round(roomElectricityAmount / item.amount)) : 0;

  return (
    <article className="rounded-[22px] border border-[#d6e2f1] bg-white p-4 shadow-[0_14px_30px_rgba(36,76,184,0.10)]">
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0 space-y-4">
          <div className="flex min-w-0 items-start gap-3">
            <BillIcon source={item.source} />
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-[#1f3152]">Tiền điện tháng {formatPeriodMonth(item.period)}</h3>
              <p className="mt-1 text-sm font-semibold text-[#6f84ad]">Phòng: {getRoomLabel(item.room)}</p>
            </div>
          </div>

          <div className="grid gap-x-6 gap-y-2 text-sm font-semibold text-[#6f84ad] sm:grid-cols-2">
            <p>Số điện tiêu thụ: <span className="text-[#48628f]">{usageKwh} kWh</span></p>
            <p>Đơn giá: <span className="text-[#48628f]">{moneyFormatter.format(unitPrice)}/kWh</span></p>
            <p>Số sinh viên trong phòng: <span className="text-[#48628f]">{studentCount || "-"}</span></p>
            <p>Tiền điện phòng: <span className="text-[#48628f]">{moneyFormatter.format(roomElectricityAmount)}</span></p>
            <p className="inline-flex items-center gap-2 sm:col-span-2">
              <CalendarDays className="h-4 w-4" />
              Hạn thanh toán: <span className="text-[#48628f]">{formatDate(item.dueDate)}</span>
            </p>
          </div>

          {item.status === "paid" ? (
            <p className="text-sm font-semibold text-[#6f84ad]">
              Đã thanh toán: {item.paidAt ? formatDate(item.paidAt) : "-"} · {item.paymentMethod || "-"} {item.transactionCode ? `· ${item.transactionCode}` : ""}
            </p>
          ) : null}
          {item.status === "overdue" ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              ⚠ Đã quá hạn thanh toán — vui lòng thanh toán sớm để tránh bị nhắc nợ/xử lý theo quy định.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col justify-between lg:items-end lg:text-right">
          <div className="space-y-2">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Tiền điện của bạn</p>
            <p className="text-2xl font-extrabold text-[#173a78]">{moneyFormatter.format(item.amount)}</p>
          </div>

          {item.status !== "paid" && onPayOnline ? (
            <button
              type="button"
              onClick={() => onPayOnline(item)}
              disabled={isPaying}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#244cb8] px-4 py-2 text-sm font-bold text-white shadow-[0_12px_24px_rgba(36,76,184,0.22)] transition hover:bg-[#1d3f9e] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <CreditCard className="h-4 w-4" />
              {isPaying ? "Đang tạo..." : "Thanh toán VNPay"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
