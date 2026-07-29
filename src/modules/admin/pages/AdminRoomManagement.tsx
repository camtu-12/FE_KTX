import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BedSingle,
  DoorOpen,
  Eye,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Users,
  User,
  X,
  ArrowUp,
} from "lucide-react";
import { useLocation, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import { listRooms, createRoom, updateRoom, deleteRoom, updateBedStatus, transferBedOccupancy, getRoomBeds, type BedPayload, type RoomPayload, type BedDetail, type BedStudent } from "../../../api/roomApi";
import { getBuilding, listBuildings } from "../../../api/buildingApi";
import {
  completeBedMaintenance,
  completeRoomMaintenance,
  completeRoomMaintenanceStudent,
  getRoomMaintenancePlan,
  startBedMaintenance,
  startRoomMaintenance,
} from "../../../api/maintenanceApi";
import type { Building } from "../../../types/building";
import BunkBedCard, { type BunkBedGroup } from "../components/BunkBedCard";
import BedStudentDetailModal from "../components/BedStudentDetailModal";
import OccupancyDetailModal, { type OccupancyDetailModalStatus } from "../components/OccupancyDetailModal";
import MaintenanceWizardModal, { type MaintenanceWizardState } from "../components/MaintenanceWizardModal";
import { formatDate as formatPreviewDate, getLocalDateValue } from "../../../utils/dateFormat";

type RoomStatus = "AVAILABLE" | "FULL" | "MAINTENANCE";
type BedStatus = "ACTIVE" | "MAINTENANCE";
type BedPosition = "UPPER" | "LOWER";
type RoomGender = "MALE" | "FEMALE";
type BedActionMode = "detail" | "status" | "transfer";

type ScheduledMaintenance = {
  id: number;
  reason: string | null;
  started_at: string | null;
  expected_end_at: string | null;
};

type Room = {
  id: number;
  building_code: string;
  room_number: string;
  floor_id?: number;
  floor?: { id: number; building_code?: string; floor_number: number; gender?: RoomGender };
  floor_number?: number;
  capacity: number;
  status: RoomStatus;
  beds: Bed[];
  scheduled_maintenance?: ScheduledMaintenance | null;
};

type Bed = {
  id: number;
  bed_number: string;
  position: BedPosition;
  status: BedStatus;
  occupied?: boolean;
};

type RoomWithBeds = Room & {
  beds: Bed[];
};

type RoomFormState = {
  building_code: string;
  room_number: string;
  floor_number: number;
  capacity: string;
  status: RoomStatus;
  maintenance_reason: string;
  maintenance_start_date: string;
  maintenance_expected_end_date: string;
};

const statusMeta: Record<RoomStatus, { label: string; className: string }> = {
  AVAILABLE: {
    label: "Còn trống",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  FULL: {
    label: "Đầy",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  MAINTENANCE: {
    label: "Bảo trì",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

const genderLabel: Record<RoomGender, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
};

const initialFormState: RoomFormState = {
  building_code: "A",
  room_number: "",
  floor_number: 1,
  capacity: "",
  status: "AVAILABLE",
  maintenance_reason: "",
  maintenance_start_date: "",
  maintenance_expected_end_date: "",
};

function isBedEffectivelyOccupied(bed: Pick<Bed, "id" | "occupied">) {
  return Boolean(bed.occupied);
}

function getRoomOccupiedBeds(room: Room) {
  if (room.status === "MAINTENANCE") {
    return 0;
  }
  return room.beds.filter(isBedEffectivelyOccupied).length;
}

function getEmptyBeds(room: Room) {
  if (room.status === "MAINTENANCE") {
    return 0;
  }
  return Math.max(room.capacity - getRoomOccupiedBeds(room) - getRoomMaintenanceBeds(room), 0);
}

function formatShortDate(value: string | null | undefined): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function getRoomMaintenanceBeds(room: Room) {
  if (room.status === "MAINTENANCE") {
    return room.capacity;
  }
  return room.beds.filter((bed) => bed.status === "MAINTENANCE").length;
}

function getRoomDisplayStatus(room: Room): RoomStatus {
  if (room.status === "MAINTENANCE") {
    return "MAINTENANCE";
  }

  const activeBeds = room.capacity - getRoomMaintenanceBeds(room);
  if (activeBeds === 0) {
    return "MAINTENANCE";
  }

  const availableBeds = getEmptyBeds(room);

  if (availableBeds === 0) {
    return "FULL";
  }

  return "AVAILABLE";
}

function getRoomCode(room: Pick<Room, "building_code" | "room_number">) {
  return `${room.building_code}${room.room_number}`;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === "string") {
      return response.data.message;
    }
  }

  return fallback;
}

function getBedPositionLabel(position?: BedPosition | BedDetail["position"] | null) {
  return position === "LOWER" || position === "bottom" ? "Tầng dưới" : "Tầng trên";
}

function getBedStatusLabel(status?: BedStatus | BedDetail["status"] | BedDetail["display_status"] | null) {
  if (status === "MAINTENANCE" || status === "maintenance") return "Bảo trì";
  if (status === "reserved") return "Chờ thanh toán";
  if (status === "occupied") return "Có người";
  if (status === "empty") return "Trống";
  return "Hoạt động";
}

function getHistoryStatusLabel(status?: string | null) {
  if (status === "ACTIVE") return "Đang hiệu lực";
  if (status === "RETURNED") return "Đã quay về";
  return status || "—";
}

function getFloorGenderByLocation(buildings: Building[], buildingCode: string, floorNumber: number): RoomGender | null {
  const building = buildings.find((item) => item.building_code === buildingCode);
  const floor = building?.floors.find((item) => item.floorNumber === floorNumber);
  return (floor?.gender as RoomGender | undefined) ?? null;
}

function getFloorNumbersByBuilding(buildings: Building[], buildingCode: string) {
  const building = buildings.find((item) => item.building_code === buildingCode);
  return (building?.floors ?? [])
    .map((floor) => floor.floorNumber)
    .filter((floorNumber) => floorNumber > 0)
    .sort((a, b) => a - b);
}

function getRoomFloor(room: Room) {
  // Prefer explicit floor data when available
  if (room.floor && typeof room.floor.floor_number === "number") return room.floor.floor_number;
  // some datasets may include a floor_number field directly
  if (typeof room.floor_number === "number") return room.floor_number;
  return 0;
}

function getRoomGender(room: Room, buildings: Building[]): RoomGender | null {
  return (room.floor?.gender as RoomGender | undefined) ?? getFloorGenderByLocation(buildings, room.building_code, getRoomFloor(room));
}

function getNextRoomNumber(buildingCode: string, floorNumber: number, existingRooms: RoomWithBeds[]): string {
  const baseNumber = floorNumber * 100;
  const roomsOnFloor = existingRooms.filter((room) => room.building_code === buildingCode && getRoomFloor(room) === floorNumber);
  
  if (roomsOnFloor.length === 0) {
    return String(baseNumber + 1);
  }
  
  const maxRoomNumber = Math.max(...roomsOnFloor.map((room) => {
    const roomNum = Number(room.room_number);
    return Number.isFinite(roomNum) ? roomNum : baseNumber;
  }));
  
  return String(maxRoomNumber + 1);
}

// Room records are loaded from BE; localStorage-backed read removed.

function getBedSortValue(bed: BedDetail) {
  const value = Number(bed.bed_number);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function createBunkBedGroups(beds: BedDetail[]): BunkBedGroup[] {
  const sortedBeds = [...beds].sort((left, right) => {
    const sortDiff = getBedSortValue(left) - getBedSortValue(right);
    if (sortDiff !== 0) return sortDiff;
    return left.id - right.id;
  });

  const groups: BunkBedGroup[] = [];

  for (let index = 0; index < sortedBeds.length; index += 2) {
    const pairBeds = sortedBeds.slice(index, index + 2);
    const top = pairBeds.find((bed) => bed.position === "top") ?? pairBeds[0];
    const bottom = pairBeds.find((bed) => bed.position === "bottom") ?? pairBeds.find((bed) => bed.id !== top?.id);

    groups.push({
      pairNumber: groups.length + 1,
      top,
      bottom,
    });
  }

  return groups;
}

function InputField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  if (props.type === "date") {
    return <DateField {...props} />;
  }

  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10 ${props.className ?? ""}`}
    />
  );
}

/**
 * <input type="date"> hiện chữ theo ngôn ngữ hiển thị của trình duyệt (không theo lang
 * của trang/element) — trên Chrome mặc định tiếng Anh sẽ luôn ra mm/dd/yyyy dù trang
 * là tiếng Việt. Đè một lớp text tự định dạng dd/mm/yyyy lên trên (ẩn chữ gốc bằng
 * color:transparent, lớp đè có pointer-events-none nên không chặn click/gõ vào input
 * gốc bên dưới) để luôn hiển thị đúng dd/mm/yyyy bất kể ngôn ngữ trình duyệt.
 */
function DateField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const raw = typeof props.value === "string" ? props.value : "";
  const display = formatShortDate(raw);

  return (
    <div className="relative">
      <input
        {...props}
        type="date"
        className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-transparent shadow-sm outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10 ${props.className ?? ""}`}
      />
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm">
        {display ? <span className="text-slate-700">{display}</span> : <span className="text-slate-400">dd/mm/yyyy</span>}
      </span>
    </div>
  );
}

