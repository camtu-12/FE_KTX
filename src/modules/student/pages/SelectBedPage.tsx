import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, LoaderCircle, MapPin, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  getDormBedPairsForRoomInstant,
  getDormRoomsInstant,
  getLatestRegistrationByEmailInstant,
  selectBedForRegistration,
  type DormBed,
  type DormBedPair,
  type DormRoom,
} from "../../../api/registrationMockApi";
import { getStoredAuth } from "../../auth/utils/authStorage";
import bunkBedIcon from "../../../assets/icons8-bunk-bed-64.png";
import maintenanceIcon from "../../../assets/icons8-maintenance-94.png";
import personIcon from "../../../assets/icons8-person-100.png";
import roomIcon from "../../../assets/icons8-dormitory-66.png";

const getRoomName = (room: DormRoom) => `${room.building_code}${room.room_number}`;

const getPositionLabel = (position: DormBed["position"]) => (position === "upper" ? "Trên" : "Dưới");

const getStatusMeta = (status: DormBed["status"]) => {
  if (status === "occupied") {
    return {
      label: "Đã có người",
      badgeClassName: "border border-slate-300 bg-slate-100 text-slate-700",
      cardClassName: "border-slate-200 bg-gray-100 text-gray-500 opacity-70 cursor-not-allowed",
      icon: <img src={personIcon} alt="Đã có người" className="h-4 w-4 object-contain" />,
      helper: "Không thể chọn",
    };
  }

  if (status === "maintenance") {
    return {
      label: "Bảo trì",
      badgeClassName: "border border-amber-300 bg-amber-100 text-amber-700",
      cardClassName: "border-amber-200 bg-yellow-100 border-yellow-450 text-yellow-600",
      icon: <img src={maintenanceIcon} alt="Bảo trì" className="h-4 w-4 object-contain" />,
      helper: "Tạm khóa",
    };
  }

  return {
    label: "Trống",
    badgeClassName: "border border-emerald-300 bg-emerald-100 text-emerald-800",
    cardClassName: "border-[#cfe2ff] bg-blue-50 border-blue-400 text-blue-600 hover: bg-blue-100",
    icon: <CheckCircle2 className="h-4 w-4" />,
    helper: "Có thể chọn",
  };
};

const getBedLabel = (bed: DormBed) => `Giường ${bed.bed_number} (${getPositionLabel(bed.position)})`;

function BedRow({
  bed,
  isSelected,
  onSelect,
}: {
  bed: DormBed;
  isSelected: boolean;
  onSelect: (bedId: number) => void;
}) {
  const meta = getStatusMeta(bed.status);
  const isClickable = bed.status === "empty";

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={() => onSelect(bed.id)}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition duration-200 ${meta.cardClassName} ${
        isSelected
          ? "border-blue-600 bg-blue-100 shadow-lg ring-2 ring-blue-400 scale-105"
          : ""
      } ${
        isClickable
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-[#8fb0e6] hover:shadow-[0_14px_26px_rgba(36,76,184,0.12)]"
          : "cursor-not-allowed opacity-70"
      }`}
    >
      <div
        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border text-base shadow-sm ${
          bed.status === "empty"
            ? isSelected
              ? "border-[#2f63da] bg-white text-[#244cb8]"
              : "border-[#cfe2ff] bg-white text-[#244cb8]"
            : bed.status === "occupied"
              ? "border-slate-200 bg-slate-200 text-slate-600"
              : "border-amber-200 bg-amber-100 text-amber-700"
        }`}
      >
        <img src={bunkBedIcon} alt="Giường tầng" className="h-6 w-6 object-contain" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-inherit">{getBedLabel(bed)}</p>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badgeClassName}`}>
            {meta.icon}
            {meta.label}
          </span>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 text-xs font-semibold text-[#244cb8]">
        {isSelected ? <CheckCircle2 className="h-5 w-5 text-[#244cb8]" /> : null}
      </div>
    </button>
  );
}

