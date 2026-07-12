import type { LucideIcon } from "lucide-react";
import { AlertCircle, ArrowRight, CalendarDays, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import type { RegistrationPeriodData } from "../../../api/registrationApi";

type DbStatus = NonNullable<RegistrationPeriodData["status"]>;

type StatusConfig = {
  accent: string;
  accentAlpha: string;
  accentBorder: string;
  accentSoft: string;
  badgeClass: string;
  label: string;
};

const STATUS_CONFIG: Record<DbStatus, StatusConfig> = {
  active: {
    accent: "#16a34a",
    accentAlpha: "#16a34a1a",
    accentBorder: "#bbf7d0",
    accentSoft: "#f0fdf4",
    badgeClass: "bg-[#dcfce7] text-[#15803d]",
    label: "Đang mở đăng ký",
  },
  pending: {
    accent: "#d97706",
    accentAlpha: "#d977061a",
    accentBorder: "#fde68a",
    accentSoft: "#fffbeb",
    badgeClass: "bg-[#fef9c3] text-[#a16207]",
    label: "Sắp mở đăng ký",
  },
  processing: {
    accent: "#2563eb",
    accentAlpha: "#2563eb1a",
    accentBorder: "#bfdbfe",
    accentSoft: "#eff6ff",
    badgeClass: "bg-[#dbeafe] text-[#1d4ed8]",
    label: "Đang xử lý hồ sơ",
  },
  closed: {
    accent: "#6b7280",
    accentAlpha: "#6b72801a",
    accentBorder: "#e5e7eb",
    accentSoft: "#f9fafb",
    badgeClass: "bg-[#f3f4f6] text-[#4b5563]",
    label: "Đã đóng đăng ký",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/70 bg-white/60 px-3 py-2.5 backdrop-blur-sm">
      <Icon
        size={15}
        className="shrink-0 text-[var(--color-primary)]"
        strokeWidth={2.2}
      />
      <div>
        <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-(--color-content)">
          {label}
        </div>
        <div className="text-sm font-extrabold text-[var(--color-title)]">
          {value}
        </div>
      </div>
    </div>
  );
}

type Props = {
  period: RegistrationPeriodData | null;
};

export default function RegistrationStatusCard({ period }: Props) {
  if (!period) {
    return (
      <article className="flex items-center gap-3 rounded-[28px] border border-[#e5e7eb] bg-[#f9fafb] px-6 py-5 shadow-[0_12px_32px_rgba(17,40,97,0.06)]">
        <AlertCircle size={20} className="shrink-0 text-[#9ca3af]" strokeWidth={2} />
        <p className="text-sm font-semibold text-(--color-content)">
          Hiện chưa có đợt đăng ký nào được tạo.
        </p>
      </article>
    );
  }

  const status = period.status ?? "closed";
  const cfg = STATUS_CONFIG[status];
  const channelLabel =
    period.channel === "main"
      ? "Đợt 1"
      : period.channel === "rolling"
        ? "Đợt 2"
        : null;

  return (
    <article
      className="rounded-[28px] border p-6 shadow-[0_18px_48px_rgba(17,40,97,0.09)] backdrop-blur-xl transition-all duration-300 ease-out hover:shadow-[0_24px_60px_rgba(17,40,97,0.14)] lg:p-7"
      style={{ borderColor: cfg.accentBorder, backgroundColor: cfg.accentSoft }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-extrabold ${cfg.badgeClass}`}
        >
          {cfg.label}
        </span>

        {channelLabel ? (
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{
              backgroundColor: cfg.accentAlpha,
              color: cfg.accent,
              border: `1px solid ${cfg.accentBorder}`,
            }}
          >
            {channelLabel}
          </span>
        ) : null}
      </div>

      {/* Info grid */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {period.school_year ? (
          <InfoRow icon={CalendarDays} label="Năm học" value={period.school_year} />
        ) : null}
        {period.semester ? (
          <InfoRow icon={CalendarDays} label="Học kỳ" value={period.semester} />
        ) : null}
        <InfoRow
          icon={CalendarDays}
          label="Thời gian nhận hồ sơ"
          value={`${formatDate(period.start_date)} – ${formatDate(period.end_date)}`}
        />
        {period.stay_start_date && period.stay_end_date ? (
          <InfoRow
            icon={Clock}
            label="Thời gian lưu trú"
            value={`${formatDate(period.stay_start_date)} – ${formatDate(period.stay_end_date)}`}
          />
        ) : null}
      </div>

      {/* Action — only when active */}
      {status === "active" ? (
        <div className="mt-5 flex justify-end">
          <Link
            to={period.allow_admission_candidates ? "/freshman-reservation" : "/register"}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(0,0,0,0.18)]"
            style={{ backgroundColor: cfg.accent }}
          >
            {period.allow_admission_candidates ? "Đăng ký tân sinh viên" : "Đăng ký ngay"}
            <ArrowRight size={15} />
          </Link>
        </div>
      ) : null}
    </article>
  );
}
