import {
  AlertTriangle,
  ArrowLeftRight,
  Bed,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  LogOut,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardData, DashboardRevenueTrendItem } from "../../../api/dashboardApi";
import {
  exportDashboardExcel,
  exportDashboardPdf,
  fetchDashboard,
  fetchDashboardFinance,
  fetchDashboardRevenueTrend,
} from "../../../api/dashboardApi";
import ExportPdfButton from "../../../components/ExportPdfButton";
import ExportExcelButton from "../../../components/ExportExcelButton";

const CARD_CLASS =
  "rounded-[20px] border border-[#e2e8f0] bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)]";

const CHART_CARD_CLASS =
  "rounded-[24px] border border-[#e2e8f0] bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)]";

function vnd(n: number) {
  return n.toLocaleString("vi-VN") + "₫";
}

function truncate(s: string, max = 22) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center rounded-[24px] border border-[#d8e4f5] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-5 py-4 text-center shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
      <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7c8fb5]">
        {label}
      </span>
      <div className="mt-3 text-[2rem] font-extrabold leading-none text-[#1f3152]">{primary}</div>
      {secondary ? <div className="mt-3 text-sm font-semibold leading-6 text-[#64748b]">{secondary}</div> : null}
    </div>
  );
}

// ── Alert item ───────────────────────────────────────────────────────────────
function AlertItem({
  count,
  label,
  to,
  variant,
  icon: Icon,
}: {
  count: number;
  label: string;
  to: string;
  variant: "red" | "amber" | "blue";
  icon: React.ElementType;
}) {
  const tone = variant === "red" ? "#ef4444" : variant === "amber" ? "#f59e0b" : "#2563eb";

  return (
    <Link
      to={to}
      className="flex min-w-0 cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-3 transition hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon size={22} strokeWidth={2.3} className="shrink-0" style={{ color: tone }} />
        <p className="truncate text-[1rem] font-semibold text-[#334155] sm:text-[1.05rem]">{label}</p>
      </div>
      <span className="shrink-0 text-2xl font-extrabold leading-none" style={{ color: tone }}>
        {count}
      </span>
    </Link>
  );
}

// ── Small progress bar ────────────────────────────────────────────────────────
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e5eaf5]">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.12)]">
      <p className="text-xs font-bold text-[#1e293b]">{label}</p>
      <p className="text-sm font-extrabold text-[#2563eb]">
        {formatter ? formatter(val) : val} sinh viên
      </p>
    </div>
  );
}

function StackedChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((item) => item.value > 0);
  const total = payload.reduce((sum, item) => sum + Number(item.value ?? 0), 0);

  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.12)]">
      <p className="text-xs font-bold text-[#1e293b]">{label}</p>
      <div className="mt-1 space-y-1">
        {(rows.length ? rows : payload).map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4 text-xs font-bold text-[#475569]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              {item.name}
            </span>
            <span>{item.value} sinh viên</span>
          </div>
        ))}
      </div>
      <p className="mt-1 text-right text-xs font-extrabold text-[#1f3152]">Tổng {total} sinh viên</p>
    </div>
  );
}

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.12)]">
      <p className="text-xs font-bold text-[#1e293b]">{label}</p>
      <p className="text-sm font-extrabold text-[#2563eb]">{vnd(payload[0].value)}</p>
    </div>
  );
}

function GenderTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { gender: string; count: number; percent: number } }>;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.12)]">
      <p className="text-xs font-bold text-[#1e293b]">{item.gender}</p>
      <p className="text-sm font-extrabold text-[#2563eb]">
        {item.count} sinh viên · {item.percent}%
      </p>
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionTitle({
  icon: Icon,
  title,
  tone = "#2563eb",
}: {
  icon: React.ElementType;
  title: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b-2 pb-3" style={{ borderColor: tone }}>
      <Icon size={17} strokeWidth={2.2} className="shrink-0" style={{ color: tone }} />
      <h2 className="text-[0.95rem] font-extrabold uppercase tracking-[0.08em]" style={{ color: tone }}>
        {title}
      </h2>
    </div>
  );
}

function FinanceRow({
  label,
  value,
  color = "#1f3152",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="shrink-0 font-semibold text-[#64748b]">{label}</span>
      <span className="min-w-6 flex-1 border-b border-dotted border-[#cbd5e1]" />
      <span className="shrink-0 font-extrabold" style={{ color }}>
        {vnd(value)}
      </span>
    </div>
  );
}

function FinanceSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#fff_0%,#f5f9ff_100%)] px-2.5 py-1 text-xs font-semibold text-[#64748b] shadow-[0_6px_14px_rgba(37,99,235,0.08)]">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="bg-transparent text-xs font-extrabold text-[#2563eb] outline-none"
      >
        {children}
      </select>
    </label>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
function PeriodControls({
  selectedMonth,
  selectedYear,
  monthOptions,
  yearOptions,
  onMonthChange,
  onYearChange,
}: {
  selectedMonth: number;
  selectedYear: number;
  monthOptions: number[];
  yearOptions: number[];
  onMonthChange: (value: number) => void;
  onYearChange: (value: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <FinanceSelect label="Tháng" value={selectedMonth} onChange={onMonthChange}>
        {monthOptions.map((month) => (
          <option key={month} value={month}>
            {String(month).padStart(2, "0")}
          </option>
        ))}
      </FinanceSelect>
      <FinanceSelect label="Năm" value={selectedYear} onChange={onYearChange}>
        {yearOptions.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </FinanceSelect>
    </div>
  );
}

export default function AdminDashboardPage() {
  const currentDate = new Date();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<DashboardRevenueTrendItem[]>([]);
  const [revenueTrendError, setRevenueTrendError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    setFinanceError(null);
    setRevenueTrendError(null);
    fetchDashboard()
      .then((dashboardData) => {
        setData(dashboardData);
        return Promise.all([
          fetchDashboardFinance(selectedMonth, selectedYear),
          fetchDashboardRevenueTrend(selectedMonth, selectedYear),
        ]);
      })
      .then(([financeData, trendData]) => {
        setRevenueTrend(trendData);
        setData((current) => current ? { ...current, finance: financeData } : current);
      })
      .catch(() => setError("Không thể tải dữ liệu dashboard. Vui lòng thử lại."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetchDashboard(),
      fetchDashboardRevenueTrend(selectedMonth, selectedYear),
    ])
      .then(([dashboardData, trendData]) => {
        if (mounted) {
          setData(dashboardData);
          setRevenueTrend(trendData);
          setRevenueTrendError("KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u doanh thu.");
          setRevenueTrendError(null);
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Không thể tải dữ liệu dashboard. Vui lòng thử lại.");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!data) return;

    let mounted = true;

    Promise.all([
      fetchDashboardFinance(selectedMonth, selectedYear),
      fetchDashboardRevenueTrend(selectedMonth, selectedYear),
    ])
      .then(([financeData, trendData]) => {
        if (mounted) {
          setFinanceError(null);
          setRevenueTrendError(null);
          setRevenueTrend(trendData);
          setData((current) => current ? { ...current, finance: financeData } : current);
        }
      })
      .catch(() => {
        if (mounted) {
          setFinanceError("Không thể tải dữ liệu tài chính.");
        }
        setRevenueTrendError("KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u doanh thu.");
      });

    return () => {
      mounted = false;
    };
  }, [selectedMonth, selectedYear]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={28} className="animate-spin text-[#2563eb]" />
          <p className="text-sm font-semibold text-[var(--color-content)]">Đang tải dữ liệu…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertTriangle size={32} className="text-[#ef4444]" />
          <p className="text-sm font-semibold text-[var(--color-content)]">{error}</p>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-5 py-2 text-sm font-bold text-white"
          >
            <RefreshCw size={14} /> Thử lại
          </button>
        </div>
      </div>
    );
  }

  const { stats, alerts, charts, finance } = data;

  type AlertEntry = { count: number; label: string; to: string; icon: React.ElementType };

  // "Đơn chờ duyệt tay" chỉ tính nhóm auto_decision='review' hoặc có priority chờ xác minh
  // (tab "Cần xem lại" trên trang danh sách) — KHÔNG gộp chung với tổng số đơn submitted,
  // để số hiển thị khớp đúng với badge "Cần xem lại" mà admin thấy khi bấm vào.
  const reviewTarget = (() => {
    const b = alerts.pending_registrations_breakdown;
    const order: Array<["main" | "rolling", "review"]> = [
      ["main", "review"],
      ["rolling", "review"],
    ];
    const hit = order.find(([channel, filter]) => b?.[channel]?.[filter] > 0);
    if (!hit) return "/admin/registrations";
    const [channel, filter] = hit;
    return `/admin/registrations?channel=${channel}&filter=${filter}`;
  })();
  const reviewCount =
    (alerts.pending_registrations_breakdown?.main?.review ?? 0) +
    (alerts.pending_registrations_breakdown?.rolling?.review ?? 0);

  // "Đơn chờ xử lý" = tổng số đơn status='submitted' (mọi tab, mọi kênh) — bổ sung riêng để
  // phân biệt với "Đơn chờ duyệt tay" (chỉ nhóm review) ở trên.
  const allPendingTarget = (() => {
    const b = alerts.pending_registrations_breakdown;
    const order: Array<[("main" | "rolling"), ("pending" | "review")]> = [
      ["main", "pending"],
      ["rolling", "pending"],
      ["main", "review"],
      ["rolling", "review"],
    ];
    const hit = order.find(([channel, filter]) => b?.[channel]?.[filter] > 0);
    if (!hit) return "/admin/registrations";
    const [channel, filter] = hit;
    return `/admin/registrations?channel=${channel}&filter=${filter}`;
  })();

  const group1: AlertEntry[] = [
    { count: alerts.overdue_invoices,      label: "Hóa đơn quá hạn chưa thanh toán", to: "/admin/payments/room-fees?status=overdue", icon: CreditCard },
    { count: reviewCount,                  label: "Đơn chờ duyệt tay",               to: reviewTarget,                              icon: FileText },
    { count: alerts.pending_registrations, label: "Đơn chờ xử lý",                   to: allPendingTarget,                          icon: FileText },
  ].filter((i) => i.count > 0);

  const group2: AlertEntry[] = [
    { count: alerts.expiring_occupancies_30d, label: "Sinh viên sắp hết hạn lưu trú",  to: "/admin/occupancies",                      icon: Clock },
    { count: alerts.pending_bed_selection,    label: "Sinh viên chưa chọn giường",      to: "/admin/bed-management?status=not_selected", icon: Users },
  ].filter((i) => i.count > 0);

  const group3: AlertEntry[] = [
    { count: alerts.pending_room_changes,     label: "Yêu cầu đổi phòng chờ xử lý",   to: "/admin/room-changes",    icon: ArrowLeftRight },
    { count: alerts.pending_bed_changes,      label: "Yêu cầu đổi giường chờ xử lý",  to: "/admin/bed-changes",     icon: Bed },
    { count: alerts.pending_checkouts,        label: "Yêu cầu thôi ở chờ xử lý",      to: "/admin/leave-requests",  icon: LogOut },
    { count: alerts.pending_support_requests, label: "Yêu cầu hỗ trợ chờ xử lý",      to: "/admin/support-requests?status=pending", icon: AlertTriangle },
  ].filter((i) => i.count > 0);

  const hasAlerts = group1.length > 0 || group2.length > 0 || group3.length > 0;

  const occupancyPct = stats.total_capacity > 0
    ? Math.round((stats.total_students / stats.total_capacity) * 100)
    : 0;
  const roomExpectedTotal = finance.room_expected_total ?? finance.expected_total;
  const electricityExpectedTotal = finance.electricity_expected_total ?? 0;
  const roomCollected = finance.room_collected ?? finance.collected;
  const electricityCollected = finance.electricity_collected ?? 0;
  const roomDebt = finance.room_debt ?? finance.debt;
  const electricityDebt = finance.electricity_debt ?? 0;
  const expectedTotal = roomExpectedTotal + electricityExpectedTotal;
  const collectedTotal = roomCollected + electricityCollected;
  const debtTotal = roomDebt + electricityDebt;
  const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);
  const yearOptions = finance.available_years?.length
    ? finance.available_years
    : [2024, 2025, 2026, 2027, 2028];
  const availableBedCount = stats.available_beds;
  const genderTotal = stats.male_count + stats.female_count;
  const genderData = (charts.by_gender?.length ? charts.by_gender : [
    { gender: "Nam", count: stats.male_count },
    { gender: "Nữ", count: stats.female_count },
  ]).map((item) => ({
    ...item,
    percent: genderTotal > 0 ? Math.round((item.count / genderTotal) * 100) : 0,
  }));

  const MALE_COLOR = "#60a5fa";
  const FEMALE_COLOR = "#f9a8d4";
  const GENDER_COLORS = [MALE_COLOR, FEMALE_COLOR];
  const provinceOpacity = (index: number) => Math.max(0.42, 0.95 - index * 0.055);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-6 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6">
      {/* Header */}
      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">
              Dashboard
            </h1>
            <p className="mt-1 text-[13px] leading-6 text-[#62789f] sm:text-sm">
              Tổng quan hệ thống ký túc xá STU
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportPdfButton fetcher={() => exportDashboardPdf(selectedMonth, selectedYear)} />
            <ExportExcelButton fetcher={() => exportDashboardExcel(selectedMonth, selectedYear)} />
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#fff_0%,#f5f9ff_100%)] px-4 py-2.5 text-sm font-semibold text-[#2563eb] shadow-[0_8px_18px_rgba(37,99,235,0.09)] transition hover:-translate-y-0.5 hover:border-[#9eb9e6] hover:bg-white"
            >
              <RefreshCw size={16} /> Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <StatCard
          label="Sinh viên đang ở"
          primary={
            <span>
              {stats.total_students}
              <span className="ml-1 text-[1.1rem] font-bold text-[#94a3b8]">
                /{stats.total_capacity}
              </span>
            </span>
          }
          secondary={
            <span>
              Tỷ lệ lấp đầy <span className="font-bold text-[#475569]">{occupancyPct}%</span>
            </span>
          }
        />
        <StatCard
          label="Phòng đang sử dụng"
          primary={
            <span>
              {stats.occupied_rooms}
              <span className="ml-1 text-[1.1rem] font-bold text-[#94a3b8]">
                /{stats.total_rooms}
              </span>
            </span>
          }
          secondary={
            <span>
              Còn <span className="font-bold text-[#475569]">{stats.total_rooms - stats.occupied_rooms}</span> phòng trống
            </span>
          }
        />
        <StatCard
          label="Giường khả dụng"
          primary={<span>{availableBedCount}</span>}
          secondary="giường hiện có thể sử dụng"
        />
        <StatCard
          label="Giường bảo trì"
          primary={<span>{stats.maintenance_beds}</span>}
          secondary="giường đang bảo trì"
        />
      </div>

      {/* ── 2. Alerts ──────────────────────────────────────────────────────── */}
      {hasAlerts ? (
        <div className="flex flex-col gap-3">
          {group1.length > 0 && (
            <div className="rounded-[20px] border border-[#fecaca] border-l-4 border-l-[#ef4444] bg-white px-5 py-4 shadow-[0_8px_20px_rgba(239,68,68,0.07)]">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle size={15} strokeWidth={2.3} className="shrink-0 text-[#ef4444]" />
                <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#ef4444]">Cần xử lý ngay</span>
              </div>
              <div className="divide-y divide-[#fee2e2]">
                {group1.map((item) => (
                  <AlertItem key={item.to} count={item.count} label={item.label} to={item.to} variant="red" icon={item.icon} />
                ))}
              </div>
            </div>
          )}
          {group2.length > 0 && (
            <div className="rounded-[20px] border border-[#fde68a] border-l-4 border-l-[#f59e0b] bg-white px-5 py-4 shadow-[0_8px_20px_rgba(245,158,11,0.07)]">
              <div className="mb-2 flex items-center gap-2">
                <Clock size={15} strokeWidth={2.3} className="shrink-0 text-[#f59e0b]" />
                <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#f59e0b]">Cần theo dõi</span>
              </div>
              <div className="divide-y divide-[#fef3c7]">
                {group2.map((item) => (
                  <AlertItem key={item.to} count={item.count} label={item.label} to={item.to} variant="amber" icon={item.icon} />
                ))}
              </div>
            </div>
          )}
          {group3.length > 0 && (
            <div className="rounded-[20px] border border-[#bfdbfe] border-l-4 border-l-[#2563eb] bg-white px-5 py-4 shadow-[0_8px_20px_rgba(37,99,235,0.07)]">
              <div className="mb-2 flex items-center gap-2">
                <FileText size={15} strokeWidth={2.3} className="shrink-0 text-[#2563eb]" />
                <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#2563eb]">Yêu cầu từ sinh viên</span>
              </div>
              <div className="divide-y divide-[#dbeafe]">
                {group3.map((item) => (
                  <AlertItem key={item.to} count={item.count} label={item.label} to={item.to} variant="blue" icon={item.icon} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-[20px] border border-[#bbf7d0] bg-white px-5 py-4 shadow-[0_8px_20px_rgba(34,197,94,0.07)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={17} className="shrink-0 text-[#22c55e]" />
            <span className="text-sm font-semibold text-[#15803d]">Không có vấn đề cần xử lý 🎉</span>
          </div>
        </div>
      )}

      {/* ── 3. Finance ────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`${CARD_CLASS} flex h-full flex-col gap-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#2563eb] pb-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <CreditCard size={17} strokeWidth={2.2} className="shrink-0 text-[#2563eb]" />
              <h2 className="whitespace-nowrap text-[0.95rem] font-extrabold uppercase tracking-[0.08em] text-[#2563eb]">
                Doanh thu hằng tháng
              </h2>
            </div>
            <PeriodControls
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              monthOptions={monthOptions}
              yearOptions={yearOptions}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
          </div>

          {financeError ? (
            <p className="rounded-xl border border-[#fecaca] bg-white px-3 py-2 text-xs font-semibold text-[#ef4444]">
              {financeError}
            </p>
          ) : null}

          <div className="space-y-2.5">
            <FinanceRow label="Tổng thu dự kiến" value={expectedTotal} color="#2563eb" />
            <FinanceRow label="Đã thu" value={collectedTotal} color="#22c55e" />
          </div>

          <div className="border-t border-[#e2e8f0] pt-4">
            <div className="space-y-2.5">
              <FinanceRow label="Tiền phòng" value={roomExpectedTotal} />
              <FinanceRow label="Tiền điện" value={electricityExpectedTotal} />
            </div>
          </div>

          {expectedTotal > 0 ? (
            <div className="mt-auto">
              <p className="mb-2 text-xs font-semibold text-[#64748b]">
                Tiến độ thu tiền
              </p>
              <ProgressBar
                value={collectedTotal}
                max={expectedTotal}
                color="#22c55e"
              />
              <p className="mt-1 text-right text-xs font-bold text-[#22c55e]">
                {Math.round((collectedTotal / expectedTotal) * 100)}%
              </p>
            </div>
          ) : null}
        </div>

        <div className={`${CARD_CLASS} flex h-full flex-col gap-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#ef4444] pb-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <AlertTriangle size={17} strokeWidth={2.2} className="shrink-0 text-[#ef4444]" />
              <h2 className="whitespace-nowrap text-[0.95rem] font-extrabold uppercase tracking-[0.08em] text-[#ef4444]">
                Công nợ hiện tại
              </h2>
            </div>
            <PeriodControls
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              monthOptions={monthOptions}
              yearOptions={yearOptions}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
          </div>

          <div className="space-y-2.5">
            <FinanceRow label="Tổng công nợ" value={debtTotal} color="#ef4444" />
          </div>

          <div className="border-t border-[#e2e8f0] pt-4">
            <div className="space-y-2.5">
              <FinanceRow label="Tiền phòng nợ" value={roomDebt} color="#ef4444" />
              <FinanceRow label="Tiền điện nợ" value={electricityDebt} color="#ef4444" />
            </div>
          </div>

          <div className="flex items-baseline gap-3 text-sm">
            <span className="shrink-0 font-semibold text-[#64748b]">Sinh viên đang nợ</span>
            <span className="min-w-6 flex-1 border-b border-dotted border-[#cbd5e1]" />
            <span className="shrink-0 font-extrabold text-[#f59e0b]">
              {finance.debtors_count} sinh viên
            </span>
          </div>

          {debtTotal > 0 ? (
            <Link
              to={`/admin/payments/room-fees?status=unpaid&month=${selectedMonth}&year=${selectedYear}`}
              className="inline-flex items-center justify-center rounded-xl border border-[#c8d8ef] bg-white px-5 py-2.5 text-sm font-semibold text-[#2563eb] shadow-[0_4px_12px_rgba(37,99,235,0.07)] transition hover:bg-[#f0f6ff]"
            >
              Xem chi tiết
            </Link>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-[#bbf7d0] bg-white px-4 py-3">
              <CheckCircle2 size={14} className="shrink-0 text-[#22c55e]" />
              <span className="text-xs font-semibold text-[#15803d]">
                Không có sinh viên nào nợ hóa đơn tháng này
              </span>
            </div>
          )}

        </div>
      </div>

      {/* ── 4. Charts ─────────────────────────────────────────────────────── */}
      <div className={CHART_CARD_CLASS}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#2563eb] pb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <TrendingUp size={17} strokeWidth={2.2} className="shrink-0 text-[#2563eb]" />
            <h2 className="whitespace-nowrap text-[0.95rem] font-extrabold uppercase tracking-[0.08em] text-[#2563eb]">
              Doanh thu 6 tháng gần nhất
            </h2>
          </div>
          <PeriodControls
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            monthOptions={monthOptions}
            yearOptions={yearOptions}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
        </div>
        {revenueTrendError ? (
          <p className="mt-4 rounded-xl border border-[#fecaca] bg-white px-3 py-2 text-xs font-semibold text-[#ef4444]">
            {revenueTrendError}
          </p>
        ) : null}
        {revenueTrend.length > 0 ? (
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend} margin={{ top: 8, right: 18, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5eaf2" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#475569" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                />
                <Tooltip content={<MoneyTooltip />} cursor={{ stroke: "#bfdbfe", strokeWidth: 1 }} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#ffffff" }}
                  activeDot={{ r: 6, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={CHART_CARD_CLASS}>
          <SectionTitle icon={Users} title="Tỷ lệ giới tính" />
          {genderTotal > 0 ? (
            <div className="mt-4 grid items-center gap-6 lg:grid-cols-[220px_1fr]">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<GenderTooltip />} />
                    <Pie
                      data={genderData}
                      dataKey="count"
                      nameKey="gender"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                      stroke="#ffffff"
                      strokeWidth={3}
                    >
                      {genderData.map((item, index) => (
                        <Cell key={item.gender} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {genderData.map((item, index) => (
                  <div
                    key={item.gender}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: GENDER_COLORS[index % GENDER_COLORS.length] }}
                      />
                      <span className="text-sm font-semibold text-[#334155]">{item.gender}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-[#1f3152]">{item.count} sinh viên</p>
                      <p className="text-xs font-bold text-[#64748b]">{item.percent}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart />
          )}
        </div>

        {/* Year chart — 1 col */}
        <div className={CHART_CARD_CLASS}>
          <SectionTitle icon={Users} title="Theo năm học" />
          {charts.by_year.length > 0 ? (
            <div className="mt-4 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts.by_year.map((d) => ({
                    ...d,
                    label: `Năm ${d.year}`,
                  }))}
                  margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5eaf2" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<StackedChartTooltip />}
                    cursor={{ fill: "#eff6ff" }}
                  />
                  <Legend iconType="square" />
                  <Bar dataKey="male" name="Nam" stackId="gender" fill={MALE_COLOR} maxBarSize={40} />
                  <Bar dataKey="female" name="Nữ" stackId="gender" fill={FEMALE_COLOR} radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>

      {/* Faculty chart — full width */}
      <div className={CHART_CARD_CLASS}>
        <SectionTitle icon={Building2} title="Phân bố theo khoa" />
        {charts.by_faculty.length > 0 ? (
          <div className="mt-4" style={{ height: Math.max(220, charts.by_faculty.length * 38) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts.by_faculty.map((d) => ({
                  ...d,
                  label: truncate(d.faculty, 28),
                }))}
                layout="vertical"
                margin={{ top: 0, right: 24, bottom: 0, left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#e5eaf2"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={160}
                  tick={{ fontSize: 11, fill: "#475569" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<StackedChartTooltip />}
                  cursor={{ fill: "#eff6ff" }}
                />
                <Legend iconType="square" />
                <Bar dataKey="male" name="Nam" stackId="gender" fill={MALE_COLOR} radius={[6, 0, 0, 6]} maxBarSize={20} />
                <Bar dataKey="female" name="Nữ" stackId="gender" fill={FEMALE_COLOR} radius={[0, 6, 6, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart />
        )}
      </div>

      {/* Province chart — full width */}
      <div className={CHART_CARD_CLASS}>
        <SectionTitle icon={Building2} title="Phân bố theo tỉnh / thành phố" />
        {charts.by_province.length > 0 ? (
          <div className="mt-4" style={{ height: Math.max(220, charts.by_province.length * 38) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts.by_province.map((d) => ({
                  ...d,
                  label: truncate(d.province, 24),
                }))}
                layout="vertical"
                margin={{ top: 0, right: 28, bottom: 0, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5eaf2" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  domain={[0, Math.max(...charts.by_province.map((d) => d.count)) + 1]}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={180}
                  tick={{ fontSize: 11, fill: "#475569" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => `${v}`} />}
                  cursor={{ fill: "#eff6ff" }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={18} fill="#2563eb">
                  {charts.by_province.map((_, i) => {
                    return <Cell key={i} fill={`rgba(37,99,235,${provinceOpacity(i)})`} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart />
        )}
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-40 items-center justify-center text-sm font-semibold text-[#94a3b8]">
      Chưa có dữ liệu
    </div>
  );
}
