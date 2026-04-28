import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowUp, CheckCircle2, DoorOpen, Home, Star, UserRound, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import {
  assignRoomToRegistration,
  getDormRoomsInstant,
  getRegistrationRequestByIdInstant,
  getRegistrationRequests,
  type DormRoom,
} from "../../../api/registrationMockApi";
import type { RegistrationRequest } from "../data/registrationRequests";

type ToastState = { kind: "success" | "error"; message: string } | null;

const getRoomName = (room: DormRoom) => `${room.building_code}${room.room_number}`;

const getGenderLabel = (gender: string) => {
  const normalizedGender = gender.trim().toLowerCase();

  if (normalizedGender === "male") {
    return "Nam";
  }

  if (normalizedGender === "female") {
    return "Nữ";
  }

  return gender.trim() || "Khác";
};

export default function AssignRoomDetailPage() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const numericRequestId = Number(requestId);

  const [request, setRequest] = useState<RegistrationRequest | null>(() =>
    Number.isFinite(numericRequestId) ? getRegistrationRequestByIdInstant(numericRequestId) : null,
  );
  const [rooms, setRooms] = useState<DormRoom[]>(() => getDormRoomsInstant());
  const [toast, setToast] = useState<ToastState>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [floorFilter, setFloorFilter] = useState<string>("all");
  const [isScrollToTopVisible, setIsScrollToTopVisible] = useState(false);
  // Show scroll-to-top button when the scroll container is actually scrollable
  // and the user has scrolled a small amount (improves visibility on moderately
  // long pages where previous threshold was too large).
  useEffect(() => {
    const scrollContainer = document.querySelector('.auth-scrollbar') as HTMLElement | null;
    if (!scrollContainer) return;
    const updateVisibility = () => {
      const canScroll = scrollContainer.scrollHeight > scrollContainer.clientHeight + 10;
      setIsScrollToTopVisible(canScroll && scrollContainer.scrollTop > 20);
    };
    updateVisibility();
    scrollContainer.addEventListener('scroll', updateVisibility, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', updateVisibility);
    };
  }, []);

  const handleScrollToTop = () => {
    const scrollContainer = document.querySelector('.auth-scrollbar') as HTMLElement | null;
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!Number.isFinite(numericRequestId)) {
        return;
      }

      const requests = await getRegistrationRequests();
      if (!isMounted) {
        return;
      }

      setRequest(requests.find((item) => item.id === numericRequestId) ?? null);
      setRooms(getDormRoomsInstant());
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [numericRequestId]);

  useEffect(() => {
    // Scroll the main container (auth-scrollbar) to top on navigation
    const scrollContainer = document.querySelector('.auth-scrollbar') as HTMLElement | null;
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [numericRequestId]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timerId = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timerId);
  }, [toast]);

  const roomNameById = useMemo(() => {
    const map = new Map<number, string>();
    rooms.forEach((room) => map.set(room.id, getRoomName(room)));
    return map;
  }, [rooms]);

  const buildingOptions = useMemo(() => {
    const values = Array.from(new Set(rooms.map((room) => room.building_code))).sort();
    return ["all", ...values];
  }, [rooms]);

  const floorOptions = useMemo(() => {
    const floors = Array.from(
      new Set(rooms.filter((room) => buildingFilter === "all" || room.building_code === buildingFilter).map((room) => Math.floor(room.room_number / 100))),
    )
      .sort((a, b) => a - b)
      .map((value) => `${value}`);

    return ["all", ...floors];
  }, [buildingFilter, rooms]);

  useEffect(() => {
    if (buildingFilter !== "all" && buildingOptions.length > 0 && !buildingOptions.includes(buildingFilter)) {
      const id = window.setTimeout(() => setBuildingFilter("all"), 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [buildingFilter, buildingOptions]);

  useEffect(() => {
    if (floorFilter !== "all" && floorOptions.length > 0 && !floorOptions.includes(floorFilter)) {
      const id = window.setTimeout(() => setFloorFilter("all"), 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [floorFilter, floorOptions]);

  const visibleRooms = useMemo(() => {
    return rooms
      .filter((room) => {
        // Lọc theo giới tính sinh viên
        const studentGender = request?.formData.gender.trim().toLowerCase();
        
        if (studentGender === "male" && room.gender !== "male") return false;
        if (studentGender === "female" && room.gender !== "female") return false;
        
        return true;
      })
      .filter((room) => (buildingFilter === "all" ? true : room.building_code === buildingFilter))
      .filter((room) =>
        floorFilter === "all" ? true : `${Math.floor(room.room_number / 100)}` === floorFilter,
      )
      .sort((a, b) => {
        const diff = b.availableBeds - a.availableBeds;
        if (diff !== 0) {
          return diff;
        }
        return getRoomName(a).localeCompare(getRoomName(b));
      });
  }, [buildingFilter, floorFilter, rooms, request?.formData.gender]);

  const recommendedRoomId = useMemo(() => {
    return visibleRooms.find((room) => room.availableBeds > 0)?.id ?? null;
  }, [visibleRooms]);

  const assignedRoomName = request?.assigned_room_id ? roomNameById.get(request.assigned_room_id) : null;

  const handleBack = (toastState?: ToastState) => {
    navigate("/admin/assign-room", { replace: true, state: toastState ? { toast: toastState } : null });
  };

  const handleChooseRoom = async (room: DormRoom) => {
    if (!request) {
      setToast({ kind: "error", message: "Không tìm thấy sinh viên." });
      return;
    }

    if (request.status !== "approved") {
      setToast({ kind: "error", message: "Chỉ phân phòng cho sinh viên đã duyệt." });
      return;
    }

    if (request.assigned_room_id) {
      handleBack({ kind: "success", message: "Sinh viên đã được phân phòng." });
      return;
    }

    if (room.availableBeds <= 0) {
      setToast({ kind: "error", message: "Phòng đã hết chỗ." });
      return;
    }

    setIsAssigning(true);
    try {
      const updated = await assignRoomToRegistration({ requestId: request.id, roomId: room.id });
      setRequest(updated);
      setRooms(getDormRoomsInstant());
      handleBack({ kind: "success", message: "Phân phòng thành công" });
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "Không thể phân phòng.",
      });
    } finally {
      setIsAssigning(false);
    }
  };


  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex min-h-full flex-col space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      {typeof document !== "undefined"
        ? createPortal(
            <>
              <AnimatePresence>
                {toast ? (
                  <motion.div
                    key={`${toast.kind}-${toast.message}`}
                    initial={{ opacity: 0, y: -14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    role="status"
                    aria-live="polite"
                    className="pointer-events-none fixed left-1/2 top-6 z-[9999] w-[min(92vw,420px)] -translate-x-1/2 px-4"
                  >
                    <motion.div
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_22px_60px_rgba(15,23,42,0.22)] ${
                        toast.kind === "success"
                          ? "border-[#c4d7f2] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] text-[#24407f]"
                          : "border-[#f2b8c6] bg-[linear-gradient(180deg,#ffffff_0%,#fff5f8_100%)] text-[#8f2f4b]"
                      }`}
                    >
                      <span
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                          toast.kind === "success"
                            ? "bg-[linear-gradient(135deg,#e6f0ff_0%,#d4e3ff_100%)] text-[#2f63d8]"
                            : "bg-[linear-gradient(135deg,#fff0f6_0%,#ffd6e6_100%)] text-[#cc3c4f]"
                        }`}
                      >
                        {toast.kind === "success" ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                      </span>
                      <div className="min-w-0 truncate text-[15px] font-semibold">{toast.message}</div>
                    </motion.div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
              {isScrollToTopVisible ? (
                <div className="fixed bottom-6 right-6 z-[70]">
                  <button
                    type="button"
                    onClick={handleScrollToTop}
                    className="group inline-flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_42%,#31b7d4_100%)] text-white shadow-[0_16px_32px_rgba(36,76,184,0.28)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
                    aria-label="Về đầu trang"
                    title="Về đầu trang"
                  >
                    <ArrowUp className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
                  </button>
                </div>
              ) : null}
            </>,
            document.body,
          )
        : null}

      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <div className="relative pl-16 sm:pl-20">
          <button
            type="button"
            onClick={() => handleBack()}
            aria-label="Quay lại"
            title="Quay lại"
            className="absolute left-0 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#c4d7f2] bg-white/90 text-[#40619a] shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-[#9cb9e7] hover:text-[#244cb8]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">
                Chọn phòng
              </h1>
              <p className="mt-1 text-sm text-[#62789f]">Chọn phòng cho sinh viên đã được duyệt đơn đăng ký.</p>
            </div>
          </div>

          {assignedRoomName ? (
            <span className="absolute right-6 top-6 inline-flex items-center gap-2 rounded-full border border-[#b9e6c7] bg-[#effcf3] px-3 py-1.5 text-xs font-semibold text-[#16784b] shadow-[0_10px_18px_rgba(22,120,75,0.08)] sm:right-8 sm:top-6">
              <Home className="h-4 w-4" />
              Đã phân phòng: {assignedRoomName}
            </span>
          ) : null}
        </div>
      </div>

      <div className="rounded-[28px] border border-[#d7e4f6] bg-[linear-gradient(180deg,#fbfdff_0%,#f6faff_100%)] px-6 py-5 shadow-[0_14px_32px_rgba(36,76,184,0.08)]">
        <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#6f84ad]">
          <UserRound className="h-4 w-4 text-[#2f83c9]" />
          Thông tin sinh viên
        </div>

        {request ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[16px] leading-7 text-[#4b6494] sm:text-[17px]">
            <span>
              Họ tên: <span className="font-semibold text-[#1f3152]">{request.formData.fullName}</span>
            </span>
            <span className="hidden text-[#9ab0d2] sm:inline">•</span>
            <span>
              MSSV: <span className="font-semibold text-[#1f3152]">{request.formData.mssv}</span>
            </span>
            <span className="hidden text-[#9ab0d2] sm:inline">•</span>
            <span className="inline-flex items-center gap-2">
              Giới tính:
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[14px] font-semibold leading-none ${
                  getGenderLabel(request.formData.gender) === "Nữ"
                    ? "border-[#f2bfd0] bg-[#fff0f6] text-[#c45b87]"
                    : "border-[#bfd2ee] bg-[#edf4ff] text-[#2f63d8]"
                }`}
              >
                {getGenderLabel(request.formData.gender)}
              </span>
            </span>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-[#f2b8c6] bg-[linear-gradient(180deg,#ffffff_0%,#fff5f8_100%)] px-5 py-4 text-sm font-semibold text-[#8f2f4b]">
            Không tìm thấy sinh viên.
          </div>
        )}
      </div>

      <div className="rounded-[22px] border border-[#d3e0f2] bg-white p-5 shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#6f84ad]">
            <DoorOpen className="h-4 w-4 text-[#2f63d8]" />
            Danh sách phòng phù hợp
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={buildingFilter}
              onChange={(event) => setBuildingFilter(event.target.value)}
              className="h-10 rounded-xl border border-[#c9d8ef] bg-white px-4 text-sm font-semibold text-[#24407f] shadow-[0_10px_22px_rgba(36,76,184,0.08)] outline-none transition hover:border-[#a9c0ea] focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12"
            >
              {buildingOptions.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? "Tất cả tòa" : `Tòa ${value}`}
                </option>
              ))}
            </select>
            <select
              value={floorFilter}
              onChange={(event) => setFloorFilter(event.target.value)}
              className="h-10 rounded-xl border border-[#c9d8ef] bg-white px-4 text-sm font-semibold text-[#24407f] shadow-[0_10px_22px_rgba(36,76,184,0.08)] outline-none transition hover:border-[#a9c0ea] focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/12"
            >
              {floorOptions.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? "Tất cả tầng" : `Tầng ${value}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#dde7f5]">
          <table className="min-w-[700px] w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  Phòng
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  Giới tính
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  Số giường trống
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRooms.map((room) => {
                const isRoomFull = room.availableBeds <= 0;
                const disableChoose = isAssigning || !request || Boolean(request.assigned_room_id) || isRoomFull;
                const isRecommended = recommendedRoomId === room.id;
                const label = isRoomFull ? "Hết chỗ" : isRecommended ? "Chọn ngay" : "Chọn";

                return (
                  <tr key={room.id} className="transition-colors hover:bg-[#f8fbff]">
                    <td className="border-t border-[#e7eef9] px-4 py-3 text-center text-sm font-semibold text-[#1f3152]">
                      {getRoomName(room)}
                    </td>
                    <td className="border-t border-[#e7eef9] px-4 py-3 text-center text-sm font-semibold">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                          room.gender === "female"
                            ? "border-[#f2bfd0] bg-[#fff0f6] text-[#c45b87]"
                            : "border-[#bfd2ee] bg-[#edf4ff] text-[#2f63d8]"
                        }`}
                      >
                        {room.gender === "female" ? "Nữ" : "Nam"}
                      </span>
                    </td>
                    <td className="border-t border-[#e7eef9] px-4 py-3 text-center text-sm font-semibold text-[#1f7a4e]">
                      {room.availableBeds}/{room.totalBeds}
                    </td>
                    <td className="border-t border-[#e7eef9] px-4 py-3 text-center">
                      <button
                        type="button"
                        disabled={disableChoose}
                        onClick={() => void handleChooseRoom(room)}
                        className={`auth-btn-gloss inline-flex min-w-[118px] flex-nowrap items-center justify-center whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition duration-200 ${
                          isRoomFull
                            ? "border border-[#d2def0] bg-[linear-gradient(135deg,#edf4ff_0%,#dfeaff_100%)] text-[#7f8da8] shadow-[0_10px_18px_rgba(36,76,184,0.10)] disabled:opacity-100"
                            : isRecommended
                              ? "bg-[linear-gradient(135deg,#1f5fd1_0%,#244cb8_42%,#31b7d4_100%)] text-white shadow-[0_18px_34px_rgba(36,76,184,0.30)] ring-2 ring-[#d9e7ff] hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                              : "bg-[#2563eb] text-white shadow-[0_14px_26px_rgba(37,99,235,0.22)] hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                        }`}
                      >
                        <span className="auth-btn-gloss__content inline-flex items-center justify-center gap-2">
                          {isRecommended ? <Star className="h-4 w-4 fill-[#facc15] text-[#facc15]" /> : null}
                          {label}
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.section>
  );
}
