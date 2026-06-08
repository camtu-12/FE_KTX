import { motion } from "framer-motion";
import { CreditCard, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createVnpayPayment, getStudentPayments, verifyVnpayPayment, type PaymentStatus, type StudentPaymentItem, type StudentPayments } from "../../../api/paymentApi";
import { useAuthStore } from "../../auth/store";

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
};

const formatDate = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ${statusMeta[status].className}`}>
      {statusMeta[status].label}
    </span>
  );
}

function BillIcon({ source }: { source: StudentPaymentItem["source"] }) {
  return (
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#c8d8ef] bg-white text-[#244cb8] shadow-[0_10px_20px_rgba(36,76,184,0.12)]">
      {source === "electricity" ? <Zap className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
    </span>
  );
}

export default function PaymentPage() {
  const studentEmail = useAuthStore((state) => state.user?.email ?? "");
  const [searchParams, setSearchParams] = useSearchParams();
  const vnpayStatus = searchParams.get("vnpay");
  const vnpayTxnRef = searchParams.get("vnp_TxnRef");
  const [payments, setPayments] = useState<StudentPayments | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [payingKey, setPayingKey] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadPayments = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const data = await getStudentPayments(studentEmail);
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
  }, [studentEmail]);

  useEffect(() => {
    if (vnpayTxnRef) {
      const payload = Object.fromEntries(searchParams.entries());
      setPaymentMessage("Đang xác minh thanh toán VNPay...");

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
      return;
    }

    if (!vnpayStatus) return;

    if (vnpayStatus === "success") {
      setPaymentMessage("Thanh toán VNPay thành công.");
      window.dispatchEvent(new Event("ktx-payments-updated"));
    } else {
      setPaymentMessage("Thanh toán VNPay không thành công hoặc đã bị hủy.");
    }

    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, vnpayStatus, vnpayTxnRef]);

  const roomFeeItems = useMemo(() => payments?.items.filter((item) => item.source === "room_fee") ?? [], [payments?.items]);
  const electricityItems = useMemo(() => payments?.items.filter((item) => item.source === "electricity") ?? [], [payments?.items]);
  const unpaidRoomFeeItems = useMemo(() => roomFeeItems.filter((item) => item.status !== "paid"), [roomFeeItems]);
  const unpaidElectricityItems = useMemo(() => electricityItems.filter((item) => item.status !== "paid"), [electricityItems]);
  const paidRoomFeeItems = useMemo(() => roomFeeItems.filter((item) => item.status === "paid"), [roomFeeItems]);
  const paidElectricityItems = useMemo(() => electricityItems.filter((item) => item.status === "paid"), [electricityItems]);
  const unpaidRoomFeeTotal = unpaidRoomFeeItems.reduce((sum, item) => sum + item.amount, 0);
  const unpaidElectricityTotal = unpaidElectricityItems.reduce((sum, item) => sum + item.amount, 0);
  const overdueTotal = payments?.items.filter((item) => item.status === "overdue").reduce((sum, item) => sum + item.amount, 0) ?? 0;

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
        email: studentEmail,
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

  if (isLoading) {
    return (
      <section className="rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6">
        <div className="rounded-[26px] border border-[#c4d7f3] bg-white/80 p-5 text-sm font-semibold text-[#5570a0] shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
          Đang tải thông tin thanh toán...
        </div>
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
        <h1 className="text-[32px] font-bold tracking-tight">Thanh toán của tôi</h1>
        <p className="mt-2 text-sm font-semibold text-[#62789f]">Theo dõi tiền phòng, tiền điện và lịch sử thanh toán.</p>
      </header>

      {loadError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{loadError}</div> : null}
      {paymentMessage ? (
        <div className="rounded-2xl border border-[#d3e0f2] bg-white/80 px-4 py-3 text-sm font-semibold text-[#1b3766]">{paymentMessage}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryCard label="Tiền phòng cần thanh toán" value={moneyFormatter.format(unpaidRoomFeeTotal)} className="text-[#244cb8]" />
        <SummaryCard label="Tiền điện cần thanh toán" value={moneyFormatter.format(unpaidElectricityTotal)} className="text-[#b77900]" />
        <SummaryCard label="Quá hạn" value={moneyFormatter.format(overdueTotal)} className="text-[#cf2448]" />
      </div>

      <PaymentSection
        title="Tiền phòng cần thanh toán"
        description="Các hóa đơn tiền phòng theo quý."
        items={unpaidRoomFeeItems}
        emptyText="Không có hóa đơn tiền phòng cần thanh toán."
        payingKey={payingKey}
        onPayOnline={handleVnpayPayment}
      />

      <PaymentSection
        title="Tiền điện cần thanh toán"
        description="Các hóa đơn tiền điện theo tháng."
        items={unpaidElectricityItems}
        emptyText="Không có hóa đơn tiền điện cần thanh toán."
        payingKey={payingKey}
        onPayOnline={handleVnpayPayment}
      />

      <PaymentSection
        title="Lịch sử thanh toán tiền phòng"
        items={paidRoomFeeItems}
        emptyText="Chưa có lịch sử thanh toán tiền phòng."
      />

      <PaymentSection
        title="Lịch sử thanh toán tiền điện"
        items={paidElectricityItems}
        emptyText="Chưa có lịch sử thanh toán tiền điện."
      />
    </motion.section>
  );
}

function SummaryCard({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="rounded-[24px] border border-[#d3e0f2] bg-white p-5 text-center shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6f84ad]">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${className}`}>{value}</p>
    </div>
  );
}

