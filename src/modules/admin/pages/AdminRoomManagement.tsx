import { useMemo, useState, useEffect } from "react";
import {
  BedDouble,
  Building2,
  DoorOpen,
  Eye,
  Pencil,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { createPortal } from "react-dom";
import type { AdminLayoutOutletContext } from "../../../layouts/AdminLayout";

type RoomStatus = "AVAILABLE" | "FULL" | "MAINTENANCE";
type BedStatus = "EMPTY" | "OCCUPIED" | "MAINTENANCE";
type BedPosition = "UPPER" | "LOWER";
type RoomGender = "MALE" | "FEMALE" | "MIXED";

type Room = {
  id: number;
  building_code: string;
  room_number: string;
  gender: RoomGender;
  capacity: number;
  occupied_beds: number;
  status: RoomStatus;
};

type Bed = {
  id: number;
  bed_number: string;
  position: BedPosition;
  status: BedStatus;
};

type RoomWithBeds = Room & {
  beds: Bed[];
};

type RoomFormState = {
  building_code: string;
  room_number: string;
  gender: RoomGender;
  status: RoomStatus;
};

type BedPair = {
  pairNumber: number;
  upper: Bed;
  lower: Bed;
};

const ROOM_CAPACITY = 14;

const statusMeta: Record<RoomStatus, { label: string; className: string }> = {
  AVAILABLE: {
    label: "AVAILABLE",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  FULL: {
    label: "FULL",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  MAINTENANCE: {
    label: "MAINTENANCE",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

const bedStatusMeta: Record<BedStatus, { label: string; className: string }> = {
  EMPTY: {
    label: "EMPTY",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  OCCUPIED: {
    label: "OCCUPIED",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  MAINTENANCE: {
    label: "MAINTENANCE",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

const genderLabel: Record<RoomGender, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  MIXED: "Hỗn hợp",
};

const initialFormState: RoomFormState = {
  building_code: "A",
  room_number: "",
  gender: "MALE",
  status: "AVAILABLE",
};

function createBeds(roomId: number, occupiedBeds: number, maintenanceBeds: number[] = []): Bed[] {
  return Array.from({ length: ROOM_CAPACITY }, (_, index) => {
    const bedIndex = index + 1;
    const isMaintenance = maintenanceBeds.includes(bedIndex);

    let status: BedStatus = "EMPTY";
    if (isMaintenance) {
      status = "MAINTENANCE";
    } else if (bedIndex <= occupiedBeds) {
      status = "OCCUPIED";
    }

    return {
      id: roomId * 100 + bedIndex,
      bed_number: String(bedIndex),
      position: bedIndex % 2 === 1 ? "UPPER" : "LOWER",
      status,
    };
  });
}

const initialRooms: RoomWithBeds[] = [
  {
    id: 1,
    building_code: "A",
    room_number: "101",
    gender: "MALE",
    capacity: ROOM_CAPACITY,
    occupied_beds: 6,
    status: "AVAILABLE",
    beds: createBeds(1, 6),
  },
  {
    id: 2,
    building_code: "A",
    room_number: "102",
    gender: "FEMALE",
    capacity: ROOM_CAPACITY,
    occupied_beds: 14,
    status: "FULL",
    beds: createBeds(2, 14),
  },
  {
    id: 3,
    building_code: "B",
    room_number: "201",
    gender: "MALE",
    capacity: ROOM_CAPACITY,
    occupied_beds: 8,
    status: "AVAILABLE",
    beds: createBeds(3, 8, [14]),
  },
  {
    id: 4,
    building_code: "B",
    room_number: "202",
    gender: "FEMALE",
    capacity: ROOM_CAPACITY,
    occupied_beds: 10,
    status: "MAINTENANCE",
    beds: createBeds(4, 10, [5, 12]),
  },
  {
    id: 5,
    building_code: "C",
    room_number: "301",
    gender: "MIXED",
    capacity: ROOM_CAPACITY,
    occupied_beds: 4,
    status: "AVAILABLE",
    beds: createBeds(5, 4),
  },
  {
    id: 6,
    building_code: "C",
    room_number: "302",
    gender: "FEMALE",
    capacity: ROOM_CAPACITY,
    occupied_beds: 14,
    status: "FULL",
    beds: createBeds(6, 14),
  },
];

function getOccupiedBeds(beds: Bed[]) {
  return beds.filter((bed) => bed.status === "OCCUPIED").length;
}

function getRoomCode(room: Pick<Room, "building_code" | "room_number">) {
  return `${room.building_code}${room.room_number}`;
}

function getFloorFromRoomNumber(roomNumber: string) {
  const numeric = roomNumber.replace(/\D/g, "");
  if (!numeric) {
    return 0;
  }
  return Number(numeric.charAt(0));
}

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
  const [rooms, setRooms] = useState<RoomWithBeds[]>(initialRooms);
  const [filterBuilding, setFilterBuilding] = useState<string>("all");
  const [filterFloor, setFilterFloor] = useState<string>("all");
  const [filterGender, setFilterGender] = useState<"all" | RoomGender>("all");

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormState>(initialFormState);
  const [roomFormError, setRoomFormError] = useState("");

  const [isBedsModalOpen, setIsBedsModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomWithBeds | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const [editingBed, setEditingBed] = useState<{
    roomId: number | null;
    bed: Bed | null;
  } | null>(null);
  const [editingBedStatus, setEditingBedStatus] = useState<BedStatus>("EMPTY");

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

  const buildingOptions = useMemo(() => {
    const buildings = new Set(rooms.map((room) => room.building_code));
    return Array.from(buildings).sort();
  }, [rooms]);

  const floorOptions = useMemo(() => {
    const floors = new Set(rooms.map((room) => getFloorFromRoomNumber(room.room_number)).filter((floor) => floor > 0));
    return Array.from(floors).sort((a, b) => a - b);
  }, [rooms]);

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
      const roomFloor = getFloorFromRoomNumber(room.room_number);
      const matchedBuilding = filterBuilding === "all" ? true : room.building_code === filterBuilding;
      const matchedFloor = filterFloor === "all" ? true : roomFloor === Number(filterFloor);
      const matchedGender = filterGender === "all" ? true : room.gender === filterGender;
      return matchedKeyword && matchedBuilding && matchedFloor && matchedGender;
    });
  }, [rooms, headerSearchValue, filterBuilding, filterFloor, filterGender]);

  const totalRooms = filteredRooms.length;
  const totalBeds = filteredRooms.reduce((sum, room) => sum + room.capacity, 0);
  const totalOccupiedBeds = filteredRooms.reduce((sum, room) => sum + getOccupiedBeds(room.beds), 0);
  const totalEmptyBeds = totalBeds - totalOccupiedBeds;

  const resetRoomForm = () => {
    setRoomForm(initialFormState);
    setRoomFormError("");
    setEditingRoomId(null);
  };

  const openAddRoomModal = () => {
    resetRoomForm();
    setIsRoomModalOpen(true);
  };

  const openEditRoomModal = (room: RoomWithBeds) => {
    setEditingRoomId(room.id);
    setRoomForm({
      building_code: room.building_code,
      room_number: room.room_number,
      gender: room.gender,
      status: room.status,
    });
    setRoomFormError("");
    setIsRoomModalOpen(true);
  };

  const closeRoomModal = () => {
    setIsRoomModalOpen(false);
    resetRoomForm();
  };

  const validateRoomForm = () => {
    const normalizedRoomNumber = roomForm.room_number.trim().toUpperCase();
    const normalizedBuildingCode = roomForm.building_code.trim().toUpperCase();

    if (!normalizedRoomNumber) {
      return "Vui lòng nhập số phòng.";
    }

    if (!normalizedBuildingCode) {
      return "Vui lòng chọn tòa.";
    }

    const duplicated = rooms.some((room) => {
      if (editingRoomId && room.id === editingRoomId) {
        return false;
      }
      return (
        room.building_code.trim().toUpperCase() === normalizedBuildingCode
        && room.room_number.trim().toUpperCase() === normalizedRoomNumber
      );
    });

    if (duplicated) {
      return "Phòng đã tồn tại trong tòa này. Vui lòng kiểm tra lại.";
    }

    return "";
  };

  const handleSubmitRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateRoomForm();
    if (validationError) {
      setRoomFormError(validationError);
      return;
    }

    const normalizedBuildingCode = roomForm.building_code.trim().toUpperCase();
    const normalizedRoomNumber = roomForm.room_number.trim().toUpperCase();

    if (editingRoomId) {
      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          if (room.id !== editingRoomId) {
            return room;
          }

          return {
            ...room,
            building_code: normalizedBuildingCode,
            room_number: normalizedRoomNumber,
            gender: roomForm.gender,
            capacity: ROOM_CAPACITY,
            occupied_beds: getOccupiedBeds(room.beds),
            status: roomForm.status,
            beds: room.beds,
          };
        }),
      );
    } else {
      const nextId = rooms.length > 0 ? Math.max(...rooms.map((room) => room.id)) + 1 : 1;
      const nextBeds = createBeds(nextId, 0);

      setRooms((prevRooms) => [
        {
          id: nextId,
          building_code: normalizedBuildingCode,
          room_number: normalizedRoomNumber,
          gender: roomForm.gender,
          capacity: ROOM_CAPACITY,
          occupied_beds: 0,
          status: roomForm.status,
          beds: nextBeds,
        },
        ...prevRooms,
      ]);
    }

    closeRoomModal();
  };

  const handleDeleteRoom = (room: RoomWithBeds) => {
    showConfirm(`Bạn có chắc muốn xóa phòng ${room.room_number}?`, () => {
      setRooms((prevRooms) => prevRooms.filter((item) => item.id !== room.id));
      if (selectedRoom?.id === room.id) {
        setIsBedsModalOpen(false);
        setSelectedRoom(null);
      }
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

  function openEditBed(bed: Bed, roomId: number) {
    setEditingBed({ roomId, bed });
    setEditingBedStatus(bed.status);
  }

  function closeEditBed() {
    setEditingBed(null);
  }

  function saveEditBed() {
    if (!editingBed || !editingBed.bed) return;
    const { roomId, bed } = editingBed;

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const updatedBeds = r.beds.map((b) => (b.id === bed.id ? { ...b, status: editingBedStatus } : b));
        const occupied = updatedBeds.filter((b) => b.status === "OCCUPIED").length;
        return { ...r, beds: updatedBeds, occupied_beds: occupied };
      }),
    );

    // nếu đang sửa phòng hiện được chọn, cập nhật tham chiếu selectedRoom
    if (selectedRoom?.id === roomId) {
      const updated = rooms.find((r) => r.id === roomId) ?? selectedRoom;
      setSelectedRoom(updated ?? null);
    }

    closeEditBed();
  }

  const closeBedsModal = () => {
    setIsBedsModalOpen(false);
    setSelectedRoom(null);
  };

  return (
    <section className="relative isolate space-y-6 rounded-[28px] border border-[#cfdbef] bg-[radial-gradient(circle_at_top_right,#ffffff_0%,#f3f8ff_55%,#eef4ff_100%)] p-4 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[28px]">
        <div className="absolute -left-20 top-0 h-56 w-56 rounded-full bg-[#244cb8]/10 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-[#31b7d4]/10 blur-3xl" />
      </div>

      <header className="rounded-2xl border border-[#d5e2f5] bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1a2d52] sm:text-3xl">Quản lý phòng</h1>
            <p className="mt-1 text-sm text-[#61779d]">Quản lý phòng, giường và trạng thái lưu trú trong ký túc xá.</p>
          </div>

          <button
            type="button"
            onClick={openAddRoomModal}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_45%,#1f46ad_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(36,76,184,0.28)] transition hover:-translate-y-0.5 hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Thêm phòng
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <SelectField
            value={filterBuilding}
            onChange={(event) => setFilterBuilding(event.target.value)}
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
            onChange={(event) => setFilterFloor(event.target.value)}
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
            onChange={(event) => setFilterGender(event.target.value as "all" | RoomGender)}
          >
            <option value="all">Tất cả giới tính</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
            <option value="MIXED">Hỗn hợp</option>
          </SelectField>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#d7e3f5] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#5f78a4]">Tổng phòng</p>
          <p className="mt-2 text-2xl font-bold text-[#1a2d52]">{totalRooms}</p>
        </article>
        <article className="rounded-2xl border border-[#d7e3f5] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#5f78a4]">Tổng giường</p>
          <p className="mt-2 text-2xl font-bold text-[#1a2d52]">{totalBeds}</p>
        </article>
        <article className="rounded-2xl border border-[#d7e3f5] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#5f78a4]">Đã sử dụng</p>
          <p className="mt-2 text-2xl font-bold text-[#1a2d52]">{totalOccupiedBeds}</p>
        </article>
        <article className="rounded-2xl border border-[#d7e3f5] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#5f78a4]">Giường trống</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{totalEmptyBeds}</p>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {filteredRooms.map((room) => {
          const occupiedBeds = getOccupiedBeds(room.beds);
          const emptyBeds = room.capacity - occupiedBeds;

          return (
            <article
              key={room.id}
              className="group rounded-3xl border border-[#cfdbef] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_38px_rgba(36,76,184,0.16)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#1a2d52]">Phòng {getRoomCode(room)}</h2>
                  <p className="mt-1 text-sm text-[#61779d]">
                    Tòa {room.building_code} • Tầng {getFloorFromRoomNumber(room.room_number)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta[room.status].className}`}
                >
                  {statusMeta[room.status].label}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  Giới tính áp dụng: <span className="font-semibold text-slate-700">{genderLabel[room.gender]}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  Cấu hình chuẩn: <span className="font-semibold text-slate-700">14 giường (7 cặp)</span>
                </p>
                <p className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-slate-400" />
                  Đã dùng/Tổng: <span className="font-semibold text-slate-700">{occupiedBeds}/{room.capacity}</span>
                </p>
                <p className="flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 text-slate-400" />
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

      {filteredRooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c9d8ef] bg-white/75 p-8 text-center text-sm text-[#61779d]">
          Không tìm thấy phòng phù hợp với bộ lọc hiện tại.
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
                      <p className="mt-1 text-sm text-[#61779d]">Mỗi phòng gồm 7 cặp giường, mỗi cặp có 1 giường trên và 1 giường dưới.</p>
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
                      <p className="text-sm font-semibold text-[#1f3152]">Cặp {pair.pairNumber}</p>
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
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${bedStatusMeta[bed.status].className}`}
                            >
                              {bedStatusMeta[bed.status].label}
                            </span>
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
                  <button onClick={closeConfirm} className="rounded-xl border px-3 py-2 text-sm">Cancel</button>
                  <button onClick={confirmNow} className="rounded-xl bg-red-600 px-3 py-2 text-sm text-white">OK</button>
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
                <div className="mt-3">
                  <label className="block text-sm text-slate-600">Trạng thái</label>
                  <select
                    value={editingBedStatus}
                    onChange={(e) => setEditingBedStatus(e.target.value as BedStatus)}
                    className="mt-2 w-full rounded-md border px-3 py-2"
                  >
                    <option value="EMPTY">EMPTY</option>
                    <option value="OCCUPIED">OCCUPIED</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button onClick={closeEditBed} className="rounded-xl border px-3 py-2 text-sm">Hủy</button>
                  <button onClick={saveEditBed} className="rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_45%,#1f46ad_100%)] px-3 py-2 text-sm text-white">Lưu</button>
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
                    <p className="mt-1 text-sm text-[#61779d]">Nhập thông tin phòng theo chuẩn quản lý ký túc xá.</p>
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
                      <label className="text-sm font-medium text-slate-600">Tòa</label>
                      <SelectField
                        value={roomForm.building_code}
                        onChange={(event) => setRoomForm((prev) => ({ ...prev, building_code: event.target.value }))}
                      >
                        {buildingOptions.length > 0 ? (
                          buildingOptions.map((buildingCode) => (
                            <option key={buildingCode} value={buildingCode}>
                              Tòa {buildingCode}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="A">Tòa A</option>
                            <option value="B">Tòa B</option>
                            <option value="C">Tòa C</option>
                          </>
                        )}
                      </SelectField>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-slate-600">Số phòng</label>
                      <InputField
                        value={roomForm.room_number}
                        onChange={(event) => setRoomForm((prev) => ({ ...prev, room_number: event.target.value }))}
                        placeholder="Ví dụ: 101"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-600">Giới tính</label>
                      <SelectField
                        value={roomForm.gender}
                        onChange={(event) => setRoomForm((prev) => ({ ...prev, gender: event.target.value as RoomGender }))}
                      >
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                        <option value="MIXED">Hỗn hợp</option>
                      </SelectField>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-600">Trạng thái phòng</label>
                      <SelectField
                        value={roomForm.status}
                        onChange={(event) => setRoomForm((prev) => ({ ...prev, status: event.target.value as RoomStatus }))}
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="FULL">FULL</option>
                        <option value="MAINTENANCE">MAINTENANCE</option>
                      </SelectField>
                    </div>

                    <div className="rounded-xl border border-[#dbe6f7] bg-[#f5f9ff] px-3 py-2 text-sm text-[#46608f]">
                      Sức chứa cố định theo nghiệp vụ: <span className="font-semibold">14 giường / phòng (7 cặp trên-dưới)</span>
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
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_45%,#1f46ad_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(36,76,184,0.28)] transition hover:-translate-y-0.5 hover:brightness-110"
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
    </section>
  );
}
