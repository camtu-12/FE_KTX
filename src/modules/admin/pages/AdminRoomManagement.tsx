import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BedSingle,
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
import { useOutletContext, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";
import { listRooms, createRoom, updateRoom, deleteRoom, updateBedStatus } from "../../../api/roomApi";
import { getBuilding, listBuildings } from "../../../api/buildingApi";
import type { Building } from "../../../types/building";

type RoomStatus = "AVAILABLE" | "FULL" | "MAINTENANCE";
type BedStatus = "ACTIVE" | "MAINTENANCE";
type BedPosition = "UPPER" | "LOWER";
type RoomGender = "MALE" | "FEMALE";

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
};

type BedPair = {
  pairNumber: number;
  upper: Bed;
  lower: Bed;
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

const bedStatusMeta: Record<BedStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: "Trống",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  MAINTENANCE: {
    label: "Bảo trì",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

const maintenanceRoomBedMeta = {
  label: "Tạm ngưng sử dụng",
  className: "border-amber-200 bg-amber-50 text-amber-700",
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
};

function isBedEffectivelyOccupied(bed: Pick<Bed, "id" | "occupied">) {
  return Boolean(bed.occupied);
}

function getRoomOccupiedBeds(room: Room) {
  return room.beds.filter(isBedEffectivelyOccupied).length;
}

function getEmptyBeds(room: Room) {
  return Math.max(room.capacity - getRoomOccupiedBeds(room) - getRoomMaintenanceBeds(room), 0);
}

function getRoomMaintenanceBeds(room: Room) {
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

function getBedDisplayStatus(room: Room, bed: Bed): string {
  if (room.status === "MAINTENANCE") {
    return "Tạm ngưng sử dụng";
  }
  if (bed.status === "MAINTENANCE") {
    return "Bảo trì";
  }
  if (isBedEffectivelyOccupied(bed)) {
    return "Có người";
  }
  return "Trống";
}

function getRoomCode(room: Pick<Room, "building_code" | "room_number">) {
  return `${room.building_code}${room.room_number}`;
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

function toBedPairs(beds: Bed[]): BedPair[] {
  const pairs: BedPair[] = [];

  for (let index = 0; index < beds.length; index += 2) {
    const pairNumber = index / 2 + 1;
    const upper = beds[index];
    const lower = beds[index + 1];

    if (upper && lower) {
      pairs.push({ pairNumber, upper, lower });
    }
  }

  return pairs;
}

function InputField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-[#244cb8] focus:ring-4 focus:ring-[#244cb8]/10 ${props.className ?? ""}`}
    />
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

export default function AdminRoomManagement() {
  const { headerSearchValue } = useOutletContext<AdminLayoutOutletContext>();
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
      } catch (err) {
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const [editingBed, setEditingBed] = useState<{
    roomId: number | null;
    bed: Bed | null;
  } | null>(null);
  const [editingBedStatus, setEditingBedStatus] = useState<BedStatus>("ACTIVE");
  const [editingBedError, setEditingBedError] = useState("");

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

  const selectedRoomBedPairs = useMemo(() => {
    if (!selectedRoom) {
      return [];
    }
    return toBedPairs(selectedRoom.beds);
  }, [selectedRoom]);

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

  const isMaintenanceBlocked = roomForm.status === "MAINTENANCE" && formOccupiedBeds > 0;
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

  const isRoomStatusBlocked = Boolean(
    isMaintenanceBlocked || isFullBlocked || isAvailableBlocked || isCapacityTooSmall,
  );
  const isRoomSubmitBlocked = Boolean(isRoomStatusBlocked || isCapacityInvalid || isCapacityOdd);

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

    if (isMaintenanceBlocked) {
      return `Phòng đang có ${formOccupiedBeds} sinh viên ở. Cần di dời trước khi chuyển sang BẢO TRÌ.`;
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
    isMaintenanceBlocked,
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

    if (roomForm.status === "MAINTENANCE" && formOccupiedBeds > 0) {
      setRoomFormError(
        `Không được chuyển phòng sang BẢO TRÌ khi phòng không có sinh viên ở. Hiện đang có ${formOccupiedBeds} sinh viên.`,
      );
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
      const building = await getBuilding(normalizedBuildingCode);
      const floorObj = building.floors.find((f) => f.floorNumber === roomForm.floor_number);
      if (!floorObj || !floorObj.id) {
        setRoomFormError("Không tìm thấy tầng tương ứng trên hệ thống.");
        return;
      }

      const payload = {
        floor_id: floorObj.id,
        room_number: normalizedRoomNumber,
        capacity: nextCapacity,
        status: roomForm.status === "MAINTENANCE" ? "maintenance" : "active",
      } as any;

      if (editingRoomId) {
        const updated = await updateRoom(editingRoomId, payload);
        setRooms((prev) => prev.map((r) => (r.id === updated.id ? (updated as unknown as RoomWithBeds) : r)));
      } else {
        const created = await createRoom(payload);
        setRooms((prev) => [(created as unknown as RoomWithBeds), ...prev]);
      }

      closeRoomModal();
    } catch (err: any) {
      setRoomFormError(err?.response?.data?.message ?? "Lỗi khi lưu phòng");
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

    showConfirm(`Bạn có chắc muốn xóa phòng ${room.room_number}?`, () => {
        (async () => {
          try {
            await deleteRoom(room.id);
            setRooms((prevRooms) => prevRooms.filter((item) => item.id !== room.id));
            if (selectedRoom?.id === room.id) {
              setIsBedsModalOpen(false);
              setSelectedRoom(null);
            }
          } catch (err) {
            showConfirm("Lỗi khi xóa phòng. Vui lòng thử lại.", () => {});
          }
        })();
    });
  };

  const handleViewBeds = (room: RoomWithBeds) => {
    setSelectedRoom(room);
    setIsBedsModalOpen(true);
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

    // Kiểm tra ràng buộc chuyển trạng thái
    if (isBedEffectivelyOccupied(editingBed.bed) && editingBedStatus === "MAINTENANCE") {
      return "Giường đang có sinh viên ở nên không thể chuyển sang bảo trì.";
    }

    return "";
  }

  function openEditBed(bed: Bed, roomId: number) {
    setEditingBed({ roomId, bed });
    setEditingBedStatus(bed.status);
    setEditingBedError("");
  }

  function closeEditBed() {
    setEditingBed(null);
    setEditingBedError("");
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
    (async () => {
      try {
        const payload = { status: editingBedStatus === "MAINTENANCE" ? "maintenance" : "empty" } as any;
        const updatedRoom = await updateBedStatus(roomId, bed.id, payload);
        setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? (updatedRoom as unknown as RoomWithBeds) : r)));
        if (selectedRoom?.id === updatedRoom.id) {
          setSelectedRoom(updatedRoom as unknown as RoomWithBeds);
          setIsBedsModalOpen(true);
        }
        closeEditBed();
      } catch (err: any) {
        setEditingBedError(err?.response?.data?.message ?? "Lỗi khi cập nhật giường");
      }
    })();
  }

  const closeBedsModal = () => {
    setIsBedsModalOpen(false);
    setSelectedRoom(null);
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

        <div className="rounded-[20px] border border-[#d8e4f5] bg-white px-6 py-10 text-center">
          <div className="text-sm text-[#62789f]">Đang tải dữ liệu, vui lòng chờ...</div>
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
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
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

              <div className="relative z-70 flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#d5e2f5] bg-white shadow-2xl max-h-[88vh]">
                <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-gutter:stable_both-edges]">
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white p-5 sm:p-6">
                    <div>
                      <h3 className="text-xl font-bold text-[#1a2d52]">Danh sách giường - Phòng {getRoomCode(selectedRoom)}</h3>
                      <p className="mt-1 text-sm text-[#61779d]">Phòng này có {selectedRoom.capacity} giường, danh sách bên dưới phản ánh đúng sức chứa hiện tại.</p>
                    </div>
                    <button
                      type="button"
                      onClick={closeBedsModal}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-5 pt-0 sm:p-6 sm:pt-0">
                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {selectedRoomBedPairs.map((pair) => (
                    <div
                      key={pair.pairNumber}
                      className="rounded-2xl border border-[#d8e4f5] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 shadow-sm"
                    >
                      <div className="mt-3 space-y-2">
                                {[pair.upper, pair.lower].map((bed) => (
                                  <div
                                    key={bed.id}
                                    className="flex cursor-pointer items-center justify-between rounded-xl border border-[#e3ebf8] bg-white px-3 py-2"
                                    onClick={() => openEditBed(bed, selectedRoom.id)}
                                  >
                            <div>
                              <p className="text-sm font-semibold text-[#1f3152]">Giường {bed.bed_number}</p>
                              <p className="text-xs text-[#6f84ad]">Vị trí: {bed.position === "UPPER" ? "Trên" : "Dưới"}</p>
                            </div>
                                    {(() => {
                              const displayStatus = getBedDisplayStatus(selectedRoom, bed);
                              let meta = bedStatusMeta[bed.status];
                              
                              if (selectedRoom.status === "MAINTENANCE") {
                                meta = maintenanceRoomBedMeta;
                              } else if (isBedEffectivelyOccupied(bed)) {
                                meta = { label: "Có người", className: "border-blue-200 bg-blue-50 text-blue-700" };
                              }
                              
                              return (
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}
                                >
                                  {displayStatus}
                                </span>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                    </div>
                  </div>
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

      {editingBed && editingBed.bed
        ? createPortal(
            <div className="fixed inset-0 z-90 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/30" onClick={closeEditBed} />
              <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
                <h3 className="text-lg font-semibold">Chỉnh sửa giường {editingBed.bed.bed_number}</h3>
                
                {selectedRoom?.status === "MAINTENANCE" ? (
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-sm text-amber-700">
                      Phòng đang bảo trì. Vui lòng kích hoạt lại phòng trước khi chỉnh sửa giường.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3">
                    <label className="block text-sm text-slate-600">Trạng thái</label>
                    <select
                      value={editingBedStatus}
                      onChange={(e) => {
                        const nextStatus = e.target.value as BedStatus;
                        setEditingBedStatus(nextStatus);
                        
                        // Tính error dựa trên nextStatus
                        if (editingBed && editingBed.bed) {
                          setEditingBedError(
                            isBedEffectivelyOccupied(editingBed.bed) && nextStatus === "MAINTENANCE"
                              ? "Giường đang có sinh viên ở nên không thể chuyển sang bảo trì."
                              : "",
                          );
                        }
                      }}
                      className={`mt-2 w-full rounded-md border px-3 py-2 ${editingBedError ? "border-red-500 focus:border-red-500" : "border-slate-200"}`}
                    >
                      <option value="ACTIVE">Hoạt động</option>
                      <option value="MAINTENANCE">Bảo trì</option>
                    </select>
                    {editingBedError ? (
                      <p className="mt-2 text-sm text-red-600">{editingBedError}</p>
                    ) : null}
                  </div>
                )}

                <div className="mt-4 flex justify-end gap-3">
                  <button onClick={closeEditBed} className="rounded-xl border px-3 py-2 text-sm">
                    Hủy
                  </button>
                  <button
                    onClick={saveEditBed}
                    disabled={Boolean(editingBedError) || selectedRoom?.status === "MAINTENANCE"}
                    className={`rounded-xl px-3 py-2 text-sm text-white ${editingBedError || selectedRoom?.status === "MAINTENANCE" ? "bg-slate-300 cursor-not-allowed" : "bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_45%,#1f46ad_100%)]"}`}
                  >
                    Lưu
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
                        <p className="mt-2 text-xs font-medium text-amber-700">
                          {blockedStatusMessage}
                        </p>
                      ) : null}
                    </div>

                    
                  </div>

                  {roomFormError ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                      {roomFormError}
                    </p>
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
                      {editingRoomId ? "Lưu thay đổi" : "Thêm phòng"}
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

