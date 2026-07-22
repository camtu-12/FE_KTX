import type { LucideIcon } from "lucide-react";

type OccupancyGuardCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Khung thông báo trạng thái CHÍNH của trang (không phải toast/banner nhỏ) — dùng khi 1 trang
 * con của sinh viên không khả dụng do trạng thái lưu trú (occupancy) hiện tại, thay cho nội
 * dung trang. Theo đúng công thức banner đã dùng ở RegistrationPage.tsx (reason_code banners):
 * icon chip tròn lớn + tiêu đề đậm + mô tả nhạt hơn + nút hành động tùy chọn.
 */
export default function OccupancyGuardCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: OccupancyGuardCardProps) {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-[24px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-10 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:px-8">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#c6d8f4] bg-[#eef5ff] text-[#2f63da]">
          <Icon className="h-8 w-8" />
        </span>
        <h2 className="mt-5 text-2xl font-bold text-[#1F3152]">{title}</h2>
        <p className="mt-3 text-base leading-7 text-[#5C7094]">{description}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(36,76,184,0.22)] transition hover:-translate-y-0.5 hover:brightness-110"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
