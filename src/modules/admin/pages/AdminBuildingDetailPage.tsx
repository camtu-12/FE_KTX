import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Funnel, Pencil, Plus, Trash2 } from "lucide-react";
import {
  initialBuildings,
  type Building,
  type BuildingFloor,
  type BuildingStatus,
  type FloorGender,
  type FloorStatus,
} from "../../../mocks/buildings";
import { initialRooms, hasOccupancy } from "../../../mocks/roommanagement";

const STORAGE_KEY = "ktx_buildings_dashboard_v2";
const ROOM_STORAGE_KEY = "ktx_rooms_dashboard_v2";

type RoomRecord = (typeof initialRooms)[number];

type RoomMetrics = {
  rooms: number;
  beds: number;
  students: number;
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-[24px] border border-[#d8e4f5] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-5 py-4 shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#7c8fb5]">{label}</p>
      <p className="mt-2 text-2xl font-extrabold leading-none text-[#1a2d52]">{value}</p>
    </article>
  );
}

function getRoomBuildingCode(room: RoomRecord) {
  return room.building_code ?? room.floor?.building_code ?? "";
}

function getRoomFloorNumber(room: RoomRecord) {
  if (typeof room.floor_number === "number") return room.floor_number;
  if (room.floor && typeof room.floor.floor_number === "number") return room.floor.floor_number;
  return 0;
}

function getRoomMetrics(rooms: RoomRecord[]) {
  return rooms.reduce<RoomMetrics>(
    (accumulator, room) => {
      accumulator.rooms += 1;
      accumulator.beds += room.beds.length;
      accumulator.students += room.beds.filter((bed) => hasOccupancy(bed.id)).length;
      return accumulator;
    },
    { rooms: 0, beds: 0, students: 0 },
  );
}

function getFloorMetricsFromRooms(rooms: RoomRecord[], floorNumber: number) {
  return getRoomMetrics(rooms.filter((room) => getRoomFloorNumber(room) === floorNumber));
}
function getFloorStatusLabel(status: FloorStatus) {
  if (status === "ACTIVE") return "Đang hoạt động";
  if (status === "MAINTENANCE") return "Bảo trì";
  return "Ngừng hoạt động";
}

