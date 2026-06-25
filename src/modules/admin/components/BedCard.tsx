import { ArrowDownToLine, ArrowUpToLine, BedDouble, CheckCircle2, Clock3, Eye, TriangleAlert } from "lucide-react";
import type { BedDetail } from "../../../api/roomApi";
import StudentMiniInfo from "./StudentMiniInfo";

type BedCardStatusMeta = {
  label: string;
  badgeClass: string;
  cardClass: string;
  Icon: typeof CheckCircle2;
};

const statusMeta: Record<BedDetail["display_status"], BedCardStatusMeta> = {
  empty: {
    label: "Trống",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    cardClass: "border-emerald-200 bg-white hover:border-emerald-300",
    Icon: CheckCircle2,
  },
  occupied: {
    label: "Có người",
    badgeClass: "border-blue-200 bg-blue-100 text-blue-700",
    cardClass:
      "border-[#bfd2ee] bg-[linear-gradient(180deg,#f5f9ff_0%,#e8f1ff_100%)] hover:border-[#9ebce5]",
    Icon: BedDouble,
  },
  reserved: {
    label: "Chờ thanh toán",
    badgeClass: "border-amber-200 bg-amber-100 text-amber-700",
    cardClass: "border-amber-200 bg-[linear-gradient(180deg,#fffdf5_0%,#fff7dc_100%)] hover:border-amber-300",
    Icon: Clock3,
  },
  maintenance: {
    label: "Bảo trì",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    cardClass: "border-amber-200 bg-[linear-gradient(180deg,#fffaf0_0%,#fdf1dc_100%)] hover:border-amber-300",
    Icon: TriangleAlert,
  },
};

type BedCardProps = {
  bed: BedDetail;
  /** mở modal chỉnh sửa trạng thái giường (chỉ cho giường không có người) */
  onEdit?: (bed: BedDetail) => void;
  /** mở thông tin đầy đủ sinh viên */
  onViewStudent?: (bed: BedDetail) => void;
};

export default function BedCard({ bed, onEdit, onViewStudent }: BedCardProps) {
  const displayStatus = bed.display_status;
  const meta = statusMeta[displayStatus];
  const StatusIcon = meta.Icon;
  const PositionIcon = bed.position === "bottom" ? ArrowDownToLine : ArrowUpToLine;
  const positionLabel = bed.position === "bottom" ? "Tầng dưới" : "Tầng trên";
  const hasStudent = (displayStatus === "occupied" || displayStatus === "reserved") && bed.student;
  const canEdit = displayStatus === "empty" && Boolean(onEdit);

  return (
    <div
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onClick={canEdit ? () => onEdit?.(bed) : undefined}
      onKeyDown={
        canEdit
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onEdit?.(bed);
              }
            }
          : undefined
      }
      className={`group flex h-full flex-col rounded-2xl border p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(36,76,184,0.16)] ${meta.cardClass} ${
        canEdit ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-[#244cb8] shadow-sm ring-1 ring-[#dce7f8]">
            <BedDouble className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#1a2d52]">Giường {bed.bed_number}</p>
            <p className="flex items-center gap-1 text-[11px] font-medium text-[#7c8fb5]">
              <PositionIcon className="h-3 w-3" />
              {positionLabel}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.badgeClass}`}
        >
          <StatusIcon className="h-3 w-3" />
          {meta.label}
        </span>
      </div>

      {hasStudent ? (
        <div className="mt-3 border-t border-white/70 pt-3">
          <StudentMiniInfo student={bed.student!} />
          {displayStatus === "reserved" ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              Đã chọn giường, chưa thanh toán.
            </div>
          ) : null}
          {onViewStudent ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onViewStudent(bed);
              }}
              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_45%,#1f46ad_100%)] text-xs font-semibold text-white shadow-[0_8px_18px_rgba(36,76,184,0.22)] transition hover:brightness-110"
            >
              <Eye className="h-3.5 w-3.5" />
              Xem chi tiết
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#d8e4f5] bg-white/50 py-4 text-center text-xs font-medium text-[#8a9bbd]">
          {displayStatus === "maintenance" ? "Giường đang tạm ngưng sử dụng" : "Giường trống — sẵn sàng phân"}
        </div>
      )}
    </div>
  );
}
