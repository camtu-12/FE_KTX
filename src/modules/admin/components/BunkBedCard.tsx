import { ArrowDownToLine, ArrowUpToLine, BedDouble, CheckCircle2, Check, Clock3, Eye, Pencil, RefreshCw, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { BedDetail } from "../../../api/roomApi";
import StudentMiniInfo from "./StudentMiniInfo";
import { formatDate } from "../../../utils/dateFormat";

export type BunkBedGroup = {
  pairNumber: number;
  top?: BedDetail;
  bottom?: BedDetail;
};

type BunkBedCardProps = {
  group: BunkBedGroup;
  beds?: BedDetail[];
  onViewBed?: (bed: BedDetail) => void;
  onEditStatus?: (bed: BedDetail) => void;
  onTransferStudent?: (bed: BedDetail) => void;
  onCompleteMaintenance?: (bed: BedDetail) => void;
};

type BedSlotProps = {
  bed?: BedDetail;
  beds?: BedDetail[];
  position: "top" | "bottom";
  onViewBed?: (bed: BedDetail) => void;
  onEditStatus?: (bed: BedDetail) => void;
  onTransferStudent?: (bed: BedDetail) => void;
  onCompleteMaintenance?: (bed: BedDetail) => void;
};

const statusMeta: Record<
  BedDetail["display_status"],
  {
    label: string;
    badgeClass: string;
    slotClass: string;
    Icon: typeof CheckCircle2;
    emptyText: string;
  }
> = {
  empty: {
    label: "Trống",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    slotClass: "border-emerald-200 bg-white",
    Icon: CheckCircle2,
    emptyText: "Giường trống - sẵn sàng phân",
  },
  occupied: {
    label: "Có người",
    badgeClass: "border-blue-200 bg-blue-100 text-blue-700",
    slotClass: "border-[#bfd2ee] bg-[linear-gradient(180deg,#f5f9ff_0%,#e8f1ff_100%)]",
    Icon: BedDouble,
    emptyText: "",
  },
  reserved: {
    label: "Chờ thanh toán",
    badgeClass: "border-amber-200 bg-amber-100 text-amber-700",
    slotClass: "border-amber-200 bg-[linear-gradient(180deg,#fffdf5_0%,#fff7dc_100%)]",
    Icon: Clock3,
    emptyText: "",
  },
  maintenance: {
    label: "Bảo trì",
    badgeClass: "border-orange-300 bg-orange-100 text-orange-700",
    slotClass: "border-orange-200 bg-[linear-gradient(180deg,#fff7ed_0%,#ffedd5_100%)]",
    Icon: TriangleAlert,
    emptyText: "Giường đang tạm ngưng sử dụng",
  },
};

function formatExpectedReturnDate(value?: string | null) {
  return value ? formatDate(value) : "Chưa xác định";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SV";
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function ActionButton({
  title,
  disabled,
  className,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  className: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:bg-white ${className}`}
    >
      {children}
    </button>
  );
}

function BedSlot({ bed, beds = [], position, onViewBed, onEditStatus, onTransferStudent, onCompleteMaintenance }: BedSlotProps) {
  const PositionIcon = position === "bottom" ? ArrowDownToLine : ArrowUpToLine;
  const positionLabel = position === "bottom" ? "Tầng dưới" : "Tầng trên";

  if (!bed) {
    return (
      <div className="flex min-h-[232px] flex-col rounded-2xl border border-dashed border-[#d8e4f5] bg-white/60 p-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[#8a9bbd]">
          <PositionIcon className="h-4 w-4" />
          {positionLabel}
        </div>
        <div className="mt-3 flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#d8e4f5] px-3 py-4 text-center text-xs font-semibold text-[#9aa9c5]">
          Chưa có dữ liệu giường
        </div>
      </div>
    );
  }

  const displayStatus = bed.display_status;
  const meta = statusMeta[displayStatus];
  const StatusIcon = meta.Icon;
  const isOccupied = Boolean(bed.student);
  const isActiveResident = bed.student?.occupancy?.status === "ACTIVE";
  const temporary = bed.student?.temporary_assignment?.is_temporary ? bed.student.temporary_assignment : null;
  const maintenance = bed.maintenance_assignment;
  const temporaryBedStudent = maintenance?.temporary_bed_id
    ? beds.find((item) => item.id === maintenance.temporary_bed_id)?.student ?? null
    : null;
  const maintenanceStudentAvatar = temporaryBedStudent?.avatar ?? maintenance?.student_avatar ?? null;
  const temporaryTooltip = temporary
    ? [
        `Phòng gốc: ${temporary.original_room_code ?? "-"}`,
        `Giường gốc: ${temporary.original_bed_number ?? "-"}`,
        `Lý do: ${temporary.reason ?? "Bảo trì phòng"}`,
        `Ngày dự kiến về: ${formatExpectedReturnDate(temporary.expected_return_date)}`,
      ].join("\n")
    : undefined;

  return (
    <div
      className={`flex min-h-[232px] flex-col rounded-2xl border p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${meta.slotClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#1a2d52]">Giường {bed.bed_number}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.badgeClass}`}>
          <StatusIcon className="h-3 w-3" />
          {meta.label}
        </span>
      </div>

      {isOccupied ? (
        <div className="mt-3 flex flex-1 flex-col border-t border-white/70 pt-3">
          <StudentMiniInfo student={bed.student!} />
          {displayStatus === "reserved" ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              Sinh viên đã chọn giường nhưng chưa thanh toán hóa đơn đầu.
            </div>
          ) : null}
          {temporary ? (
            <div
              className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-[11px] font-semibold text-orange-700 shadow-sm"
              title={temporaryTooltip}
            >
              <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-700">
                Ở tạm
              </span>
              <p className="mt-2">
                Phòng gốc: {temporary.original_room_code ?? "-"}
              </p>
              <p>Giường gốc: {temporary.original_bed_number ?? "-"}</p>
              <p>Lý do: {temporary.reason ?? "Bảo trì phòng"}</p>
              <p>Ngày dự kiến về: {formatExpectedReturnDate(temporary.expected_return_date)}</p>
            </div>
          ) : null}
        </div>
      ) : maintenance ? (
        <div className="mt-3 flex flex-1 flex-col border-t border-orange-200/80 pt-3 text-xs font-semibold text-[#61779d]">
          <div className="space-y-1">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_60%,#31b7d4_100%)] text-xs font-bold text-white ring-2 ring-white shadow-sm">
                {maintenanceStudentAvatar ? (
                  <img src={maintenanceStudentAvatar} alt={maintenance.student_name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">{getInitials(maintenance.student_name)}</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[#61779d]" title={`Sinh viên gốc: ${maintenance.student_name}`}>
                  Sinh viên gốc: <span className="font-bold text-[#1a2d52]">{maintenance.student_name}</span>
                </p>
                <p className="truncate text-[#61779d]" title={`MSSV: ${maintenance.student_code}`}>
                  MSSV: <span className="font-bold text-[#2563eb]">{maintenance.student_code}</span>
                </p>
              </div>
            </div>
            <p>Đang ở tạm: Giường {maintenance.temporary_bed_number ?? "-"}</p>
            <p>Ngày chuyển: {formatDate(maintenance.transferred_at)}</p>
            <p>Dự kiến về: {formatExpectedReturnDate(maintenance.expected_return_date)}</p>
          </div>
          {maintenance.can_return && onCompleteMaintenance ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCompleteMaintenance(bed);
              }}
              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <Check className="h-3.5 w-3.5" />
              Hoàn tất bảo trì
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#d8e4f5] bg-white/55 px-3 py-4 text-center text-xs font-semibold text-[#8a9bbd]">
          {meta.emptyText}
        </div>
      )}

      <div className="mt-auto flex justify-end gap-2 pt-3">
        <ActionButton title="Xem chi tiết" className="text-sky-600 hover:bg-sky-50" onClick={() => onViewBed?.(bed)}>
          <Eye className="h-4 w-4" />
        </ActionButton>
        <ActionButton title="Sửa trạng thái" className="text-amber-600 hover:bg-amber-50" onClick={() => onEditStatus?.(bed)}>
          <Pencil className="h-4 w-4" />
        </ActionButton>
        <ActionButton
          title={isActiveResident ? "Chuyển sinh viên" : displayStatus === "reserved" ? "Chưa thể chuyển khi sinh viên chưa thanh toán" : "Giường chưa có sinh viên để chuyển"}
          disabled={!isActiveResident}
          className="text-indigo-600 hover:bg-indigo-50"
          onClick={() => onTransferStudent?.(bed)}
        >
          <RefreshCw className="h-4 w-4" />
        </ActionButton>
      </div>
    </div>
  );
}

export default function BunkBedCard({ group, beds = [], onViewBed, onEditStatus, onTransferStudent, onCompleteMaintenance }: BunkBedCardProps) {
  return (
    <article className="relative overflow-hidden rounded-[26px] border border-[#c7d8f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_18px_40px_rgba(36,76,184,0.10)]">
      <div className="hidden">
        <div>
          <p className="text-base font-bold text-[#1a2d52]">Giường tầng {group.pairNumber}</p>
          <p className="mt-0.5 text-xs font-semibold text-[#7c8fb5]">1 tầng trên, 1 tầng dưới</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#244cb8] shadow-sm ring-1 ring-[#dce7f8]">
          <BedDouble className="h-5 w-5" />
        </span>
      </div>

      <div className="relative rounded-[24px] border border-[#d8e4f5] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-5 shadow-inner">
        <div className="pointer-events-none absolute left-4 top-7 bottom-7 w-[5px] rounded-full bg-[linear-gradient(180deg,#d9e0ea_0%,#aeb9c8_48%,#d9e0ea_100%)] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.45)]" />
        <div className="pointer-events-none absolute right-5 top-8 bottom-8 w-10 rounded-full border-l-[5px] border-r-[5px] border-[#aeb9c8]">
          <span className="absolute left-0 right-0 top-1/4 h-[3px] rounded-full bg-[#aeb9c8]" />
          <span className="absolute left-0 right-0 top-1/2 h-[3px] rounded-full bg-[#aeb9c8]" />
          <span className="absolute left-0 right-0 top-3/4 h-[3px] rounded-full bg-[#aeb9c8]" />
        </div>
        <div className="pointer-events-none absolute left-8 right-20 top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#dbe3ee_0%,#aeb9c8_45%,#dbe3ee_100%)] shadow-[0_1px_2px_rgba(100,116,139,0.18)]" />
        <div className="relative z-10 ml-8 mr-16 grid grid-rows-2 gap-4">
          <BedSlot bed={group.top} beds={beds} position="top" onViewBed={onViewBed} onEditStatus={onEditStatus} onTransferStudent={onTransferStudent} onCompleteMaintenance={onCompleteMaintenance} />
          <BedSlot bed={group.bottom} beds={beds} position="bottom" onViewBed={onViewBed} onEditStatus={onEditStatus} onTransferStudent={onTransferStudent} onCompleteMaintenance={onCompleteMaintenance} />
        </div>
      </div>
    </article>
  );
}
