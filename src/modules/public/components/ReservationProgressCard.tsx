import { CheckCircle2, LogIn, Search } from "lucide-react";
import type { ReservationProgress, ReservationStatus } from "../../../api/dormReservationApi";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_22px_40px_rgba(36,76,184,0.34)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";
const secondaryBtn =
  "inline-flex items-center gap-2 rounded-2xl border border-[#c5d4f0] bg-[linear-gradient(135deg,#ffffff_0%,#f1f6ff_48%,#e8f0ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#244CB8] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_22px_rgba(36,76,184,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a9c0ea] hover:text-[#173D97] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_16px_28px_rgba(36,76,184,0.16)] active:scale-[0.98] disabled:opacity-50";

export const reservationStatusLabel: Record<ReservationStatus, string> = {
  submitted: "Đã nộp",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  waitlisted: "Đang chờ",
  converted: "Đã hoàn tất",
  expired: "Hết hạn",
  cancelled: "Đã hủy",
};

const reservationStatusClass: Record<ReservationStatus, string> = {
  submitted: "border-blue-200 bg-blue-50 text-blue-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  waitlisted: "border-amber-200 bg-amber-50 text-amber-700",
  converted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  expired: "border-slate-200 bg-slate-50 text-slate-600",
  cancelled: "border-slate-200 bg-slate-100 text-slate-500",
};

const statusMessage: Record<ReservationStatus, string> = {
  submitted: "Hồ sơ của bạn đã được gửi và đang chờ xử lý.",
  approved: "Hồ sơ đã được duyệt. Vui lòng theo dõi các thông báo tiếp theo.",
  waitlisted: "Hồ sơ đang nằm trong danh sách chờ. Hệ thống sẽ thông báo khi có chỗ trống.",
  rejected: "Hồ sơ giữ chỗ không được duyệt.",
  cancelled: "Hồ sơ giữ chỗ đã bị hủy.",
  expired: "Hồ sơ giữ chỗ đã hết hiệu lực.",
  converted: "Bạn đã hoàn tất đăng ký KTX chính thức. Vui lòng đăng nhập bằng MSSV để tiếp tục.",
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
  const hasTime = /[T\s]\d{2}:\d{2}/.test(value);

  return hasTime ? `${day}/${month}/${year} ${hours}:${minutes}` : `${day}/${month}/${year}`;
}

type Props = {
  reservation: ReservationProgress;
  message?: string | null;
  onCheckAnother?: () => void;
  onOpenLookup?: () => void;
  onLogin?: () => void;
};

export default function ReservationProgressCard({ reservation, message, onCheckAnother, onOpenLookup, onLogin }: Props) {
  const title = reservation.status === "converted"
    ? "Đăng ký chính thức đã hoàn tất"
    : "Tiến trình hồ sơ hiện tại";
  const guide = message || statusMessage[reservation.status];

  return (
    <div className="rounded-[22px] border border-sky-200 bg-[linear-gradient(180deg,#f0f9ff_0%,#ffffff_100%)] p-5 shadow-[0_14px_30px_rgba(36,76,184,0.10)] sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-600">
          <CheckCircle2 className="h-5 w-5 stroke-[2.4]" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[#1F3152]">{title}</h2>
            <span className={`rounded-lg border px-2 py-0.5 text-xs font-semibold ${reservationStatusClass[reservation.status]}`}>
              {reservationStatusLabel[reservation.status]}
            </span>
          </div>
          {guide && <p className="mt-1 text-sm font-medium text-[#5C7094]">{guide}</p>}
          {reservation.status === "rejected" && reservation.rejectionReason && (
            <p className="mt-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              Lý do: {reservation.rejectionReason}
            </p>
          )}
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
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
        <div className="min-w-0 rounded-2xl border border-[#d8e6f6] bg-white/75 px-4 py-3">
          <dt className="font-medium text-[#6F84A7]">Đợt đăng ký</dt>
          <dd className="mt-1 font-semibold text-[#1F3152]">{reservation.periodName || "Chưa có dữ liệu"}</dd>
        </div>
      </dl>

      {(onCheckAnother || onOpenLookup || (reservation.status === "converted" && onLogin)) && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#d8e6f6] pt-5">
          <div className="flex flex-wrap items-center gap-3">
            {onCheckAnother && (
              <button type="button" onClick={onCheckAnother} className={secondaryBtn}>
                Kiểm tra hồ sơ khác
              </button>
            )}
            {onOpenLookup && (
              <button type="button" onClick={onOpenLookup} className={secondaryBtn}>
                <Search className="h-4 w-4" />
                Xem trang tra cứu
              </button>
            )}
          </div>
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
