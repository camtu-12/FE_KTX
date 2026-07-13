import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  LoaderCircle,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  getEffectiveBedApprovalStatus,
  getLatestRegistrationByEmail,
  getLatestRegistrationByEmailInstant,
  selectBedForRegistration,
} from "../../../api/registrationService";
import { useAuthStore } from "../../auth/store";
import bunkBedIcon from "../../../assets/icons8-bunk-bed-64.png";
import maintenanceIcon from "../../../assets/icons8-maintenance-94.png";
import personIcon from "../../../assets/icons8-person-100.png";
import roomIcon from "../../../assets/icons8-dormitory-66.png";
import type { DormBed, DormBedPair, DormRoom } from "../../../types/dormRoom";
import getBedDisplayStatus from "../../../utils/bedDisplay";
import { getRoomBeds, listRooms, type RoomApi } from "../../../api/roomApi";
import type { RegistrationRequest } from "../../admin/data/registrationRequests";

const getRoomName = (room: DormRoom) => `${room.building_code}${room.room_number}`;
const getPositionLabel = (position: DormBed["position"]) =>
  position === "upper" ? "Trên" : "Dưới";

type SelectableDormBed = DormBed & { occupied?: boolean };

const getStatusMeta = (bed: DormBed, hasOccupancyFn?: (id: number) => boolean) => {
  const display = getBedDisplayStatus(bed, undefined, hasOccupancyFn);
  if (display === "MAINTENANCE") {
    return {
      label: "Bảo trì",
      badgeClassName: "border border-amber-300 bg-amber-100 text-amber-700",
      cardClassName: "border-amber-200 bg-yellow-100 border-yellow-450 text-yellow-600",
      icon: <img src={maintenanceIcon} alt="Bảo trì" className="h-4 w-4 object-contain" />,
    };
  }
  if (display === "HAS_OCCUPANCY") {
    return {
      label: "Đã có người",
      badgeClassName: "border border-slate-300 bg-slate-100 text-slate-700",
      cardClassName: "border-slate-200 bg-gray-100 text-gray-500 opacity-70 cursor-not-allowed",
      icon: <img src={personIcon} alt="Đã có người" className="h-4 w-4 object-contain" />,
    };
  }
  return {
    label: "Trống",
    badgeClassName: "border border-emerald-300 bg-emerald-100 text-emerald-800",
    cardClassName:
      "border-[#cfe2ff] bg-blue-50 border-blue-400 text-blue-600 hover:bg-blue-100",
    icon: <CheckCircle2 className="h-4 w-4" />,
  };
};

const getBedLabel = (bed: DormBed) =>
  `Giường ${bed.bed_number} (${getPositionLabel(bed.position)})`;

