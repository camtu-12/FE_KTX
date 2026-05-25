import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Funnel, Plus } from "lucide-react";
import {
  initialBuildings,
  type Building,
  type BuildingFloor,
  type BuildingStatus,
  type FloorGender,
  type FloorStatus,
} from "../../../mocks/buildings";

const STORAGE_KEY = "ktx_buildings_dashboard_v2";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-[24px] border border-[#d8e4f5] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-5 py-4 shadow-[0_14px_30px_rgba(36,76,184,0.08)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#7c8fb5]">{label}</p>
      <p className="mt-2 text-2xl font-extrabold leading-none text-[#1a2d52]">{value}</p>
    </article>
  );
}

function getFloorsMetrics(floors: BuildingFloor[]) {
  return floors.reduce(
    (accumulator, floor) => {
      accumulator.rooms += floor.roomCount;
      accumulator.beds += floor.bedCount;
      accumulator.students += floor.occupiedStudents;
      return accumulator;
    },
    { rooms: 0, beds: 0, students: 0 },
  );
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

  const [isAddFloorOpen, setIsAddFloorOpen] = useState(false);
  const [floorForm, setFloorForm] = useState<{
    floorNumber: number | "";
    gender: FloorGender;
    roomCount: number | "";
    bedCount: number | "";
    status: FloorStatus;
  }>({ floorNumber: "", gender: "MALE", roomCount: "", bedCount: "", status: "ACTIVE" });
  const [validationErrors, setValidationErrors] = useState<{ roomCount?: string; bedCount?: string }>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const openAddFloor = () => {
    if (!building) {
      setIsAddFloorOpen(true);
      return;
    }
    const maxFloor = building.floors.reduce((m, f) => Math.max(m, f.floorNumber), 0);
    const next = maxFloor + 1;
    setFloorForm((s) => ({ ...s, floorNumber: next }));
    setIsAddFloorOpen(true);
  };
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const closeAddFloor = () => {
    setIsAddFloorOpen(false);
    setFloorForm({ floorNumber: "", gender: "MALE", roomCount: "", bedCount: "", status: "ACTIVE" });
    setValidationErrors({});
    setSubmitAttempted(false);
  };

  const saveFloor = () => {
    if (!building) return;
    setSubmitAttempted(true);
    const entered = Number(floorForm.floorNumber);
    const maxFloor = building.floors.reduce((m, f) => Math.max(m, f.floorNumber), 0);
    const expected = maxFloor + 1;
    const floorNumber = expected; // enforce sequential addition
    const roomCount = Number(floorForm.roomCount);
    const bedCount = Number(floorForm.bedCount);

    const errors: { roomCount?: string; bedCount?: string } = {};
    if (!roomCount || roomCount <= 0) errors.roomCount = "Vui lòng nhập Số phòng";
    if (!bedCount || bedCount <= 0) errors.bedCount = "Vui lòng nhập Số giường";
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // if user entered a different number, override and inform
    if (entered && entered !== expected && building.floors.some((f) => f.floorNumber === entered) === false) {
      // silently override to expected to keep sequential numbering
      // (do not allow adding non-sequential floor numbers)
      // optionally inform user
      // alert(`Số tầng được ghi nhận là ${expected} (tự động căn chỉnh).`);
    }
    // check duplicate floor (shouldn't happen since we enforce expected)
    if (building.floors.some((f) => f.floorNumber === floorNumber)) {
      alert("Tầng này đã tồn tại trong tòa.");
      return;
    }

    const newFloor: BuildingFloor = {
      floorNumber,
      gender: floorForm.gender,
      roomCount,
      bedCount,
      occupiedStudents: 0,
      status: floorForm.status,
    };

    setBuildings((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== building.id) return b;
        return { ...b, floors: [...b.floors, newFloor], total_floors: b.total_floors + 1 };
      });
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    closeAddFloor();
    setSuccessMessage(`Thiết lập tầng ${floorNumber} thành công`);
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

  const filteredMetrics = useMemo(() => getFloorsMetrics(filteredFloors), [filteredFloors]);

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
      <section className="relative isolate flex min-h-full flex-col gap-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6">
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

  // overallMetrics removed — previously used by the overview summary which was deleted

  return (
    <section className="relative isolate flex min-h-full flex-col gap-5 rounded-[24px] bg-[radial-gradient(circle_at_top_left,#eaf3ff_0%,#dbe9fb_38%,#d2e3f8_100%)] p-4 sm:p-6">
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

      {isAddFloorOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="max-w-2xl w-full rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                  <div>
                    <h3 className="text-xl font-bold text-[#1a2d52]">Thiết lập tầng</h3>
                    <p className="mt-1 text-sm text-[#62789f]">Nhập thông tin cơ bản của tầng theo cấu trúc dữ liệu.</p>
                  </div>
                  <button onClick={closeAddFloor} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-[#bfd2ec] hover:bg-[#f3f8ff]">
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
                      <span className="mt-1 text-xs text-[#62789f]">Tầng tiếp theo sẽ là {floorForm.floorNumber}</span>
                    </label>

                    <label className="flex flex-col">
                      <span className="text-sm font-medium text-[#1a2d52]">Giới tính <span className="ml-1 text-red-500">*</span></span>
                      <select
                        value={floorForm.gender}
                        onChange={(e) => { setFloorForm((s) => ({ ...s, gender: e.target.value as FloorGender })); setValidationErrors({}); }}
                        className="mt-2 h-11 rounded-2xl border border-slate-200 px-3.5 text-sm outline-none"
                      >
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                      </select>
                    </label>

                    <label className="flex flex-col">
                      <span className="text-sm font-medium text-[#1a2d52]">
                        Số phòng
                        <span className="ml-1 text-red-500">*</span>
                      </span>
                      <input
                        type="number"
                        value={floorForm.roomCount}
                        onChange={(e) => { setFloorForm((s) => ({ ...s, roomCount: e.target.value === "" ? "" : Number(e.target.value) })); setValidationErrors({}); }}
                        className="mt-2 h-11 rounded-2xl border border-slate-200 px-3.5 text-sm outline-none"
                      />
                      {submitAttempted && validationErrors.roomCount ? <span className="mt-1 text-xs text-red-600">{validationErrors.roomCount}</span> : null}
                    </label>

                    <label className="flex flex-col">
                      <span className="text-sm font-medium text-[#1a2d52]">
                        Số giường
                        <span className="ml-1 text-red-500">*</span>
                      </span>
                      <input
                        type="number"
                        value={floorForm.bedCount}
                        onChange={(e) => { setFloorForm((s) => ({ ...s, bedCount: e.target.value === "" ? "" : Number(e.target.value) })); setValidationErrors({}); }}
                        className="mt-2 h-11 rounded-2xl border border-slate-200 px-3.5 text-sm outline-none"
                      />
                      {submitAttempted && validationErrors.bedCount ? <span className="mt-1 text-xs text-red-600">{validationErrors.bedCount}</span> : null}
                    </label>

                    <label className="flex flex-col sm:col-span-2">
                      <span className="text-sm font-medium text-[#1a2d52]">Trạng thái <span className="ml-1 text-red-500">*</span></span>
                      <select
                        value={floorForm.status}
                        onChange={(e) => { setFloorForm((s) => ({ ...s, status: e.target.value as FloorStatus })); setValidationErrors({}); }}
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
                  <button onClick={closeAddFloor} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Hủy</button>
                  <button onClick={saveFloor} className="inline-flex h-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2f63da_0%,#244cb8_38%,#1f46ad_72%,#31b7d4_100%)] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(36,76,184,0.28)]">Lưu</button>
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

      <div className="overflow-hidden rounded-[32px] border border-[#d7e2f0] bg-white shadow-[0_18px_40px_rgba(36,76,184,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[17%]" />
              <col className="w-[17%]" />
              <col className="w-[17%]" />
              <col className="w-[17%]" />
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
                      aria-label="Bộ lọc tầng"
                      title="Bộ lọc tầng"
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
                      aria-label="Bộ lọc giới tính"
                      title="Bộ lọc giới tính"
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
                      aria-label="Bộ lọc trạng thái"
                      title="Bộ lọc trạng thái"
                    >
                      <Funnel className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFloors.length > 0 ? (
                filteredFloors.map((floor) => (
                  <tr key={floor.floorNumber} className="group transition-colors duration-200 hover:bg-[#f8fbff]">
                    <td className="border-t border-[#e7eef9] px-3 py-4 text-center text-sm font-semibold text-[#1f3152]">Tầng {floor.floorNumber}</td>
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
                    <td className="border-t border-[#e7eef9] px-3 py-4 text-center text-sm text-[#5d7299]">{floor.roomCount}</td>
                    <td className="border-t border-[#e7eef9] px-3 py-4 text-center text-sm text-[#5d7299]">{floor.bedCount}</td>
                    <td className="border-t border-[#e7eef9] px-3 py-4 text-center text-sm text-[#5d7299]">{floor.occupiedStudents}</td>
                    <td className="border-t border-[#e7eef9] px-3 py-4 text-center">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(floor.status)}`}>
                        {getFloorStatusLabel(floor.status)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="border-t border-[#e7eef9] px-4 py-14 text-center">
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