function BedPairCard({
  pair,
  selectedBedId,
  onSelect,
}: {
  pair: DormBedPair;
  selectedBedId: number | null;
  onSelect: (bedId: number) => void;
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-[#c9daf1] bg-white shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
      <div className="flex items-center justify-between border-b border-[#e3edf8] bg-[linear-gradient(180deg,#ffffff_0%,#f5faff_100%)] px-4 py-3">
        <div className="flex items-center gap-2">

          <p className="text-sm font-semibold text-[#1f3152]">Đôi {pair.pairNumber}</p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <BedRow bed={pair.upper} isSelected={pair.upper.id === selectedBedId} onSelect={onSelect} />

        <BedRow bed={pair.lower} isSelected={pair.lower.id === selectedBedId} onSelect={onSelect} />
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
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-[#c9daf1] bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
        <p className="text-lg font-bold text-[#1a2d52]">🎯 Xác nhận giường đã chọn</p>
        <div className="mt-4 rounded-2xl border border-[#dbe8f7] bg-[#f7fbff] p-4 text-[#1f3152]">
          <p className="text-sm font-semibold text-[#5c7094]">Bạn sắp hoàn tất đăng ký nội trú với:</p>
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
          <p className="text-xs font-semibold text-amber-800 flex items-start gap-2">
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

export default function SelectBedPage() {
  const navigate = useNavigate();
  const storedAuth = getStoredAuth();
  const studentEmail = storedAuth?.user.email ?? "";

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("resetMocks") === "1") {
        localStorage.removeItem("mock_dorm_beds_v1");
        localStorage.removeItem("mock_dorm_rooms_v4");
        localStorage.removeItem("mock_registration_requests_v5");
        const clean = window.location.pathname;
        window.location.replace(clean);
      }
    } catch {
      // ignore in non-browser env
    }
  }, []);

  const request = useMemo(
    () => (studentEmail ? getLatestRegistrationByEmailInstant(studentEmail) : null),
    [studentEmail],
  );

  const rooms = useMemo(() => getDormRoomsInstant(), []);

  const room = useMemo(() => {
    const assignedRoomId = request?.assigned_room_id ?? 3;
    return rooms.find((item) => item.id === assignedRoomId) ?? null;
  }, [request?.assigned_room_id, rooms]);

  const bedPairs = useMemo(() => {
    const roomId = request?.assigned_room_id ?? 3;
    return getDormBedPairsForRoomInstant(roomId);
  }, [request?.assigned_room_id]);

  const [selectedBedId, setSelectedBedId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!studentEmail || !request) {
      return;
    }

    if (request.bedId) {
      navigate("/student/registration", { replace: true });
    }
  }, [navigate, request, studentEmail]);

  const roomName = room ? getRoomName(room) : "A103";
  const selectedBed = useMemo(() => {
    const allBeds = bedPairs.flatMap((pair) => [pair.upper, pair.lower]);
    return allBeds.find((bed) => bed.id === selectedBedId) ?? null;
  }, [bedPairs, selectedBedId]);

  const handleCancelSelection = () => {
    if (isSubmitting) {
      return;
    }

    setIsConfirmOpen(false);
    setSelectedBedId(null);
  };

  useEffect(() => {
    if (errorMessage && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [errorMessage]);

  const handleOpenConfirm = () => {
    setIsConfirmOpen(true);
  };

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
      await selectBedForRegistration({ email: studentEmail, bedId: selectedBed.id });
      navigate("/student/registration", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể chọn giường.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              onClick={() => navigate("/student/registration")}
              aria-label="Quay lại"
              title="Quay lại"
              className="absolute left-0 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#c4d7f2] bg-white/90 text-[#40619a] shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-[#9cb9e7] hover:text-[#244cb8]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Chọn giường</h1>
              <p className="mt-1 text-sm text-[#5C7094]">
                Sinh viên chọn giường phù hợp để hoàn tất thủ tục đăng ký
              </p>
            </div>
          </div>

          <div className="ml-auto inline-flex w-fit items-center gap-2 rounded-2xl border border-[#c9daf1] bg-white/70 px-4 py-3 text-sm text-[#1F3152] shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
            <MapPin className="h-4 w-4 text-[#244cb8]" />
            <span className="font-medium">Phòng:</span>
            <span className="font-bold text-[#244cb8]">{roomName}</span>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div ref={errorRef} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 whitespace-pre-line">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {bedPairs.map((pair) => (
          <BedPairCard key={pair.pairNumber} pair={pair} selectedBedId={selectedBedId} onSelect={handleSelectBed} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[#c1d6f4] bg-white/80 px-5 py-4 shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
        <div className="flex items-center gap-3 text-sm text-[#1F3152]">
          <ShieldCheck className="h-5 w-5 text-[#244cb8]" />
          <div>
            <p className="font-semibold">Bạn chọn :</p>
            <p className="text-[#5C7094]">
              {selectedBed ? `${getBedLabel(selectedBed)}` : "Chưa chọn giường"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenConfirm}
          disabled={isSubmitting || !selectedBed}
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
          onCancel={handleCancelSelection}
          onConfirm={handleConfirm}
        />
      ) : null}
    </motion.section>
  );
}
