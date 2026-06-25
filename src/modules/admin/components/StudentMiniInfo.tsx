import { CalendarDays } from "lucide-react";
import type { BedStudent } from "../../../api/roomApi";
import { formatDate } from "../../../utils/dateFormat";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SV";
  const last = parts[parts.length - 1];
  const first = parts[0];
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function formatOccupancyDate(value?: string | null) {
  if (!value) return "--";
  return formatDate(value);
}

type StudentMiniInfoProps = {
  student: BedStudent;
  /** size of the avatar; "md" cho card giường, "lg" cho modal chi tiết */
  size?: "md" | "lg";
};

export default function StudentMiniInfo({ student, size = "md" }: StudentMiniInfoProps) {
  const avatarSize = size === "lg" ? "h-20 w-20 text-xl" : "h-12 w-12 text-sm";
  const wrapperGap = size === "lg" ? "gap-5" : "gap-3";
  const nameClass = size === "lg" ? "text-lg" : "text-sm";
  const codeClass = size === "lg" ? "text-base" : "text-xs";
  const metaClass = size === "lg" ? "mt-1.5 text-sm" : "mt-0.5 text-[11px]";
  const metaIconClass = size === "lg" ? "h-4 w-4" : "h-3 w-3";
  const currentOccupancy = student.occupancy ?? null;
  const occupancyStatus = String(currentOccupancy?.status ?? "").toUpperCase();
  const isPendingPayment = occupancyStatus === "PENDING_PAYMENT";
  const isActive = occupancyStatus === "ACTIVE";
  const modalCheckInDate = currentOccupancy?.check_in_date ?? null;
  const modalCheckOutDate = currentOccupancy?.check_out_date ?? null;
  const residencyBadge = isPendingPayment
    ? {
        label: "● Chờ thanh toán",
        className: "border-amber-200 bg-amber-50 text-amber-700",
      }
    : currentOccupancy
      ? !isActive
      ? {
          label: "● Đã rời KTX",
          className: "border-slate-200 bg-slate-100 text-slate-600",
        }
      : {
          label: "● Đang lưu trú",
          className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        }
    : {
        label: "Chưa lưu trú",
        className: "border-slate-200 bg-slate-50 text-slate-500",
      };
  const temporary = student.temporary_assignment?.is_temporary ? student.temporary_assignment : null;
  const temporaryTitle = temporary
    ? `Phòng gốc: ${temporary.original_room_code ?? "—"}\nGiường gốc: ${temporary.original_bed_number ?? "—"}\nLý do: ${temporary.reason ?? "Bảo trì phòng"}\nNgày dự kiến về: ${formatOccupancyDate(temporary.expected_return_date)}`
    : undefined;

  return (
    <div className={`flex items-center ${wrapperGap}`}>
      <div className={`relative shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-[0_6px_14px_rgba(36,76,184,0.18)] ${avatarSize}`}>
        {student.avatar ? (
          <img src={student.avatar} alt={student.full_name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_60%,#31b7d4_100%)] font-bold text-white">
            {getInitials(student.full_name)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={`truncate font-bold leading-relaxed text-[#1a2d52] ${nameClass}`} title={student.full_name}>
          {student.full_name}
        </p>
        {size !== "lg" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={`truncate font-semibold leading-relaxed text-[#2563EB] ${codeClass}`}>MSSV: {student.student_code}</p>
            {temporary ? (
              <span
                title={temporaryTitle}
                className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700"
              >
                Ở tạm
              </span>
            ) : null}
          </div>
        ) : null}
        <p className={`flex items-center gap-1.5 leading-relaxed text-[#7c8fb5] ${metaClass}`}>
          <CalendarDays className={`${metaIconClass} shrink-0 text-[#9bb0d4]`} />
          {isPendingPayment ? "Ngày dự kiến vào:" : "Ngày vào ở:"} {size === "lg" ? formatOccupancyDate(modalCheckInDate) : formatDate(student.check_in_date)}
        </p>
        {size !== "lg" ? (
          <p className={`flex items-center gap-1.5 leading-relaxed text-[#7c8fb5] ${metaClass}`}>
            <CalendarDays className={`${metaIconClass} shrink-0 text-[#9bb0d4]`} />
            {isPendingPayment ? "Ngày dự kiến rời:" : "Ngày rời đi:"} {student.check_out_date ? formatDate(student.check_out_date) : isActive ? "Đang ở" : "--"}
          </p>
        ) : null}
        {size === "lg" ? (
          <>
            <p className={`flex items-center gap-1.5 leading-relaxed text-[#7c8fb5] ${metaClass}`}>
              <CalendarDays className={`${metaIconClass} shrink-0 text-[#9bb0d4]`} />
              {isPendingPayment ? "Ngày dự kiến rời:" : "Ngày rời đi:"} {currentOccupancy ? (modalCheckOutDate ? formatDate(modalCheckOutDate) : isActive ? "Đang ở" : "--") : "--"}
            </p>
            <span className={`mt-2 inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold ${residencyBadge.className}`}>
              {residencyBadge.label}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
