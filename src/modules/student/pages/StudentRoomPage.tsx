import { motion } from "framer-motion";
import { BedSingle, Home, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getDormBedsForRoomInstant, getDormRoomsInstant, getLatestRegistrationByEmailInstant } from "../../../api/registrationMockApi";
import { getStoredAuth } from "../../auth/utils/authStorage";

const getRoomName = (room: { building_code: string; room_number: number }) => `${room.building_code}${room.room_number}`;

export default function StudentRoomPage() {
  const navigate = useNavigate();
  const storedAuth = getStoredAuth();
  const studentEmail = storedAuth?.user.email ?? "";

  const registration = useMemo(
    () => (studentEmail ? getLatestRegistrationByEmailInstant(studentEmail) : null),
    [studentEmail],
  );

  const room = useMemo(() => {
    const roomId = registration?.assigned_room_id ?? null;

    if (!roomId) {
      return null;
    }

    return getDormRoomsInstant().find((item) => item.id === roomId) ?? null;
  }, [registration?.assigned_room_id]);

  const bed = useMemo(() => {
    const roomId = registration?.assigned_room_id ?? null;
    const bedId = registration?.bedId ?? null;

    if (!roomId || !bedId) {
      return null;
    }

    return getDormBedsForRoomInstant(roomId).find((item) => item.id === bedId) ?? null;
  }, [registration?.assigned_room_id, registration?.bedId]);

  const roomName = room ? getRoomName(room) : "A103";
  const bedLabel = bed ? `${bed.bed_number} (${bed.position === "upper" ? "Trên" : "Dưới"})` : "Chưa có giường";

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
              <Home className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2F83C9]">Phòng của tôi</p>
              <h1 className="text-[28px] font-bold tracking-tight text-[#1a2d52]">Bạn đã hoàn tất đăng ký nội trú</h1>
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

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[24px] border border-[#c9daf1] bg-white p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
          <div className="flex items-center gap-2 text-[#2451b5]">
            <ShieldCheck className="h-5 w-5" />
            <p className="font-semibold">Thông tin phòng</p>
          </div>
          <div className="mt-5 space-y-4 text-sm text-[#1f3152]">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#e3edf8] bg-[#f7fbff] px-4 py-3">
              <span className="text-[#5c7094]">Phòng</span>
              <span className="font-bold text-[#244cb8]">{roomName}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#e3edf8] bg-[#f7fbff] px-4 py-3">
              <span className="text-[#5c7094]">Giường</span>
              <span className="font-bold text-[#244cb8]">{bedLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#e3edf8] bg-[#f7fbff] px-4 py-3">
              <span className="text-[#5c7094]">Trạng thái</span>
              <span className="font-bold text-emerald-700">Đã hoàn tất</span>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#c9daf1] bg-white p-6 shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
          <div className="flex items-center gap-2 text-[#2451b5]">
            <BedSingle className="h-5 w-5" />
            <p className="font-semibold">Tóm tắt</p>
          </div>
          <p className="mt-4 text-sm leading-7 text-[#5c7094]">
            Thông tin phòng và giường của bạn đã được khóa trong hệ thống. Nếu cần thay đổi, hãy liên hệ quản lý nội trú.
          </p>
          <button
            type="button"
            onClick={() => navigate("/student/registration")}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-4 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition hover:-translate-y-0.5 hover:brightness-110"
          >
            Xem đăng ký
          </button>
        </div>
      </div>
    </motion.section>
  );
}