function PaymentSection({
  title,
  description,
  items,
  emptyText,
  payingKey,
  onPayOnline,
}: {
  title: string;
  description?: string;
  items: StudentPaymentItem[];
  emptyText: string;
  payingKey?: string;
  onPayOnline?: (item: StudentPaymentItem) => void;
}) {
  return (
    <section className="rounded-[26px] border border-[#c4d7f3] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1a2d52]">{title}</h2>
          {description ? <p className="mt-1 text-sm font-semibold text-[#62789f]">{description}</p> : null}
        </div>
        <div className="inline-flex items-center rounded-2xl border border-[#d3e0f2] bg-white px-4 py-2 text-sm font-bold text-[#24407f]">
          {moneyFormatter.format(items.reduce((sum, item) => sum + item.amount, 0))}
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
}: {
  item: StudentPaymentItem;
  isPaying?: boolean;
  onPayOnline?: (item: StudentPaymentItem) => void;
}) {
  return (
    <article className="rounded-[22px] border border-[#d6e2f1] bg-white p-4 shadow-[0_14px_30px_rgba(36,76,184,0.10)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <BillIcon source={item.source} />
          <div>
            <h3 className="text-lg font-bold text-[#1f3152]">{item.title}</h3>
            <p className="mt-1 text-sm font-semibold text-[#6f84ad]">
              Phòng {item.room ? `${item.room.buildingCode}${item.room.roomNumber}` : "-"} · Hạn đóng {formatDate(item.dueDate)}
            </p>
            {item.source === "electricity" ? (
              <p className="mt-1 text-sm font-semibold text-[#6f84ad]">
                {item.usageKwh ?? 0} kWh · {moneyFormatter.format(item.unitPrice ?? 0)}/kWh
              </p>
            ) : null}
            {item.status === "paid" ? (
              <p className="mt-1 text-sm font-semibold text-[#6f84ad]">
                Đã thanh toán: {item.paidAt ? formatDate(item.paidAt) : "-"} · {item.paymentMethod || "-"} {item.transactionCode ? `· ${item.transactionCode}` : ""}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-xl font-bold text-[#244cb8]">{moneyFormatter.format(item.amount)}</p>
          <StatusBadge status={item.status} />
          {item.status !== "paid" && onPayOnline ? (
            <button
              type="button"
              onClick={() => onPayOnline(item)}
              disabled={isPaying}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#244cb8] px-4 py-2 text-sm font-bold text-white shadow-[0_12px_24px_rgba(36,76,184,0.22)] transition hover:bg-[#1d3f9e] disabled:cursor-not-allowed disabled:opacity-70"
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
