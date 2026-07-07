import { motion } from "framer-motion";
import {
  AlertTriangle,
  BedSingle,
  CheckCircle2,
  Info,
  Clock3,
  DoorOpen,
  LogOut,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { type MyRoom, type MyRoomBed, type MyRoomStatus } from "../../../mocks/myRoom";
import { useAuthStore } from "../../auth/store";
import {
  cancelCheckoutForRegistration,
  getMyRegistration,
  getRooms,
  requestCheckoutForRegistration,
} from "../../../api/registrationService";
import { getStudentPayments } from "../../../api/paymentApi";
import type { RegistrationRequest } from "../../admin/data/registrationRequests";
import type { DormRoom } from "../../../types/dormRoom";
import { getMyOccupancyFromBackend } from "../services/occupancyService";
import ProgressStep from "../../registration/components/ProgressStep";
import {
  fetchMyRoomChangeHistory,
  type OccupancyRoomChangeHistory,
} from "../../../api/roomChangeHistoryApi";

import { formatDate, formatDateTime } from "../../../utils/dateFormat";

const getBedLevelLong = (bedNumber: number) => (bedNumber % 2 === 1 ? "Tầng trên" : "Tầng dưới");

const getTodayValue = () => new Date().toISOString().slice(0, 10);

const registrationChannelLabel: Record<"main" | "rolling", string> = {
  main: "Đợt chính",
  rolling: "Quanh năm",
};

function formatRegistrationPeriodLabel(period: {
  name: string;
  school_year: string | null;
  semester: number | string | null;
  channel: "main" | "rolling" | null;
}): string {
  const parts: string[] = [];
  if (period.channel && registrationChannelLabel[period.channel]) {
    parts.push(registrationChannelLabel[period.channel]);
  }
  parts.push(period.name);
  if (period.semester) parts.push(`Học kỳ ${period.semester}`);
  if (period.school_year) parts.push(`năm học ${period.school_year}`);
  return parts.join(" - ");
}

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
  PENDING_PAYMENT: {
    label: "Chờ thanh toán",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
    Icon: Clock3,
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

const hideSystemReason = (reason?: string | null) => {
  const normalized = String(reason ?? "").trim();
  return normalized && normalized !== "FORCE_EVICTED" ? normalized : "";
};

const getForcedLeaveReason = (registration: RegistrationRequest, occupancy: MyRoom) =>
  hideSystemReason(registration.blacklist?.reason) ||
  hideSystemReason(occupancy.forcedLeave?.reason) ||
  "Nợ quá hạn kéo dài";

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6d7fa6]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#1b3766]">{value || "-"}</p>
    </div>
  );
}

