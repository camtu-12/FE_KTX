import { motion } from "framer-motion";
import { FileCheck2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ContractPage() {
  const navigate = useNavigate();

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex min-h-full flex-col gap-6 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#2d58c4] bg-[radial-gradient(circle_at_30%_30%,#2347a8_0%,#1b3e97_58%,#17347e_100%)] text-[#b7ccff] shadow-[inset_0_1px_0_rgba(132,166,244,0.30),0_12px_24px_rgba(36,76,184,0.18)]">
              <FileCheck2 className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">Hợp đồng</p>
              <h1 className="text-[28px] font-bold tracking-tight text-[#1a2d52]">Hợp đồng nội trú</h1>
              <p className="mt-1 text-sm text-[#5C7094]">Vui lòng xem nội dung hợp đồng trước khi ký.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/student/registration")}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#c9daf1] bg-white/70 px-4 text-sm font-semibold text-[#244cb8] shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition hover:border-[#9cb9e7] hover:bg-white"
          >
            Quay lại đăng ký
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#c9daf1] bg-white p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
        <div className="flex items-center gap-2 text-[#2451b5]">
          <FileCheck2 className="h-5 w-5" />
          <p className="font-semibold">Nội dung hợp đồng</p>
        </div>

        <div className="mt-4 space-y-3 rounded-2xl border border-[#e3edf8] bg-[#f7fbff] px-5 py-4 text-sm leading-7 text-[#1f3152]">
          <p>
            Đây là trang hợp đồng (mock). Khi tích hợp backend, hệ thống sẽ hiển thị file hợp đồng PDF và trạng thái ký
            hợp đồng của bạn.
          </p>
          <p className="text-[#5c7094]">
            Tạm thời bạn có thể xem thông tin phòng/giường tại mục <span className="font-semibold text-[#244cb8]">Phòng của tôi</span>.
          </p>
        </div>
      </div>
    </motion.section>
  );
}

