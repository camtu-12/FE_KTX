import { motion } from "framer-motion";
import {
  AlertTriangle,
  BedSingle,
  CheckCircle2,
  Clock3,
  DoorOpen,
  LogOut,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { type MyRoom, type MyRoomBed, type MyRoomStatus } from "../../../mocks/myRoom";
import { useAuthStore } from "../../auth/store";
import { requestCheckoutForRegistration } from "../../../api/registrationService";
import { getMyOccupancyFromBackend } from "../services/occupancyService";

const formatDate = (iso: string) => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getBedLevelLong = (bedNumber: number) => (bedNumber % 2 === 1 ? "Tầng trên" : "Tầng dưới");

const statusMeta: Record<
  MyRoomStatus,
  {
    label: string;
    badgeClassName: string;
    Icon: typeof CheckCircle2;
  }
> = {
  ACTIVE: {
    label: "Đang lưu trú",
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Icon: CheckCircle2,
  },
  LEAVE_REQUESTED: {
    label: "Chờ duyệt thôi ở",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
    Icon: Clock3,
  },
  LEFT: {
    label: "Đã thôi ở",
    badgeClassName: "border-slate-200 bg-slate-50 text-slate-600",
    Icon: CheckCircle2,
  },
  FORCED_LEFT: {
    label: "Bị buộc thôi ở",
    badgeClassName: "border-rose-200 bg-rose-50 text-rose-700",
    Icon: AlertTriangle,
  },
};

type RoomAisle = {
  label: string;
  bunkBeds: number[][];
};

const violationLevelLabel: Record<"MINOR" | "MEDIUM" | "SERIOUS", string> = {
  MINOR: "Nhẹ",
  MEDIUM: "Trung bình",
  SERIOUS: "Nghiêm trọng",
};

function createRoomAisles(beds: MyRoomBed[]): RoomAisle[] {
  const bedNumbers = beds
    .map((bed) => bed.bedNumber)
    .filter((bedNumber) => Number.isFinite(bedNumber))
    .sort((a, b) => a - b);

  const bunkBeds: number[][] = [];

  for (let index = 0; index < bedNumbers.length; index += 2) {
    bunkBeds.push(bedNumbers.slice(index, index + 2));
  }

  const midpoint = Math.ceil(bunkBeds.length / 2);

  return [
    {
      label: "Dãy trái",
      bunkBeds: bunkBeds.slice(0, midpoint),
    },
    {
      label: "Dãy phải",
      bunkBeds: bunkBeds.slice(midpoint),
    },
  ].filter((aisle) => aisle.bunkBeds.length > 0);
}

function getBedByNumber(beds: MyRoomBed[], bedNumber: number) {
  return beds.find((bed) => bed.bedNumber === bedNumber);
}

function BedCard({ bed, currentBedNumber }: { bed: MyRoomBed; currentBedNumber: number }) {
  const isMine = bed.bedNumber === currentBedNumber;
  const isMaintenance = bed.status === "MAINTENANCE";
  const isOccupied = !isMaintenance && Boolean(bed.occupantName);
  const tooltipName = isMaintenance ? "Bảo trì" : bed.occupantName ?? "Trống";
  const tooltipCode = bed.studentCode ?? "-";

  return (
    <div className="group relative">
      <motion.article
        whileHover={{ y: -4, scale: 1.03 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className={[
          "relative min-h-[112px] overflow-hidden rounded-[22px] border p-4 transition-all duration-300",
          "shadow-[0_14px_28px_rgba(35,72,138,0.12)] hover:shadow-[0_26px_48px_rgba(36,76,184,0.24)]",
          isMine
            ? "border-[#75d8ff] bg-[linear-gradient(135deg,#225bd7_0%,#159bd2_100%)] text-white shadow-[0_0_36px_rgba(37,99,235,0.38)]"
            : isMaintenance
              ? "border-amber-200 bg-amber-50/90 text-[#8a5a00] backdrop-blur-xl"
            : isOccupied
              ? "border-emerald-200 bg-emerald-50/90 text-[#1a2d52] backdrop-blur-xl"
              : "border-[#d8e0ec] bg-[#f1f4f8]/90 text-[#6d7fa6] backdrop-blur-xl",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-white/60" />
        <div className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-white/28 blur-2xl" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${isMine ? "text-[#dff7ff]" : "text-[#7c8fb5]"}`}>
              {getBedLevelLong(bed.bedNumber)}
            </p>
            <h3 className="mt-2 text-xl font-extrabold">Giường {bed.bedNumber}</h3>
          </div>
          <span
            className={[
              "flex h-11 w-11 items-center justify-center rounded-2xl border",
              isMine
                ? "border-white/35 bg-white/18 text-white"
                : isMaintenance
                  ? "border-amber-200 bg-white text-amber-600"
                : isOccupied
                  ? "border-emerald-200 bg-white text-emerald-700"
                  : "border-[#d8e0ec] bg-white/75 text-[#9aacca]",
            ].join(" ")}
          >
            {isOccupied ? <UserRound className="h-5 w-5" /> : <BedSingle className="h-5 w-5" />}
          </span>
        </div>

        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
          <span
            className={[
              "rounded-full border px-3 py-1 text-xs font-bold",
              isMine
                ? "border-white/30 bg-white/16 text-white"
                : isMaintenance
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                : isOccupied
                  ? "border-emerald-200 bg-white text-emerald-700"
                  : "border-[#d8e0ec] bg-[#f8fbff] text-[#7c8fb5]",
            ].join(" ")}
          >
            {isMine ? "Giường của bạn" : isMaintenance ? "Bảo trì" : isOccupied ? "Có người ở" : "Trống"}
          </span>
        </div>
      </motion.article>

      <div className="pointer-events-none absolute left-1/2 top-[-10px] z-30 w-[210px] -translate-x-1/2 -translate-y-full rounded-2xl border border-[#c8d8ef] bg-white px-4 py-3 text-left text-xs font-semibold text-[#1f3152] opacity-0 shadow-[0_18px_36px_rgba(15,23,42,0.18)] transition duration-200 group-hover:opacity-100">
        <p className="font-extrabold text-[#173a78]">{tooltipName}</p>
        <p className="mt-1 text-[#6d7fa6]">MSSV: {tooltipCode}</p>
        <p className="mt-1 text-[#6d7fa6]">Giường số: {bed.bedNumber}</p>
        <p className="mt-1 text-[#6d7fa6]">Vị trí: {getBedLevelLong(bed.bedNumber)}</p>
      </div>
    </div>
  );
}

function BunkBed({ pair, occupancy }: { pair: number[]; occupancy: MyRoom }) {
  return (
    <div className="rounded-[28px] border border-[#c7d8ee] bg-white/54 p-3 shadow-[0_18px_38px_rgba(36,76,184,0.12)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6f84ad]">Giường tầng</span>
      </div>
      <div className="space-y-3">
        {pair.map((bedNumber) => {
          const bed = getBedByNumber(occupancy.beds, bedNumber);

          return bed ? <BedCard key={bedNumber} bed={bed} currentBedNumber={occupancy.bedNumber} /> : null;
        })}
      </div>
    </div>
  );
}

function AccessNotice({ message }: { message: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <div className="rounded-[26px] border border-[#c4d7f3] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] p-5 text-[#1a2d52] shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-5 w-5 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold text-[#1a2d52]">Phòng của tôi</h1>
            <p className="mt-2 text-sm font-semibold text-[#5570a0]">{message}</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default function MyRoomPage() {
  const studentEmail = useAuthStore((state) => state.user?.email ?? "");
  const [occupancy, setOccupancy] = useState<MyRoom | null>(null);
  const [isLoadingOccupancy, setIsLoadingOccupancy] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [expectedLeaveDate, setExpectedLeaveDate] = useState("");
  const [leaveErrors, setLeaveErrors] = useState<{ reason?: string; expectedLeaveDate?: string }>({});

  useEffect(() => {
    let isActive = true;

    const loadOccupancy = async () => {
      setIsLoadingOccupancy(true);
      setLoadError("");

      try {
        const nextOccupancy = await getMyOccupancyFromBackend(studentEmail);

        if (isActive) {
          setOccupancy(nextOccupancy);
        }
      } catch (error) {
        if (isActive) {
          setOccupancy(null);
          setLoadError(error instanceof Error ? error.message : "Không thể tải thông tin phòng.");
        }
      } finally {
        if (isActive) {
          setIsLoadingOccupancy(false);
        }
      }
    };

    void loadOccupancy();

    if (typeof window !== "undefined") {
      window.addEventListener("ktx-registrations-updated", loadOccupancy);
      window.addEventListener("ktx-rooms-updated", loadOccupancy);
      window.addEventListener("focus", loadOccupancy);
    }

    return () => {
      isActive = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("ktx-registrations-updated", loadOccupancy);
        window.removeEventListener("ktx-rooms-updated", loadOccupancy);
        window.removeEventListener("focus", loadOccupancy);
      }
    };
  }, [studentEmail]);

  const roomAisles = useMemo(() => createRoomAisles(occupancy?.beds ?? []), [occupancy?.beds]);

  if (isLoadingOccupancy) {
    return <AccessNotice message="Đang tải thông tin phòng..." />;
  }

  if (!occupancy) {
    return <AccessNotice message={loadError || "Bạn chưa đăng ký nội trú, xin mời hoàn thành đầy đủ"} />;
  }

  const StatusIcon = statusMeta[occupancy.status].Icon;
  const myBed = getBedByNumber(occupancy.beds, occupancy.bedNumber);
  const isLiving = occupancy.status === "ACTIVE" || occupancy.status === "LEAVE_REQUESTED";

  const closeLeaveModal = () => {
    setIsLeaveModalOpen(false);
    setLeaveReason("");
    setExpectedLeaveDate("");
    setLeaveErrors({});
  };

  const handleSubmitLeaveRequest = async () => {
    const errors: { reason?: string; expectedLeaveDate?: string } = {};
    const trimmedReason = leaveReason.trim();

    if (!trimmedReason) {
      errors.reason = "Vui lòng nhập lý do thôi ở.";
    }

    if (!expectedLeaveDate) {
      errors.expectedLeaveDate = "Vui lòng chọn ngày dự kiến rời KTX.";
    }

    if (errors.reason || errors.expectedLeaveDate) {
      setLeaveErrors(errors);
      return;
    }

    try {
      await requestCheckoutForRegistration({
        email: studentEmail,
        reason: trimmedReason,
        expectedLeaveDate,
      });
      const nextOccupancy = await getMyOccupancyFromBackend(studentEmail);
      setOccupancy(nextOccupancy);
      closeLeaveModal();
    } catch (error) {
      setLeaveErrors({
        reason: error instanceof Error ? error.message : "Không thể gửi yêu cầu thôi ở.",
      });
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[28px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-5 text-[#1a2d52] shadow-[0_18px_44px_rgba(15,23,42,0.10)] transition-all duration-300 sm:px-8 sm:py-6"
      >
        <div className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full bg-[#8fb7ff]/18 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-4rem] left-[18%] h-40 w-40 rounded-full bg-[#7fe1d7]/14 blur-3xl" />

        <div className="relative z-10">
          <h1 className="text-[42px] font-bold leading-none tracking-tight sm:text-[52px]">
            Phòng {occupancy.roomCode}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-base font-medium text-[#5f739b] sm:text-lg">
            <span className="inline-flex items-center gap-2">
              <DoorOpen className="h-5 w-5" />
              Tòa {occupancy.buildingCode}
            </span>
            <span className="text-[#9aacca]">•</span>
            <span>Tầng {occupancy.floorNumber}</span>
            <span className="text-[#9aacca]">•</span>
            <span className="inline-flex items-center gap-2">
              <BedSingle className="h-5 w-5" />
              Giường {occupancy.bedNumber} ({getBedLevelLong(occupancy.bedNumber)})
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, delay: 0.08, ease: "easeOut" }}
        className="rounded-[26px] border border-[#c4d7f3] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)]"
      >
        <h2 className="text-2xl font-bold text-[#1a2d52]">Thông tin lưu trú</h2>
        <div className="mt-5 grid gap-x-6 gap-y-4 text-sm md:grid-cols-2 xl:grid-cols-3">
          <p className="text-[#5570a0]">
            MSSV: <span className="font-semibold text-[#1b3766]">{myBed?.studentCode ?? "-"}</span>
          </p>
          <p className="text-[#5570a0]">
            Ngày bắt đầu ở: <span className="font-semibold text-[#1b3766]">{formatDate(occupancy.startDate)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[#5570a0]">
            <span>Trạng thái lưu trú:</span>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${statusMeta[occupancy.status].badgeClassName}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {statusMeta[occupancy.status].label}
            </span>
          </div>
          <p className="text-[#5570a0]">
            Họ tên: <span className="font-semibold text-[#1b3766]">{myBed?.occupantName ?? "-"}</span>
          </p>
          <p className="text-[#5570a0]">
            Ngày kết thúc ở: <span className="font-semibold text-[#1b3766]">{formatDate(occupancy.endDate)}</span>
          </p>
        </div>
      </motion.div>

      {occupancy.status === "LEFT" ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: "easeOut" }}
          className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600 shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
        >
          <h3 className="text-lg font-bold text-slate-700">Bạn đã hoàn tất thủ tục thôi ở.</h3>
          <p className="mt-2">Ngày thôi ở: {occupancy.leftDate ? formatDate(occupancy.leftDate) : "-"}</p>
        </motion.div>
      ) : null}

      {occupancy.status === "FORCED_LEFT" ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: "easeOut" }}
          className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700 shadow-[0_14px_30px_rgba(190,52,85,0.10)]"
        >
          <h3 className="text-lg font-bold text-rose-800">Bạn đã bị buộc thôi ở.</h3>
          <p className="mt-2">Loại vi phạm: {occupancy.forcedLeave?.violationTypeName || "-"}</p>
          <p className="mt-2">
            Mức độ:{" "}
            {occupancy.forcedLeave?.violationTypeLevel
              ? violationLevelLabel[occupancy.forcedLeave.violationTypeLevel]
              : "-"}
          </p>
          <p className="mt-2">Lý do: {occupancy.forcedLeave?.reason || "-"}</p>
          <p className="mt-2">Ngày quyết định: {occupancy.forcedLeave?.decidedAt ? formatDate(occupancy.forcedLeave.decidedAt) : "-"}</p>
        </motion.div>
      ) : null}

      {isLiving ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.1, ease: "easeOut" }}
          className="overflow-hidden rounded-[30px] border border-[#b7cff0] bg-[linear-gradient(180deg,#ffffff_0%,#edf5ff_100%)] p-5 shadow-[0_24px_58px_rgba(28,72,160,0.16)]"
        >
          <div className="flex items-end">
            <h2 className="text-2xl font-bold text-[#1a2d52]">Sơ đồ phòng</h2>
          </div>

          <div className="mt-5">
            <div className="mx-auto max-w-5xl rounded-t-[26px] border border-[#c8d8ef] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] px-4 py-3 text-center shadow-[0_14px_28px_rgba(36,76,184,0.08)]">
              <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#6f84ad]">
                <DoorOpen className="h-4 w-4" />
                Cửa phòng
              </span>
            </div>

            <div className="mx-auto max-w-5xl rounded-b-[26px] border-x border-b border-[#c8d8ef] bg-[linear-gradient(135deg,rgba(255,255,255,0.78)_0%,rgba(231,241,255,0.86)_100%)] px-4 py-6 shadow-[inset_0_18px_36px_rgba(36,76,184,0.08)] sm:px-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {roomAisles.map((aisle) => (
                  <div key={aisle.label} className="flex h-full flex-col rounded-[30px] border border-[#d2e0f2] bg-white/42 p-4 shadow-[0_16px_34px_rgba(36,76,184,0.10)]">
                    <div className="flex-1 space-y-5">
                      {aisle.bunkBeds.map((pair) => (
                        <BunkBed key={pair.join("-")} pair={pair} occupancy={occupancy} />
                      ))}
                    </div>
                    <div className="mt-4 rounded-[20px] border border-[#b9d4f7] bg-[linear-gradient(180deg,#eff8ff_0%,#dceeff_100%)] px-4 py-3 text-center">
                      <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6f84ad]">
                        Cửa sổ {aisle.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}

      {isLiving ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.18, ease: "easeOut" }}
          className="rounded-[26px] border border-[#c4d7f3] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)]"
        >
          <h2 className="text-2xl font-bold text-[#1a2d52]">Hành động</h2>

          {occupancy.status === "ACTIVE" ? (
            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(true)}
              className="auth-btn-gloss mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700 shadow-[0_12px_24px_rgba(190,52,85,0.12)] transition duration-200 hover:-translate-y-0.5 hover:bg-rose-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="auth-btn-gloss__content">Yêu cầu thôi ở</span>
            </button>
          ) : null}

          {occupancy.status === "LEAVE_REQUESTED" ? (
            <button
              type="button"
              disabled
              className="mt-4 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-700 opacity-80"
            >
              <Clock3 className="h-4 w-4" />
              Đã gửi yêu cầu
            </button>
          ) : null}
        </motion.div>
      ) : null}

      {isLeaveModalOpen
        ? createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-[72] flex items-center justify-center bg-[rgba(14,25,48,0.50)] px-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
                className="w-full max-w-[640px] rounded-[28px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-6 shadow-[0_24px_62px_rgba(27,56,122,0.26)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="mt-2 text-2xl font-bold text-[#173a78]">Gửi yêu cầu thôi ở</h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeLeaveModal}
                    className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Lý do: </span>
                    <textarea
                      value={leaveReason}
                      onChange={(event) => {
                        setLeaveReason(event.target.value);
                        setLeaveErrors((current) => ({ ...current, reason: undefined }));
                      }}
                      rows={4}
                      className="mt-2 w-full resize-none rounded-2xl border border-[#d3e0f2] bg-white/80 px-4 py-3 text-sm font-semibold text-[#1b3766] outline-none transition placeholder:text-[#9aabc9] focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
                      placeholder="Nhập lý do bạn muốn thôi ở..."
                    />
                    {leaveErrors.reason ? <p className="mt-1 text-sm font-semibold text-rose-600">{leaveErrors.reason}</p> : null}
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold tracking-[0.12em] text-[#6f84ad]">Ngày dự kiến rời KTX</span>
                    <input
                      type="date"
                      value={expectedLeaveDate}
                      onChange={(event) => {
                        setExpectedLeaveDate(event.target.value);
                        setLeaveErrors((current) => ({ ...current, expectedLeaveDate: undefined }));
                      }}
                      className="mt-2 h-12 w-full rounded-2xl border border-[#d3e0f2] bg-white/80 px-4 text-sm font-semibold text-[#1b3766] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
                    />
                    {leaveErrors.expectedLeaveDate ? <p className="mt-1 text-sm font-semibold text-rose-600">{leaveErrors.expectedLeaveDate}</p> : null}
                  </label>

                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeLeaveModal}
                    className="rounded-2xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-5 py-2.5 text-sm font-semibold text-[#24407f] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitLeaveRequest}
                    className="auth-btn-gloss rounded-2xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
                  >
                    <span className="auth-btn-gloss__content">Gửi yêu cầu</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>,
            document.body,
          )
        : null}
    </motion.section>
  );
}