function BedRow({
  bed,
  isSelected,
  onSelect,
  hasOccupancyFn,
}: {
  bed: DormBed;
  isSelected: boolean;
  onSelect: (bedId: number) => void;
  hasOccupancyFn?: (id: number) => boolean;
}) {
  const meta = getStatusMeta(bed, hasOccupancyFn);
  const isClickable = getBedDisplayStatus(bed, undefined, hasOccupancyFn) === "NO_OCCUPANCY";
  const positionLabel = bed.position === "upper" ? "Tầng trên" : "Tầng dưới";

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={() => onSelect(bed.id)}
      className={`flex min-h-[132px] w-full flex-col rounded-2xl border p-3 text-left transition duration-200 ${meta.cardClassName} ${
        isSelected ? "border-blue-600 bg-blue-100 shadow-lg ring-2 ring-blue-400" : ""
      } ${
        isClickable
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-[#8fb0e6] hover:shadow-[0_14px_26px_rgba(36,76,184,0.12)]"
          : "cursor-not-allowed opacity-70"
      }`}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-inherit">Giường {bed.bed_number}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#6f84ad]">{positionLabel}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badgeClassName}`}
        >
          {meta.icon}
          {meta.label}
        </span>
      </div>

      <div className="mt-3 flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#d8e4f5] bg-white/55 px-3 py-4 text-center text-xs font-semibold text-[#8a9bbd]">
        {isSelected ? (
          <span className="inline-flex items-center gap-1.5 text-[#244cb8]">
            <CheckCircle2 className="h-4 w-4" />
            Đang chọn
          </span>
        ) : isClickable ? (
          "Nhấn để chọn"
        ) : (
          meta.label
        )}
      </div>
    </button>
  );
}
function BedPairCard({
  pair,
  selectedBedId,
  onSelect,
  hasOccupancyFn,
}: {
  pair: DormBedPair;
  selectedBedId: number | null;
  onSelect: (bedId: number) => void;
  hasOccupancyFn?: (id: number) => boolean;
}) {
  return (
    <article className="overflow-hidden rounded-[26px] border border-[#c9daf1] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_16px_34px_rgba(36,76,184,0.10)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#e3edf8] bg-[linear-gradient(180deg,#ffffff_0%,#f5faff_100%)] px-4 py-3">
        <p className="text-sm font-semibold text-[#1f3152]">Đôi {pair.pairNumber}</p>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#c9daf1] bg-white px-3 py-1 text-xs font-bold text-[#244cb8]">
          <img src={bunkBedIcon} alt="Giường tầng" className="h-4 w-4 object-contain" />
          Giường tầng
        </span>
      </div>
      <div className="relative p-4">
        <div className="pointer-events-none absolute bottom-7 left-4 top-7 w-[5px] rounded-full bg-[linear-gradient(180deg,#d9e0ea_0%,#aeb9c8_48%,#d9e0ea_100%)] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.45)]" />
        <div className="pointer-events-none absolute bottom-7 right-5 top-7 w-9 rounded-full border-l-[5px] border-r-[5px] border-[#aeb9c8]">
          <span className="absolute left-0 right-0 top-1/4 h-[3px] rounded-full bg-[#aeb9c8]" />
          <span className="absolute left-0 right-0 top-1/2 h-[3px] rounded-full bg-[#aeb9c8]" />
          <span className="absolute left-0 right-0 top-3/4 h-[3px] rounded-full bg-[#aeb9c8]" />
        </div>
        <div className="pointer-events-none absolute left-8 right-16 top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#dbe3ee_0%,#aeb9c8_45%,#dbe3ee_100%)] shadow-[0_1px_2px_rgba(100,116,139,0.18)]" />

        <div className="relative z-10 ml-5 mr-12 grid grid-rows-2 gap-4">
          <BedRow
            bed={pair.upper}
            isSelected={pair.upper.id === selectedBedId}
            onSelect={onSelect}
            hasOccupancyFn={hasOccupancyFn}
          />
          <BedRow
            bed={pair.lower}
            isSelected={pair.lower.id === selectedBedId}
            onSelect={onSelect}
            hasOccupancyFn={hasOccupancyFn}
          />
        </div>
      </div>
    </article>
  );
}

function ConfirmBedModal({
  roomName,
  bed,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  roomName: string;
  bed: DormBed;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-[#c9daf1] bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
        <p className="text-lg font-bold text-[#1a2d52]">🎯 Xác nhận giường đã chọn</p>
        <div className="mt-4 rounded-2xl border border-[#dbe8f7] bg-[#f7fbff] p-4 text-[#1f3152]">
          <p className="text-sm font-semibold text-[#5c7094]">
            Bạn sắp hoàn tất đăng ký nội trú với:
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <img src={bunkBedIcon} alt="Giường" className="h-5 w-5 object-contain" />
              <span className="font-semibold text-[#1a2d52]">{getBedLabel(bed)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <img src={roomIcon} alt="Phòng" className="h-5 w-5 object-contain" />
              <span className="font-semibold text-[#1a2d52]">Phòng {roomName}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-start gap-2 text-xs font-semibold text-amber-800">
            <span className="text-base">⚠️</span>
            <span>Lưu ý: Sau khi xác nhận, bạn sẽ không thể đổi giường.</span>
          </p>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#c9daf1] bg-white px-5 text-sm font-semibold text-[#40619a] transition hover:border-[#9cb9e7] hover:text-[#244cb8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function useDeadlineCountdown(
  bedSelectionDeadline: string | null | undefined,
  roomAssignedAt: string | null | undefined,
  bedSelectionDays: number | null | undefined,
) {
  const deadline = useMemo(() => {
    if (bedSelectionDeadline) {
      const d = new Date(bedSelectionDeadline);
      if (!Number.isNaN(d.getTime())) return d;
    }
    if (!roomAssignedAt || bedSelectionDays === null || bedSelectionDays === undefined) return null;
    const d = new Date(roomAssignedAt);
    d.setDate(d.getDate() + bedSelectionDays);
    d.setHours(17, 0, 0, 0);
    return d;
  }, [bedSelectionDeadline, bedSelectionDays, roomAssignedAt]);

  const [remaining, setRemaining] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!deadline) {
      setIsExpired(false);
      setRemaining("");
      return;
    }
    const tick = () => {
      const diff = deadline.getTime() - Date.now();
      if (diff <= 0) {
        setIsExpired(true);
        setRemaining("Hết hạn");
        return;
      }
      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      setRemaining(
        days > 0
          ? `${days} ngày ${hours} giờ`
          : hours > 0
            ? `${hours} giờ ${minutes} phút`
            : `${minutes} phút`,
      );
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [deadline]);

  return { remaining, isExpired, deadline };
}

export default function BedSelectionPage() {
  const navigate = useNavigate();
  const studentEmail = useAuthStore((state) => state.user?.email ?? "");

  const [rooms, setRooms] = useState<DormRoom[]>([]);
  const [assignedBeds, setAssignedBeds] = useState<SelectableDormBed[]>([]);
  const [registrationVersion, setRegistrationVersion] = useState(0);
  const [request, setRequest] = useState<RegistrationRequest | null | undefined>(undefined);
  const [isRequestLoaded, setIsRequestLoaded] = useState(false);
  const [requestLoadError, setRequestLoadError] = useState(false);

  const loadRooms = useCallback(async () => {
    try {
      const data = await listRooms();
      const mapped = data.map((r: RoomApi) => ({
        id: r.id,
        building_code: r.building_code,
        room_number: r.room_number,
        totalBeds: r.beds?.length ?? r.capacity ?? 0,
        availableBeds: r.beds?.filter((b) => !b.occupied).length ?? 0,
        capacity: r.capacity ?? r.beds?.length,
        gender: r.floor?.gender ?? null,
        floor_id: r.floor?.id ?? r.floor_id,
        floor: r.floor
          ? {
              id: r.floor.id,
              building_code: r.building_code,
              floor_number: r.floor.floor_number,
              gender: r.floor.gender,
            }
          : undefined,
        floor_number: r.floor_number ?? r.floor?.floor_number,
        beds: [],
      })) as DormRoom[];
      setRooms(mapped);
    } catch {
      // ignore
    }
  }, []);

  const loadAssignedBeds = useCallback(async (roomId: number) => {
    try {
      const { beds } = await getRoomBeds(roomId);
      setAssignedBeds(
        beds.map((b): SelectableDormBed => ({
          id: b.id,
          room_id: roomId,
          bed_number: Number(b.bed_number) || 0,
          position: b.position === "top" ? "upper" : "lower",
          status: b.status === "maintenance" ? "maintenance" : "active",
          occupied: b.display_status !== "empty",
        })),
      );
    } catch {
      setAssignedBeds([]);
    }
  }, []);

  useEffect(() => {
    const refreshRegistrations = () => setRegistrationVersion((v) => v + 1);

    void loadRooms();
    window.addEventListener("focus", loadRooms);
    window.addEventListener("ktx-registrations-updated", refreshRegistrations);
    return () => {
      window.removeEventListener("focus", loadRooms);
      window.removeEventListener("ktx-registrations-updated", refreshRegistrations);
    };
  }, [loadRooms]);

  useEffect(() => {
    let isMounted = true;
    const loadRequest = async () => {
      setIsRequestLoaded(false);
      if (!studentEmail) {
        setRequest(null);
        setIsRequestLoaded(true);
        return;
      }
      const instant = getLatestRegistrationByEmailInstant(studentEmail);
      if (isMounted && instant) setRequest(instant);
      try {
        const latest = await getLatestRegistrationByEmail(studentEmail);
        if (isMounted) {
          setRequest(latest);
          setIsRequestLoaded(true);
        }
      } catch {
        if (isMounted) setRequestLoadError(true);
        if (isMounted && !instant) setRequest(null);
        if (isMounted) setIsRequestLoaded(true);
      }
    };
    void loadRequest();
    return () => {
      isMounted = false;
    };
  }, [studentEmail, registrationVersion]);

  // Load beds for the assigned room whenever request changes
  useEffect(() => {
    const roomId = request?.assigned_room_id;
    if (!roomId || request?.occupancy_status !== "ROOM_CONFIRMED") {
      setAssignedBeds([]);
      return;
    }
    void loadAssignedBeds(roomId);
  }, [request?.assigned_room_id, request?.occupancy_status, loadAssignedBeds]);

  // Guard: only ROOM_CONFIRMED students without a confirmed bed may access this page
  useEffect(() => {
    if (!isRequestLoaded || !studentEmail) return;
    // API fail → show error UI, don't redirect silently
    if (requestLoadError) return;
    if (!request) {
      navigate("/student/room", { replace: true });
      return;
    }
    const bedApprovalStatus = getEffectiveBedApprovalStatus(request);
    if (request.bedId && bedApprovalStatus !== "rejected") {
      navigate("/student/room", { replace: true });
      return;
    }
    if (request.occupancy_status !== "ROOM_CONFIRMED") {
      navigate("/student/room", { replace: true });
    }
  }, [isRequestLoaded, requestLoadError, navigate, request, studentEmail]);

  const room = useMemo(() => {
    const id = request?.assigned_room_id;
    if (!id) return null;
    return rooms.find((r) => r.id === id) ?? null;
  }, [request?.assigned_room_id, rooms]);

  const bedPairs = useMemo(() => {
    if (!assignedBeds.length) return [] as DormBedPair[];
    const sorted = [...assignedBeds].sort((a, b) => a.bed_number - b.bed_number);
    const pairs: DormBedPair[] = [];
    for (let i = 0; i < sorted.length; i += 2) {
      const b1 = sorted[i];
      const b2 = sorted[i + 1];
      if (!b1 || !b2) continue;
      const upper = b1.position === "upper" ? b1 : b2;
      const lower = b1.position === "lower" ? b1 : b2;
      pairs.push({ pairNumber: i / 2 + 1, upper, lower });
    }
    return pairs;
  }, [assignedBeds]);

  const [selectedBedId, setSelectedBedId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const roomName = room ? getRoomName(room) : request?.assigned_room_id ? "Đang tải..." : "";
  const selectedBed = useMemo(() => {
    return assignedBeds.find((b) => b.id === selectedBedId) ?? null;
  }, [assignedBeds, selectedBedId]);

  const hasOccupancyFn = useMemo(() => {
    const occupied = new Set(assignedBeds.filter((b) => b.occupied).map((b) => b.id));
    return (bedId: number) => occupied.has(bedId);
  }, [assignedBeds]);

  // Deadline countdown — prefer BE deadline; fallback keeps the shared 17:00 cutoff.
  const roomAssignedAt = request?.room_assigned_at ?? null;
  const { remaining, isExpired } = useDeadlineCountdown(
    request?.bed_selection_deadline,
    roomAssignedAt,
    request?.bed_selection_days,
  );

  useEffect(() => {
    if (errorMessage && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [errorMessage]);

  const handleSelectBed = (bedId: number) => {
    setSelectedBedId(bedId);
    setIsConfirmOpen(false);
  };

  const handleConfirm = async () => {
    if (!studentEmail) {
      setErrorMessage("Bạn cần đăng nhập để chọn giường.");
      return;
    }
    if (!selectedBed) {
      setErrorMessage("Vui lòng chọn một giường trống.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await selectBedForRegistration({
        email: studentEmail,
        bedId: selectedBed.id,
        currentRequest: request ?? undefined,
      });
      navigate("/student/room", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể chọn giường.");
      const roomId = request?.assigned_room_id;
      if (roomId) void loadAssignedBeds(roomId);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRequestLoaded && requestLoadError) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 rounded-3xl bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-6 text-center">
        <p className="text-base font-semibold text-rose-700">
          Không thể tải thông tin phòng. Vui lòng kiểm tra console để biết chi tiết lỗi.
        </p>
        <button
          type="button"
          onClick={() => {
            setRequestLoadError(false);
            setRegistrationVersion((v) => v + 1);
          }}
          className="rounded-xl border border-[#c4d7f2] bg-white px-5 py-2 text-sm font-semibold text-[#244cb8] transition hover:border-[#9cb9e7]"
        >
          Thử lại
        </button>
        <button
          type="button"
          onClick={() => navigate("/student/room")}
          className="text-sm text-[#5c7094] underline"
        >
          Quay lại trang phòng
        </button>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex min-h-full flex-col gap-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <div className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <div className="flex flex-wrap items-start gap-4">
          <div className="relative min-w-0 flex-1 pl-16 sm:pl-20">
            <button
              type="button"
              onClick={() => navigate("/student/room")}
              aria-label="Quay lại"
              className="absolute left-0 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#c4d7f2] bg-white/90 text-[#40619a] shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-[#9cb9e7] hover:text-[#244cb8]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">
                Chọn giường
              </h1>
              <p className="mt-1 text-sm text-[#5C7094]">
                Chọn giường phù hợp để hoàn tất thủ tục đăng ký nội trú
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-col items-end gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#c9daf1] bg-white/70 px-4 py-3 text-sm text-[#1F3152] shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
              <MapPin className="h-4 w-4 text-[#244cb8]" />
              <span className="font-medium">Phòng:</span>
              <span className="font-bold text-[#244cb8]">{roomName}</span>
            </div>
            {remaining && (
              <div
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                  isExpired
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                {isExpired ? "Đã hết hạn chọn giường" : `Còn lại: ${remaining}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div
          ref={errorRef}
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 whitespace-pre-line"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {bedPairs.map((pair) => (
          <BedPairCard
            key={pair.pairNumber}
            pair={pair}
            selectedBedId={selectedBedId}
            onSelect={handleSelectBed}
            hasOccupancyFn={hasOccupancyFn}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[#c1d6f4] bg-white/80 px-5 py-4 shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
        <div className="flex items-center gap-3 text-sm text-[#1F3152]">
          <ShieldCheck className="h-5 w-5 text-[#244cb8]" />
          <div>
            <p className="font-semibold">Bạn chọn:</p>
            <p className="text-[#5C7094]">
              {selectedBed ? getBedLabel(selectedBed) : "Chưa chọn giường"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          disabled={isSubmitting || !selectedBed || isExpired}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span className="inline-flex items-center gap-2">
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            Xác nhận chọn giường
          </span>
        </button>
      </div>

      {isConfirmOpen && selectedBed ? (
        <ConfirmBedModal
          roomName={roomName}
          bed={selectedBed}
          isSubmitting={isSubmitting}
          onCancel={() => {
            if (!isSubmitting) {
              setIsConfirmOpen(false);
              setSelectedBedId(null);
            }
          }}
          onConfirm={handleConfirm}
        />
      ) : null}
    </motion.section>
  );
}