function SelectField(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10 ${props.className ?? ""}`}
    />
  );
}

/**
 * occupancy.status trả thô từ backend luôn là 'ACTIVE' cho sinh viên đang ở thật —
 * 'CHECKOUT_REQUESTED' chỉ suy ra được qua checkout_request đang pending, không nằm
 * trực tiếp trong cột status. Quy đổi tương ứng để khớp OccupancyDetailModalStatus.
 */
function resolveOccupancyDetailStatus(occupancy: BedStudent["occupancy"]): OccupancyDetailModalStatus {
  if (!occupancy) return "ACTIVE";
  if (occupancy.checkout_request) return "CHECKOUT_REQUESTED";
  const raw = String(occupancy.status ?? "").toUpperCase();
  if (raw === "COMPLETED" || raw === "CHECKED_OUT") return "CHECKED_OUT";
  if (raw === "TERMINATED" || raw === "FORCED_CHECKOUT") return "FORCED_CHECKOUT";
  return "ACTIVE";
}

export default function AdminRoomManagement() {
  const { headerSearchValue, setHeaderSearchValue } = useOutletContext<AdminLayoutOutletContext>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryBuilding = searchParams.get("building") ?? "all";
  const queryFloor = searchParams.get("floor") ?? "all";
  const rawQueryGender = searchParams.get("gender");
  const queryGender: "all" | RoomGender =
    rawQueryGender === "MALE" || rawQueryGender === "FEMALE" ? rawQueryGender : "all";
  const rawQueryStatus = searchParams.get("status");
  const queryStatus: "all" | RoomStatus =
    rawQueryStatus === "AVAILABLE" || rawQueryStatus === "FULL" || rawQueryStatus === "MAINTENANCE"
      ? rawQueryStatus
      : "all";
  const [rooms, setRooms] = useState<RoomWithBeds[]>([]);
  const [hasLoadedRooms, setHasLoadedRooms] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [hasLoadedBuildings, setHasLoadedBuildings] = useState(false);

  // Load rooms from BE on mount
  useEffect(() => {
    let mounted = true;

    const loadRooms = async () => {
      try {
        const data = await listRooms();
        if (!mounted) return;
        // normalize shape to existing RoomWithBeds type (loose cast)
        setRooms(data as unknown as RoomWithBeds[]);
      } catch {
        // keep empty fallback
      } finally {
        if (mounted) {
          setHasLoadedRooms(true);
        }
      }
    };

    void loadRooms();

    if (typeof window !== "undefined") {
      window.addEventListener("ktx-rooms-updated", loadRooms);
      window.addEventListener("ktx-registrations-updated", loadRooms);
      window.addEventListener("focus", loadRooms);
    }

    return () => {
      mounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("ktx-rooms-updated", loadRooms);
        window.removeEventListener("ktx-registrations-updated", loadRooms);
        window.removeEventListener("focus", loadRooms);
      }
    };
  }, []);

  // Rooms are kept in sync with backend; localStorage sync removed.

  useEffect(() => {
    const routeState = location.state as { presetRoomCode?: string } | null;
    const presetRoomCode = routeState?.presetRoomCode;

    if (!presetRoomCode) {
      return;
    }

    setHeaderSearchValue(presetRoomCode);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, setHeaderSearchValue]);

  useEffect(() => {
    let mounted = true;

    const loadBuildings = async () => {
      try {
        const data = await listBuildings();
        if (mounted) {
          setBuildings(data);
        }
      } catch {
        if (mounted) {
          setBuildings([]);
        }
      } finally {
        if (mounted) {
          setHasLoadedBuildings(true);
        }
      }
    };

    void loadBuildings();

    if (typeof window !== "undefined") {
      window.addEventListener("ktx-buildings-updated", loadBuildings);
    }

    return () => {
      mounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("ktx-buildings-updated", loadBuildings);
      }
    };
  }, []);

  const filterGender = queryGender;
  const filterStatus = queryStatus;

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormState>(initialFormState);
  const [roomFormError, setRoomFormError] = useState("");
  const [roomValidationErrors, setRoomValidationErrors] = useState<{ room_number?: string; building_code?: string }>({});
  const [roomSubmitAttempted, setRoomSubmitAttempted] = useState(false);

  const [isBedsModalOpen, setIsBedsModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomWithBeds | null>(null);
  const [bedDetails, setBedDetails] = useState<BedDetail[]>([]);
  const [isBedDetailsLoading, setIsBedDetailsLoading] = useState(false);
  const [bedDetailsError, setBedDetailsError] = useState("");
  const [detailStudent, setDetailStudent] = useState<{ student: BedStudent; bedNumber: string } | null>(null);
  const [viewingOccupancyId, setViewingOccupancyId] = useState<number | null>(null);
  const bunkBedGroups = useMemo(() => createBunkBedGroups(bedDetails), [bedDetails]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const [editingBed, setEditingBed] = useState<{
    roomId: number | null;
    bed: Bed | null;
  } | null>(null);
  const [bedActionMode, setBedActionMode] = useState<BedActionMode | null>(null);
  const [bedDetailTab, setBedDetailTab] = useState<"current" | "transfer" | "maintenance">("current");
  const [editingBedStatus, setEditingBedStatus] = useState<BedStatus>("ACTIVE");
  const [editingBedError, setEditingBedError] = useState("");
  const [transferTargetBedId, setTransferTargetBedId] = useState("");
  const [transferSourceStatus, setTransferSourceStatus] = useState<BedPayload["status"]>("active");
  const [transferChangeType, setTransferChangeType] = useState<"PERMANENT" | "TEMPORARY_MAINTENANCE">("PERMANENT");
  const [transferExpectedReturnDate, setTransferExpectedReturnDate] = useState("");
  const [transferMaintenanceReason, setTransferMaintenanceReason] = useState("");
  const [transferBedError, setTransferBedError] = useState("");
  const [isTransferringBed, setIsTransferringBed] = useState(false);
  const [maintenanceWizard, setMaintenanceWizard] = useState<MaintenanceWizardState | null>(null);
  const [maintenanceWizardError, setMaintenanceWizardError] = useState("");
  const [isMaintenanceSubmitting, setIsMaintenanceSubmitting] = useState(false);
  const [roomReturnModal, setRoomReturnModal] = useState<{ room: RoomWithBeds; beds: BedDetail[] } | null>(null);
  const [roomReturnError, setRoomReturnError] = useState("");
  const [isRoomReturnSubmitting, setIsRoomReturnSubmitting] = useState(false);
  const editingBedDetail = useMemo(() => {
    if (!editingBed?.bed) return null;
    return bedDetails.find((bed) => bed.id === editingBed.bed?.id) ?? null;
  }, [bedDetails, editingBed]);
  const transferTargetBeds = useMemo(() => {
    if (!editingBed?.bed) return [];
    return bedDetails.filter((bed) => bed.id !== editingBed.bed?.id && !bed.student && bed.display_status === "empty");
  }, [bedDetails, editingBed]);
  const selectedTransferTargetBed = useMemo(
    () => transferTargetBeds.find((bed) => String(bed.id) === transferTargetBedId) ?? null,
    [transferTargetBedId, transferTargetBeds],
  );
  const isTemporaryMaintenanceTransfer = transferChangeType === "TEMPORARY_MAINTENANCE";

  useEffect(() => {
    if (typeof document === "undefined") return;
    const original = document.body.style.overflow;
    const authScrollEl = document.querySelector<HTMLElement>(".auth-scrollbar");
    const originalAuthOverflow = authScrollEl ? authScrollEl.style.overflow : "";
    if (isBedsModalOpen || isRoomModalOpen) {
      document.body.style.overflow = "hidden";
      if (authScrollEl) authScrollEl.style.overflow = "hidden";
    } else {
      document.body.style.overflow = original;
      if (authScrollEl) authScrollEl.style.overflow = originalAuthOverflow;
    }
    return () => {
      document.body.style.overflow = original;
      if (authScrollEl) authScrollEl.style.overflow = originalAuthOverflow;
    };
  }, [isBedsModalOpen, isRoomModalOpen]);

  const [isScrollToTopVisible, setIsScrollToTopVisible] = useState(false);

  // No local persistence for rooms; state mirrors server-side data.

  const filterBuilding = queryBuilding;
  const filterFloor = queryFloor;

  const handleScrollToTop = () => {
    const scrollContainer = document.querySelector(".auth-scrollbar") as HTMLElement | null;
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    const scrollContainer = document.querySelector<HTMLElement>(".auth-scrollbar");
    if (!scrollContainer) return;

    const updateVisibility = () => {
      const threshold = Math.max(180, scrollContainer.clientHeight * 0.6);
      setIsScrollToTopVisible(scrollContainer.scrollTop > threshold);
    };

    updateVisibility();
    scrollContainer.addEventListener("scroll", updateVisibility, { passive: true });

    return () => scrollContainer.removeEventListener("scroll", updateVisibility);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const authScrollEl = document.querySelector<HTMLElement>(".auth-scrollbar");
    if (authScrollEl) {
      authScrollEl.scrollTo({ top: 0 });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, []);

  const buildingOptions = useMemo(() => {
    return buildings.map((building) => building.building_code).filter(Boolean).sort();
  }, [buildings]);

  const floorOptions = useMemo(() => {
    const buildingCode = filterBuilding === "all" ? null : filterBuilding;
    const floors = buildingCode
      ? buildings.find((building) => building.building_code === buildingCode)?.floors.map((floor) => floor.floorNumber) ?? []
      : Array.from(new Set(buildings.flatMap((building) => building.floors.map((floor) => floor.floorNumber))));

    return floors.filter((floorNumber) => Number.isInteger(floorNumber) && floorNumber > 0).sort((a, b) => a - b);
  }, [buildings, filterBuilding]);

  useEffect(() => {
    if (!hasLoadedBuildings) return;
    if (filterBuilding === "all") return;
    if (buildingOptions.includes(filterBuilding)) return;

    const next = new URLSearchParams(searchParams);
    next.delete("building");
    next.delete("floor");
    setSearchParams(next, { replace: true });
  }, [buildingOptions, filterBuilding, hasLoadedBuildings, searchParams, setSearchParams]);

  useEffect(() => {
    if (!hasLoadedBuildings) return;
    if (typeof window === "undefined") return;
    if (filterFloor === "all") return;

    const floorNumber = Number(filterFloor);
    if (!Number.isInteger(floorNumber)) return;
    if (!floorOptions.includes(floorNumber)) {
      const next = new URLSearchParams(searchParams);
      next.delete("floor");
      setSearchParams(next, { replace: true });
    }
  }, [filterFloor, floorOptions, hasLoadedBuildings, searchParams, setSearchParams]);

  const filteredRooms = useMemo(() => {
    const keyword = headerSearchValue.trim().toLowerCase();
    return rooms.filter((room) => {
      const roomCode = getRoomCode(room).toLowerCase();
      const matchedKeyword = keyword
        ? roomCode.includes(keyword) || room.room_number.toLowerCase().includes(keyword)
        : true;
      const roomFloor = getRoomFloor(room);
      const matchedBuilding = filterBuilding === "all" ? true : room.building_code === filterBuilding;
      const matchedFloor = filterFloor === "all" ? true : roomFloor === Number(filterFloor);
      const matchedGender = filterGender === "all" ? true : getRoomGender(room, buildings) === filterGender;
      const matchedStatus = filterStatus === "all" ? true : room.status === filterStatus;
      return matchedKeyword && matchedBuilding && matchedFloor && matchedGender && matchedStatus;
    });
  }, [rooms, buildings, headerSearchValue, filterBuilding, filterFloor, filterGender, filterStatus]);
  // Display rooms oldest-first (id ascending)
  // Keep this separate so filtering logic stays clear
  const displayedRooms = useMemo(() => {
    return [...filteredRooms].sort((a, b) => a.id - b.id);
  }, [filteredRooms]);

  const resetAllFilters = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("building");
      next.delete("floor");
      next.delete("gender");
      next.delete("status");
      return next;
    }, { replace: true });
  };

  const totalRooms = filteredRooms.length;
  const totalBeds = filteredRooms.reduce(
    (sum, room) => sum + room.capacity,
    0,
  );
  const totalOccupiedBeds = filteredRooms.reduce(
    (sum, room) => sum + getRoomOccupiedBeds(room),
    0,
  );
  const totalEmptyBeds = filteredRooms.reduce(
    (sum, room) => sum + getEmptyBeds(room),
    0,
  );

  const editingRoom = useMemo(() => {
    if (!editingRoomId) return null;
    return rooms.find((room) => room.id === editingRoomId) ?? null;
  }, [rooms, editingRoomId]);

  const editingRoomOccupiedBeds = editingRoom ? getRoomOccupiedBeds(editingRoom) : 0;
  const editingRoomMaintenanceBeds = editingRoom ? getRoomMaintenanceBeds(editingRoom) : 0;

  const formOccupiedBeds = editingRoomId ? editingRoomOccupiedBeds : 0;
  const formCapacity = Number(roomForm.capacity);
  const formEmptyBeds = Number.isFinite(formCapacity) && formCapacity > 0 ? Math.max(formCapacity - formOccupiedBeds - editingRoomMaintenanceBeds, 0) : 0;
  const isCapacityInvalid = !Number.isFinite(formCapacity) || formCapacity < 1 || !Number.isInteger(formCapacity);
  const isCapacityOdd = Number.isFinite(formCapacity) && Number.isInteger(formCapacity) && formCapacity % 2 !== 0;
  const isCapacityTooSmall = Boolean(editingRoomId && editingRoom && formCapacity > 0 && formCapacity < editingRoomOccupiedBeds);

  const isMaintenancePlanningRequired = Boolean(
    editingRoomId
      && editingRoom
      && editingRoom.status !== "MAINTENANCE"
      && roomForm.status === "MAINTENANCE"
      && formOccupiedBeds > 0,
  );
  const isMaintenanceMetaMissing = isMaintenancePlanningRequired
    && (!roomForm.maintenance_reason.trim() || !roomForm.maintenance_start_date || !roomForm.maintenance_expected_end_date);
  const oddCapacityError = useMemo(() => {
    if (!isCapacityOdd) return "";
    return "Sức chứa phải là số chẵn vì ký túc xá dùng giường đôi.";
  }, [isCapacityOdd]);

  const capacityTooSmallError = useMemo(() => {
    if (!isCapacityTooSmall) return "";
    return `Giường đang có sinh viên ở không thể giảm. Vui lòng dời sinh viên qua giường khác trước khi giảm số giường trong phòng ${
      editingRoom ? getRoomCode(editingRoom) : "này"
    }.`;
  }, [isCapacityTooSmall, editingRoom]);

  const fullStatusError = useMemo(() => {
    if (roomForm.status !== "FULL") return "";
    if (editingRoom?.status === "MAINTENANCE") {
      return "Phòng đang BẢO TRÌ. Hãy chuyển về CÒN CHỖ và phân giường trước.";
    }

    if (formOccupiedBeds === 0) {
      return "Không thể chuyển sang ĐẦY khi phòng chưa có sinh viên ở.";
    }

    if (formEmptyBeds > 0) {
      return `Phòng vẫn còn ${formEmptyBeds} giường trống nên không thể chuyển sang ĐẦY. Hãy phân giường hết trước.`;
    }

    return "";
  }, [roomForm.status, editingRoom?.status, formOccupiedBeds, formEmptyBeds]);

  const availableStatusError = useMemo(() => {
    if (roomForm.status !== "AVAILABLE" || formCapacity < 1 || formEmptyBeds > 0) return "";
    return "Phòng không còn giường trống nên không thể chuyển sang CÒN CHỖ. Hãy chuyển ít nhất 1 giường về TRỐNG trước.";
  }, [roomForm.status, formCapacity, formEmptyBeds]);

  const isFullBlocked = Boolean(fullStatusError);
  const isAvailableBlocked = Boolean(availableStatusError);

  const isEmptyBedsFullError = Boolean(
    roomForm.status === "FULL"
      && editingRoom?.status !== "MAINTENANCE"
      && formOccupiedBeds > 0
      && formEmptyBeds > 0,
  );

  const handleGoToAssignRoom = () => {
    if (!editingRoom) return;
    const roomGender = getRoomGender(editingRoom, buildings);
    const presetGenderFilter = roomGender === "MALE" ? "male" : roomGender === "FEMALE" ? "female" : "all";
    navigate("/admin/assign-room", { state: { presetGenderFilter, roomLabel: getRoomCode(editingRoom) } });
  };

  const isRoomStatusBlocked = Boolean(isFullBlocked || isAvailableBlocked || isCapacityTooSmall);
  const isRoomSubmitBlocked = Boolean(isRoomStatusBlocked || isCapacityInvalid || isCapacityOdd || isMaintenanceMetaMissing);

  const autoGeneratedRoomNumber = useMemo(() => {
    if (editingRoomId) {
      return roomForm.room_number;
    }
    if (!roomForm.building_code || roomForm.floor_number < 1) {
      return "";
    }
    return getNextRoomNumber(roomForm.building_code, roomForm.floor_number, rooms);
  }, [roomForm.building_code, roomForm.floor_number, roomForm.room_number, editingRoomId, rooms]);

  const roomFormFloorOptions = useMemo(() => {
    return roomForm.building_code ? getFloorNumbersByBuilding(buildings, roomForm.building_code) : [];
  }, [buildings, roomForm.building_code]);

  const blockedStatusMessage = useMemo(() => {
    if (capacityTooSmallError) {
      return capacityTooSmallError;
    }

    if (availableStatusError) {
      return availableStatusError;
    }

    if (isFullBlocked) {
      return fullStatusError;
    }

    return "";
  }, [
    formOccupiedBeds,
    isFullBlocked,
    fullStatusError,
    capacityTooSmallError,
    availableStatusError,
  ]);

  const resetRoomForm = () => {
    setRoomForm(initialFormState);
    setRoomFormError("");
    setEditingRoomId(null);
    setRoomValidationErrors({});
    setRoomSubmitAttempted(false);
  };

  const openAddRoomModal = () => {
    const defaultBuilding = buildingOptions[0] ?? "";
    const defaultFloors = defaultBuilding ? getFloorNumbersByBuilding(buildings, defaultBuilding) : [];
    const defaultFloor = defaultFloors[0] ?? 0;
    const nextRoomNum = defaultBuilding && defaultFloor > 0 ? getNextRoomNumber(defaultBuilding, defaultFloor, rooms) : "";
    setRoomForm({
      ...initialFormState,
      building_code: defaultBuilding,
      floor_number: defaultFloor,
      room_number: nextRoomNum,
    });
    setRoomFormError("");
    setRoomValidationErrors({});
    setEditingRoomId(null);
    setRoomSubmitAttempted(false);
    setIsRoomModalOpen(true);
  };

  // removed effect-based auto-fill to avoid cascading renders

  const openEditRoomModal = (room: RoomWithBeds) => {
    setEditingRoomId(room.id);
    setRoomForm({
      building_code: room.building_code,
      room_number: room.room_number,
      floor_number: getRoomFloor(room),
      capacity: String(room.capacity),
      status: room.status,
      maintenance_reason: "",
      maintenance_start_date: getLocalDateValue(),
      maintenance_expected_end_date: "",
    });
    setRoomFormError("");
    setRoomValidationErrors({});
    setRoomSubmitAttempted(false);
    setIsRoomModalOpen(true);
  };

  const closeRoomModal = () => {
    setIsRoomModalOpen(false);
    resetRoomForm();
  };

  const validateRoomForm = () => {
    const normalizedBuildingCode = roomForm.building_code.trim().toUpperCase();
    const parsedCapacity = Number(roomForm.capacity);

    if (normalizedBuildingCode && !buildings.some((building) => building.building_code === normalizedBuildingCode)) {
      return "Tòa không tồn tại trong hệ thống.";
    }

    if (normalizedBuildingCode && !roomFormFloorOptions.includes(roomForm.floor_number)) {
      return "Vui lòng chọn tầng thuộc tòa hiện có.";
    }

    if (!normalizedBuildingCode) {
      return "Vui lòng chọn tòa.";
    }

    if (!Number.isFinite(parsedCapacity) || parsedCapacity < 1 || !Number.isInteger(parsedCapacity)) {
      return "";
    }

    if (parsedCapacity % 2 !== 0) {
      return "Sức chứa phải là số chẵn vì ký túc xá dùng giường đôi.";
    }

    const normalizedGeneratedRoomNumber = autoGeneratedRoomNumber.trim().toUpperCase();
    const duplicated = rooms.some((room) => {
      if (editingRoomId && room.id === editingRoomId) {
        return false;
      }
      return (
        room.building_code.trim().toUpperCase() === normalizedBuildingCode
        && room.room_number.trim().toUpperCase() === normalizedGeneratedRoomNumber
      );
    });

    if (duplicated) {
      return "Phòng đã tồn tại trong tòa này. Vui lòng kiểm tra lại.";
    }

    return "";
  };

  const handleSubmitRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRoomSubmitAttempted(true);
    setRoomValidationErrors({});

    const normalizedBuildingCode = roomForm.building_code.trim().toUpperCase();
    const parsedCapacity = Number(roomForm.capacity);
    const fieldErrors: { room_number?: string; building_code?: string } = {};
    if (!normalizedBuildingCode) fieldErrors.building_code = "Vui lòng chọn Tòa";
    if (Object.keys(fieldErrors).length > 0) {
      setRoomValidationErrors(fieldErrors);
      return;
    }

    const validationError = validateRoomForm();
    if (validationError) {
      // If duplicate room detected, show error on the specific fields
      if (validationError.includes("Phòng đã tồn tại")) {
        setRoomValidationErrors({ room_number: "Phòng đã tồn tại trong tòa này", building_code: undefined });
      } else {
        setRoomFormError(validationError);
      }
      return;
    }

    if (!Number.isFinite(parsedCapacity) || parsedCapacity < 1 || !Number.isInteger(parsedCapacity)) {
      return;
    }

    if (parsedCapacity % 2 !== 0) {
      setRoomFormError("Sức chứa phải là số chẵn vì ký túc xá dùng giường đôi.");
      return;
    }

    if (capacityTooSmallError) {
      setRoomFormError(capacityTooSmallError);
      return;
    }

    if (fullStatusError) {
      setRoomFormError(fullStatusError);
      return;
    }

    if (availableStatusError) {
      setRoomFormError(availableStatusError);
      return;
    }

    const nextCapacity = parsedCapacity;
    const normalizedRoomNumber = autoGeneratedRoomNumber.trim().toUpperCase();

    try {
      if (isMaintenancePlanningRequired && editingRoomId) {
        if (isMaintenanceMetaMissing) {
          setRoomFormError("Vui lòng nhập đầy đủ lý do bảo trì, ngày bắt đầu và ngày dự kiến hoàn thành.");
          return;
        }
        await openRoomMaintenanceWizard(editingRoomId, {
          reason: roomForm.maintenance_reason.trim(),
          startedAt: roomForm.maintenance_start_date,
          expectedEndAt: roomForm.maintenance_expected_end_date,
        });
        closeRoomModal();
        return;
      }

      const building = await getBuilding(normalizedBuildingCode);
      const floorObj = building.floors.find((f) => f.floorNumber === roomForm.floor_number);
      if (!floorObj || !floorObj.id) {
        setRoomFormError("Không tìm thấy tầng tương ứng trên hệ thống.");
        return;
      }

      const payload: RoomPayload = {
        floor_id: floorObj.id,
        room_number: normalizedRoomNumber,
        capacity: nextCapacity,
        status: roomForm.status === "MAINTENANCE" ? "maintenance" : "active",
      };

      if (editingRoomId) {
        const updated = await updateRoom(editingRoomId, payload);
        setRooms((prev) => prev.map((r) => (r.id === updated.id ? (updated as unknown as RoomWithBeds) : r)));
      } else {
        const created = await createRoom(payload);
        setRooms((prev) => [(created as unknown as RoomWithBeds), ...prev]);
      }

      closeRoomModal();
    } catch (error) {
      setRoomFormError(getApiErrorMessage(error, "Lỗi khi lưu phòng"));
    }
  };

  const handleDeleteRoom = (room: RoomWithBeds) => {
    const occupiedBeds = getRoomOccupiedBeds(room);
    if (occupiedBeds > 0) {
      showConfirm(
        `Không thể xóa phòng ${getRoomCode(room)} vì đang có sinh viên ở`,
        () => {},
      );
      return;
    }

    showConfirm(`Bạn có chắc muốn xóa phòng ${getRoomCode(room)}?`, () => {
        (async () => {
          try {
            await deleteRoom(room.id);
            setRooms((prevRooms) => prevRooms.filter((item) => item.id !== room.id));
            if (selectedRoom?.id === room.id) {
              setIsBedsModalOpen(false);
              setSelectedRoom(null);
            }
          } catch {
            showConfirm("Lỗi khi xóa phòng. Vui lòng thử lại.", () => {});
          }
        })();
    });
  };

  const fetchBedDetails = async (roomId: number) => {
    setIsBedDetailsLoading(true);
    setBedDetailsError("");
    try {
      const data = await getRoomBeds(roomId);
      setBedDetails(data.beds);
    } catch {
      setBedDetails([]);
      setBedDetailsError("Không thể tải danh sách giường. Vui lòng thử lại.");
    } finally {
      setIsBedDetailsLoading(false);
    }
  };

  const handleViewBeds = (room: RoomWithBeds) => {
    setSelectedRoom(room);
    setBedDetails([]);
    setIsBedsModalOpen(true);
    void fetchBedDetails(room.id);
  };

  const openBedAction = (bedDetail: BedDetail, mode: BedActionMode) => {
    if (!selectedRoom) return;
    const originalBed = selectedRoom.beds.find((item) => item.id === bedDetail.id);
    const bedForEdit: Bed = originalBed
      ? { ...originalBed, occupied: Boolean(bedDetail.student) || Boolean(originalBed.occupied) }
      : {
          id: bedDetail.id,
          bed_number: bedDetail.bed_number,
          position: bedDetail.position === "bottom" ? "LOWER" : "UPPER",
          status: bedDetail.status === "maintenance" ? "MAINTENANCE" : "ACTIVE",
          occupied: Boolean(bedDetail.student),
        };
    openEditBed(bedForEdit, selectedRoom.id, mode);
  };

  function showConfirm(message: string, action: () => void) {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setIsConfirmOpen(true);
  }

  function closeConfirm() {
    setIsConfirmOpen(false);
    setConfirmMessage("");
    setConfirmAction(null);
  }

  function confirmNow() {
    if (confirmAction) confirmAction();
    closeConfirm();
  }

  function getEditingBedStatusError(): string {
    if (!editingBed || !editingBed.bed) return "";

    const room = rooms.find((r) => r.id === editingBed.roomId);
    if (room?.status === "MAINTENANCE") {
      return "Phòng đang bảo trì. Vui lòng kích hoạt lại phòng trước khi chỉnh sửa giường.";
    }

    return "";
  }

  function openEditBed(bed: Bed, roomId: number, mode: BedActionMode = "status") {
    setEditingBed({ roomId, bed });
    setBedActionMode(mode);
    setBedDetailTab("current");
    setEditingBedStatus(bed.status);
    setEditingBedError("");
    setTransferTargetBedId("");
    setTransferSourceStatus("active");
    setTransferChangeType("PERMANENT");
    setTransferExpectedReturnDate("");
    setTransferMaintenanceReason("");
    setTransferBedError("");
  }

  function closeEditBed() {
    setEditingBed(null);
    setBedActionMode(null);
    setBedDetailTab("current");
    setEditingBedError("");
    setTransferTargetBedId("");
    setTransferSourceStatus("active");
    setTransferChangeType("PERMANENT");
    setTransferExpectedReturnDate("");
    setTransferMaintenanceReason("");
    setTransferBedError("");
    setIsTransferringBed(false);
  }

  function saveEditBed() {
    if (!editingBed || !editingBed.bed) return;
    const { roomId, bed } = editingBed;
    if (roomId === null) return;
    const error = getEditingBedStatusError();

    if (error) {
      setEditingBedError(error);
      return;
    }
    if (editingBedStatus === "MAINTENANCE" && editingBedDetail?.student) {
      setEditingBedError("Giường hiện đang có sinh viên. Cần chuyển sinh viên trước khi đưa giường vào bảo trì.");
      return;
    }
    (async () => {
      try {
        const payload: BedPayload = { status: editingBedStatus === "MAINTENANCE" ? "maintenance" : "active" };
        const updatedRoom = await updateBedStatus(roomId, bed.id, payload);
        setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? (updatedRoom as unknown as RoomWithBeds) : r)));
        if (selectedRoom?.id === updatedRoom.id) {
          setSelectedRoom(updatedRoom as unknown as RoomWithBeds);
          setIsBedsModalOpen(true);
          void fetchBedDetails(updatedRoom.id);
        }
        closeEditBed();
      } catch (error) {
        setEditingBedError(getApiErrorMessage(error, "Lỗi khi cập nhật giường"));
      }
    })();
  }

  function handleTransferBed() {
    if (!editingBed || !editingBed.bed || editingBed.roomId === null) return;
    if (!editingBedDetail?.student) {
      setTransferBedError("Giường này chưa có sinh viên để chuyển.");
      return;
    }
    if (!transferTargetBedId) {
      setTransferBedError("Vui lòng chọn giường trống cần chuyển đến.");
      return;
    }
    if (isTemporaryMaintenanceTransfer && !transferExpectedReturnDate) {
      setTransferBedError("Vui lòng chọn ngày dự kiến hoàn tất bảo trì.");
      return;
    }
    if (isTemporaryMaintenanceTransfer && !transferMaintenanceReason.trim()) {
      setTransferBedError("Vui lòng nhập lý do bảo trì.");
      return;
    }

    setIsTransferringBed(true);
    setTransferBedError("");
    (async () => {
      try {
        const updatedRoom = await transferBedOccupancy(editingBed.roomId!, editingBed.bed!.id, {
          target_bed_id: Number(transferTargetBedId),
          source_status: isTemporaryMaintenanceTransfer ? "maintenance" : transferSourceStatus,
          change_type: transferChangeType,
          transfer_type: isTemporaryMaintenanceTransfer ? "TEMP_MAINTENANCE" : "PERMANENT",
          reason: isTemporaryMaintenanceTransfer ? transferMaintenanceReason.trim() : "admin_transfer_bed",
          expected_return_date: isTemporaryMaintenanceTransfer ? transferExpectedReturnDate : undefined,
          maintenance_reason: isTemporaryMaintenanceTransfer ? transferMaintenanceReason.trim() : undefined,
        });
        setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? (updatedRoom as unknown as RoomWithBeds) : r)));
        if (selectedRoom?.id === updatedRoom.id) {
          setSelectedRoom(updatedRoom as unknown as RoomWithBeds);
          await fetchBedDetails(updatedRoom.id);
        }
        closeEditBed();
      } catch (error) {
        setTransferBedError(getApiErrorMessage(error, "Lỗi khi chuyển giường"));
      } finally {
        setIsTransferringBed(false);
      }
    })();
  }

  async function openRoomMaintenanceWizard(
    roomId: number,
    meta?: { reason: string; startedAt: string; expectedEndAt: string },
  ) {
    setMaintenanceWizardError("");
    const plan = await getRoomMaintenancePlan(roomId);
    const assignments = plan.affected.reduce<Record<number, string>>((acc, item) => {
      if (item.target) {
        acc[item.occupancy_id] = String(item.target.id);
      }
      return acc;
    }, {});
    setMaintenanceWizard({
      type: "room",
      step: 1,
      plan,
      assignments,
      reason: meta?.reason ?? "",
      startedAt: meta?.startedAt ?? getLocalDateValue(),
      expectedEndAt: meta?.expectedEndAt ?? "",
    });
  }

  function closeMaintenanceWizard() {
    setMaintenanceWizard(null);
    setMaintenanceWizardError("");
    setIsMaintenanceSubmitting(false);
  }

  async function confirmMaintenanceWizard() {
    if (!maintenanceWizard) return;
    setIsMaintenanceSubmitting(true);
    setMaintenanceWizardError("");

    try {
      const updatedRoom =
        maintenanceWizard.type === "bed"
          ? await startBedMaintenance(
              maintenanceWizard.plan.source.room.id,
              maintenanceWizard.plan.source.bed.id,
              Number(maintenanceWizard.targetBedId),
            )
          : await startRoomMaintenance(
              maintenanceWizard.plan.room.id,
              {
                reason: maintenanceWizard.reason.trim(),
                started_at: maintenanceWizard.startedAt,
                expected_end_at: maintenanceWizard.expectedEndAt,
                maintenance_reason: maintenanceWizard.reason.trim(),
                maintenance_start_date: maintenanceWizard.startedAt,
                maintenance_expected_end_date: maintenanceWizard.expectedEndAt,
                is_temporary_relocation: true,
                assignments: maintenanceWizard.plan.affected.map((item) => ({
                  occupancy_id: item.occupancy_id,
                  target_bed_id: Number(maintenanceWizard.assignments[item.occupancy_id]),
                  original_room_id: item.original_room_id ?? item.current_room_id ?? maintenanceWizard.plan.room.id,
                  original_bed_id: item.original_bed_id ?? item.current_bed_id ?? null,
                  original_room_code: item.original_room_code ?? item.current_room,
                  original_bed_number: item.original_bed_number ?? item.current_bed,
                })),
              },
            );

      setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? (updatedRoom as unknown as RoomWithBeds) : r)));
      if (selectedRoom?.id === updatedRoom.id) {
        setSelectedRoom(updatedRoom as unknown as RoomWithBeds);
        await fetchBedDetails(updatedRoom.id);
      }
      // Giường/phòng đích nhận sinh viên tạm không nằm trong response ở trên — bắn sự
      // kiện để tự tải lại toàn bộ danh sách phòng, tránh phải F5 mới thấy đúng.
      window.dispatchEvent(new Event("ktx-rooms-updated"));
      closeMaintenanceWizard();
    } catch (error) {
      setMaintenanceWizardError(getApiErrorMessage(error, "Lỗi khi xác nhận bảo trì"));
    } finally {
      setIsMaintenanceSubmitting(false);
    }
  }

  async function handleCompleteBedMaintenance(roomId: number, bedId: number) {
    setEditingBedError("");
    try {
      const updatedRoom = await completeBedMaintenance(roomId, bedId);
      setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? (updatedRoom as unknown as RoomWithBeds) : r)));
      if (selectedRoom?.id === updatedRoom.id) {
        setSelectedRoom(updatedRoom as unknown as RoomWithBeds);
        await fetchBedDetails(updatedRoom.id);
      }
      window.dispatchEvent(new Event("ktx-rooms-updated"));
      closeEditBed();
    } catch (error) {
      setEditingBedError(getApiErrorMessage(error, "Lỗi khi hoàn tất bảo trì giường"));
    }
  }

  async function handleCompleteRoomMaintenance(roomId: number) {
    const room = rooms.find((item) => item.id === roomId) ?? selectedRoom;
    if (!room) return;
    setRoomReturnError("");
    try {
      const data = await getRoomBeds(roomId);
      const hasPendingReturns = data.beds.some((bed) => Boolean(bed.maintenance_assignment?.occupancy_id));
      if (!hasPendingReturns) {
        const updatedRoom = await completeRoomMaintenance(roomId);
        setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? (updatedRoom as unknown as RoomWithBeds) : r)));
        if (selectedRoom?.id === updatedRoom.id) {
          setSelectedRoom(updatedRoom as unknown as RoomWithBeds);
          await fetchBedDetails(updatedRoom.id);
        }
        window.dispatchEvent(new Event("ktx-rooms-updated"));
        setRoomReturnModal(null);
        return;
      }
      setRoomReturnModal({ room, beds: data.beds });
    } catch (error) {
      showConfirm(getApiErrorMessage(error, "Lỗi khi tải danh sách sinh viên điều chuyển tạm"), () => {});
    }
  }

  async function confirmCompleteRoomMaintenanceAll() {
    if (!roomReturnModal) return;
    setIsRoomReturnSubmitting(true);
    setRoomReturnError("");
    try {
      const updatedRoom = await completeRoomMaintenance(roomReturnModal.room.id);
      setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? (updatedRoom as unknown as RoomWithBeds) : r)));
      if (selectedRoom?.id === updatedRoom.id) {
        setSelectedRoom(updatedRoom as unknown as RoomWithBeds);
        await fetchBedDetails(updatedRoom.id);
      }
      window.dispatchEvent(new Event("ktx-rooms-updated"));
      setRoomReturnModal(null);
    } catch (error) {
      setRoomReturnError(getApiErrorMessage(error, "Lỗi khi hoàn nguyên tất cả sinh viên"));
    } finally {
      setIsRoomReturnSubmitting(false);
    }
  }

  async function confirmCompleteRoomMaintenanceStudent(occupancyId: number) {
    if (!roomReturnModal) return;
    setIsRoomReturnSubmitting(true);
    setRoomReturnError("");
    try {
      const updatedRoom = await completeRoomMaintenanceStudent(roomReturnModal.room.id, occupancyId);
      setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? (updatedRoom as unknown as RoomWithBeds) : r)));
      if (selectedRoom?.id === updatedRoom.id) {
        setSelectedRoom(updatedRoom as unknown as RoomWithBeds);
        await fetchBedDetails(updatedRoom.id);
      }
      window.dispatchEvent(new Event("ktx-rooms-updated"));
      const data = await getRoomBeds(roomReturnModal.room.id);
      const hasPending = data.beds.some((bed) => Boolean(bed.maintenance_assignment?.occupancy_id));
      if (hasPending) {
        setRoomReturnModal((current) => (current ? { ...current, beds: data.beds } : current));
      } else {
        setRoomReturnModal(null);
      }
    } catch (error) {
      setRoomReturnError(getApiErrorMessage(error, "Lỗi khi hoàn nguyên sinh viên"));
    } finally {
      setIsRoomReturnSubmitting(false);
    }
  }

  const closeBedsModal = () => {
    setIsBedsModalOpen(false);
    setSelectedRoom(null);
    setBedDetails([]);
    setBedDetailsError("");
    setDetailStudent(null);
  };

  if (!hasLoadedRooms || !hasLoadedBuildings) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex min-h-full flex-col gap-6 rounded-[28px] border border-[#cfdbef] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:p-6"
      >
        <header className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
          <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Quản lý phòng</h1>
          <p className="mt-1 text-sm text-[#62789f]">Đang tải danh sách phòng, giường và trạng thái lưu trú.</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[88px] animate-pulse rounded-2xl border border-[#d7e3f5] bg-white" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[260px] animate-pulse rounded-3xl border border-[#cfdbef] bg-[linear-gradient(180deg,#ffffff_0%,#f1f6ff_100%)]"
            />
          ))}
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex min-h-full flex-col gap-6 rounded-[28px] border border-[#cfdbef] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:p-6"
    >
      {typeof document !== "undefined" && isScrollToTopVisible
        ? createPortal(
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
            </div>,
            document.body,
          )
        : null}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[28px]">
        <div className="absolute -left-20 top-0 h-56 w-56 rounded-full bg-[#244cb8]/10 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-[#31b7d4]/10 blur-3xl" />
      </div>

      <header className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Quản lý phòng</h1>
            <p className="mt-1 text-sm text-[#62789f]">Quản lý phòng, giường và trạng thái lưu trú trong ký túc xá.</p>
          </div>

          <button
            type="button"
            onClick={openAddRoomModal}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(36,76,184,0.28)] transition hover:-translate-y-0.5 hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Thêm phòng
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <SelectField
            value={filterBuilding}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              if (event.target.value === "all") {
                next.delete("building");
              } else {
                next.set("building", event.target.value);
              }
              setSearchParams(next, { replace: true });
            }}
          >
            <option value="all">Tất cả tòa</option>
            {buildingOptions.map((buildingCode) => (
              <option key={buildingCode} value={buildingCode}>
                Tòa {buildingCode}
              </option>
            ))}
          </SelectField>

          <SelectField
            value={filterFloor}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              if (event.target.value === "all") {
                next.delete("floor");
              } else {
                next.set("floor", event.target.value);
              }
              setSearchParams(next, { replace: true });
            }}
          >
              <option value="all">Tất cả tầng</option>
              {floorOptions.map((floor) => (
                <option key={floor} value={String(floor)}>
                  Tầng {floor}
                </option>
              ))}
          </SelectField>

          <SelectField
            value={filterGender}
            onChange={(event) => {
              const nextValue = event.target.value as "all" | RoomGender;
              const next = new URLSearchParams(searchParams);
              if (nextValue === "all") {
                next.delete("gender");
              } else {
                next.set("gender", nextValue);
              }
              setSearchParams(next, { replace: true });
            }}
          >
            <option value="all">Tất cả giới tính</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
          </SelectField>
          <SelectField
            value={filterStatus}
            onChange={(event) => {
              const nextValue = event.target.value as "all" | RoomStatus;
              const next = new URLSearchParams(searchParams);
              if (nextValue === "all") {
                next.delete("status");
              } else {
                next.set("status", nextValue);
              }
              setSearchParams(next, { replace: true });
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="AVAILABLE">Còn trống</option>
            <option value="FULL">Đầy</option>
            <option value="MAINTENANCE">Bảo trì</option>
          </SelectField>

          <button
            type="button"
            onClick={resetAllFilters}
            className="h-11 rounded-2xl border border-[#c8d8ef] bg-white px-5 text-sm font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-[#f5f9ff]"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#d7e3f5] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#5f78a4]">Tổng phòng</p>
          <p className="mt-4 text-2xl font-extrabold text-[#1a2d52]">{totalRooms}</p>
        </article>
        <article className="rounded-2xl border border-[#d7e3f5] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#5f78a4]">Tổng giường</p>
          <p className="mt-4 text-2xl font-extrabold text-[#1a2d52]">{totalBeds}</p>
        </article>
        <article className="rounded-2xl border border-[#d7e3f5] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#5f78a4]">Đã sử dụng</p>
          <p className="mt-4 text-2xl font-extrabold text-[#1a2d52]">{totalOccupiedBeds}</p>
        </article>
        <article className="rounded-2xl border border-[#d7e3f5] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#5f78a4]">Giường trống</p>
          <p className="mt-4 text-2xl font-extrabold text-emerald-700">{totalEmptyBeds}</p>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {displayedRooms.map((room) => {
          const occupiedBeds = getRoomOccupiedBeds(room);
          const emptyBeds = getEmptyBeds(room);
          const maintenanceBeds = getRoomMaintenanceBeds(room);
          const roomDisplayStatus = getRoomDisplayStatus(room);

          return (
            <article
              key={room.id}
              className="group rounded-3xl border border-[#cfdbef] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_38px_rgba(36,76,184,0.16)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#1a2d52]">Phòng {getRoomCode(room)}</h2>
                  <p className="mt-1 text-sm text-[#61779d]">
                    Tòa {room.building_code} · Tầng {getRoomFloor(room)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta[roomDisplayStatus].className}`}
                >
                  {statusMeta[roomDisplayStatus].label}
                </span>
              </div>

              {room.scheduled_maintenance ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                  <Settings2 className="h-3.5 w-3.5" />
                  Đã lên lịch bảo trì từ {formatShortDate(room.scheduled_maintenance.started_at)}
                  {room.scheduled_maintenance.reason ? ` — ${room.scheduled_maintenance.reason}` : ""}
                </p>
              ) : null}

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  Giới tính áp dụng:
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-sm font-semibold ${
                    getRoomGender(room, buildings) === "MALE" ? "bg-sky-100 text-sky-700" : "bg-pink-100 text-pink-700"
                    }`}
                  >
                    {getRoomGender(room, buildings) ? genderLabel[getRoomGender(room, buildings)!] : "Chưa xác định"}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-slate-400" />
                  Sức chứa: <span className="font-semibold text-slate-700">{room.capacity} giường</span>
                </p>
                <p className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  Đã sử dụng: <span className="font-semibold text-slate-700">{occupiedBeds}</span>
                </p>
                <p className="flex items-center gap-2">
                  <BedSingle className="h-4 w-4 text-slate-400" />
                  Giường trống: <span className="font-semibold text-emerald-700">{emptyBeds}</span>
                </p>
                <p className="flex items-center gap-2">
                  <BedSingle className="h-4 w-4 text-slate-400" />
                  Giường bảo trì: <span className="font-semibold text-amber-700">{maintenanceBeds}</span>
                </p>
              </div>

              <div className={`mt-5 grid gap-2 ${roomDisplayStatus === "MAINTENANCE" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
                <button
                  type="button"
                  onClick={() => handleViewBeds(room)}
                  className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-[#bfd2ec] bg-white text-xs font-semibold text-[#2a4f8f] transition hover:border-[#9ebce5] hover:bg-[#f3f8ff]"
                >
                  <Eye className="h-4 w-4" />
                  Xem giường
                </button>
                <button
                  type="button"
                  onClick={() => openEditRoomModal(room)}
                  className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-[#bfd2ec] bg-white text-xs font-semibold text-[#2a4f8f] transition hover:border-[#9ebce5] hover:bg-[#f3f8ff]"
                >
                  <Pencil className="h-4 w-4" />
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRoom(room)}
                  className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa
                </button>
                {roomDisplayStatus === "MAINTENANCE" ? (
                  <button
                    type="button"
                    onClick={() => void handleCompleteRoomMaintenance(room.id)}
                    className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                  >
                    Hoàn tất bảo trì
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {displayedRooms.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-[28px] border border-dashed border-[#cfdcf0] bg-[#f8fbff] px-6 py-10 text-center">
          <p className="text-sm font-semibold text-[#1a2d52]">Không tìm thấy phòng phù hợp với bộ lọc hiện tại</p>
          <button type="button" onClick={resetAllFilters} className="mt-5 inline-flex h-9 items-center justify-center rounded-xl bg-[#244cb8] px-4 text-sm font-semibold text-white transition hover:bg-[#1f44a4]">
            Bỏ bộ lọc
          </button>
        </div>
      ) : null}

      {isBedsModalOpen && selectedRoom
        ? createPortal(
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/35" onClick={closeBedsModal} />

              <div className="relative z-70 flex w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[#d5e2f5] bg-white shadow-2xl max-h-[88vh]">
                <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-gutter:stable_both-edges]">
                  <div className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-slate-100 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] sm:p-6">
                    <div>
                      <h3 className="text-xl font-bold text-[#1a2d52]">Danh sách giường - Phòng {getRoomCode(selectedRoom)}</h3>
                      <p className="mt-1 text-sm text-[#61779d]">
                        Tòa {selectedRoom.building_code} - Tầng {getRoomFloor(selectedRoom)} - Giới tính {getRoomGender(selectedRoom, buildings) ? genderLabel[getRoomGender(selectedRoom, buildings)!] : "Chưa xác định"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeBedsModal}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="relative z-0 p-5 pt-0 sm:p-6 sm:pt-0">
                    {isBedDetailsLoading ? (
                      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {Array.from({ length: Math.max(Math.ceil(selectedRoom.capacity / 2), 2) }).map((_, index) => (
                          <div
                            key={index}
                            className="h-[620px] animate-pulse rounded-[26px] border border-[#e3ebf8] bg-[linear-gradient(180deg,#f4f8ff_0%,#eaf2fd_100%)]"
                          />
                        ))}
                      </div>
                    ) : bedDetailsError ? (
                      <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-rose-50/50 px-6 py-10 text-center">
                        <p className="text-sm font-semibold text-rose-600">{bedDetailsError}</p>
                        <button
                          type="button"
                          onClick={() => void fetchBedDetails(selectedRoom.id)}
                          className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-[#244cb8] px-4 text-sm font-semibold text-white transition hover:bg-[#1f44a4]"
                        >
                          Thử lại
                        </button>
                      </div>
                    ) : bedDetails.length === 0 ? (
                      <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfdcf0] bg-[#f8fbff] px-6 py-10 text-center">
                        <p className="text-sm font-semibold text-[#1a2d52]">Phòng này chưa có giường nào.</p>
                      </div>
                    ) : (
                      <div className="mt-5 space-y-4">
                        <div className="rounded-[22px] border border-[#c7d8f2] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-5 py-3 text-center shadow-[0_12px_28px_rgba(36,76,184,0.08)]">
                          <p className="inline-flex items-center justify-center gap-2 text-base font-extrabold uppercase tracking-[0.16em] text-[#6f86b2]">
                            <DoorOpen className="h-4 w-4" />
                            Cửa phòng
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                          {(() => {
                            const midpoint = Math.ceil(bunkBedGroups.length / 2);
                            return [
                              { key: "left", label: "Cửa sổ dãy trái", groups: bunkBedGroups.slice(0, midpoint) },
                              { key: "right", label: "Cửa sổ dãy phải", groups: bunkBedGroups.slice(midpoint) },
                            ];
                          })().map((column) => (
                            <div key={column.key} className="flex h-full flex-col gap-4">
                              <div className="flex-1 space-y-4">
                                {column.groups.map((group) => (
                                  <BunkBedCard
                                    key={group.pairNumber}
                                    group={group}
                                    beds={bedDetails}
                                    onViewBed={(bed) => openBedAction(bed, "detail")}
                                    onEditStatus={(bed) => openBedAction(bed, "status")}
                                    onTransferStudent={(bed) => openBedAction(bed, "transfer")}
                                    onCompleteMaintenance={(bed) => void handleCompleteBedMaintenance(selectedRoom.id, bed.id)}
                                  />
                                ))}
                              </div>
                              <div className="rounded-[22px] border border-[#bfd6f7] bg-[linear-gradient(180deg,#edf5ff_0%,#e5f0ff_100%)] px-5 py-3 text-center shadow-[0_12px_28px_rgba(36,76,184,0.08)]">
                                <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#6f86b2]">
                                  {column.label}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {detailStudent && selectedRoom ? (
        <BedStudentDetailModal
          student={detailStudent.student}
          bedNumber={detailStudent.bedNumber}
          roomCode={getRoomCode(selectedRoom)}
          onClose={() => setDetailStudent(null)}
          onViewFullOccupancyDetail={
            detailStudent.student.occupancy?.id
              ? () => setViewingOccupancyId(detailStudent.student.occupancy!.id)
              : undefined
          }
        />
      ) : null}

      {viewingOccupancyId && detailStudent && selectedRoom ? (
        <OccupancyDetailModal
          occupancyId={viewingOccupancyId}
          onClose={() => setViewingOccupancyId(null)}
          student={{
            studentCode: detailStudent.student.student_code,
            fullName: detailStudent.student.full_name,
            className: detailStudent.student.class_name,
            faculty: detailStudent.student.faculty,
            email: detailStudent.student.email,
            gender: detailStudent.student.gender,
            dateOfBirth: detailStudent.student.date_of_birth,
            phone: detailStudent.student.phone,
          }}
          occupancy={{
            roomCode: getRoomCode(selectedRoom),
            bedNumber: detailStudent.bedNumber,
            checkInDate: detailStudent.student.occupancy?.check_in_date,
            checkOutDate: detailStudent.student.occupancy?.check_out_date,
            status: resolveOccupancyDetailStatus(detailStudent.student.occupancy),
            leaveRequest: detailStudent.student.occupancy?.checkout_request
              ? {
                  expectedLeaveDate: detailStudent.student.occupancy.checkout_request.expected_leave_date,
                  reason: detailStudent.student.occupancy.checkout_request.reason,
                }
              : null,
          }}
        />
      ) : null}

      {maintenanceWizard ? (
        <MaintenanceWizardModal
          state={maintenanceWizard}
          error={maintenanceWizardError}
          submitting={isMaintenanceSubmitting}
          onClose={closeMaintenanceWizard}
          onStepChange={(step) => setMaintenanceWizard((current) => (current ? { ...current, step } : current))}
          onBedTargetChange={(bedId) =>
            setMaintenanceWizard((current) => (current?.type === "bed" ? { ...current, targetBedId: bedId } : current))
          }
          onRoomAssignmentChange={(occupancyId, bedId) =>
            setMaintenanceWizard((current) =>
              current?.type === "room"
                ? { ...current, assignments: { ...current.assignments, [occupancyId]: bedId } }
                : current,
            )
          }
          onConfirm={confirmMaintenanceWizard}
        />
      ) : null}

      {roomReturnModal
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/35" onClick={() => setRoomReturnModal(null)} />
              <div className="relative flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#d5e2f5] bg-white shadow-2xl">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
                  <div>
                    <h3 className="text-xl font-bold text-[#1a2d52]">Hoàn tất bảo trì phòng</h3>
                    <p className="mt-1 text-sm text-[#61779d]">
                      Phòng {getRoomCode(roomReturnModal.room)} - hoàn nguyên sinh viên đang điều chuyển tạm.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRoomReturnModal(null)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                  {(() => {
                    const returnItems = roomReturnModal.beds.filter((bed) => Boolean(bed.maintenance_assignment?.occupancy_id));
                    if (returnItems.length === 0) {
                      return (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-600">
                          Không có sinh viên đang điều chuyển tạm trong phòng này.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {returnItems.map((bed) => {
                          const assignment = bed.maintenance_assignment!;
                          return (
                            <div key={bed.id} className="rounded-2xl border border-[#d8e4f5] bg-white p-4 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-bold text-[#1a2d52]">{assignment.student_name}</p>
                                  <p className="mt-1 text-sm text-[#61779d]">
                                    Vị trí gốc: {getRoomCode(roomReturnModal.room)} - Giường {bed.bed_number}
                                  </p>
                                  <p className="text-sm text-[#61779d]">
                                    Đang ở tạm: Giường {assignment.temporary_bed_number ?? "--"}
                                  </p>
                                  <p className="text-sm text-[#61779d]">
                                    Dự kiến về: {formatPreviewDate(assignment.expected_return_date)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={isRoomReturnSubmitting || !assignment.occupancy_id}
                                  onClick={() => assignment.occupancy_id ? void confirmCompleteRoomMaintenanceStudent(assignment.occupancy_id) : undefined}
                                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Hoàn nguyên
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {roomReturnError ? (
                    <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                      {roomReturnError}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 p-5">
                  <button
                    type="button"
                    onClick={() => setRoomReturnModal(null)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={isRoomReturnSubmitting || !roomReturnModal.beds.some((bed) => Boolean(bed.maintenance_assignment?.occupancy_id))}
                    onClick={() => void confirmCompleteRoomMaintenanceAll()}
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isRoomReturnSubmitting ? "Đang xử lý..." : "Hoàn nguyên tất cả"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isConfirmOpen
        ? createPortal(
            <div className="fixed inset-0 z-80 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/30" onClick={closeConfirm} />
              <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
                <p className="text-sm text-slate-700">{confirmMessage}</p>
                <div className="mt-4 flex justify-end gap-3">
                  {confirmAction ? (
                    <>
                      <button onClick={closeConfirm} className="rounded-xl border px-3 py-2 text-sm">
                        Hủy
                      </button>
                      <button onClick={confirmNow} className="rounded-xl bg-red-600 px-3 py-2 text-sm text-white">
                        OK
                      </button>
                    </>
                  ) : (
                    <button onClick={closeConfirm} className="rounded-xl bg-slate-200 px-3 py-2 text-sm text-slate-700">
                      Đóng
                    </button>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {editingBed && editingBed.bed && bedActionMode === "detail"
        ? createPortal(
            <div className="fixed inset-0 z-90 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/30" onClick={closeEditBed} />
              <div className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#d5e2f5] bg-white shadow-2xl">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] p-5">
                  <div>
                    <h3 className="text-lg font-bold uppercase text-[#1a2d52]">Thông tin giường</h3>
                    <p className="mt-1 text-sm text-[#61779d]">Phòng {selectedRoom ? getRoomCode(selectedRoom) : "-"} · Giường {editingBed.bed.bed_number}</p>
                  </div>
                  <button type="button" onClick={closeEditBed} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                  {editingBedDetail?.student ? (
                    <div className="rounded-2xl border border-[#d8e4f5] bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#2563EB] text-sm font-bold text-white">
                          {editingBedDetail.student.avatar ? (
                            <img src={editingBedDetail.student.avatar} alt={editingBedDetail.student.full_name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">{editingBedDetail.student.full_name.slice(0, 2).toUpperCase()}</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-bold text-[#1a2d52]">{editingBedDetail.student.full_name}</p>
                          <p className="text-sm font-semibold text-[#2563EB]">MSSV: {editingBedDetail.student.student_code}</p>
                          <p className="text-xs text-[#61779d]">{[editingBedDetail.student.class_name, editingBedDetail.student.faculty].filter(Boolean).join(" · ") || "—"}</p>
                          <p className="text-xs text-[#7c8fb5]">Ngày vào ở: {formatPreviewDate(editingBedDetail.student.check_in_date)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDetailStudent({ student: editingBedDetail.student!, bedNumber: editingBed.bed!.bed_number })}
                          className="rounded-xl border border-[#bfd2ec] bg-white px-3 py-2 text-xs font-semibold text-[#2563EB] transition hover:bg-sky-50"
                        >
                          Xem hồ sơ
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${editingBedDetail?.student ? "mt-4" : ""}`}>
                    {[
                      ["Tòa", selectedRoom?.building_code],
                      ["Tầng", selectedRoom ? getRoomFloor(selectedRoom) : null],
                      ["Phòng", selectedRoom ? getRoomCode(selectedRoom) : null],
                      ["Giường", `Giường ${editingBed.bed.bed_number}`],
                      ["Vị trí", getBedPositionLabel(editingBed.bed.position)],
                      ["Trạng thái", getBedStatusLabel(editingBedDetail?.display_status ?? editingBed.bed.status)],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-2xl border border-[#e7eef9] bg-[#f8fbff] px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase text-[#7c8fb5]">{label}</p>
                        <p className="mt-1 text-sm font-bold text-[#1a2d52]">{value || "—"}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-100">
                    {[
                      ["current", "Lưu trú hiện tại"],
                      ["transfer", "Lịch sử chuyển giường"],
                      ["maintenance", "Lịch sử bảo trì"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setBedDetailTab(value as typeof bedDetailTab)}
                        className={`border-b-2 px-3 py-2 text-sm font-semibold transition ${
                          bedDetailTab === value ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#61779d] hover:text-[#1a2d52]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-[#e7eef9] bg-slate-50 p-4 shadow-sm">
                    {bedDetailTab === "current" ? (
                      <div className="text-sm text-[#1a2d52]">
                        <p className="font-semibold">Trạng thái lưu trú: {editingBedDetail?.student ? "Đang có sinh viên" : "Chưa có sinh viên"}</p>
                        {editingBedDetail?.student?.temporary_assignment?.is_temporary ? (
                          <p className="mt-1 text-orange-700">Đang ở tạm từ Giường {editingBedDetail.student.temporary_assignment.original_bed_number ?? "—"}</p>
                        ) : null}
                      </div>
                    ) : null}
                    {bedDetailTab === "transfer" ? (
                      editingBedDetail?.transfer_history?.length ? (
                        <div className="space-y-3">
                          {editingBedDetail.transfer_history
                            .filter((item) => !item.is_initial_assignment)
                            .map((item) => (
                            <div key={item.id} className="rounded-2xl border border-[#d8e4f5] bg-white p-3 text-sm text-[#1a2d52] shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-bold">{item.student_name ?? "Sinh viên"}</p>
                                  {item.student_code ? <p className="text-xs font-semibold text-[#2563EB]">MSSV: {item.student_code}</p> : null}
                                </div>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-[#61779d]">
                                  {getHistoryStatusLabel(item.status)}
                                </span>
                              </div>
                              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <p>
                                  <span className="font-semibold text-[#61779d]">Từ: </span>
                                  {item.old_room_code ? `Phòng ${item.old_room_code} · ` : ""}
                                  Giường {item.old_bed_number ?? "Không rõ"}
                                </p>
                                <p>
                                  <span className="font-semibold text-[#61779d]">Đến: </span>
                                  {item.new_room_code ? `Phòng ${item.new_room_code} · ` : ""}
                                  Giường {item.new_bed_number ?? "Không rõ"}
                                </p>
                                <p>
                                  <span className="font-semibold text-[#61779d]">Lý do: </span>
                                  {item.reason ?? "Không rõ"}
                                </p>
                                <p>
                                  <span className="font-semibold text-[#61779d]">Ngày chuyển: </span>
                                  {formatPreviewDate(item.transferred_at)}
                                </p>
                                {item.expected_return_date ? (
                                  <p>
                                    <span className="font-semibold text-[#61779d]">Dự kiến về: </span>
                                    {formatPreviewDate(item.expected_return_date)}
                                  </p>
                                ) : null}
                                {item.completed_at ? (
                                  <p>
                                    <span className="font-semibold text-[#61779d]">Hoàn tất: </span>
                                    {formatPreviewDate(item.completed_at)}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ))}
                          {editingBedDetail.transfer_history
                            .filter((item) => item.is_initial_assignment)
                            .map((item) => (
                            <div key={item.id} className="rounded-2xl border border-dashed border-[#c7d6ee] bg-[#f3f7ff] p-3 text-sm text-[#1a2d52]">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-bold text-[#2563EB]">📍 Xếp chỗ ban đầu</p>
                                {item.student_name ? (
                                  <span className="rounded-full border border-[#c7d6ee] bg-white px-2.5 py-1 text-xs font-bold text-[#61779d]">
                                    {item.student_name}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <p>
                                  <span className="font-semibold text-[#61779d]">Xếp vào: </span>
                                  {item.new_room_code ? `Phòng ${item.new_room_code} · ` : ""}
                                  Giường {item.new_bed_number ?? "Không rõ"}
                                </p>
                                <p>
                                  <span className="font-semibold text-[#61779d]">Ngày: </span>
                                  {formatPreviewDate(item.transferred_at)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-[#7c8fb5]">🔄 Chưa có lịch sử chuyển giường</p>
                      )
                    ) : null}
                    {bedDetailTab === "maintenance" ? (
                      editingBedDetail?.maintenance_history?.length ? (
                        <div className="space-y-3">
                          {editingBedDetail.maintenance_history.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-orange-100 bg-white p-3 text-sm text-[#1a2d52] shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-bold">{item.student_name ?? "Sinh viên"}</p>
                                  {item.student_code ? <p className="text-xs font-semibold text-[#2563EB]">MSSV: {item.student_code}</p> : null}
                                </div>
                                <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
                                  {getHistoryStatusLabel(item.status)}
                                </span>
                              </div>
                              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <p>
                                  <span className="font-semibold text-[#61779d]">Lý do: </span>
                                  {item.reason ?? "Không rõ"}
                                </p>
                                <p>
                                  <span className="font-semibold text-[#61779d]">Ngày chuyển: </span>
                                  {formatPreviewDate(item.transferred_at)}
                                </p>
                                {item.expected_return_date ? (
                                  <p>
                                    <span className="font-semibold text-[#61779d]">Dự kiến về: </span>
                                    {formatPreviewDate(item.expected_return_date)}
                                  </p>
                                ) : null}
                                {item.completed_at ? (
                                  <p>
                                    <span className="font-semibold text-[#61779d]">Hoàn tất: </span>
                                    {formatPreviewDate(item.completed_at)}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-[#7c8fb5]">📄 Chưa có dữ liệu bảo trì</p>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {editingBed && editingBed.bed && bedActionMode === "status"
        ? createPortal(
            <div className="fixed inset-0 z-90 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/30" onClick={closeEditBed} />
              <div className="relative w-full max-w-md rounded-2xl border border-[#d5e2f5] bg-white p-5 shadow-2xl">
                <h3 className="text-lg font-bold uppercase text-[#1a2d52]">Cập nhật trạng thái giường</h3>
                <p className="mt-1 text-sm text-[#61779d]">Giường {editingBed.bed.bed_number} · {getBedPositionLabel(editingBed.bed.position)}</p>

                {selectedRoom?.status === "MAINTENANCE" ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
                    <p className="text-sm font-semibold text-amber-700">Phòng đang bảo trì. Vui lòng kích hoạt lại phòng trước khi chỉnh sửa giường.</p>
                  </div>
                ) : (
                  <>
                    <label className="mt-4 block text-sm font-semibold text-slate-600">Trạng thái</label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[
                        ["ACTIVE", "Hoạt động"],
                        ["MAINTENANCE", "Bảo trì"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setEditingBedStatus(value as BedStatus);
                            setEditingBedError("");
                          }}
                          className={`relative rounded-2xl border px-3 py-3 text-sm font-semibold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                            editingBedStatus === value ? "border-[#2563EB] bg-indigo-50 text-[#2563EB] ring-2 ring-[#2563EB]/15" : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {editingBedStatus === "MAINTENANCE" && editingBedDetail?.student ? (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
                        <p className="text-sm font-bold text-amber-700">⚠ Giường hiện đang có sinh viên.</p>
                        <p className="mt-1 text-sm text-amber-700">Bạn cần chuyển sinh viên sang giường khác trước khi đưa giường vào bảo trì.</p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTransferChangeType("TEMPORARY_MAINTENANCE");
                              setTransferSourceStatus("maintenance");
                              setTransferBedError("");
                              setBedActionMode("transfer");
                            }}
                            className="rounded-xl bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                          >
                            Chuyển sinh viên
                          </button>
                          <button type="button" onClick={closeEditBed} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {editingBedError ? <p className="mt-2 text-sm text-red-600">{editingBedError}</p> : null}
                  </>
                )}

                <div className="mt-5 flex justify-end gap-3">
                  <button onClick={closeEditBed} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">
                    Hủy
                  </button>
                  <button
                    onClick={saveEditBed}
                    disabled={Boolean(editingBedError) || selectedRoom?.status === "MAINTENANCE" || Boolean(editingBedStatus === "MAINTENANCE" && editingBedDetail?.student)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold text-white ${
                      editingBedError || selectedRoom?.status === "MAINTENANCE" || (editingBedStatus === "MAINTENANCE" && editingBedDetail?.student)
                        ? "cursor-not-allowed bg-slate-300"
                        : "bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_45%,#1f46ad_100%)]"
                    }`}
                  >
                    Lưu
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {editingBed && editingBed.bed && bedActionMode === "transfer" && editingBedDetail?.student
        ? createPortal(
            <div className="fixed inset-0 z-90 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/30" onClick={closeEditBed} />
              <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#d5e2f5] bg-white shadow-2xl">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] p-5">
                  <div>
                    <h3 className="text-lg font-bold uppercase text-[#1a2d52]">Chuyển sinh viên</h3>
                    <p className="mt-1 text-sm text-[#61779d]">Chọn giường mới và hình thức chuyển phù hợp.</p>
                  </div>
                  <button type="button" onClick={closeEditBed} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                  <div className="rounded-2xl border border-[#d8e4f5] bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#2563EB] text-sm font-bold text-white">
                        {editingBedDetail.student.avatar ? (
                          <img src={editingBedDetail.student.avatar} alt={editingBedDetail.student.full_name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">{editingBedDetail.student.full_name.slice(0, 2).toUpperCase()}</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-[#1a2d52]">{editingBedDetail.student.full_name}</p>
                        <p className="text-sm font-semibold text-[#2563EB]">MSSV: {editingBedDetail.student.student_code}</p>
                        <p className="text-xs font-semibold text-[#61779d]">Giường hiện tại: Giường {editingBed.bed.bed_number}</p>
                      </div>
                    </div>
                  </div>

                  <label className="mt-4 block text-sm font-semibold text-slate-600">Giường chuyển đến</label>
                  <select
                    value={transferTargetBedId}
                    onChange={(event) => {
                      setTransferTargetBedId(event.target.value);
                      setTransferBedError("");
                    }}
                    className={`mt-2 h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 ${transferBedError ? "border-red-500" : "border-slate-200"}`}
                  >
                    <option value="">Chọn giường trống</option>
                    {transferTargetBeds.map((bed) => (
                      <option key={bed.id} value={bed.id}>
                        Giường {bed.bed_number} - {getBedPositionLabel(bed.position)}
                      </option>
                    ))}
                  </select>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      {
                        value: "PERMANENT",
                        title: "🏠 Chuyển vĩnh viễn",
                        description: "Sinh viên sẽ ở luôn tại giường mới.",
                      },
                      {
                        value: "TEMPORARY_MAINTENANCE",
                        title: "🔧 Chuyển tạm do bảo trì",
                        description: "Giữ quyền sử dụng giường cũ. Sau khi bảo trì xong có thể chuyển về.",
                      },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          const nextType = option.value as "PERMANENT" | "TEMPORARY_MAINTENANCE";
                          setTransferChangeType(nextType);
                          setTransferBedError("");
                          if (nextType === "TEMPORARY_MAINTENANCE") {
                            setTransferSourceStatus("maintenance");
                          } else {
                            setTransferExpectedReturnDate("");
                            setTransferMaintenanceReason("");
                            setTransferSourceStatus("active");
                          }
                        }}
                        className={`rounded-2xl border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                          transferChangeType === option.value ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"
                        }`}
                      >
                        <p className="text-sm font-bold text-[#1a2d52]">{option.title}</p>
                        <p className="mt-1 text-xs font-semibold text-[#61779d]">{option.description}</p>
                      </button>
                    ))}
                  </div>

                  {isTemporaryMaintenanceTransfer ? (
                    <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
                      <label className="block text-sm font-semibold text-orange-700">Ngày dự kiến hoàn tất bảo trì *</label>
                      <DateField
                        value={transferExpectedReturnDate}
                        min={getLocalDateValue()}
                        onChange={(event) => {
                          setTransferExpectedReturnDate(event.target.value);
                          setTransferBedError("");
                        }}
                        className="mt-2 h-10 border-orange-200 focus:border-orange-400 focus:ring-orange-100"
                        required
                      />
                      <label className="mt-3 block text-sm font-semibold text-orange-700">Lý do bảo trì *</label>
                      <textarea
                        value={transferMaintenanceReason}
                        onChange={(event) => {
                          setTransferMaintenanceReason(event.target.value);
                          setTransferBedError("");
                        }}
                        rows={3}
                        className="mt-2 w-full resize-none rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        placeholder="Gãy thanh chắn, hỏng khung giường, sơn sửa giường, thay mới thiết bị..."
                        required
                      />
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <p className="text-sm font-bold uppercase text-[#1a2d52]">Kết quả sau khi lưu</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold text-[#61779d]">Sinh viên:</p>
                        <p className="font-bold text-[#1a2d52]">{editingBedDetail.student.full_name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#61779d]">Giường gốc:</p>
                        <p className="font-bold text-[#1a2d52]">Giường {editingBed.bed.bed_number}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#61779d]">Giường mới:</p>
                        <p className="font-bold text-[#1a2d52]">{selectedTransferTargetBed ? `Giường ${selectedTransferTargetBed.bed_number}` : "Chưa chọn"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#61779d]">Trạng thái:</p>
                        <p className="font-bold text-[#1a2d52]">{isTemporaryMaintenanceTransfer ? "Đang ở tạm" : "Đã chuyển vĩnh viễn"}</p>
                      </div>
                      {isTemporaryMaintenanceTransfer ? (
                        <div className="sm:col-span-2">
                          <p className="text-xs font-semibold text-[#61779d]">Ngày dự kiến quay lại:</p>
                          <p className="font-bold text-[#1a2d52]">{formatPreviewDate(transferExpectedReturnDate)}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {transferTargetBeds.length === 0 ? <p className="mt-3 text-sm font-semibold text-amber-700">Phòng này hiện không có giường trống để chuyển.</p> : null}
                  {transferBedError ? <p className="mt-3 text-sm font-semibold text-red-600">{transferBedError}</p> : null}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
                  <button type="button" onClick={closeEditBed} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleTransferBed}
                    disabled={isTransferringBed || transferTargetBeds.length === 0}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold text-white ${
                      isTransferringBed || transferTargetBeds.length === 0
                        ? "cursor-not-allowed bg-slate-300"
                        : "bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_45%,#1f46ad_100%)]"
                    }`}
                  >
                    {isTransferringBed ? "Đang chuyển..." : "Xác nhận chuyển"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isRoomModalOpen
        ? createPortal(
            <div className="fixed inset-0 z-70">
              <div className="absolute inset-0 bg-slate-950/35" onClick={closeRoomModal} />

              <div className="fixed left-1/2 top-1/2 z-80 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 transform max-h-[88vh] overflow-y-auto rounded-3xl border border-[#d5e2f5] bg-white p-5 shadow-2xl sm:p-6">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#1a2d52]">
                      {editingRoomId ? "Cập nhật phòng" : "Thêm phòng mới"}
                    </h3>
                    <p className="mt-1 text-sm text-[#61779d]">Nhập thông tin phòng và sức chứa thực tế của từng phòng.</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeRoomModal}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmitRoom} className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-slate-600">Tòa <span className="ml-1 text-red-500">*</span></label>
                      <SelectField
                        value={roomForm.building_code}
                        disabled={Boolean(editingRoomId) || buildingOptions.length === 0}
                        onChange={(event) => {
                          const newCode = event.target.value;
                          const nextFloors = getFloorNumbersByBuilding(buildings, newCode);
                          setRoomForm((prev) => ({
                            ...prev,
                            building_code: newCode,
                            floor_number: nextFloors.includes(prev.floor_number) ? prev.floor_number : nextFloors[0] ?? 0,
                          }));
                          setRoomValidationErrors({});
                        }}
                      >
                        {buildingOptions.length > 0 ? (
                          buildingOptions.map((buildingCode) => (
                            <option key={buildingCode} value={buildingCode}>
                              Tòa {buildingCode}
                            </option>
                          ))
                        ) : (
                          <option value="">Chưa có tòa</option>
                        )}
                      </SelectField>
                      {roomSubmitAttempted && roomValidationErrors.building_code ? (
                        <div className="mt-1 text-xs text-red-600">{roomValidationErrors.building_code}</div>
                      ) : null}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-600">Tầng <span className="ml-1 text-red-500">*</span></label>
                      <SelectField
                        value={String(roomForm.floor_number)}
                        disabled={Boolean(editingRoomId) || roomFormFloorOptions.length === 0}
                        onChange={(event) => setRoomForm((prev) => ({ ...prev, floor_number: Number(event.target.value) }))}
                      >
                        {roomFormFloorOptions.length > 0 ? (
                          roomFormFloorOptions.map((f) => (
                            <option key={f} value={f}>
                              Tầng {f}
                            </option>
                          ))
                        ) : (
                          <option value={0}>Chưa có tầng</option>
                        )}
                      </SelectField>
                      <p className="mt-1 text-xs text-slate-500">
                        Giới tính áp dụng: {genderLabel[getFloorGenderByLocation(buildings, roomForm.building_code, roomForm.floor_number) ?? "MALE"]}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-600">Số phòng <span className="ml-1 text-red-500">*</span></label>
                      <div className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-700 shadow-sm flex items-center">
                        {autoGeneratedRoomNumber}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Phòng được đánh số tự động theo tòa và tầng đã chọn.
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-600">Sức chứa (số giường) <span className="ml-1 text-red-500">*</span></label>
                      <InputField
                        type="number"
                        min={1}
                        step={1}
                        value={roomForm.capacity}
                        onChange={(event) => {
                          setRoomForm((prev) => ({ ...prev, capacity: event.target.value }));
                          setRoomFormError("");
                        }}
                        placeholder="Ví dụ: 12, 14, 16"
                      />
                      {oddCapacityError ? (
                        <div className="mt-1 text-xs text-red-600">{oddCapacityError}</div>
                      ) : null}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-slate-600">Trạng thái <span className="ml-1 text-red-500">*</span></label>
                      <SelectField
                        value={roomForm.status}
                        onChange={(event) => {
                          setRoomForm((prev) => ({ ...prev, status: event.target.value as RoomStatus }));
                          setRoomFormError("");
                        }}
                      >
                        <option value="AVAILABLE">Còn trống</option>
                        <option value="FULL">Đầy</option>
                        <option value="MAINTENANCE">Bảo trì</option>
                      </SelectField>
                      {isRoomStatusBlocked ? (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs font-medium text-amber-700">
                            {blockedStatusMessage}
                          </p>
                          {isFullBlocked && isEmptyBedsFullError ? (
                            <button
                              type="button"
                              onClick={handleGoToAssignRoom}
                              className="inline-flex h-8 items-center justify-center rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white transition hover:bg-amber-700"
                            >
                              Đi tới Phân phòng
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {isMaintenancePlanningRequired ? (
                      <div className="sm:col-span-2 space-y-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <div>
                          <p className="font-bold">Phòng hiện đang có sinh viên lưu trú</p>
                          <p className="mt-1">
                            Phòng này có {formOccupiedBeds} sinh viên đang ở.
                          </p>
                          <p className="mt-1">
                            Để đưa phòng vào bảo trì, cần di dời toàn bộ sinh viên sang vị trí tạm thời.
                          </p>
                          <p className="mt-1">
                            Sau khi bảo trì hoàn tất, hệ thống sẽ hỗ trợ hoàn nguyên về phòng cũ.
                          </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="text-sm font-medium text-amber-950">Lý do bảo trì <span className="ml-1 text-red-500">*</span></label>
                            <textarea
                              value={roomForm.maintenance_reason}
                              onChange={(event) => {
                                setRoomForm((prev) => ({ ...prev, maintenance_reason: event.target.value }));
                                setRoomFormError("");
                              }}
                              rows={3}
                              className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                              placeholder="Ví dụ: Sửa hệ thống điện"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-amber-950">Ngày bắt đầu <span className="ml-1 text-red-500">*</span></label>
                            <InputField
                              type="date"
                              value={roomForm.maintenance_start_date}
                              min={getLocalDateValue()}
                              onChange={(event) => {
                                setRoomForm((prev) => ({ ...prev, maintenance_start_date: event.target.value }));
                                setRoomFormError("");
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-amber-950">Ngày dự kiến hoàn thành <span className="ml-1 text-red-500">*</span></label>
                            <InputField
                              type="date"
                              value={roomForm.maintenance_expected_end_date}
                              min={roomForm.maintenance_start_date || getLocalDateValue()}
                              onChange={(event) => {
                                setRoomForm((prev) => ({ ...prev, maintenance_expected_end_date: event.target.value }));
                                setRoomFormError("");
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {roomFormError ? (
                    <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                      <p className="text-sm font-medium text-red-700">{roomFormError}</p>
                      {isEmptyBedsFullError ? (
                        <button
                          type="button"
                          onClick={handleGoToAssignRoom}
                          className="inline-flex h-8 items-center justify-center rounded-lg bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700"
                        >
                          Đi tới Phân phòng
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={closeRoomModal}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isRoomSubmitBlocked}
                      title={isRoomStatusBlocked ? blockedStatusMessage : undefined}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#1f5fd1_0%,#244cb8_42%,#31b7d4_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(36,76,184,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100"
                    >
                      {isMaintenancePlanningRequired ? "Tiếp tục lập kế hoạch di dời" : editingRoomId ? "Lưu thay đổi" : "Thêm phòng"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </motion.section>
  );
}

