import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BedDouble,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  CreditCard,
  FileText,
  Home,
  LifeBuoy,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  type CurrentInvoice,
  type CurrentOccupancy,
  type LatestRegistration,
  type PendingRequest,
  type RecentActivity,
  type StudentDashboardData,
  fetchStudentDashboard,
} from "../../../api/studentDashboardApi";
import { getStoredAuth } from "../../auth/utils/authStorage";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getOutstandingAmount(invoice: CurrentInvoice | null): number {
  if (!invoice) return 0;

  const currentUnpaid = [invoice.room_fee, invoice.electricity].reduce((total, item) => {
    if (!item) return total;
    if (item.status === "unpaid") return total + item.amount;
    if (item.status === "overdue" && invoice.overdue_amount <= 0) return total + item.amount;
    return total;
  }, 0);

  return invoice.overdue_amount + currentUnpaid;
}

function getRoomCode(occupancy: CurrentOccupancy): string {
  const building = occupancy.room?.building_code ?? "";
  const roomNumber = occupancy.room?.room_number ?? "";
  if (!building && !roomNumber) return "—";
  if (!building) return roomNumber;
  if (!roomNumber) return building;
  return `${building}${roomNumber}`;
}

function getStayProgress(occupancy: CurrentOccupancy) {
  const totalDays = occupancy.total_days ?? 0;
  const daysLeft = occupancy.days_left ?? 0;
  const daysElapsed = Math.max(0, totalDays - daysLeft);
  const progressPct = totalDays > 0 ? Math.min(100, (daysElapsed / totalDays) * 100) : 0;

  return { totalDays, daysElapsed, daysLeft, progressPct };
}

const actionLabels: Record<string, string> = {
  reward_recorded: "Khen thưởng",
  reminded: "Nhắc nhở",
  warned: "Cảnh cáo",
  force_evicted: "Buộc thôi ở",
};

