import { CheckCircle2, Clock3, LogIn, XCircle } from "lucide-react";
import type { ReservationProgress, ReservationStatus } from "../../../api/dormReservationApi";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_22px_40px_rgba(36,76,184,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

export const reservationStatusLabel: Record<ReservationStatus, string> = {
  submitted: "Đã nộp hồ sơ",
  approved: "Đã duyệt giữ chỗ",
  rejected: "Không được duyệt",
  waitlisted: "Danh sách chờ",
  converted: "Đã chuyển thành đơn nội trú",
  expired: "Đã hết hạn",
  cancelled: "Đã hủy",
};

const reservationStatusClass: Record<ReservationStatus, string> = {
  submitted: "border-blue-200 bg-blue-50 text-blue-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  waitlisted: "border-amber-200 bg-amber-50 text-amber-700",
  converted: "border-teal-200 bg-teal-50 text-teal-700",
  expired: "border-slate-200 bg-slate-50 text-slate-600",
  cancelled: "border-slate-200 bg-slate-100 text-slate-500",
};

const statusMessage: Record<ReservationStatus, string> = {
  submitted: "Hồ sơ giữ chỗ của bạn đã được gửi và đang chờ xét duyệt.",
  approved: "Hồ sơ giữ chỗ của bạn đã được duyệt. Hồ sơ này chưa phải là đơn đăng ký nội trú chính thức. Sau khi nhà trường xác nhận nhập học và cấp MSSV, hệ thống sẽ thực hiện bước chuyển đổi tiếp theo.",
  waitlisted: "Hồ sơ của bạn đang trong danh sách chờ. Hệ thống sẽ cập nhật khi có kết quả mới.",
  rejected: "Hồ sơ giữ chỗ của bạn không được duyệt.",
  cancelled: "Hồ sơ giữ chỗ của bạn đã bị hủy.",
  expired: "Hồ sơ giữ chỗ của bạn đã hết hiệu lực.",
  converted: "Hồ sơ giữ chỗ đã được chuyển thành đơn đăng ký nội trú chính thức.",
};

type TimelineState = "done" | "active" | "pending" | "stopped";
type TimelineStep = {
  label: string;
  description: string;
  state: TimelineState;
};

export function formatReservationDate(value: string | null): string {
  if (!value) return "Chưa có dữ liệu";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function buildTimeline(status: ReservationStatus): TimelineStep[] {
  if (status === "converted") {
    return [
      { label: "Đã nộp hồ sơ", description: "Hồ sơ giữ chỗ đã được ghi nhận.", state: "done" },
      { label: "Đang xét duyệt", description: "Ban quản lý KTX đã xem xét hồ sơ.", state: "done" },
      { label: "Đã duyệt giữ chỗ", description: "Hồ sơ giữ chỗ đã được duyệt.", state: "done" },
      { label: "Đăng ký nội trú chính thức", description: "Đơn đăng ký nội trú chính thức đã được tạo.", state: "done" },
    ];
  }

  if (status === "cancelled") {
    return [
      { label: "Đã nộp hồ sơ", description: "Hồ sơ giữ chỗ đã được ghi nhận.", state: "done" },
      { label: "Đã hủy", description: "Hồ sơ giữ chỗ đã bị hủy.", state: "stopped" },
      { label: "Kết quả giữ chỗ", description: "Không tiếp tục xử lý.", state: "pending" },
      { label: "Đăng ký nội trú chính thức", description: "Chưa chuyển thành đơn chính thức.", state: "pending" },
    ];
  }

  if (status === "expired") {
    return [
      { label: "Đã nộp hồ sơ", description: "Hồ sơ giữ chỗ đã được ghi nhận.", state: "done" },
      { label: "Đã hết hạn", description: "Hồ sơ giữ chỗ đã hết hiệu lực.", state: "stopped" },
      { label: "Kết quả giữ chỗ", description: "Không tiếp tục xử lý.", state: "pending" },
      { label: "Đăng ký nội trú chính thức", description: "Chưa chuyển thành đơn chính thức.", state: "pending" },
    ];
  }

  if (status === "rejected") {
    return [
      { label: "Đã nộp hồ sơ", description: "Hồ sơ giữ chỗ đã được ghi nhận.", state: "done" },
      { label: "Đang xét duyệt", description: "Ban quản lý KTX đã xem xét hồ sơ.", state: "done" },
      { label: "Không được duyệt", description: "Hồ sơ giữ chỗ không được duyệt.", state: "stopped" },
      { label: "Đăng ký nội trú chính thức", description: "Không tiếp tục khi hồ sơ không được duyệt.", state: "pending" },
    ];
  }

  if (status === "approved") {
    return [
      { label: "Đã nộp hồ sơ", description: "Hồ sơ giữ chỗ đã được ghi nhận.", state: "done" },
      { label: "Đang xét duyệt", description: "Ban quản lý KTX đã xem xét hồ sơ.", state: "done" },
      { label: "Đã duyệt giữ chỗ", description: "Hồ sơ giữ chỗ đã được duyệt.", state: "done" },
      { label: "Đăng ký nội trú chính thức", description: "Chưa chuyển thành đơn chính thức.", state: "pending" },
    ];
  }

  if (status === "waitlisted") {
    return [
      { label: "Đã nộp hồ sơ", description: "Hồ sơ giữ chỗ đã được ghi nhận.", state: "done" },
      { label: "Đang xét duyệt", description: "Ban quản lý KTX đã xem xét hồ sơ.", state: "done" },
      { label: "Danh sách chờ", description: "Hồ sơ đang nằm trong danh sách chờ.", state: "active" },
      { label: "Đăng ký nội trú chính thức", description: "Chưa chuyển thành đơn chính thức.", state: "pending" },
    ];
  }

  return [
    { label: "Đã nộp hồ sơ", description: "Hồ sơ giữ chỗ đã được ghi nhận.", state: "done" },
    { label: "Đang xét duyệt", description: "Ban quản lý KTX đang xem xét hồ sơ.", state: "active" },
    { label: "Kết quả giữ chỗ", description: "Chưa có kết quả xét duyệt.", state: "pending" },
    { label: "Đăng ký nội trú chính thức", description: "Chưa chuyển thành đơn chính thức.", state: "pending" },
  ];
}

function stepClasses(state: TimelineState) {
  if (state === "done") {
    return {
      dot: "border-emerald-200 bg-emerald-50 text-emerald-600",
      line: "bg-emerald-300",
      label: "text-[#1F3152]",
      description: "text-[#5C7094]",
      icon: <CheckCircle2 className="h-5 w-5 stroke-[2.4]" />,
    };
  }
  if (state === "active") {
    return {
      dot: "border-amber-200 bg-amber-50 text-amber-600",
      line: "bg-[#d8e6f6]",
      label: "text-[#1F3152]",
      description: "text-[#5C7094]",
      icon: <Clock3 className="h-5 w-5 stroke-[2.4]" />,
    };
  }
  if (state === "stopped") {
    return {
      dot: "border-rose-200 bg-rose-50 text-rose-600",
      line: "bg-[#d8e6f6]",
      label: "text-rose-800",
      description: "text-rose-700",
      icon: <XCircle className="h-5 w-5 stroke-[2.4]" />,
    };
  }
  return {
    dot: "border-slate-200 bg-slate-50 text-slate-400",
    line: "bg-[#d8e6f6]",
    label: "text-[#8393ad]",
    description: "text-[#97a6bd]",
    icon: <Clock3 className="h-5 w-5 stroke-[2.4]" />,
  };
}

type Props = {
  reservation: ReservationProgress;
  onLogin?: () => void;
  onLookupAnother?: () => void;
};

export default function ReservationProgressCard({ reservation, onLogin, onLookupAnother }: Props) {
  const timeline = buildTimeline(reservation.status);

  return (
    <div className="rounded-[22px] border border-sky-200 bg-[linear-gradient(180deg,#f0f9ff_0%,#ffffff_100%)] p-5 shadow-[0_14px_30px_rgba(36,76,184,0.10)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[#1F3152]">Tiến trình hồ sơ hiện tại</h2>
            <span className={`rounded-lg border px-2 py-0.5 text-xs font-semibold ${reservationStatusClass[reservation.status]}`}>
              {reservationStatusLabel[reservation.status]}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-[#5C7094]">{statusMessage[reservation.status]}</p>
          {reservation.status === "rejected" && reservation.rejectionReason && (
            <p className="mt-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              Lý do không được duyệt: {reservation.rejectionReason}
            </p>
          )}
        </div>
      </div>

      <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {timeline.map((step, index) => {
          const classes = stepClasses(step.state);
          return (
            <li key={`${step.label}-${index}`} className="relative min-w-0 md:pb-0">
              {index < timeline.length - 1 && (
                <div className={`absolute left-5 top-10 h-[calc(100%_-_1.5rem)] w-px md:left-[calc(50%_+_1.25rem)] md:top-5 md:h-px md:w-[calc(100%_-_2.5rem)] ${classes.line}`} />
              )}
              <div className="relative flex gap-3 md:flex-col md:items-center md:text-center">
                <span className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${classes.dot}`}>
                  {classes.icon}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${classes.label}`}>{step.label}</p>
                  <p className={`mt-1 text-xs leading-5 ${classes.description}`}>{step.description}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-[#d8e6f6] pt-5 text-sm sm:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-[#d8e6f6] bg-white/75 px-4 py-3">
          <dt className="font-medium text-[#6F84A7]">Mã hồ sơ giữ chỗ</dt>
          <dd className="mt-1 break-all font-semibold text-[#1F3152]">{reservation.reservationCode || "Chưa có dữ liệu"}</dd>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#d8e6f6] bg-white/75 px-4 py-3">
          <dt className="font-medium text-[#6F84A7]">Trạng thái</dt>
          <dd className="mt-1 font-semibold text-[#1F3152]">{reservationStatusLabel[reservation.status]}</dd>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#d8e6f6] bg-white/75 px-4 py-3">
          <dt className="font-medium text-[#6F84A7]">Ngày nộp</dt>
          <dd className="mt-1 font-semibold text-[#1F3152]">{formatReservationDate(reservation.submittedAt)}</dd>
        </div>
        {reservation.approvedAt && (
          <div className="min-w-0 rounded-2xl border border-[#d8e6f6] bg-white/75 px-4 py-3">
            <dt className="font-medium text-[#6F84A7]">Ngày duyệt giữ chỗ</dt>
            <dd className="mt-1 font-semibold text-[#1F3152]">{formatReservationDate(reservation.approvedAt)}</dd>
          </div>
        )}
        <div className="min-w-0 rounded-2xl border border-[#d8e6f6] bg-white/75 px-4 py-3">
          <dt className="font-medium text-[#6F84A7]">Đợt đăng ký</dt>
          <dd className="mt-1 font-semibold text-[#1F3152]">{reservation.periodName || "Chưa có dữ liệu"}</dd>
        </div>
      </dl>

      {reservation.status === "cancelled" && (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <p className="text-[#9A4B00]">Lý do hủy</p>
          <p className="mt-1 text-base font-semibold text-[#7A3B00]">
            {reservation.cancellationReason?.trim() || "Vui lòng liên hệ Ban quản lý KTX để biết thêm chi tiết."}
          </p>
        </div>
      )}

      {(onLookupAnother || (reservation.status === "converted" && onLogin)) && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#d8e6f6] pt-5">
          {onLookupAnother && (
            <button
              type="button"
              onClick={onLookupAnother}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#c5d4f0] bg-[linear-gradient(135deg,#ffffff_0%,#f1f6ff_48%,#e8f0ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#244CB8] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_22px_rgba(36,76,184,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a9c0ea] hover:text-[#173D97]"
            >
              Tra cứu mã khác
            </button>
          )}
          {reservation.status === "converted" && onLogin && (
            <button type="button" onClick={onLogin} className={primaryBtn}>
              <LogIn className="h-4 w-4" />
              Đăng nhập bằng MSSV
            </button>
          )}
        </div>
      )}
    </div>
  );
}
