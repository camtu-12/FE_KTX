import { X } from "lucide-react";
import { createPortal } from "react-dom";
import type { DormCapacityByGender, DormCapacitySummary } from "../../../types/dormCapacity";

type Props = {
  open: boolean;
  onClose: () => void;
  capacity: DormCapacityByGender | null;
  title?: string;
  loading?: boolean;
  error?: string | null;
};

const valueOf = (value: number | null | undefined) => Math.max(0, Number(value ?? 0) || 0);

type NumericCapacityKey = {
  [Key in keyof DormCapacitySummary]: DormCapacitySummary[Key] extends number ? Key : never;
}[keyof DormCapacitySummary];

// Chỉ số chung — không cần tách nam/nữ, admin ít cần xem riêng (cộng gộp 2 giới để hiển thị
// 1 lần cho gọn, tránh lặp lại 2 lần những con số ít quan trọng cho quyết định duyệt).
const sharedRows: Array<{ label: string; key: NumericCapacityKey; note?: string }> = [
  { label: "Tổng số giường", key: "total_beds" },
  { label: "Giường bảo trì/không sử dụng", key: "maintenance_or_blocked_beds" },
  {
    label: "Giường đã được phân",
    key: "physically_occupied_or_reserved_beds",
    note: "Số giường đã có Occupancy chiếm chỗ (đã xác nhận phòng, đang chờ thanh toán hoặc đang lưu trú).",
  },
  { label: "Suất dành cho gia hạn", key: "approved_extensions" },
  { label: "Đơn nội trú đã duyệt (chưa phân giường)", key: "approved_unassigned_registrations" },
  { label: "Hồ sơ giữ chỗ đã duyệt", key: "approved_dorm_reservations" },
];

// Chỉ số quyết định duyệt được bao nhiêu — PHẢI tách riêng nam/nữ vì giường tách theo giới.
const genderRows: Array<{ label: string; key: NumericCapacityKey }> = [
  { label: "Giường khả dụng", key: "available_physical_beds" },
  { label: "Có thể duyệt thêm", key: "available_approval_slots" },
  { label: "Gợi ý duyệt", key: "proposed_approved_count" },
  { label: "Còn lại sau khi duyệt", key: "remaining_after_proposals" },
];

const genderLabel: Record<"male" | "female", string> = { male: "Nam", female: "Nữ" };

function GenderColumn({ gender, capacity }: { gender: "male" | "female"; capacity: DormCapacitySummary }) {
  return (
    <div className="flex-1 rounded-2xl border border-[#dce7f6] bg-[#f7faff] p-3">
      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[#244cb8]">{genderLabel[gender]}</p>
      <div className="grid grid-cols-2 gap-2">
        {genderRows.map((row) => (
          <div key={row.key} className="rounded-xl border border-[#dce7f6] bg-white px-3 py-2.5">
            <p className="text-xs font-semibold text-[#62789f]">{row.label}</p>
            <p className="mt-0.5 text-lg font-bold text-[#1f3152]">{valueOf(capacity[row.key])}</p>
          </div>
        ))}
      </div>

      {capacity.capacity_exceeded && (
        <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          Vượt quá sức chứa {valueOf(capacity.over_capacity_count)} suất.
        </div>
      )}
    </div>
  );
}

export default function CapacityDetailsModal({
  open,
  onClose,
  capacity,
  title = "Chi tiết sức chứa KTX",
  loading = false,
  error = null,
}: Props) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-[24px] border border-[#c1d6f4] bg-white shadow-[0_24px_56px_rgba(36,76,184,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eef3fb] bg-white px-6 py-4">
          <h2 className="text-xl font-bold text-[#1a2d52]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#7f93b6] transition hover:bg-[#f2f6fd] hover:text-[#244cb8]"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-[#eef4fb]" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : capacity ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sharedRows.map((row) => (
                  <div
                    key={row.key}
                    title={row.note}
                    className="rounded-2xl border border-[#dce7f6] bg-[#f7faff] px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-[#62789f]">{row.label}</p>
                    <p className="mt-1 text-xl font-bold text-[#1f3152]">
                      {valueOf(capacity.male[row.key]) + valueOf(capacity.female[row.key])}
                    </p>
                    {row.note && (
                      <p className="mt-1 text-xs leading-4 text-[#8ba0c4]">{row.note}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <GenderColumn gender="male" capacity={capacity.male} />
                <GenderColumn gender="female" capacity={capacity.female} />
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-[#dce7f6] bg-[#f7faff] px-4 py-3 text-sm font-semibold text-[#62789f]">
              Chọn đợt đăng ký để xem sức chứa.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