const invoiceStatusConfig = {
  paid: { label: "Đã thanh toán", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  unpaid: { label: "Chưa thanh toán", className: "border-amber-200 bg-amber-50 text-amber-700" },
  overdue: { label: "Quá hạn", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

const requestStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ xử lý", className: "border-amber-200 bg-amber-50 text-amber-700" },
  processing: { label: "Đang xử lý", className: "border-blue-200 bg-blue-50 text-blue-700" },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-56 animate-pulse rounded-[24px] bg-[#d4e2f5]" />
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-5">
          <div className="h-72 animate-pulse rounded-[24px] bg-[#d4e2f5]" />
          <div className="h-52 animate-pulse rounded-[24px] bg-[#d4e2f5]" />
        </div>
        <div className="space-y-5">
          <div className="h-56 animate-pulse rounded-[24px] bg-[#d4e2f5]" />
          <div className="h-40 animate-pulse rounded-[24px] bg-[#d4e2f5]" />
          <div className="h-48 animate-pulse rounded-[24px] bg-[#d4e2f5]" />
        </div>
      </div>
    </div>
  );
}

// ─── Shared card shell ────────────────────────────────────────────────────────

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[20px] border border-[#d6e2f1] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.07)] ${className ?? ""}`}>
      {children}
    </div>
  );
}

function CardHeader({
  title,
  icon: Icon,
  action,
}: {
  title: string;
  icon: React.ElementType;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#eef3fb] px-6 py-5">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-[#2563eb]" />
        <h2 className="text-lg font-extrabold text-[#1a2d52]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function MiniKpiCard({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#d6e2f1] bg-white px-5 py-4 shadow-[0_8px_22px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#eef5ff] text-[#244cb8]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-normal uppercase tracking-[0.1em] text-[#6f84ad]">{label}</p>
          <p className={`mt-1 truncate whitespace-nowrap text-xl font-medium ${valueClassName ?? "text-[#1a2d52]"}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

// ─── CASE 1: Not residing ─────────────────────────────────────────────────────

function getRegistrationHeroState(registration: LatestRegistration | null) {
  if (!registration) {
    return {
      title: "Bạn chưa đăng ký nội trú",
      description: "Hoàn tất hồ sơ để bắt đầu quy trình xét duyệt nội trú.",
      buttonLabel: "Đăng ký ngay",
      to: "/student/registration",
      Icon: Home,
      tone: "blue",
    };
  }

  if (registration.status === "submitted") {
    return {
      title: "Hồ sơ đang chờ xét duyệt",
      description: "Dự kiến xử lý trong 3-5 ngày làm việc",
      buttonLabel: "Xem hồ sơ",
      to: "/student/room-status",
      Icon: Clock,
      tone: "amber",
    };
  }

  if (registration.status === "rejected") {
    return {
      title: "Hồ sơ chưa được duyệt",
      description: registration.rejection_reason || "Chưa có lý do từ chối cụ thể.",
      buttonLabel: "Xem chi tiết",
      to: "/student/room-status",
      Icon: AlertTriangle,
      tone: "rose",
    };
  }

  if (registration.occupancy_status === "PENDING_PAYMENT") {
    return {
      title: "Vui lòng thanh toán để hoàn tất lưu trú",
      description: "Bạn đã chọn giường. Thanh toán hóa đơn tháng đầu để kích hoạt lưu trú.",
      buttonLabel: "Thanh toán ngay",
      to: "/student/payment",
      secondaryLabel: "Xem hồ sơ",
      secondaryTo: "/student/room-status",
      Icon: CreditCard,
      tone: "amber",
    };
  }

  if (registration.occupancy_status === "ROOM_CONFIRMED") {
    return {
      title: "Bạn đã được phân phòng!",
      description: "Vui lòng vào chọn giường để hoàn tất thủ tục lưu trú.",
      buttonLabel: "Chọn giường",
      to: "/student/room",
      secondaryLabel: "Xem hồ sơ",
      secondaryTo: "/student/room-status",
      Icon: CheckCircle2,
      tone: "emerald",
    };
  }

  return {
    title: "Hồ sơ đã được duyệt",
    description: "Vui lòng chờ ban quản lý phân phòng. Bạn sẽ được thông báo khi có phòng.",
    buttonLabel: "Xem hồ sơ",
    to: "/student/room-status",
    Icon: CheckCircle2,
    tone: "emerald",
  };
}

function HeroBannerEmpty({ registration }: { registration: LatestRegistration | null }) {
  const state = getRegistrationHeroState(registration);
  const Icon = state.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative flex min-h-[214px] items-center justify-center overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#1e3a5f_0%,#1d4ed8_60%,#1e40af_100%)] px-6 py-6 text-white shadow-[0_20px_48px_rgba(30,58,95,0.28)]"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/6" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/4" />

      <div className="relative z-10 flex max-w-3xl flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/20">
          <Icon className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">{state.title}</h1>
        <p className="mt-2 max-w-xl text-[15px] font-medium leading-6 text-blue-100">{state.description}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={state.to}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-[#1e3a5f] shadow-[0_8px_20px_rgba(0,0,0,0.18)] transition hover:bg-blue-50"
          >
            {state.buttonLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {"secondaryTo" in state && state.secondaryTo && (
            <Link
              to={state.secondaryTo}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              {state.secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── CASE 2: Residing components ──────────────────────────────────────────────

function RoomInfoCard({ occupancy }: { occupancy: CurrentOccupancy }) {
  const { totalDays, daysElapsed, daysLeft, progressPct } = getStayProgress(occupancy);
  const isExpiringSoon = daysLeft < 30 && daysLeft >= 0;
  const roomCode = getRoomCode(occupancy);
  const bedLabel = occupancy.bed ? `#${occupancy.bed.bed_number}` : "—";

  return (
    <Card className="px-6 py-6 sm:px-7 sm:py-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-2 text-2xl font-medium text-[#1a2d52]">
              <Home className="h-6 w-6 text-[#2563eb]" />
              {roomCode}
            </span>
            <span className="text-xl text-[#8ba0c1]">•</span>
            <span className="inline-flex items-center gap-2 text-2xl font-medium text-[#1a2d52]">
              <BedDouble className="h-6 w-6 text-[#2563eb]" />
              {bedLabel}
            </span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
            <div className="rounded-[14px] border border-[#eef3fb] bg-[#f8fbff] px-5 py-4">
              <p className="text-sm font-normal uppercase tracking-[0.12em] text-[#6f84ad]">Ngày nhận phòng</p>
              <p className="mt-2 text-xl font-medium text-[#1a2d52]">{formatDate(occupancy.check_in_date)}</p>
            </div>
            <div className="rounded-[14px] border border-[#eef3fb] bg-[#f8fbff] px-5 py-4">
              <p className="text-sm font-normal uppercase tracking-[0.12em] text-[#6f84ad]">Ngày kết thúc</p>
              <p className="mt-2 text-xl font-medium text-[#1a2d52]">{formatDate(occupancy.check_out_date)}</p>
            </div>
          </div>

          {totalDays > 0 && (
            <div className="mt-5 lg:max-w-2xl">
              <div className="mb-2 flex justify-between text-base font-medium">
                <span className="text-[#3d5068]">Đã ở: {daysElapsed} ngày</span>
                <span className={isExpiringSoon ? "text-rose-600" : "text-[#3d5068]"}>
                  Còn lại: {daysLeft} ngày
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#e8eff9]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isExpiringSoon ? "bg-rose-500" : "bg-[#2563eb]"}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 lg:w-56 lg:flex-col lg:items-stretch">
          <Link
            to="/student/room"
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] border border-[#c9d8ee] bg-white px-4 text-base font-semibold text-[#1e3a5f] transition hover:bg-[#f3f7fd] lg:flex-none"
          >
            <Home className="h-5 w-5" />
            Xem chi tiết phòng
          </Link>
          {occupancy.status === "ACTIVE" && (
            <Link
              to="/student/extension"
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#2563eb] px-4 text-base font-semibold text-white shadow-[0_8px_18px_rgba(37,99,235,0.18)] transition hover:bg-[#1d4ed8] lg:flex-none"
            >
              <CalendarClock className="h-5 w-5" />
              Gia hạn hợp đồng
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

function InvoiceCard({ invoice }: { invoice: CurrentInvoice }) {
  const roomAmount = invoice.room_fee?.amount ?? 0;
  const electricityAmount = invoice.electricity?.amount ?? 0;
  const total = roomAmount + electricityAmount;
  const outstandingAmount = getOutstandingAmount(invoice);
  const statuses = [invoice.room_fee?.status, invoice.electricity?.status].filter(Boolean);
  const overallStatus =
    statuses.includes("overdue") ? "overdue" : statuses.includes("unpaid") ? "unpaid" : "paid";
  const status = invoiceStatusConfig[overallStatus];

  return (
    <Card>
      <CardHeader title="Hóa đơn tháng hiện tại" icon={FileText} />

      <div className="space-y-4 px-6 py-5">
        <div className="flex items-center justify-between text-base">
          <span className="font-normal text-[#3d5068]">Tiền phòng</span>
          <span className="font-medium text-[#1a2d52]">{formatMoney(roomAmount)}</span>
        </div>
        <div className="flex items-center justify-between text-base">
          <span className="font-normal text-[#3d5068]">Tiền điện</span>
          <span className="font-medium text-[#1a2d52]">{formatMoney(electricityAmount)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-[#eef3fb] pt-3">
          <span className="text-base font-normal text-[#1a2d52]">Tổng cộng</span>
          <span className="text-xl font-medium text-[#1e3a5f]">{formatMoney(total)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-base font-normal text-[#1a2d52]">Trạng thái</span>
          <span className={`rounded-full border px-4 py-1.5 text-sm font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>
      </div>

      {outstandingAmount > 0 && (
        <div className="mx-6 mb-5 flex items-center justify-between gap-3 rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="inline-flex min-w-0 items-center gap-2 text-base font-medium text-rose-700">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rose-500" />
            Bạn đang nợ {formatMoney(outstandingAmount)}
          </p>
          <Link
            to="/student/payment"
            className="flex-shrink-0 rounded-[10px] bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
          >
            Thanh toán ngay
          </Link>
        </div>
      )}
    </Card>
  );
}

function PendingRequestsCard({ requests }: { requests: PendingRequest[] }) {
  return (
    <Card>
      <CardHeader title="Yêu cầu đang xử lý" icon={LifeBuoy} />
      {requests.length === 0 ? (
        <div className="flex items-center gap-3 px-6 py-6">
          <CheckCircle2 className="h-8 w-8 flex-shrink-0 text-emerald-400" />
          <p className="text-base font-medium text-[#3d5068]">Không có yêu cầu đang xử lý</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#eef3fb]">
          {requests.map((request) => {
            const status = requestStatusConfig[request.status];
            return (
              <li key={request.id}>
                <Link
                  to={`/student/support?status=${request.status}`}
                  className="group relative flex cursor-pointer items-center justify-between gap-3 px-6 py-5 transition duration-200 hover:z-10 hover:-translate-y-1 hover:bg-[#f5f9ff] hover:shadow-[0_12px_26px_rgba(37,99,235,0.14)] hover:ring-1 hover:ring-[#bfd3f4]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-[#1a2d52]">{request.title}</p>
                    <p className="mt-1 text-sm font-normal text-[#8099bc]">{formatDate(request.created_at)}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${status?.className ?? ""}`}>
                    {status?.label ?? request.status}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function RecentActivitiesCard({ activities }: { activities: RecentActivity[] }) {
  const visibleActivities = activities.slice(0, 5);

  return (
    <Card>
      <CardHeader
        title="Hoạt động gần đây"
        icon={FileText}
        action={
          activities.length > 5 ? (
            <Link
              to="/student/activities"
              className="flex items-center gap-1 text-sm font-medium text-[#2563eb] hover:underline"
            >
              Xem tất cả <ChevronRight className="h-4 w-4" />
            </Link>
          ) : null
        }
      />
      {visibleActivities.length === 0 ? (
        <p className="px-6 py-7 text-center text-base font-normal text-[#8099bc]">Chưa có hoạt động nào được ghi nhận.</p>
      ) : (
        <ul className="px-6 py-4">
          {visibleActivities.map((a, idx) => {
            const isNegative = a.type?.category === "negative";
            return (
              <li key={a.id}>
                <Link
                  to="/student/activities"
                  className="group relative flex cursor-pointer gap-3 rounded-[14px] px-2 py-2 transition duration-200 hover:z-10 hover:-translate-y-1 hover:bg-[#f5f9ff] hover:shadow-[0_12px_26px_rgba(37,99,235,0.14)] hover:ring-1 hover:ring-[#bfd3f4]"
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${isNegative ? "bg-rose-50 ring-1 ring-rose-200" : "bg-emerald-50 ring-1 ring-emerald-200"}`}
                    >
                      <CircleDot className={`h-4 w-4 ${isNegative ? "text-rose-500" : "text-emerald-500"}`} />
                    </div>
                    {idx < visibleActivities.length - 1 && <div className="my-1 w-px flex-1 bg-[#e2ebf8]" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base font-medium text-[#1a2d52]">
                        {a.type?.name ?? (a.action_taken ? (actionLabels[a.action_taken] ?? a.action_taken) : "Hoạt động")}
                      </p>
                      {a.action_taken && (
                        <span
                          className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${isNegative ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
                        >
                          {actionLabels[a.action_taken] ?? a.action_taken}
                        </span>
                      )}
                    </div>
                    {a.note && <p className="mt-1 text-sm font-normal text-[#6b82a8]">{a.note}</p>}
                    <p className="mt-1 text-sm font-normal text-[#8099bc]">{formatDate(a.date)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ─── Views ────────────────────────────────────────────────────────────────────

function NotResidingView({ data }: { data: StudentDashboardData }) {
  return (
    <div className="space-y-5">
      <HeroBannerEmpty registration={data.latest_registration} />
    </div>
  );
}

function ResidingView({ data }: { data: StudentDashboardData }) {
  const occupancy = data.current_occupancy!;
  const outstandingAmount = getOutstandingAmount(data.current_invoice);
  const roomFeeAmount = data.current_invoice?.room_fee?.amount ?? null;
  const electricityAmount = data.current_invoice?.electricity?.amount ?? null;
  const unreadNotifications = data.notifications.filter((notification) => !notification.is_read).length;

  return (
    <div className="space-y-5">
      <RoomInfoCard occupancy={occupancy} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniKpiCard
          icon={CreditCard}
          label="Công nợ"
          value={formatMoney(outstandingAmount)}
          valueClassName={outstandingAmount > 0 ? "text-rose-600" : "text-emerald-600"}
        />
        <MiniKpiCard
          icon={Home}
          label="Hóa đơn phòng"
          value={roomFeeAmount !== null ? formatMoney(roomFeeAmount) : "Chưa có"}
          valueClassName={roomFeeAmount !== null ? "text-[#1a2d52]" : "text-[#8099bc]"}
        />
        <MiniKpiCard
          icon={Zap}
          label="Hóa đơn điện"
          value={electricityAmount !== null ? formatMoney(electricityAmount) : "Chưa có"}
          valueClassName={electricityAmount !== null ? "text-[#1a2d52]" : "text-[#8099bc]"}
        />
        <MiniKpiCard
          icon={Bell}
          label="Thông báo mới"
          value={unreadNotifications}
          valueClassName={unreadNotifications > 0 ? "text-[#2563eb]" : "text-[#1a2d52]"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {data.current_invoice ? (
          <InvoiceCard invoice={data.current_invoice} />
        ) : (
          <Card>
            <CardHeader title="Hóa đơn tháng hiện tại" icon={FileText} />
            <p className="px-5 py-6 text-center text-sm font-normal text-[#8099bc]">
              Chưa có hóa đơn tháng hiện tại.
            </p>
          </Card>
        )}
        <PendingRequestsCard requests={data.pending_requests} />
      </div>

      <RecentActivitiesCard activities={data.recent_activities} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentDashboardPage() {
  const email = getStoredAuth()?.user?.email ?? "";

  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(!!email);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email) return;

    let mounted = true;

    const load = async () => {
      try {
        const result = await fetchStudentDashboard();
        if (mounted) setData(result);
      } catch {
        if (mounted) setError("Không thể tải dữ liệu. Vui lòng thử lại.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, [email]);

  const isResiding = data?.current_occupancy?.status === "ACTIVE";
  const firstName = data?.student.full_name.split(" ").pop() ?? "";

  const handleRetry = () => {
    setError("");
    setIsLoading(true);
    fetchStudentDashboard()
      .then(setData)
      .catch(() => setError("Không thể tải dữ liệu."))
      .finally(() => setIsLoading(false));
  };

  return (
    <section className="min-h-[calc(100vh-5rem)] space-y-5 rounded-3xl bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-6">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-52 animate-pulse rounded-xl bg-[#d4e2f5]" />
            </div>
            <LoadingSkeleton />
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-3 rounded-[20px] border border-rose-200 bg-rose-50 px-6 py-12 text-center"
          >
            <AlertTriangle className="h-10 w-10 text-rose-400" />
            <p className="text-sm font-semibold text-rose-700">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-600"
            >
              Thử lại
            </button>
          </motion.div>
        ) : data ? (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-5"
          >
            {!isResiding && (
              <div className="flex items-center justify-between">
                <h1 className="text-[30px] font-extrabold tracking-tight text-[#1a2d52] sm:text-[34px]">
                  Xin chào, {firstName}!
                </h1>
              </div>
            )}
            {isResiding ? <ResidingView data={data} /> : <NotResidingView data={data} />}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
