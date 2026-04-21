import { Building2 } from "lucide-react";

export default function AppBrand() {
  return (
    <div className="flex items-center gap-3 text-[#14377b]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#14377b_0%,#2d58c4_100%)] shadow-[0_12px_24px_rgba(20,55,123,0.18)]">
        <Building2 size={24} strokeWidth={2.2} className="text-white" />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d7ea6]">
          STU Dormitory
        </div>
        <div className="auth-display text-xl font-extrabold text-[#14377b]">
          Hệ thống quản lý ký túc xá
        </div>
      </div>
    </div>
  );
}