function getStatusClass(status: BuildingStatus | FloorStatus) {
  if (status === "ACTIVE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "MAINTENANCE") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function getGenderLabel(gender: FloorGender) {
  return gender === "MALE" ? "Nam" : "Nữ";
}

export default function AdminBuildingDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = Number(params.buildingId || "");

  const [buildings, setBuildings] = useState<Building[]>(() => {
    if (typeof window === "undefined") return initialBuildings;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return initialBuildings;
      const parsed = JSON.parse(raw) as Building[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialBuildings;
    } catch {
      return initialBuildings;
    }
  });

  const [filterStatus, setFilterStatus] = useState<"all" | FloorStatus>("all");
  const [filterGender, setFilterGender] = useState<"all" | FloorGender>("all");
  const [filterFloor, setFilterFloor] = useState<"all" | number>("all");

  const [draftFilterStatus, setDraftFilterStatus] = useState<"all" | FloorStatus>("all");
  const [draftFilterGender, setDraftFilterGender] = useState<"all" | FloorGender>("all");
  const [draftFilterFloor, setDraftFilterFloor] = useState<"all" | number>("all");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isGenderFilterOpen, setIsGenderFilterOpen] = useState(false);
  const [isFloorFilterOpen, setIsFloorFilterOpen] = useState(false);
  const [statusFilterMenuPosition, setStatusFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [genderFilterMenuPosition, setGenderFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [floorFilterMenuPosition, setFloorFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const statusFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const genderFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const floorFilterButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      try {
        const parsed = JSON.parse(e.newValue ?? "null") as Building[] | null;
        if (Array.isArray(parsed)) {
          setBuildings(parsed);
        }
      } catch {
        // ignore parse errors
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!isStatusFilterOpen) return;

    const updateMenuPosition = () => {
      const buttonRect = statusFilterButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;
      setStatusFilterMenuPosition({
        top: buttonRect.bottom + 10,
        left: buttonRect.left + buttonRect.width / 2,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isStatusFilterOpen]);

  useEffect(() => {
    if (!isGenderFilterOpen) return;

    const updateMenuPosition = () => {
      const buttonRect = genderFilterButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;
      setGenderFilterMenuPosition({
        top: buttonRect.bottom + 10,
        left: buttonRect.left + buttonRect.width / 2,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isGenderFilterOpen]);

  useEffect(() => {
    if (!isFloorFilterOpen) return;

    const updateMenuPosition = () => {
      const buttonRect = floorFilterButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;

      setFloorFilterMenuPosition({
        top: buttonRect.bottom + 10,
        left: buttonRect.left + buttonRect.width / 2,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isFloorFilterOpen]);

  const building = useMemo(() => buildings.find((b) => b.id === id) ?? null, [buildings, id]);

  const [rooms, setRooms] = useState<RoomRecord[]>(() => {
    if (typeof window === "undefined") return initialRooms as RoomRecord[];
    try {
      const stored = window.localStorage.getItem(ROOM_STORAGE_KEY);
      if (!stored) return initialRooms as RoomRecord[];
      const parsed = JSON.parse(stored) as RoomRecord[];
      return Array.isArray(parsed) ? parsed : (initialRooms as RoomRecord[]);
    } catch {
      return initialRooms as RoomRecord[];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(rooms));
    } catch {
      // ignore storage write failures
    }
  }, [rooms]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== ROOM_STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as RoomRecord[];
        if (Array.isArray(parsed)) {
          setRooms(parsed);
        }
      } catch {
        // ignore invalid payloads from storage
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const [floorDialogMode, setFloorDialogMode] = useState<"create" | "edit" | null>(null);
  const [selectedFloorNumber, setSelectedFloorNumber] = useState<number | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [floorForm, setFloorForm] = useState<{
    floorNumber: number | "";
    gender: FloorGender;
    status: FloorStatus;
  }>({ floorNumber: "", gender: "MALE", status: "ACTIVE" });

  const closeFloorDialog = () => {
    setFloorDialogMode(null);
    setSelectedFloorNumber(null);
    setFloorForm({ floorNumber: "", gender: "MALE", status: "ACTIVE" });
  };

  const showConfirm = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setIsConfirmOpen(true);
  };

  const closeConfirm = () => {
    setIsConfirmOpen(false);
    setConfirmMessage("");
    setConfirmAction(null);
  };

  const confirmNow = () => {
    if (confirmAction) confirmAction();
    closeConfirm();
  };

  const openAddFloor = () => {
    if (!building) {
      setFloorDialogMode("create");
      return;
    }
    const maxFloor = building.floors.reduce((m, f) => Math.max(m, f.floorNumber), 0);
    const next = maxFloor + 1;
    setFloorForm((s) => ({ ...s, floorNumber: next }));
    setSelectedFloorNumber(null);
    setFloorDialogMode("create");
  };
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const openEditFloor = (floor: BuildingFloor) => {
    setSelectedFloorNumber(floor.floorNumber);
    setFloorForm({
      floorNumber: floor.floorNumber,
      gender: floor.gender,
      status: floor.status,
    });
    setFloorDialogMode("edit");
  };

  const deleteFloor = (floor: BuildingFloor) => {
    if (floor.occupiedStudents > 0) {
      showConfirm(`Không thể xóa tầng ${floor.floorNumber} vì đang có ${floor.occupiedStudents} sinh viên ở. Hãy chuyển sinh viên sang tầng khác trước.`, () => {});
      return;
    }

    showConfirm(`Bạn có chắc muốn xóa tầng ${floor.floorNumber} không?`, () => {
      if (!building) return;

      setBuildings((prev) => {
        const updated = prev.map((item) => {
          if (item.id !== building.id) return item;
          return { ...item, floors: item.floors.filter((itemFloor) => itemFloor.floorNumber !== floor.floorNumber) };
        });

        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }

        return updated;
      });

      if (floorDialogMode !== null) {
        closeFloorDialog();
      }

      setSuccessMessage(`Đã xóa tầng ${floor.floorNumber}`);
      setTimeout(() => setSuccessMessage(null), 3500);
    });
  };

  const saveFloor = () => {
    if (!building) return;
    const maxFloor = building.floors.reduce((m, f) => Math.max(m, f.floorNumber), 0);
    const expected = maxFloor + 1;
    const floorNumber = floorDialogMode === "edit" && selectedFloorNumber !== null ? selectedFloorNumber : expected; // enforce sequential addition for new floors

    if (floorDialogMode !== "edit" && building.floors.some((f) => f.floorNumber === floorNumber)) {
      alert("Tầng này đã tồn tại trong tòa.");
      return;
    }

    const floorMetrics = getFloorMetricsFromRooms(
      rooms.filter((room) => getRoomBuildingCode(room) === building.building_code),
      floorNumber,
    );

    const newFloor: BuildingFloor = {
      floorNumber,
      gender: floorForm.gender,
      roomCount: floorMetrics.rooms,
      bedCount: floorMetrics.rooms > 0 ? Math.max(1, Math.floor(floorMetrics.beds / floorMetrics.rooms)) : 0,
      occupiedStudents: floorMetrics.students,
      status: floorForm.status,
    };

    setBuildings((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== building.id) return b;
        if (floorDialogMode === "edit") {
          return {
            ...b,
            floors: b.floors.map((floor) => (floor.floorNumber === floorNumber ? newFloor : floor)),
          };
        }
        return { ...b, floors: [...b.floors, newFloor] };
      });
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    closeFloorDialog();
    setSuccessMessage(floorDialogMode === "edit" ? `Đã cập nhật tầng ${floorNumber}` : `Thiết lập tầng ${floorNumber} thành công`);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const filteredFloors = useMemo(() => {
    if (!building) return [];
    return building.floors.filter((floor) => {
      const matchedStatus = filterStatus === "all" ? true : floor.status === filterStatus;
      const matchedGender = filterGender === "all" ? true : floor.gender === filterGender;
      const matchedFloor = filterFloor === "all" ? true : floor.floorNumber === filterFloor;
      return matchedStatus && matchedGender && matchedFloor;
    });
  }, [building, filterGender, filterStatus, filterFloor]);

  const buildingRooms = useMemo(
    () => rooms.filter((room) => building && getRoomBuildingCode(room) === building.building_code),
    [building, rooms],
  );

  const floorMetricsByNumber = useMemo(() => {
    const metrics = new Map<number, RoomMetrics>();

    buildingRooms.forEach((room) => {
      const floorNumber = getRoomFloorNumber(room);
      if (!floorNumber) return;

      const current = metrics.get(floorNumber) ?? { rooms: 0, beds: 0, students: 0 };
      current.rooms += 1;
      current.beds += room.beds.length;
      current.students += room.beds.filter((bed) => hasOccupancy(bed.id)).length;
      metrics.set(floorNumber, current);
    });

    return metrics;
  }, [buildingRooms]);

  const getFloorMetrics = (floorNumber: number) => floorMetricsByNumber.get(floorNumber) ?? { rooms: 0, beds: 0, students: 0 };

  const filteredMetrics = useMemo(
    () =>
      filteredFloors.reduce(
        (accumulator, floor) => {
          const metrics = floorMetricsByNumber.get(floor.floorNumber) ?? { rooms: 0, beds: 0, students: 0 };
          accumulator.rooms += metrics.rooms;
          accumulator.beds += metrics.beds;
          accumulator.students += metrics.students;
          return accumulator;
        },
        { rooms: 0, beds: 0, students: 0 },
      ),
    [filteredFloors, floorMetricsByNumber],
  );

  const openStatusFilter = () => {
    setDraftFilterStatus(filterStatus);
    setIsStatusFilterOpen(true);
  };

  const resetStatusFilter = () => {
    setDraftFilterStatus("all");
    setFilterStatus("all");
    setIsStatusFilterOpen(false);
  };

  const applyStatusFilter = () => {
    setFilterStatus(draftFilterStatus);
    setIsStatusFilterOpen(false);
  };

  const openGenderFilter = () => {
    setDraftFilterGender(filterGender);
    setIsGenderFilterOpen(true);
  };

  const openFloorFilter = () => {
    setDraftFilterFloor(filterFloor);
    setIsFloorFilterOpen(true);
  };

  const resetFloorFilter = () => {
    setDraftFilterFloor("all");
    setFilterFloor("all");
    setIsFloorFilterOpen(false);
  };

  const applyFloorFilter = () => {
    setFilterFloor(draftFilterFloor);
    setIsFloorFilterOpen(false);
  };

  const resetGenderFilter = () => {
    setDraftFilterGender("all");
    setFilterGender("all");
    setIsGenderFilterOpen(false);
  };

  const applyGenderFilter = () => {
    setFilterGender(draftFilterGender);
    setIsGenderFilterOpen(false);
  };

  const resetAllFilters = () => {
    setDraftFilterStatus("all");
    setDraftFilterGender("all");
    setDraftFilterFloor("all");
    setFilterStatus("all");
    setFilterGender("all");
    setFilterFloor("all");
    setIsStatusFilterOpen(false);
    setIsGenderFilterOpen(false);
    setIsFloorFilterOpen(false);
  };

  if (!building) {
    return (
      <section className="relative isolate flex min-h-[calc(100vh-8rem)] flex-col gap-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[24px]">
          <div className="absolute -left-20 top-0 h-56 w-56 rounded-full bg-[#244cb8]/10 blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-[#31b7d4]/10 blur-3xl" />
        </div>

        <header className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
          <div className="relative pl-16 sm:pl-20">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Quay lại"
              title="Quay lại"
              className="absolute left-0 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#c4d7f2] bg-white/90 text-[#40619a] shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-[#9cb9e7] hover:text-[#244cb8]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Không tìm thấy tòa</h1>
              <p className="mt-1 text-sm text-[#62789f]">Tòa nhà bạn chọn không tồn tại hoặc đã bị xóa.</p>
            </div>
          </div>
        </header>

        <div className="rounded-[24px] border border-[#d7e3f5] bg-white p-5 shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
          <p className="text-lg font-bold text-[#1a2d52]">Không tìm thấy tòa</p>
          <p className="mt-2 text-sm text-[#61779d]">Vui lòng quay lại trang quản lý tòa để chọn tòa khác.</p>
        </div>
      </section>
    );
  }

  // overallMetrics removed (previously used by the overview summary which was deleted)

  const navigateToRoomManagement = (floor: BuildingFloor) => {
    const params = new URLSearchParams();
    params.set("building", building.building_code);
    params.set("floor", String(floor.floorNumber));
    params.set("gender", floor.gender);

    navigate(`/admin/rooms?${params.toString()}`);
  };

  return (
    <section className="relative isolate flex min-h-[calc(100vh-8rem)] flex-col gap-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[24px]">
        <div className="absolute -left-20 top-0 h-56 w-56 rounded-full bg-[#244cb8]/10 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-[#31b7d4]/10 blur-3xl" />
      </div>

      {isStatusFilterOpen && statusFilterMenuPosition
        ? createPortal(
            <div className="fixed inset-0 z-[68]" onClick={() => setIsStatusFilterOpen(false)}>
              <div
                className="absolute w-[210px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
                style={{ top: statusFilterMenuPosition.top, left: statusFilterMenuPosition.left }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-0.5 p-2.5">
                  {[
                    { value: "all", label: "Tất cả" },
                    { value: "ACTIVE", label: "Đang hoạt động" },
                    { value: "MAINTENANCE", label: "Bảo trì" },
                    { value: "INACTIVE", label: "Ngừng hoạt động" },
                  ].map((option) => {
                    const selected = draftFilterStatus === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDraftFilterStatus(option.value as "all" | FloorStatus)}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                      >
                        <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected ? "border-[#244cb8] bg-[#244cb8]/10" : "border-[#cfd9e8] bg-white"}`}>
                          <span className={`h-2 w-2 rounded-full ${selected ? "bg-[#244cb8]" : "bg-transparent"}`} />
                        </span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between border-t border-[#dbe5f3] px-2.5 py-2">
                  <button type="button" onClick={resetStatusFilter} className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]">
                    Reset
                  </button>
                  <button type="button" onClick={applyStatusFilter} className="rounded-xl bg-[#0c4f97] px-3 py-1.5 text-[10px] font-semibold tracking-normal text-white shadow-[0_8px_16px_rgba(12,79,151,0.22)] transition hover:brightness-110">
                    OK
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isConfirmOpen
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 sm:items-center">
              <div className="absolute inset-0 bg-black/30" onClick={closeConfirm} />
              <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
                <p className="text-sm text-slate-700">{confirmMessage}</p>
                <div className="mt-4 flex justify-end gap-3">
                  <button type="button" onClick={closeConfirm} className="rounded-xl border px-3 py-2 text-sm">
                    Hủy
                  </button>
                  <button type="button" onClick={confirmNow} className="rounded-xl bg-red-600 px-3 py-2 text-sm text-white">
                    OK
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isGenderFilterOpen && genderFilterMenuPosition
        ? createPortal(
            <div className="fixed inset-0 z-[68]" onClick={() => setIsGenderFilterOpen(false)}>
              <div
                className="absolute w-[210px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
                style={{ top: genderFilterMenuPosition.top, left: genderFilterMenuPosition.left }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-0.5 p-2.5">
                  {[
                    { value: "all", label: "Tất cả" },
                    { value: "MALE", label: "Nam" },
                    { value: "FEMALE", label: "Nữ" },
                  ].map((option) => {
                    const selected = draftFilterGender === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDraftFilterGender(option.value as "all" | FloorGender)}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                      >
                        <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected ? "border-[#244cb8] bg-[#244cb8]/10" : "border-[#cfd9e8] bg-white"}`}>
                          <span className={`h-2 w-2 rounded-full ${selected ? "bg-[#244cb8]" : "bg-transparent"}`} />
                        </span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between border-t border-[#dbe5f3] px-2.5 py-2">
                  <button type="button" onClick={resetGenderFilter} className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]">
                    Reset
                  </button>
                  <button type="button" onClick={applyGenderFilter} className="rounded-xl bg-[#0c4f97] px-3 py-1.5 text-[10px] font-semibold tracking-normal text-white shadow-[0_8px_16px_rgba(12,79,151,0.22)] transition hover:brightness-110">
                    OK
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

        {isFloorFilterOpen && floorFilterMenuPosition && building
          ? createPortal(
              <div className="fixed inset-0 z-[68]" onClick={() => setIsFloorFilterOpen(false)}>
                <div
                  className="absolute w-[210px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-[#d7e2f2] bg-white text-left shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
                  style={{ top: floorFilterMenuPosition.top, left: floorFilterMenuPosition.left }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="space-y-0.5 p-2.5">
                    {[{ value: "all", label: "Tất cả" }, ...building.floors.map((f) => ({ value: f.floorNumber, label: `Tầng ${f.floorNumber}` }))].map((option) => {
                      const selected = draftFilterFloor === option.value;
                      return (
                        <button
                          key={String(option.value)}
                          type="button"
                          onClick={() => setDraftFilterFloor(option.value as "all" | number)}
                          className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] font-medium tracking-normal text-[#1f4a8d] transition hover:bg-[#f5f9ff]"
                        >
                          <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected ? "border-[#244cb8] bg-[#244cb8]/10" : "border-[#cfd9e8] bg-white"}`}>
                            <span className={`h-2 w-2 rounded-full ${selected ? "bg-[#244cb8]" : "bg-transparent"}`} />
                          </span>
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between border-t border-[#dbe5f3] px-2.5 py-2">
                    <button type="button" onClick={resetFloorFilter} className="text-[10px] font-medium tracking-normal text-[#b2b8c3] transition hover:text-[#7c8799]">
                      Reset
                    </button>
                    <button type="button" onClick={applyFloorFilter} className="rounded-xl bg-[#0c4f97] px-3 py-1.5 text-[10px] font-semibold tracking-normal text-white shadow-[0_8px_16px_rgba(12,79,151,0.22)] transition hover:brightness-110">
                      OK
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}

      <header className="rounded-[20px] border border-[#c1d6f4] bg-[linear-gradient(180deg,#f8fbff_0%,#eaf3ff_72%,#dfebff_100%)] px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
        <div className="relative pl-16 sm:pl-20">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Quay lại"
            title="Quay lại"
            className="absolute left-0 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#c4d7f2] bg-white/90 text-[#40619a] shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-[#9cb9e7] hover:text-[#244cb8]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold tracking-tight text-[#1a2d52] sm:text-[28px]">Chi tiết tòa {building.building_code}</h1>
              <p className="mt-1 text-sm text-[#62789f]">Địa chỉ: {building.address ?? "-"}</p>
            </div>

            <div className="shrink-0 lg:pt-1">
              <button
                type="button"
                onClick={openAddFloor}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(36,76,184,0.28)] transition hover:-translate-y-0.5 hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                Thiết lập tầng
              </button>
            </div>
          </div>
        </div>
      </header>

      {floorDialogMode !== null
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="max-w-2xl w-full rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                  <div>
                    <h3 className="text-xl font-bold text-[#1a2d52]">
                      {floorDialogMode === "edit" ? "Chỉnh sửa tầng" : "Thiết lập tầng"}
                    </h3>
                    <p className="mt-1 text-sm text-[#62789f]">
                      {floorDialogMode === "edit"
                        ? "Cập nhật thông tin cơ bản của tầng."
                        : "Nhập thông tin cơ bản của tầng theo cấu trúc dữ liệu."}
                    </p>
                  </div>
                  <button onClick={closeFloorDialog} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-[#bfd2ec] hover:bg-[#f3f8ff]">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="px-6 py-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="flex flex-col">
                      <span className="text-sm font-medium text-[#1a2d52]">Tầng <span className="ml-1 text-red-500">*</span></span>
                      <input
                        type="number"
                        value={floorForm.floorNumber}
                        readOnly
                        className="mt-2 h-11 rounded-2xl border border-slate-200 bg-[#fafcff] px-3.5 text-sm outline-none"
                      />
                    </label>

                    <label className="flex flex-col">
                      <span className="text-sm font-medium text-[#1a2d52]">Giới tính <span className="ml-1 text-red-500">*</span></span>
                      <select
                        value={floorForm.gender}
                        onChange={(e) => setFloorForm((s) => ({ ...s, gender: e.target.value as FloorGender }))}
                        className="mt-2 h-11 rounded-2xl border border-slate-200 px-3.5 text-sm outline-none"
                      >
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                      </select>
                    </label>

                    <label className="flex flex-col sm:col-span-2">
                      <span className="text-sm font-medium text-[#1a2d52]">Trạng thái <span className="ml-1 text-red-500">*</span></span>
                      <select
                        value={floorForm.status}
                        onChange={(e) => setFloorForm((s) => ({ ...s, status: e.target.value as FloorStatus }))}
                        className="mt-2 h-11 rounded-2xl border border-slate-200 px-3.5 text-sm outline-none"
                      >
                        <option value="ACTIVE">Đang hoạt động</option>
                        <option value="MAINTENANCE">Bảo trì</option>
                        <option value="INACTIVE">Ngừng hoạt động</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                  <button onClick={closeFloorDialog} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Hủy</button>
                  <button onClick={saveFloor} className="inline-flex h-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(36,76,184,0.28)]">
                    {floorDialogMode === "edit" ? "Cập nhật" : "Lưu"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng tầng" value={filteredFloors.length} />
        <StatCard label="Tổng phòng" value={filteredMetrics.rooms} />
        <StatCard label="Tổng giường" value={filteredMetrics.beds} />
        <StatCard label="Tổng sinh viên đang ở" value={filteredMetrics.students} />
      </div>

      <div className="rounded-[32px] border border-[#d7e2f0] bg-white shadow-[0_18px_40px_rgba(36,76,184,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)]">
                <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  <div className="inline-flex items-center justify-center gap-2">
                    <span>Tầng</span>
                    <button
                      ref={floorFilterButtonRef}
                      type="button"
                      onClick={isFloorFilterOpen ? () => setIsFloorFilterOpen(false) : openFloorFilter}
                      className={`flex items-center justify-center transition ${filterFloor !== "all" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"}`}
                      aria-label="Bật lọc tầng"
                      title="Bật lọc tầng"
                    >
                      <Funnel className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
                <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  <div className="inline-flex items-center justify-center gap-2">
                    <span>Giới tính</span>
                    <button
                      ref={genderFilterButtonRef}
                      type="button"
                      onClick={isGenderFilterOpen ? () => setIsGenderFilterOpen(false) : openGenderFilter}
                      className={`flex items-center justify-center transition ${filterGender !== "all" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"}`}
                      aria-label="Bật lọc giới tính"
                      title="Bật lọc giới tính"
                    >
                      <Funnel className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
                <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Tổng phòng</th>
                <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Tổng giường</th>
                <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Sinh viên</th>
                <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">
                  <div className="inline-flex items-center justify-center gap-2">
                    <span>Trạng thái</span>
                    <button
                      ref={statusFilterButtonRef}
                      type="button"
                      onClick={isStatusFilterOpen ? () => setIsStatusFilterOpen(false) : openStatusFilter}
                      className={`flex items-center justify-center transition ${filterStatus !== "all" ? "text-[#244cb8]" : "text-[#6f84ad] hover:text-[#244cb8]"}`}
                      aria-label="Bật lọc trạng thái"
                      title="Bật lọc trạng thái"
                    >
                      <Funnel className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
                <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6f84ad]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {building && building.floors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border-t border-[#e7eef9] px-4 py-14 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-[28px] border border-dashed border-[#cfdcf0] bg-[#f8fbff] px-6 py-10 text-center">
                      <p className="text-sm font-semibold text-[#1a2d52]">Tòa hiện chưa có tầng nào. Hãy thiết lập tầng cho tòa</p>
                      <button type="button" onClick={openAddFloor} className="mt-5 inline-flex h-9 items-center justify-center rounded-xl bg-[#244cb8] px-4 text-sm font-semibold text-white transition hover:bg-[#1f44a4]">
                        Thiết lập tầng
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredFloors.length > 0 ? (
                filteredFloors.map((floor) => (
                  <tr
                    key={floor.floorNumber}
                    onClick={() => navigateToRoomManagement(floor)}
                    className="group cursor-pointer transition-colors duration-200 hover:bg-[#f8fbff]"
                  >
                    <td className="border-t border-[#e7eef9] px-3 py-4 text-center text-sm font-semibold text-[#1f3152]">
                      <button
                        type="button"
                        onClick={() => navigateToRoomManagement(floor)}
                        className="inline-flex items-center justify-center rounded-lg px-2 py-1 text-sm font-semibold text-[#1f3152] transition hover:bg-[#edf4ff] hover:text-[#244cb8]"
                        title={`Mở quản lý phòng tầng ${floor.floorNumber}`}
                      >
                        Tầng {floor.floorNumber}
                      </button>
                    </td>
                    <td className="border-t border-[#e7eef9] px-3 py-4 text-center">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                          floor.gender === "FEMALE"
                            ? "border-[#f2bfd0] bg-[#fff0f6] text-[#c45b87]"
                            : "border-[#bfd2ee] bg-[#edf4ff] text-[#2f63d8]"
                        }`}
                      >
                        {getGenderLabel(floor.gender)}
                      </span>
                    </td>
                    <td className="border-t border-[#e7eef9] px-3 py-4 text-center text-sm text-[#5d7299]">{getFloorMetrics(floor.floorNumber).rooms}</td>
                    <td className="border-t border-[#e7eef9] px-3 py-4 text-center text-sm text-[#5d7299]">{getFloorMetrics(floor.floorNumber).beds}</td>
                    <td className="border-t border-[#e7eef9] px-3 py-4 text-center text-sm text-[#5d7299]">{getFloorMetrics(floor.floorNumber).students}</td>
                    <td className="border-t border-[#e7eef9] px-3 py-4 text-center">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(floor.status)}`}>
                        {getFloorStatusLabel(floor.status)}
                      </span>
                    </td>
                    <td className="border-t border-[#e7eef9] px-3 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditFloor(floor);
                          }}
                          title="Sửa"
                          aria-label={`Sửa tầng ${floor.floorNumber}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.12)] transition hover:-translate-y-0.5 hover:border-[#aac2ea] hover:bg-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteFloor(floor);
                          }}
                          title="Xóa"
                          aria-label={`Xóa tầng ${floor.floorNumber}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 shadow-[0_8px_18px_rgba(225,85,105,0.12)] transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="border-t border-[#e7eef9] px-4 py-14 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-[28px] border border-dashed border-[#cfdcf0] bg-[#f8fbff] px-6 py-10 text-center">
                      <p className="text-sm font-semibold text-[#1a2d52]">Không tìm thấy tầng phù hợp với bộ lọc hiện tại</p>
                      <button type="button" onClick={resetAllFilters} className="mt-5 inline-flex h-9 items-center justify-center rounded-xl bg-[#244cb8] px-4 text-sm font-semibold text-white transition hover:bg-[#1f44a4]">
                        Bỏ bộ lọc
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {successMessage
        ? createPortal(
            <div className="fixed right-6 top-6 z-[90] rounded-xl bg-white/95 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
              <div className="text-sm font-medium text-[#1a2d52]">{successMessage}</div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}


// Render toast at root level to show success messages


