import { AlertCircle, Info } from "lucide-react";
import type { DormCapacityByGender, DormCapacitySummary } from "../../../types/dormCapacity";

type Props = {
  capacity: DormCapacityByGender | null;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
  showDetails?: boolean;
  onOpenDetails?: () => void;
  emptyMessage?: string;
};

const valueOf = (value: number | null | undefined) => Math.max(0, Number(value ?? 0) || 0);

const metricClass =
  "rounded-2xl border border-[#dce7f6] bg-white px-3 py-3 shadow-[0_6px_14px_rgba(36,76,184,0.05)]";

const genderLabel: Record<"male" | "female", string> = { male: "Nam", female: "Nữ" };

function GenderCapacityBlock({ gender, capacity }: { gender: "male" | "female"; capacity: DormCapacitySummary }) {
  const metrics = [
    {
      label: "Giường khả dụng",
      value: valueOf(capacity.available_physical_beds),
      title: "Số giường vật lý có thể sử dụng sau khi loại giường/phòng bảo trì và các giường đang được giữ.",
      emphasis: false,
    },
    {
      label: "Có thể duyệt thêm",
      value: valueOf(capacity.available_approval_slots),
      title: "Số suất còn có thể phê duyệt sau khi trừ gia hạn, đơn nội trú đã duyệt và hồ sơ giữ chỗ đã duyệt.",
      emphasis: true,
    },
    {
      label: "Đang chọn duyệt",
      value: valueOf(capacity.proposed_approved_count),
      title: "Số hồ sơ đang được đề xuất duyệt nhưng chưa xác nhận chính thức.",
      emphasis: false,
    },
    {
      label: "Còn lại sau khi duyệt",
      value: valueOf(capacity.remaining_after_proposals),
      title: "Số suất dự kiến còn lại nếu xác nhận toàn bộ hồ sơ đang chọn duyệt.",
      emphasis: true,
    },
  ];

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8aa4cc]">
        {genderLabel[gender]}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className={metricClass} title={metric.title}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#62789f]">{metric.label}</p>
            <p className={`mt-1 text-2xl font-bold ${metric.emphasis ? "text-[#244cb8]" : "text-[#1f3152]"}`}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {capacity.total_beds <= 0 && (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Không tìm thấy giường {genderLabel[gender].toLowerCase()} thuộc phạm vi của đợt đăng ký.</span>
        </div>
      )}

      {capacity.capacity_exceeded ? (
        <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          Số hồ sơ {genderLabel[gender].toLowerCase()} đang chọn duyệt vượt quá sức chứa hiện tại {valueOf(capacity.over_capacity_count)} suất. Có thể duyệt thêm: {valueOf(capacity.available_approval_slots)} hồ sơ, đang chọn duyệt: {valueOf(capacity.proposed_approved_count)} hồ sơ.
        </div>
      ) : valueOf(capacity.available_approval_slots) === 0 && valueOf(capacity.proposed_approved_count) === 0 ? (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          Hiện không còn suất {genderLabel[gender].toLowerCase()} để duyệt thêm.
        </div>
      ) : null}
    </div>
  );
}

export default function CapacitySummaryCard({
  capacity,
  loading = false,
  error = null,
  compact = false,
  showDetails = true,
  onOpenDetails,
  emptyMessage = "Chọn đợt đăng ký để xem sức chứa và thực hiện xếp hạng.",
}: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#d6e2f1] bg-[#f7faff] p-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-[#e8f1fb]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
        Không thể tải thông tin sức chứa. Vui lòng làm mới và thử lại.
      </div>
    );
  }

  if (!capacity) {
    return (
      <div className="rounded-2xl border border-dashed border-[#c8d8ef] bg-[#f7faff] px-4 py-3 text-sm font-semibold text-[#62789f]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#d6e2f1] bg-[#f7faff] p-3">
      <div className="space-y-3">
        <GenderCapacityBlock gender="male" capacity={capacity.male} />
        <div className="border-t border-[#e1eaf7]" />
        <GenderCapacityBlock gender="female" capacity={capacity.female} />
      </div>

      {showDetails && onOpenDetails && (
        <button
          type="button"
          onClick={onOpenDetails}
          className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#244cb8] hover:text-[#1f46ad] ${compact ? "text-xs" : ""}`}
        >
          <Info className="h-4 w-4" />
          Xem chi tiết sức chứa
        </button>
      )}
    </div>
  );
}