function ForcedEvictionHistory({
  occupancy,
  registration,
  studentCode,
  studentName,
}: {
  occupancy: MyRoom;
  registration: RegistrationRequest;
  studentCode?: string;
  studentName?: string;
}) {
  const reason = getForcedLeaveReason(registration, occupancy);
  const decisionDate = registration.blacklist?.created_at || occupancy.forcedLeave?.decidedAt || occupancy.leftDate;
  const statusBadge = "Buộc thôi ở";
  const blacklistCreatedAt = registration.blacklist?.created_at || decisionDate;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-5 rounded-[24px] bg-[#eef3f8] p-4 sm:p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: "easeOut" }}
        className="rounded-[24px] border border-[#c9d7ea] bg-white px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)] sm:px-6"
      >
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-sm font-semibold text-[#5C7094]">Phòng của tôi</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#1A2D52] sm:text-[30px]">Lưu trú gần nhất</h1>
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-[#5f739b] sm:text-base">
            <DoorOpen className="h-4 w-4 text-[#6d86b2]" />
            <span>Phòng {occupancy.roomCode}</span>
            <span className="text-[#9aacca]">•</span>
            <span>Tòa {occupancy.buildingCode}</span>
            <span className="text-[#9aacca]">•</span>
            <span>Tầng {occupancy.floorNumber}</span>
            <span className="text-[#9aacca]">•</span>
            <span className="inline-flex items-center gap-1">
              <BedSingle className="h-4 w-4 text-[#6d86b2]" />
              Giường {occupancy.bedNumber}
            </span>
          </p>
        </div>
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.04, ease: "easeOut" }}
          className="rounded-[22px] border border-[#d8e3f1] bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.07)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#1a2d52]">Trạng thái lưu trú</h2>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
              {statusBadge}
            </span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoRow label="MSSV" value={studentCode} />
            <InfoRow label="Họ tên" value={studentName} />
            <InfoRow label="Ngày bắt đầu lưu trú" value={formatDate(occupancy.startDate)} />
            <InfoRow label="Ngày kết thúc lưu trú" value={formatDate(occupancy.leftDate || occupancy.endDate)} />
            <InfoRow label="Trạng thái" value="Đã bị buộc thôi ở" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.08, ease: "easeOut" }}
          className="rounded-[22px] border border-amber-200 bg-amber-50 p-5 text-[#5d4212] shadow-[0_14px_30px_rgba(120,78,0,0.08)]"
        >
          <h2 className="text-lg font-bold text-amber-900">Quyết định buộc thôi ở</h2>
          <p className="mt-3 text-sm font-medium leading-6">
            Sinh viên đã bị buộc thôi ở và không còn quyền lưu trú tại ký túc xá.
          </p>
          <div className="mt-4 space-y-3">
            <InfoRow label="Lý do" value={reason} />
            <InfoRow label="Ngày quyết định" value={decisionDate ? formatDate(decisionDate) : "-"} />
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, delay: 0.12, ease: "easeOut" }}
        className="rounded-[22px] border border-[#d8e3f1] bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.07)]"
      >
        <h2 className="text-lg font-bold text-[#1a2d52]">Trạng thái đăng ký nội trú</h2>
        <p className="mt-3 text-sm font-medium leading-6 text-[#526985]">
          Bạn hiện đang thuộc danh sách không được đăng ký nội trú tại ký túc xá.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <InfoRow label="Trạng thái" value="Không được đăng ký nội trú" />
          <InfoRow label="Lý do" value={reason} />
          <InfoRow label="Ngày thêm vào danh sách" value={blacklistCreatedAt ? formatDate(blacklistCreatedAt) : "-"} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, delay: 0.16, ease: "easeOut" }}
        className="rounded-[22px] border border-sky-200 bg-sky-50 p-5 text-[#1f4967] shadow-[0_14px_30px_rgba(14,116,144,0.08)]"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-700">
            <Info className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-sky-950">Bạn vẫn có thể sử dụng hệ thống</h2>
            <ul className="mt-3 space-y-2 text-sm font-medium leading-6">
              <li>Bạn vẫn có thể đăng nhập tài khoản.</li>
              <li>Bạn vẫn có thể xem các hóa đơn còn nợ.</li>
              <li>Bạn vẫn có thể thanh toán các khoản công nợ còn tồn đọng.</li>
              <li>Sau khi hoàn thành nghĩa vụ tài chính, việc xem xét đăng ký lại nếu được phép theo quy định của KTX sẽ do Ban quản lý quyết định.</li>
            </ul>
            <Link
              to="/student/payment"
              className="auth-btn-gloss mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_56%,#31b7d4_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,76,184,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] sm:w-auto"
            >
              <span className="auth-btn-gloss__content">Đi đến trang thanh toán</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}

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
  const [registration, setRegistration] = useState<RegistrationRequest | null>(null);
  const [assignedRoom, setAssignedRoom] = useState<DormRoom | null>(null);
  const [occupancy, setOccupancy] = useState<MyRoom | null>(null);
  const [isLoadingOccupancy, setIsLoadingOccupancy] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [expectedLeaveDate, setExpectedLeaveDate] = useState("");
  const [leaveErrors, setLeaveErrors] = useState<{ reason?: string; expectedLeaveDate?: string }>({});
  const [pendingDebtAmount, setPendingDebtAmount] = useState<number | null>(null);
  const [isCancellingLeaveRequest, setIsCancellingLeaveRequest] = useState(false);
  const [cancelLeaveError, setCancelLeaveError] = useState("");
  const [roomChangeHistory, setRoomChangeHistory] = useState<OccupancyRoomChangeHistory[]>([]);
  const [isLoadingRoomChangeHistory, setIsLoadingRoomChangeHistory] = useState(true);
  const [roomChangeHistoryError, setRoomChangeHistoryError] = useState("");
  const [expandedOccupancyIds, setExpandedOccupancyIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let isActive = true;

    const loadRoomChangeHistory = async () => {
      setIsLoadingRoomChangeHistory(true);
      setRoomChangeHistoryError("");

      try {
        const history = await fetchMyRoomChangeHistory();
        if (isActive) {
          setRoomChangeHistory(history);
          setExpandedOccupancyIds(new Set(history.length > 0 ? [history[0].group_id] : []));
        }
      } catch (error) {
        if (isActive) {
          setRoomChangeHistory([]);
          setRoomChangeHistoryError(
            error instanceof Error ? error.message : "Không thể tải lịch sử chuyển phòng/giường."
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingRoomChangeHistory(false);
        }
      }
    };

    void loadRoomChangeHistory();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadOccupancy = async () => {
      setIsLoadingOccupancy(true);
      setLoadError("");

      try {
        const [reg, nextOccupancy] = await Promise.all([
          getMyRegistration(studentEmail) as Promise<RegistrationRequest | null>,
          getMyOccupancyFromBackend(studentEmail),
        ]);

        if (isActive) {
          setRegistration(reg);
          setOccupancy(nextOccupancy);

          if (reg?.assigned_room_id && !nextOccupancy) {
            const rooms = await getRooms();
            const room = rooms.find((r) => r.id === reg.assigned_room_id) ?? null;
            if (isActive) setAssignedRoom(room as DormRoom | null);
          } else {
            setAssignedRoom(null);
          }
        }
      } catch (error) {
        if (isActive) {
          setRegistration(null);
          setOccupancy(null);
          setAssignedRoom(null);
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

  // Chỉ che toàn trang bằng màn hình loading ở lần tải đầu tiên (chưa có dữ liệu cũ).
  // Các lần refetch ngầm sau đó (do event ktx-registrations-updated/ktx-rooms-updated,
  // hoặc focus lại tab) giữ nguyên giao diện cũ, tránh chớp toàn trang.
  if (isLoadingOccupancy && !occupancy) {
    return <AccessNotice message="Đang tải thông tin phòng..." />;
  }

  if (!registration || registration.status !== "approved") {
    return <AccessNotice message={loadError || "Bạn chưa đăng ký nội trú, xin mời hoàn thành đầy đủ"} />;
  }

  if (registration.occupancy_status === "PROPOSED") {
    return (
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative isolate flex min-h-[calc(100vh-5rem-28px)] flex-col space-y-6 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[24px]">
          <div className="absolute -left-24 -top-24 h-56 w-56 rounded-full bg-[#244CB8]/14 blur-3xl" />
          <div className="absolute -bottom-28 right-0 h-60 w-60 rounded-full bg-[#4F7FF1]/14 blur-3xl" />
        </div>
        <motion.div
          transition={{ duration: 0.2 }}
          className="auth-reveal is-visible rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-sm sm:px-8"
        >
          <h1 className="text-[30px] font-bold tracking-tight text-[#1A2D52]">Phòng của tôi</h1>
          <p className="mt-1.5 text-sm text-[#5C7094]">Theo dõi tiến trình phân phòng và chọn giường nội trú.</p>
        </motion.div>
        <div className="auth-reveal is-visible mx-auto w-full max-w-2xl rounded-2xl border border-amber-200 bg-amber-50/95 p-5 text-center shadow-[0_12px_24px_rgba(180,120,0,0.12)] backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 text-amber-700">
            <Clock3 className="h-5 w-5" />
            <p className="font-semibold text-amber-900">Đơn của bạn đang được xử lý</p>
          </div>
          <p className="mt-1.5 text-sm text-amber-800/90">
            Vui lòng chờ thông báo xác nhận phòng từ quản lý.
          </p>
        </div>
      </motion.section>
    );
  }

  if (registration.occupancy_status === "PENDING_PAYMENT") {
    const roomDisplay = occupancy?.roomCode ?? String(registration.assigned_room_id ?? "");
    const bedDisplay = occupancy?.bedNumber ?? null;
    return (
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative isolate flex min-h-[calc(100vh-5rem-28px)] flex-col space-y-6 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[24px]">
          <div className="absolute -left-24 -top-24 h-56 w-56 rounded-full bg-[#f59e0b]/10 blur-3xl" />
          <div className="absolute -bottom-28 right-0 h-60 w-60 rounded-full bg-[#f59e0b]/10 blur-3xl" />
        </div>
        <motion.div
          transition={{ duration: 0.2 }}
          className="auth-reveal is-visible rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-sm sm:px-8"
        >
          <h1 className="text-[30px] font-bold tracking-tight text-[#1A2D52]">Phòng của tôi</h1>
          <p className="mt-1.5 text-sm text-[#5C7094]">Vui lòng hoàn tất thanh toán để kích hoạt lưu trú.</p>
        </motion.div>
        <div className="auth-reveal is-visible mx-auto w-full max-w-2xl rounded-2xl border border-amber-200 bg-amber-50/95 p-6 shadow-[0_12px_24px_rgba(180,120,0,0.12)] backdrop-blur-sm">
          <div className="flex items-center gap-2 text-amber-700">
            <Clock3 className="h-5 w-5 shrink-0" />
            <p className="font-bold text-amber-900">Chờ thanh toán hóa đơn tháng đầu</p>
          </div>
          <p className="mt-2 text-sm text-amber-800/90">
            Bạn đã chọn{" "}
            {roomDisplay ? (
              <span className="font-semibold">
                phòng {roomDisplay}{bedDisplay != null ? ` giường #${bedDisplay}` : ""}
              </span>
            ) : "giường"}.{" "}
            Vui lòng thanh toán hóa đơn tháng đầu để hoàn tất đăng ký lưu trú.
          </p>
          <div className="mt-4 flex justify-end">
            <Link
              to="/student/payment"
              className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(245,158,11,0.30)] transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Thanh toán ngay
            </Link>
          </div>
        </div>
      </motion.section>
    );
  }

  if (!registration.assigned_room_id) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative isolate flex min-h-[calc(100vh-5rem-28px)] flex-col space-y-6 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[24px]">
          <div className="absolute -left-24 -top-24 h-56 w-56 rounded-full bg-[#244CB8]/14 blur-3xl" />
          <div className="absolute -bottom-28 right-0 h-60 w-60 rounded-full bg-[#4F7FF1]/14 blur-3xl" />
        </div>
        <motion.div
          transition={{ duration: 0.2 }}
          className="auth-reveal is-visible rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-sm sm:px-8"
        >
          <h1 className="text-[30px] font-bold tracking-tight text-[#1A2D52]">Phòng của tôi</h1>
          <p className="mt-1.5 text-sm text-[#5C7094]">Theo dõi tiến trình phân phòng và chọn giường nội trú.</p>
        </motion.div>
        <div className="auth-reveal is-visible mx-auto w-full max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50/95 p-5 text-center shadow-[0_12px_24px_rgba(16,185,129,0.16)] backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-semibold text-emerald-900">Đơn đã được duyệt</p>
          </div>
          <p className="mt-1.5 text-sm text-emerald-800/90">
            Đang chờ quản lý xếp phòng. Kết quả sẽ có trong vòng 1–2 ngày làm việc.
          </p>
        </div>
      </motion.section>
    );
  }

  if (!occupancy) {
    const roomName = assignedRoom
      ? `${assignedRoom.building_code}${assignedRoom.room_number}`
      : "Đang tải...";

    return (
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative isolate flex min-h-[calc(100vh-5rem-28px)] flex-col space-y-6 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[24px]">
          <div className="absolute -left-24 -top-24 h-56 w-56 rounded-full bg-[#244CB8]/14 blur-3xl" />
          <div className="absolute -bottom-28 right-0 h-60 w-60 rounded-full bg-[#4F7FF1]/14 blur-3xl" />
        </div>
        <motion.div
          transition={{ duration: 0.2 }}
          className="auth-reveal is-visible rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-sm sm:px-8"
        >
          <h1 className="text-[30px] font-bold tracking-tight text-[#1A2D52]">Phòng của tôi</h1>
          <p className="mt-1.5 text-sm text-[#5C7094]">Theo dõi tiến trình phân phòng và chọn giường nội trú.</p>
        </motion.div>
        <ProgressStep variant="room" currentStep={2} />
        <div className="auth-reveal is-visible mx-auto w-full max-w-2xl rounded-2xl border border-[#b7ccef] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_68%,#edf5ff_100%)] p-5 text-center shadow-[0_12px_24px_rgba(36,76,184,0.10)] backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 text-[#2f63da]">
            <BedSingle className="h-5 w-5" />
            <p className="font-semibold text-[#1F3152]">
              Bạn được phân vào phòng <span className="text-[#244CB8]">{roomName}</span>
            </p>
          </div>
          <p className="mt-1.5 text-sm text-[#5C7094]">
            Vui lòng chọn giường để hoàn tất đăng ký nội trú.
          </p>
          <Link
            to="/student/bed-selection"
            className="auth-btn-gloss mx-auto mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,76,184,0.24)] transition hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
          >
            <span className="auth-btn-gloss__content">Chọn giường</span>
          </Link>
        </div>
      </motion.section>
    );
  }

  const StatusIcon = statusMeta[occupancy.status].Icon;
  const myBed = getBedByNumber(occupancy.beds, occupancy.bedNumber);
  const isLiving = occupancy.status === "ACTIVE" || occupancy.status === "LEAVE_REQUESTED";
  const isBlacklistedForcedLeave = occupancy.status === "FORCED_LEFT" && Boolean(registration.blacklist);
  const closeLeaveModal = () => {
    setIsLeaveModalOpen(false);
    setLeaveReason("");
    setExpectedLeaveDate("");
    setLeaveErrors({});
  };

  const openLeaveModal = () => {
    setIsLeaveModalOpen(true);
    setPendingDebtAmount(null);
    getStudentPayments()
      .then((data) => {
        const total = data.summary.unpaidAmount + data.summary.overdueAmount;
        setPendingDebtAmount(total);
      })
      .catch(() => setPendingDebtAmount(null));
  };

  const handleCancelLeaveRequest = async () => {
    setIsCancellingLeaveRequest(true);
    setCancelLeaveError("");
    try {
      await cancelCheckoutForRegistration();
      // Không tự fetch lại occupancy ở đây — cancelCheckoutForRegistration() đã bắn
      // event "ktx-registrations-updated", useEffect loadOccupancy sẽ tự cập nhật ở nền
      // (tránh 2 lần loadOccupancy chạy đua nhau gây chớp toàn trang do gate isLoadingOccupancy).
    } catch (error) {
      setCancelLeaveError(error instanceof Error ? error.message : "Không thể hủy yêu cầu thôi ở.");
    } finally {
      setIsCancellingLeaveRequest(false);
    }
  };

  const handleSubmitLeaveRequest = async () => {
    const errors: { reason?: string; expectedLeaveDate?: string } = {};
    const trimmedReason = leaveReason.trim();

    if (!trimmedReason) {
      errors.reason = "Vui lòng nhập lý do thôi ở.";
    }

    if (!expectedLeaveDate) {
      errors.expectedLeaveDate = "Vui lòng chọn ngày dự kiến rời KTX.";
    } else if (expectedLeaveDate < getTodayValue()) {
      errors.expectedLeaveDate = "Ngày dự kiến rời không được ở quá khứ.";
    } else if (registration.check_out_date && expectedLeaveDate >= registration.check_out_date) {
      errors.expectedLeaveDate = `Ngày rời phải trước ngày kết thúc lưu trú dự kiến (${formatDate(registration.check_out_date)}).`;
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
      // Đóng modal ngay — không tự fetch lại occupancy ở đây nữa vì
      // requestCheckoutForRegistration() đã bắn event "ktx-registrations-updated",
      // useEffect lắng nghe event đó (loadOccupancy) sẽ tự cập nhật occupancy ở nền.
      // Gọi fetch lần 2 ở đây từng gây tình trạng modal chớp/hiện lại do 2 lần
      // loadOccupancy chạy đua nhau cùng lúc.
      closeLeaveModal();
    } catch (error) {
      setLeaveErrors({
        reason: error instanceof Error ? error.message : "Không thể gửi yêu cầu thôi ở.",
      });
    }
  };

  if (isBlacklistedForcedLeave) {
    return (
      <ForcedEvictionHistory
        occupancy={occupancy}
        registration={registration}
        studentCode={myBed?.studentCode || registration.formData.mssv}
        studentName={myBed?.occupantName || registration.formData.fullName}
      />
    );
  }

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

      {occupancy.warningNotice && occupancy.status !== "FORCED_LEFT" ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: "easeOut" }}
          className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-700 shadow-[0_14px_30px_rgba(180,116,0,0.10)]"
        >
          <h3 className="text-lg font-bold text-amber-800">Bạn đã bị nhắc nhở.</h3>
          <p className="mt-2">Hoạt động: {occupancy.warningNotice.violationTypeName || "-"}</p>
          <p className="mt-2">
            Mức độ:{" "}
            {occupancy.warningNotice.violationTypeLevel
              ? violationLevelLabel[occupancy.warningNotice.violationTypeLevel]
              : "-"}
          </p>
          <p className="mt-2">Lý do: {occupancy.warningNotice.reason || "-"}</p>
          <p className="mt-2">Ngày xử lý: {occupancy.warningNotice.decidedAt ? formatDate(occupancy.warningNotice.decidedAt) : "-"}</p>
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
          <p className="mt-2">Hoạt động: {occupancy.forcedLeave?.violationTypeName || "-"}</p>
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

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, delay: 0.14, ease: "easeOut" }}
        className="rounded-[26px] border border-[#c4d7f3] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)]"
      >
        <h2 className="text-2xl font-bold text-[#1a2d52]">Lịch sử chuyển phòng/giường</h2>

        {isLoadingRoomChangeHistory ? (
          <p className="mt-4 text-sm text-[#5570a0]">Đang tải lịch sử chuyển phòng/giường...</p>
        ) : roomChangeHistoryError ? (
          <p className="mt-4 text-sm font-semibold text-rose-600">{roomChangeHistoryError}</p>
        ) : roomChangeHistory.length === 0 ? (
          <p className="mt-4 text-sm text-[#5570a0]">Chưa có dữ liệu lịch sử.</p>
        ) : (
          <div className="mt-5 space-y-4">
            {roomChangeHistory.map((entry) => {
              const isExpanded = expandedOccupancyIds.has(entry.group_id);
              const checkOutLabel = entry.is_current
                ? `${formatDate(entry.check_out_date)} (dự kiến)`
                : formatDate(entry.check_out_date);

              return (
                <div
                  key={entry.group_id}
                  className="rounded-[20px] border border-[#d7e4f7] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedOccupancyIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(entry.group_id)) {
                          next.delete(entry.group_id);
                        } else {
                          next.add(entry.group_id);
                        }
                        return next;
                      })
                    }
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#1a2d52]">
                        Phòng {entry.room_code ?? "-"} · {formatDate(entry.check_in_date)} - {checkOutLabel}
                        {entry.extension_count > 0 ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                            Đã gia hạn {entry.extension_count} lần
                          </span>
                        ) : null}
                      </span>
                      {entry.registration_period ? (
                        <span className="text-xs font-semibold text-[#5570a0]">
                          Đợt đăng ký: {formatRegistrationPeriodLabel(entry.registration_period)}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-[#5570a0]">
                      {isExpanded ? "Thu gọn" : "Xem chi tiết"}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="mt-4 space-y-3 border-l-2 border-[#c4d7f3] pl-4">
                      {entry.changes.map((change) => (
                        <div key={change.id} className="relative pb-1">
                          <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-[#244cb8] shadow" />
                          <p className="text-xs font-semibold text-[#5570a0]">
                            {formatDateTime(change.transferred_at)}
                          </p>
                          <p className="mt-0.5 text-sm font-bold text-[#1a2d52]">{change.label}</p>
                          <p className="mt-0.5 text-sm text-[#5570a0]">
                            Phòng {change.old_room_code ?? "-"}
                            {change.old_bed_number ? ` (Giường ${change.old_bed_number})` : ""} → Phòng{" "}
                            {change.new_room_code ?? "-"}
                            {change.new_bed_number ? ` (Giường ${change.new_bed_number})` : ""}
                          </p>
                          {change.pending_return ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                              Đang tạm thời, chờ trả về
                            </span>
                          ) : null}
                        </div>
                      ))}

                      <div className="relative pb-1">
                        <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow" />
                        <p className="text-xs font-semibold text-[#5570a0]">
                          {formatDateTime(entry.start.transferred_at)}
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-[#1a2d52]">
                          Bắt đầu ở - Phòng {entry.start.room_code ?? "-"}
                          {entry.start.bed_number ? ` - Giường ${entry.start.bed_number}` : ""}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

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
              onClick={openLeaveModal}
              className="auth-btn-gloss mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700 shadow-[0_12px_24px_rgba(190,52,85,0.12)] transition duration-200 hover:-translate-y-0.5 hover:bg-rose-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="auth-btn-gloss__content">Yêu cầu thôi ở</span>
            </button>
          ) : null}

          {occupancy.status === "LEAVE_REQUESTED" ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-700">
                <Clock3 className="h-4 w-4" />
                Đã gửi yêu cầu thôi ở — đang chờ duyệt
              </div>
              <div className="mt-3 space-y-1.5 text-sm text-amber-800">
                <p>
                  Ngày dự kiến rời:{" "}
                  <span className="font-semibold">
                    {occupancy.leaveRequest?.expectedLeaveDate ? formatDate(occupancy.leaveRequest.expectedLeaveDate) : "-"}
                  </span>
                </p>
                <p>
                  Lý do: <span className="font-semibold">{occupancy.leaveRequest?.reason || "-"}</span>
                </p>
                {occupancy.leaveRequest?.requestedAt ? (
                  <p>
                    Ngày gửi: <span className="font-semibold">{formatDateTime(occupancy.leaveRequest.requestedAt)}</span>
                  </p>
                ) : null}
              </div>
              {cancelLeaveError ? <p className="mt-2 text-sm font-semibold text-rose-600">{cancelLeaveError}</p> : null}
              <button
                type="button"
                onClick={handleCancelLeaveRequest}
                disabled={isCancellingLeaveRequest}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCancellingLeaveRequest ? "Đang hủy..." : "Hủy yêu cầu"}
              </button>
            </div>
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
                      min={getTodayValue()}
                      max={registration.check_out_date || undefined}
                      onChange={(event) => {
                        setExpectedLeaveDate(event.target.value);
                        setLeaveErrors((current) => ({ ...current, expectedLeaveDate: undefined }));
                      }}
                      className="mt-2 h-12 w-full rounded-2xl border border-[#d3e0f2] bg-white/80 px-4 text-sm font-semibold text-[#1b3766] outline-none transition focus:border-[#244cb8] focus:bg-white focus:ring-4 focus:ring-[#244cb8]/12"
                    />
                    {leaveErrors.expectedLeaveDate ? <p className="mt-1 text-sm font-semibold text-rose-600">{leaveErrors.expectedLeaveDate}</p> : null}
                  </label>

                  {pendingDebtAmount !== null && pendingDebtAmount > 0 ? (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 text-sm text-orange-800">
                      <p>
                        Bạn hiện còn{" "}
                        <span className="font-semibold">{pendingDebtAmount.toLocaleString("vi-VN")}đ</span>{" "}
                        chưa thanh toán. Khoản nợ này KHÔNG được xóa khi thôi ở — bạn vẫn cần thanh toán sau khi rời KTX.
                      </p>
                      <Link to="/student/payment" className="mt-1.5 inline-block text-sm font-semibold text-[#244cb8] underline">
                        Xem chi tiết hóa đơn
                      </Link>
                    </div>
                  ) : null}
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
